import { Router } from "express";
import { ChatCompletionChunk } from "openai/resources/index.mjs";
import { Socket } from "socket.io";
import { v4 } from "uuid";
import { z } from "zod";
import { io } from "../app.js";
import composioToolset from "../lib/composioToolset.js";
import { db } from "../lib/db.js";
import { deepSeekClient } from "../lib/deepSeekClient.js";
import environmentVars from "../lib/environmentVars.js";
import mcpClient from "../lib/mcpClient.js";
import mcpSchemaToOpenAITools from "../lib/mcpSchemaToOpenAITools.js";
import { getProps } from "../lib/middlewareProps.js";
import openAIClient from "../lib/openAIClient.js";
import openRouterClient from "../lib/openRouterClient.js";
import rag from "../lib/rag.js";
import {
  duplicateStream,
  getAudioStreamBySentence,
  parseReaderByChunks,
} from "../lib/streamUtils.js";
import { Chat, CreditDetails, Message } from "../lib/typesJsonData.js";
import adminRequired from "../middlewares/adminRequired.js";
import { Middlewares } from "../middlewares/middlewaresNamespace.js";
import adminRouter from "./children/adminRouter.js";
import assistantsRouter from "./children/assistants/assistantsRouter.js";
import getUrlContent, {
  isCSVUrl,
} from "./children/assistants/tools/getUrlContent.js";
import awsRouter from "./children/awsRouter.js";
import friendsRouter from "./children/friendsRouter.js";
import jsonDataRouter from "./children/jsonDataRouter.js";
import { jsonDataService, JsonDataValue } from "./children/jsonDataService.js";
import ragRouter from "./children/ragRouter.js";
import sdCentralAcademyWebRouter from "./children/sdCentralAcademyWebRouter.js";

const rootRouter = Router();
rootRouter.use("/friends", friendsRouter);
rootRouter.use("/json-data", jsonDataRouter);
rootRouter.use("/aws", awsRouter);
rootRouter.use("/assistants", assistantsRouter);
rootRouter.use("/admin", adminRequired, adminRouter);
rootRouter.use("/rag", adminRequired, ragRouter);
rootRouter.use("/sdCentralAcademyWeb", sdCentralAcademyWebRouter);
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
        input_audio_transcription: {
          model: "gpt-4o-transcribe",
        },
      }),
    });
    const data = await r.json();

    // Send back the JSON we received from the OpenAI REST API
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

const getClient = (clientName: string) => {
  if (clientName === "openrouter") {
    return openRouterClient;
  } else if (clientName === "deepseek") {
    return deepSeekClient;
  } else if (clientName === "openai") {
    return openAIClient;
  } else {
    throw new Error("unknown ai client");
  }
};

rootRouter.post("/completion", async (req, res, next) => {
  try {
    const { messages, model } = req.body;
    const [clientName, modelName] = model.split("/");

    const completion = await getClient(clientName).chat.completions.create({
      messages: messages,
      model: modelName,
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
    const { messages, model } = req.body;
    const [clientName, modelName] = model.split("/");
    const completion = await getClient(clientName).chat.completions.create({
      messages: messages,
      model: modelName,
      response_format: { type: "json_object" },
    });
    return res.json(JSON.parse(completion.choices[0].message.content as any));
  } catch (err) {
    return next(err);
  }
});

const getTextStreamTools = async () => {
  const composioTools = await composioToolset.getTools({
    apps: ["googlesheets"],
    // apps: [],
  });
  const mcpToolsSchema = await mcpClient.listTools();
  const mcpOpenAITools = mcpSchemaToOpenAITools(mcpToolsSchema);

  // const mcpOpenAITools: any = [];
  return { composioTools, mcpOpenAITools: mcpOpenAITools };
};

rootRouter.get("/tools", async (req, res, next) => {
  try {
    const { composioTools, mcpOpenAITools } = await getTextStreamTools();
    return res.json({ composioTools, mcpOpenAITools });
  } catch (err) {
    return next(err);
  }
});

const executeTool = async (toolCall: any) => {
  let output = "";
  if (toolCall.source === "composio") {
    output = await composioToolset.executeToolCall({
      ...toolCall,
      function: {
        ...toolCall.function,
        arguments: JSON.stringify(toolCall.function.arguments),
      },
    });
  } else if (toolCall.source === "mcp") {
    const value = await mcpClient.callTool({
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    });
    output = JSON.stringify(value);
  } else {
    throw new Error("Unknown function name: " + toolCall.function.name);
  }
  return output;
};

rootRouter.post("/execute-tool", async (req, res, next) => {
  try {
    const output = await executeTool(req.body.toolCall);
    return res.json({ output: output });
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/text", async (req, res, next) => {
  try {
    let { messages, socketId, tools, model, streamAudio } = req.body;
    const socket = socketId ? io.sockets.sockets.get(socketId) : undefined;
    if (!socket) {
      throw new Error("socket not present");
    }
    messages = messages.map((m: any) => {
      delete m.id;
      delete m.status;
      if (m.tool_calls) {
        for (let tc of m.tool_calls) {
          tc.function.arguments = JSON.stringify(tc.function.arguments);
        }
      }
      return m;
    });
    const { toolCalls } = await handleStream({
      messages,
      tools,
      socket,
      model,
      streamAudio,
    });

    return res.json({ toolCalls });
  } catch (err) {
    return next(err);
  }
});

const getClientNameAndModelName = (model: string) => {
  const slashIndex = model.indexOf("/");
  const clientName = model.slice(0, slashIndex);
  const modelName = model.slice(slashIndex + 1);
  return { clientName, modelName };
};
async function* modifyStream(
  originalStream: AsyncIterable<ChatCompletionChunk>
) {
  for await (const chunk of originalStream) {
    const content = chunk.choices[0].delta.content ?? "";
    yield content;
  }
}
export const handleStream = async ({
  messages,
  tools,
  socket,
  model,
  streamAudio,
}: {
  messages: any;
  tools: any;
  socket: Socket;
  model: string;
  streamAudio?: boolean;
}) => {
  const { clientName, modelName } = getClientNameAndModelName(model);

  const controller = new AbortController(); // Create an AbortController
  const signal = controller.signal; // Get the signal
  const stream = await getClient(clientName).chat.completions.create(
    {
      messages: messages,
      model: modelName,
      stream: true,
      tools: tools,
    },
    {
      signal,
    }
  );

  // Object to accumulate the tool call arguments for each index.
  const toolCallAccumulators: any = {};
  // Object to store the full tool call objects (saved once when first received).
  const savedToolCalls: any = {};

  const toolCalls: any = [];

  async function streamText(textStream: AsyncIterable<ChatCompletionChunk>) {
    for await (const part of textStream) {
      const delta = part.choices[0].delta;
      if (delta.content) {
        socket.emit("content", delta.content);
      }
      if ((delta as any).reasoning_content) {
        socket.emit("reasoning_content", (delta as any).reasoning_content);
      }
      if (delta.tool_calls) {
        socket.emit("tool_calls");
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

          // Attempt to parse the accumulated arguments.
          try {
            const parsedArgs = JSON.parse(toolCallAccumulators[idx]);
            // If parsing is successful, emit the complete tool call immediately.
            savedToolCalls[idx].function.arguments = parsedArgs;
            const tool = tools.find(
              (t: any) => t.function.name === savedToolCalls[idx].function.name
            );
            const toolCall = {
              ...savedToolCalls[idx],
              source: tool.source,
              variant: tool.variant,
            };
            toolCalls.push(toolCall);
            socket.emit("toolCall", toolCall);
            if (toolCall.variant === "serverSide") {
              executeTool(toolCall).then((output) => {
                socket.emit("toolCallOutput", {
                  toolCall,
                  toolCallOutput: output,
                });
              });
            }
          } catch (e) {
            // JSON.parse failed: likely the tool call arguments are not complete yet.
            // Continue accumulating.
          }
        }
      }
    }
    socket.emit("text-complete");
  }
  if (streamAudio) {
    const [textStream, textStreamForAudio] = await duplicateStream(stream);
    const audioController = new AbortController(); // Create an AbortController
    const audioSignal = audioController.signal; // Get the signal
    const audioStream = getAudioStreamBySentence(
      modifyStream(textStreamForAudio),
      (text) => getAudioStreamOpenAI(text, audioSignal)
    );
    socket.on("audio-stop", () => {
      audioController.abort();
    });
    socket.on("stop", () => {
      audioController.abort();
      controller.abort();
    });

    async function streamAudio() {
      try {
        for await (const chunk of audioStream) {
          socket.emit("audio", chunk);
        }
      } catch (err) {
        // !!IMPORTANT below error is thrown when we pause the audio stream
        // console.log("audio paused error");
      }
      socket.emit("audio-complete");
    }
    // await Promise.all([streamAudio(), streamText(textStream)]);
    streamAudio();
    await streamText(textStream);
  } else {
    socket.on("stop", () => {
      controller.abort();
    });
    await streamText(stream);
  }

  return {
    toolCalls,
  };
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

const searchMessagesSchema = z.object({
  q: z.string(),
  personaId: z.string().optional(),
});

rootRouter.get("/search-messages", async (req, res, next) => {
  try {
    const { q, personaId } = searchMessagesSchema.parse(req.query);
    const attachPersonaPrefixIfPresent = (key: string) => {
      if (personaId) {
        return `personas/${personaId}/${key}`;
      }
      return key;
    };
    const { userEmail } = getProps<Middlewares.Authenticate>(
      req,
      Middlewares.Keys.Authenticate
    );

    const result: JsonDataValue<Message[] | Chat>[] = await db.$queryRaw`
WITH MatchedChats AS (
    -- Find chats that match the query in either the title or messages content
    SELECT DISTINCT key
    FROM "JsonData"
    WHERE 
        (
            key LIKE ${`reactAIExperiments/users/${userEmail}/${attachPersonaPrefixIfPresent(
              `chats/%/messages`
            )}`}
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(value) AS elem
                WHERE elem->>'role' IN ('user', 'assistant')  
                    AND elem->>'content' ILIKE ${`%${q}%`}
            )
        )
        OR 
        (
            key LIKE ${`reactAIExperiments/users/${userEmail}/${attachPersonaPrefixIfPresent(
              `chats/%`
            )}`}
            AND value->>'title' ILIKE ${`%${q}%`}
        )
)

-- Fetch both the chat and corresponding messages for matched chat IDs
SELECT *
FROM "JsonData"
WHERE 
    key IN (
        SELECT key FROM MatchedChats
        UNION
        -- Ensure the chat entry is fetched if messages match and vice versa
        SELECT REPLACE(key, '/messages', '') FROM MatchedChats WHERE key LIKE '%/messages'
        UNION
        SELECT key || '/messages' FROM MatchedChats WHERE key NOT LIKE '%/messages'
    )
ORDER BY "createdAt" DESC;
    `;
    const messagesJsonDataEntries: JsonDataValue<Message[]>[] = [];
    const chatJsonDataEntries: JsonDataValue<Chat>[] = [];
    for (const entry of result) {
      if (entry.key.endsWith("/messages")) {
        messagesJsonDataEntries.push(entry as any);
      } else {
        chatJsonDataEntries.push(entry as any);
      }
    }
    return res.json({
      messagesJsonDataEntries: messagesJsonDataEntries,
      chatJsonDataEntries: chatJsonDataEntries,
    });
  } catch (err) {
    return next(err);
  }
});

const processFileMessageSchema = z.object({
  url: z.string(),
  collectionName: z.string(),
});

rootRouter.post("/process-file-message", async (req, res, next) => {
  try {
    const { url, collectionName } = processFileMessageSchema.parse(req.body);
    const csvUrl = isCSVUrl(url);
    const content = await getUrlContent({ url, collectionName });
    const result = await rag.processFileMessage({
      content,
      source: url,
      collectionName,
      ragAllowed: !csvUrl,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export const getTextStreamOpenAI = async function* (
  messages: any,
  signal?: AbortSignal
) {
  const stream = await openAIClient.chat.completions.create(
    {
      messages: messages,
      model: "gpt-4o",
      stream: true,
    },
    {
      signal,
    }
  );
  for await (const part of stream) {
    const content = part.choices[0].delta.content ?? "";
    yield content;
  }
};

export const getAudioStreamOpenAI = async function* (
  text: string,
  signal?: AbortSignal
) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${environmentVars.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      instructions: "Speak in a cheerful and positive tone.",
    }),
    signal,
  });

  if (!response.body) {
    throw new Error("Response body is undefined");
  }

  const reader = response.body.getReader();
  //   yield* parseReader(reader);
  yield* parseReaderByChunks(reader, 1024);
};

rootRouter.post("/audio", async (req, res, next) => {
  try {
    const { messages } = req.body;

    const controller = new AbortController(); // Create an AbortController
    const signal = controller.signal; // Get the signal

    const textStream = getTextStreamOpenAI(messages, signal);
    const audioStream = getAudioStreamBySentence(textStream, (text) =>
      getAudioStreamOpenAI(text, signal)
    );
    req.on("close", () => {
      controller.abort();
      console.log("Client disconnected (request closed)");
    });
    res.on("close", () => {
      controller.abort();
      console.log("Client disconnected (response closed)");
    });
    let audioChunkCount = 0;
    for await (const chunk of audioStream) {
      audioChunkCount++;
      res.write(chunk);
    }
    // console.log(`Sent ${audioChunkCount} audio chunks`);
    return res.end();
  } catch (err) {
    return next(err);
  }
});

const generateAudioSchema = z.object({
  text: z.string(),
});

rootRouter.post("/play-audio", async (req, res, next) => {
  try {
    const { text } = generateAudioSchema.parse(req.body);
    const controller = new AbortController(); // Create an AbortController
    const signal = controller.signal; // Get the signal
    const audioStream = getAudioStreamOpenAI(text, signal);

    req.on("close", () => {
      controller.abort();
      console.log("Client disconnected (request closed)");
    });
    res.on("close", () => {
      controller.abort();
      console.log("Client disconnected (response closed)");
    });
    for await (const chunk of audioStream) {
      res.write(chunk);
    }
    return res.end();
  } catch (err) {
    return next(err);
  }
});

export default rootRouter;
