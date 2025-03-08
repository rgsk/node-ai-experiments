import { Router } from "express";
import { v4 } from "uuid";
import { io } from "../app.js";
import composioToolset from "../lib/composioToolset.js";
import { deepSeekClient } from "../lib/deepSeekClient.js";
import environmentVars from "../lib/environmentVars.js";
import mcpSchemaToOpenAITools from "../lib/mcpSchemaToOpenAITools.js";
import { getProps } from "../lib/middlewareProps.js";
import openAIClient from "../lib/openAIClient.js";
import { CreditDetails } from "../lib/typesJsonData.js";
import adminRequired from "../middlewares/adminRequired.js";
import { Middlewares } from "../middlewares/middlewaresNamespace.js";
import adminRouter from "./children/adminRouter.js";
import assistantsRouter, {
  EmitSocketEvent,
  getMcpClient,
} from "./children/assistants/assistantsRouter.js";
import awsRouter from "./children/awsRouter.js";
import friendsRouter from "./children/friendsRouter.js";
import jsonDataRouter from "./children/jsonDataRouter.js";
import { jsonDataService } from "./children/jsonDataService.js";

const rootRouter = Router();
rootRouter.use("/friends", friendsRouter);
rootRouter.use("/json-data", jsonDataRouter);
rootRouter.use("/aws", awsRouter);
rootRouter.use("/assistants", assistantsRouter);
rootRouter.use("/admin", adminRequired, adminRouter);
rootRouter.get("/", async (req, res, next) => {
  try {
    return res.json({
      message: `Server is running on http://localhost:${environmentVars.PORT}`,
    });
  } catch (err) {
    return next(err);
  }
});

// An endpoint which would work with the client code above - it returns
// the contents of a REST API request to this protected endpoint
rootRouter.get("/session", async (req, res, next) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${environmentVars.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
      }),
    });
    const data = await r.json();

    // Send back the JSON we received from the OpenAI REST API
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});
enum AIClient {
  Deepseek = "deepseek",
  OpenAI = "openai",
}
const aiClient = AIClient.OpenAI as AIClient.Deepseek | AIClient.OpenAI; // Example usage

const getClient = () => {
  if (aiClient === AIClient.Deepseek) {
    return deepSeekClient;
  } else {
    return openAIClient;
  }
};

const getModel = (overrideModel?: Partial<Record<AIClient, string>>) => {
  if (aiClient === AIClient.Deepseek) {
    return overrideModel?.[aiClient] || "deepseek-chat";
  } else {
    return overrideModel?.[aiClient] || "gpt-4o";
  }
};
rootRouter.post("/completion", async (req, res, next) => {
  try {
    const { messages } = req.body;
    const completion = await getClient().chat.completions.create({
      messages: messages,
      model: getModel(),
    });
    return res.json({
      content: completion.choices[0].message.content,
    });
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/json-completion", async (req, res, next) => {
  try {
    const { messages } = req.body;
    const completion = await getClient().chat.completions.create({
      messages: messages,
      model: getModel(),
      response_format: { type: "json_object" },
    });
    return res.json(JSON.parse(completion.choices[0].message.content as any));
  } catch (err) {
    return next(err);
  }
});

const getTextStreamTools = async () => {
  const mcpClient = await getMcpClient();
  const composioTools = await composioToolset.getTools({
    apps: ["googlesheets"],
    // apps: [],
  });
  const mcpToolsSchema = await mcpClient.listTools();
  const mcpOpenAITools = mcpSchemaToOpenAITools(mcpToolsSchema);
  // const mcpOpenAITools: any = [];
  return { composioTools, mcpOpenAITools };
};

rootRouter.post("/execute-tool", async (req, res, next) => {
  try {
    const { composioTools, mcpOpenAITools } = await getTextStreamTools();
    const { toolCall } = req.body as {
      toolCall: {
        index: number;
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: any;
        };
      };
    };
    let output = "";
    if (
      composioTools.some(
        (tool) => tool.function.name === toolCall.function.name
      )
    ) {
      output = await composioToolset.executeToolCall({
        ...toolCall,
        function: {
          ...toolCall.function,
          arguments: JSON.stringify(toolCall.function.arguments),
        },
      });
    } else if (
      mcpOpenAITools.some(
        (tool: any) => tool.function.name === toolCall.function.name
      )
    ) {
      const mcpClient = await getMcpClient();
      const value = await mcpClient.callTool({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      });
      output = JSON.stringify(value);
    } else {
      throw new Error("Unknown function name: " + toolCall.function.name);
    }
    return res.json({ output: output });
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/text", async (req, res, next) => {
  try {
    let { messages, socketId } = req.body;
    const socket = socketId ? io.sockets.sockets.get(socketId) : undefined;
    const emitSocketEvent: EmitSocketEvent = (eventName: string, data: any) => {
      if (socket) {
        socket.emit(eventName, data);
      }
    };
    const { composioTools, mcpOpenAITools } = await getTextStreamTools();
    const tools = [...composioTools, ...mcpOpenAITools];
    messages = messages.map((m: any) => {
      if (m.tool_calls) {
        for (let tc of m.tool_calls) {
          tc.function.arguments = JSON.stringify(tc.function.arguments);
        }
      }
      return m;
    });
    const textStream = getTextStreamOpenAI({
      messages,
      tools,
      emitSocketEvent,
    });
    for await (const chunk of textStream) {
      res.write(chunk);
    }
    return res.end();
  } catch (err) {
    return next(err);
  }
});

export const getTextStreamOpenAI = async function* ({
  messages,
  tools,
  emitSocketEvent,
}: {
  messages: any;
  tools: any;
  emitSocketEvent: EmitSocketEvent;
}) {
  const stream = await getClient().chat.completions.create({
    messages: messages,
    model: getModel(),
    stream: true,
    tools: tools,
  });

  // Object to accumulate the tool call arguments for each index.
  const toolCallAccumulators: any = {};
  // Object to store the full tool call objects (saved once when first received).
  const savedToolCalls: any = {};

  for await (const part of stream) {
    const delta = part.choices[0].delta;

    // Check if this delta contains tool calls.
    if (delta.tool_calls) {
      for (const toolCall of delta.tool_calls) {
        const idx = toolCall.index;
        // Save the complete tool call object the first time it appears.
        if (!savedToolCalls[idx]) {
          savedToolCalls[idx] = toolCall;
        }
        // Initialize the accumulator for arguments if not already set.
        if (!toolCallAccumulators[idx]) {
          toolCallAccumulators[idx] = "";
        }
        // Append the current chunk of arguments.
        toolCallAccumulators[idx] += toolCall.function!.arguments;
        console.log(
          `Accumulated arguments for index ${idx}: ${toolCallAccumulators[idx]}`
        );
      }
    }

    // Yield any text content from this delta.
    const content = delta.content ?? "";
    if (content) {
      yield content;
    }
  }

  // After the stream ends, update each saved tool call with the complete combined arguments.
  for (const idx in savedToolCalls) {
    savedToolCalls[idx].function.arguments = JSON.parse(
      toolCallAccumulators[idx]
    );
  }

  // Save the final tool calls somewhere, here we simply log them,
  // but you could store them in a database, a file, or any other storage.
  console.log("Final saved tool calls:", savedToolCalls);
  const toolCallsToExecute = Object.values(savedToolCalls);

  // Optionally, yield the complete tool call information as a JSON string.
  // yield "toolCallsToExecute:" + JSON.stringify(toolCallsToExecute);
  emitSocketEvent("toolCallsToExecute", toolCallsToExecute);
};

export const getTextStreamOpenAIEmitDelta = async function* ({
  messages,
  tools,
}: {
  messages: any;
  tools: any;
}) {
  const stream = await getClient().chat.completions.create({
    messages: messages,
    model: getModel(),
    stream: true,
    tools: tools,
  });
  for await (const part of stream) {
    const delta = part.choices[0].delta;
    yield JSON.stringify(delta);
  }
};

rootRouter.post("/initialize-credits", async (req, res, next) => {
  try {
    const { userEmail } = getProps<Middlewares.Authenticate>(
      req,
      Middlewares.Keys.Authenticate
    );

    const { value: creditDetails } =
      (await jsonDataService.findByKey<CreditDetails>(
        `reactAIExperiments/admin/public/creditDetails/${userEmail}`
      )) ?? {};
    if (creditDetails) {
      throw new Error(
        `creditDetails for userEmail - ${userEmail} already exist`
      );
    }
    const initialFreeCreditBalance = 10;
    const result = await jsonDataService.createOrUpdate<CreditDetails>({
      key: `reactAIExperiments/admin/public/creditDetails/${userEmail}`,
      value: {
        id: v4(),
        userEmail: userEmail,
        balance: initialFreeCreditBalance,
      },
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
rootRouter.post("/deduct-credits", async (req, res, next) => {
  try {
    const { userEmail } = getProps<Middlewares.Authenticate>(
      req,
      Middlewares.Keys.Authenticate
    );
    const { value: creditDetails } =
      (await jsonDataService.findByKey<CreditDetails>(
        `reactAIExperiments/admin/public/creditDetails/${userEmail}`
      )) ?? {};
    if (!creditDetails) {
      throw new Error(`creditDetails for userEmail - ${userEmail} not found`);
    }
    const deductionAmount = 1;
    if (creditDetails.balance < deductionAmount) {
      return res.json({
        isAllowed: false,
        creditsBalance: creditDetails.balance,
      });
    }
    const result = await jsonDataService.createOrUpdate<CreditDetails>({
      key: `reactAIExperiments/admin/public/creditDetails/${userEmail}`,
      value: {
        ...creditDetails,
        balance: creditDetails.balance - deductionAmount,
      },
    });
    const updatedCreditDetails = result.value;
    return res.json({
      isAllowed: true,
      creditsBalance: updatedCreditDetails.balance,
    });
  } catch (err) {
    return next(err);
  }
});

export default rootRouter;
