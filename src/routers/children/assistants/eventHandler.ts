import { EventEmitter } from "events";
import { NextFunction, Request, Response } from "express";
import { OpenAI } from "openai";
import { AssistantStreamEvent } from "openai/resources/beta/assistants.js";
import composioToolset from "../../../lib/composioToolset.js";
import experimentsMcpClient from "../../../lib/experimentsMcpClient.js";
import { addProps } from "../../../lib/middlewareProps.js";
import openAIClient from "../../../lib/openAIClient.js";
import { Persona } from "../../../lib/typesJsonData.js";
import { Middlewares } from "../../../middlewares/middlewaresNamespace.js";
import { EmitSocketEvent } from "./assistantsRouter.js";
import getRelevantDocs from "./tools/getRelevantDocs.js";
import getUrlContent from "./tools/getUrlContent.js";
import saveUserInfoToMemory from "./tools/saveUserInfoToMemory.js";
type ToolsPassed = { name: string; type: "mcp" | "composio" }[];
export type EventObject = {
  userEmail: string;
  emitSocketEvent: EmitSocketEvent;
  persona?: Persona;
  toolsPassed: ToolsPassed;
  req: Request;
  res: Response;
  next: NextFunction;
};
class EventHandler extends EventEmitter {
  client: OpenAI;
  constructor(client: OpenAI) {
    super();
    this.client = client;
  }
  async onEvent(
    event: AssistantStreamEvent,
    {
      userEmail,
      emitSocketEvent,
      persona,
      toolsPassed,
      req,
      res,
      next,
    }: EventObject
  ) {
    // console.log(event);
    // Retrieve events that are denoted with 'requires_action'
    // since these will have our tool_calls
    if (event.event === "thread.run.requires_action") {
      await this.handleRequiresAction({
        run: event.data,
        runId: event.data.id,
        threadId: event.data.thread_id,
        userEmail,
        emitSocketEvent,
        persona,
        toolsPassed,
        req,
        res,
        next,
      });
    } else if (event.event === "thread.message.delta") {
      // console.log("Message delta", event.data.delta.content);
      // res.write(JSON.stringify(event.data.delta.content));
      emitSocketEvent("thread.message.delta", {
        content: event.data.delta.content,
      });
    } else if (event.event === "thread.message.created") {
      emitSocketEvent("thread.message.created", {
        message: event.data,
      });
    } else if (event.event === "thread.message.completed") {
      emitSocketEvent("thread.message.completed", {
        message: event.data,
      });
    } else if (event.event === "thread.run.failed") {
      // console.log("thread.run.failed");
      // console.log(event.data);
      const run = event.data;
      const lastError = run.last_error;
      addProps<Middlewares.ErrorData>(
        req,
        { data: { source: "thread.run.failed", ...lastError } },
        Middlewares.Keys.ErrorData
      );
      next(new Error(lastError?.message ?? "Unknown error"));
    } else if (event.event === "thread.run.completed") {
      res.json({ message: "thread.run.completed", run: event.data });
    } else if (event.event === "thread.run.cancelled") {
      res.json({ message: "thread.run.cancelled", run: event.data });
    } else if (event.event === "thread.message.incomplete") {
      const message = event.data;
      emitSocketEvent("thread.message.incomplete", {
        message,
      });
    }
  }

  async handleRequiresAction({
    run,
    runId,
    threadId,
    userEmail,
    emitSocketEvent,
    persona,
    toolsPassed,
    req,
    res,
    next,
  }: {
    run: OpenAI.Beta.Threads.Runs.Run;
    runId: string;
    threadId: string;
    userEmail: string;
    emitSocketEvent: EmitSocketEvent;
    persona?: Persona;
    toolsPassed: ToolsPassed;
    req: Request;
    res: Response;
    next: NextFunction;
  }) {
    if (run.required_action) {
      const toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] =
        [];
      for (const toolCall of run.required_action.submit_tool_outputs
        .tool_calls) {
        const matchingToolPassed = toolsPassed.find(
          (tool) => tool.name === toolCall.function.name
        );
        if (matchingToolPassed) {
          let output = "";
          if (matchingToolPassed.type === "composio") {
            output = await composioToolset.executeToolCall(toolCall);
          } else if (matchingToolPassed.type === "mcp") {
            const value = await experimentsMcpClient.callTool({
              name: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments),
            });
            output = JSON.stringify(value);
          } else {
            throw new Error(
              `Unknown ToolPassed type: ${matchingToolPassed.type}`
            );
          }
          // console.log({ output });
          const result = {
            tool_call_id: toolCall.id,
            output: output,
          };
          toolOutputs.push(result);
        } else if (toolCall.function.name === "getCurrentTemperature") {
          const result = {
            tool_call_id: toolCall.id,
            output: "100",
          };
          toolOutputs.push(result);
        } else if (toolCall.function.name === "getRainProbability") {
          const result = {
            tool_call_id: toolCall.id,
            output: "0.06",
          };
          toolOutputs.push(result);
        } else if (toolCall.function.name === "getRelevantDocs") {
          if (persona) {
            const args = toolCall.function.arguments;
            const { query } = JSON.parse(args) as { query: string };
            // console.log({ query });
            const relevantDocs = await getRelevantDocs({ query, persona });
            const result = {
              tool_call_id: toolCall.id,
              output: JSON.stringify(relevantDocs),
            };
            toolOutputs.push(result);
          } else {
            // console.log("no relevant docs");
            const result = {
              tool_call_id: toolCall.id,
              output: "no relevant docs",
            };
            toolOutputs.push(result);
          }
        } else if (toolCall.function.name === "getUrlContent") {
          const args = toolCall.function.arguments;
          const { url } = JSON.parse(args) as { url: string };
          const output = await getUrlContent(url);
          // console.log(output);
          const result = {
            tool_call_id: toolCall.id,
            output: output,
          };
          toolOutputs.push(result);
        } else if (toolCall.function.name === "saveUserInfoToMemory") {
          const args = toolCall.function.arguments;
          const { statement } = JSON.parse(args) as { statement: string };
          const output = await saveUserInfoToMemory({
            statement,
            userEmail,
          });
          // console.log(output);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: output,
          });
        } else {
          throw new Error("Unknown function name: " + toolCall.function.name);
        }
      }
      // Submit all the tool outputs at the same time
      await this.submitToolOutputs({
        toolOutputs,
        runId,
        threadId,
        userEmail,
        emitSocketEvent,
        persona,
        toolsPassed,
        req,
        res,
        next,
      });
    }
  }

  async submitToolOutputs({
    runId,
    threadId,
    toolOutputs,
    userEmail,
    emitSocketEvent,
    persona,
    toolsPassed,
    req,
    res,
    next,
  }: {
    toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[];
    runId: string;
    threadId: string;
    userEmail: string;
    emitSocketEvent: EmitSocketEvent;
    persona?: Persona;
    toolsPassed: ToolsPassed;
    req: Request;
    res: Response;
    next: NextFunction;
  }) {
    // Use the submitToolOutputsStream helper
    const stream = this.client.beta.threads.runs.submitToolOutputsStream(
      threadId,
      runId,
      { tool_outputs: toolOutputs }
    );
    const eventObject: EventObject = {
      userEmail,
      emitSocketEvent,
      persona,
      toolsPassed,
      req,
      res,
      next,
    };
    for await (const event of stream) {
      this.emit("event", event, eventObject);
    }
  }
}

export const eventHandler = new EventHandler(openAIClient);
eventHandler.on("event", eventHandler.onEvent.bind(eventHandler));
