import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Router } from "express";
import fs from "fs";
import { MessageContentPartParam } from "openai/resources/beta/threads/messages";
import { z } from "zod";
import { io } from "../../../app.js";
import composioToolset from "../../../lib/composioToolset.js";
import environmentVars from "../../../lib/environmentVars.js";
import mcpSchemaToOpenAITools from "../../../lib/mcpSchemaToOpenAITools.js";
import { getProps } from "../../../lib/middlewareProps.js";
import openAIClient from "../../../lib/openAIClient.js";
import { upload } from "../../../lib/upload.js";
import { Middlewares } from "../../../middlewares/middlewaresNamespace.js";
import { eventHandler, EventObject } from "./eventHandler.js";

const assistantsRouter = Router();

assistantsRouter.get("/threads/:threadId/messages", async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const threadMessages = await openAIClient.beta.threads.messages.list(
      threadId
    );
    const data = threadMessages.data.reverse();
    // writeFile("sampleMessages.json", JSON.stringify(data));
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

export type EmitSocketEvent = (eventName: string, data: any) => void;

// schema for request body
const requestBodySchema = z.object({
  threadId: z.string(),
  assistantId: z.string(),
  userMessage: z.string(),
  userContextString: z.string().optional(),
  personaId: z.string().optional(),
  secondaryMessages: z.array(z.string()).optional(),
  socketId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        file_id: z.string(),
        tools: z.array(
          z.object({
            type: z.enum(["code_interpreter", "file_search"]),
          })
        ),
      })
    )
    .optional(),
  imageFileIds: z.array(z.string()).optional(),
  imageUrls: z.record(z.string()).optional(),
  attachFilesToCodeInterpreter: z.boolean().optional(),
});
export const getMcpClient = async () => {
  const mcpTransport = new SSEClientTransport(
    new URL(environmentVars.MCP_AI_EXPERIMENTS_SERVER + "/sse")
  );

  const mcpClient = new Client({
    name: "example-client",
    version: "1.0.0",
  });
  await mcpClient.connect(mcpTransport);
  return mcpClient;
};
assistantsRouter.post("/chat", async (req, res, next) => {
  try {
    const { userEmail } = getProps<Middlewares.Authenticate>(
      req,
      Middlewares.Keys.Authenticate
    );
    const {
      threadId,
      assistantId,
      userMessage,
      secondaryMessages,
      personaId,
      userContextString,
      socketId,
      attachments,
      imageFileIds,
      imageUrls,
    } = requestBodySchema.parse(req.body);

    // writeFile("dummy.json", JSON.stringify(attachments));

    const socket = socketId ? io.sockets.sockets.get(socketId) : undefined;
    const emitSocketEvent: EmitSocketEvent = (eventName: string, data: any) => {
      if (socket) {
        socket.emit(eventName, data);
      }
    };

    const imageFilesContent: MessageContentPartParam[] =
      imageFileIds?.map((fileId) => ({
        type: "image_file",
        image_file: {
          file_id: fileId,
        },
      })) ?? [];
    const secondaryTextMessages: MessageContentPartParam[] =
      secondaryMessages?.map((m) => ({
        type: "text",
        text: m,
      })) ?? [];
    const mcpClient = await getMcpClient();

    const message = await openAIClient.beta.threads.messages.create(threadId, {
      role: "user",
      content: [
        ...imageFilesContent,
        {
          type: "text",
          text: userMessage,
        },
        ...secondaryTextMessages,
      ],
      attachments: attachments,
      metadata: {
        ...imageUrls,
      },
    });

    emitSocketEvent("userMessage.created", { message });

    let personaInstruction = "";
    if (personaId) {
      const result = await mcpClient.getPrompt({
        name: "persona",
        arguments: {
          personaId,
          userEmail,
        },
      });
      personaInstruction = result.messages[0].content.text as string;
    }

    let memoryInstruction = "";
    const result = await mcpClient.getPrompt({
      name: "memory",
      arguments: {
        userEmail,
      },
    });
    memoryInstruction = result.messages[0].content.text as string;

    const additional_instructions = [
      userContextString,
      memoryInstruction,
      personaInstruction,
      `userEmail: ${userEmail}`,
    ]
      .filter(Boolean)
      ?.join("\n--------------\n");
    const composioTools = await composioToolset.getTools({
      apps: [],
    });
    const mcpToolsSchema = await mcpClient.listTools();
    const mcpOpenAITools = mcpSchemaToOpenAITools(mcpToolsSchema);
    // writeFile("basic.json", JSON.stringify({ mcpToolsSchema, mcpOpenAITools }));

    const toolsPassed = [
      ...composioTools.map((tool) => ({
        name: tool.function.name,
        type: "composio",
      })),
      ...mcpOpenAITools.map((tool: any) => ({
        name: tool.function.name,
        type: "mcp",
      })),
    ];
    const stream = openAIClient.beta.threads.runs.stream(
      threadId,
      {
        assistant_id: assistantId,
        additional_instructions: additional_instructions,
        tools: [...composioTools, ...mcpOpenAITools],
      },
      eventHandler as any
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
      eventHandler.emit("event", event, eventObject);
    }
  } catch (err) {
    return next(err);
  }
});

assistantsRouter.post("/threads", async (req, res, next) => {
  try {
    const thread = await openAIClient.beta.threads.create();
    return res.json({ threadId: thread.id });
  } catch (err) {
    return next(err);
  }
});

assistantsRouter.post(
  "/threads/:threadId/runs/:runId/cancel",
  async (req, res, next) => {
    try {
      const { threadId, runId } = req.params;
      const run = await openAIClient.beta.threads.runs.cancel(threadId, runId);
      return res.json(run);
    } catch (err) {
      return next(err);
    }
  }
);

assistantsRouter.post(
  "/files",
  upload.single("file") as any,
  async (req, res, next) => {
    try {
      if (req.file) {
        const filePath = req.file.path;
        const imageMimeTypes = [
          "image/gif",
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];
        try {
          const fileObject = await openAIClient.files.create({
            file: fs.createReadStream(filePath),
            purpose: imageMimeTypes.includes(req.file.mimetype)
              ? "vision"
              : "assistants",
          });
          return res.json(fileObject);
        } catch (err) {
          throw err;
        } finally {
          fs.unlinkSync(filePath);
        }
      } else {
        throw new Error("No file uploaded");
      }
    } catch (err) {
      return next(err);
    }
  }
);

assistantsRouter.delete("/files/:file_id", async (req, res, next) => {
  try {
    const { file_id } = req.params;
    const fileObject = await openAIClient.files.del(file_id);
    return res.json(fileObject);
  } catch (err) {
    return next(err);
  }
});

assistantsRouter.get("/files/:file_id", async (req, res, next) => {
  try {
    const { file_id } = req.params;
    const file = await openAIClient.files.retrieve(file_id);
    return res.json(file);
  } catch (err) {
    return next(err);
  }
});

assistantsRouter.get("/files/:file_id/content", async (req, res, next) => {
  try {
    const { file_id } = req.params;
    const fileContent = await openAIClient.files.content(file_id);

    // Collect the buffer content
    const buffer = Buffer.from(await fileContent.arrayBuffer());

    // Set response headers for file download
    res.setHeader("Content-Type", "application/octet-stream");

    // Send the buffer as the response
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
});

export default assistantsRouter;
