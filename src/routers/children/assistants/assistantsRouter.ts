import { io } from "app";
import { Router } from "express";
import fs from "fs";
import composioToolset from "lib/composioToolset";
import { getProps } from "lib/middlewareProps";
import openAIClient from "lib/openAIClient";
import { Memory, Persona } from "lib/typesJsonData";
import { upload } from "lib/upload";
import { Middlewares } from "middlewares/middlewaresNamespace";
import { MessageContentPartParam } from "openai/resources/beta/threads/messages";
import { z } from "zod";
import { getPopulatedKey } from "../jsonDataRouter";
import { jsonDataService } from "../jsonDataService";
import { eventHandler, EventObject } from "./eventHandler";

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
    let persona: Persona | undefined = undefined;
    if (personaId) {
      const result = await jsonDataService.findByKey<Persona>(
        getPopulatedKey(
          `reactAIExperiments/users/$userEmail/personas/${personaId}`,
          userEmail
        )
      );
      persona = result?.value;
      if (!persona) {
        throw new Error("persona not found");
      }
    }
    const personaInstruction = `
      user is interacting persona with following personality
      <persona>${JSON.stringify(persona)}</persona>
      you have to respond on persona's behalf

      additionally since, user interacting with this persona, getRelevantDocs tool becomes important
      so make sure to pass user query to that tool and fetch the relevant docs and respond accordingly
    `;
    const { value: memories } =
      (await jsonDataService.findByKey<Memory[]>(
        getPopulatedKey(
          `reactAIExperiments/users/$userEmail/memories`,
          userEmail
        )
      )) ?? {};
    const statements = memories?.map((m) => m.statement) ?? [];
    const memoryInstruction = `
              Following memory statements are gathered from previous conversations with the user, 
              try to incorporate them into the conversation context to provide a more personalized response.
              <statements>
              ${statements.join(", ")}
              </statements>
  
              additionally, if user has revealed something new about himself in the conversation so far, 
              save that statement in the memory
            `;

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
    const additional_instructions = [
      userContextString,
      memoryInstruction,
      persona && personaInstruction,
    ]
      .filter(Boolean)
      ?.join("\n--------------\n");
    const composioTools = await composioToolset.getTools({
      apps: ["googlesheets"],
    });
    const composioToolsFunctionNames = composioTools.map(
      (tool) => tool.function.name
    );
    const stream = openAIClient.beta.threads.runs.stream(
      threadId,
      {
        assistant_id: assistantId,
        additional_instructions: additional_instructions,
        tools: [...composioTools],
      },
      eventHandler as any
    );
    const eventObject: EventObject = {
      userEmail,
      emitSocketEvent,
      persona,
      composioToolsFunctionNames,
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
