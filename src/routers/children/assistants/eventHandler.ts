import { EventEmitter } from "events";
import { NextFunction, Request, Response } from "express";
import { OpenAI } from "openai";
import { AssistantStreamEvent } from "openai/resources/beta/assistants.js";
import composioToolset from "../../../lib/composioToolset.js";
import { addProps } from "../../../lib/middlewareProps.js";
import openAIClient from "../../../lib/openAIClient.js";
import { Middlewares } from "../../../middlewares/middlewaresNamespace.js";
import { EmitSocketEvent, getMcpClient } from "./assistantsRouter.js";

type ToolsPassed = { name: string; type: "mcp" | "composio" }[];
export type EventObject = {
  userEmail: string;
  emitSocketEvent: EmitSocketEvent;
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
    { userEmail, emitSocketEvent, toolsPassed, req, res, next }: EventObject
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
      return next(lastError);
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
        try {
          if (matchingToolPassed) {
            let output = "";
            if (matchingToolPassed.type === "composio") {
              output = await composioToolset.executeToolCall(toolCall);
            } else if (matchingToolPassed.type === "mcp") {
              const mcpClient = await getMcpClient();
              const value = await mcpClient.callTool({
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
          } else {
            throw new Error("Unknown function name: " + toolCall.function.name);
          }
        } catch (err: any) {
          try {
            const run = await openAIClient.beta.threads.runs.cancel(
              threadId,
              runId
            );
            addProps<Middlewares.ErrorData>(
              req,
              {
                data: {
                  source: "tool call error",
                  toolCallFunctionName: toolCall.function.name,
                  matchingToolPassedType: matchingToolPassed?.type,
                },
              },
              Middlewares.Keys.ErrorData
            );
            return next({
              code: "tool_call_error",
              message: err.message,
              err: err,
            });
          } catch (err) {
            addProps<Middlewares.ErrorData>(
              req,
              {
                data: {
                  source: "cancelling run failed",
                  toolCallFunctionName: toolCall.function.name,
                },
              },
              Middlewares.Keys.ErrorData
            );
            return next(err);
          }
        }
      }
      // Submit all the tool outputs at the same time
      await this.submitToolOutputs({
        toolOutputs,
        runId,
        threadId,
        userEmail,
        emitSocketEvent,
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
