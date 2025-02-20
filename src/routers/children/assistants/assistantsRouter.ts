import { io } from "app";
import { Router } from "express";
import openAIClient from "lib/openAIClient";
import { MessageContentPartParam } from "openai/resources/beta/threads/messages";
import { z } from "zod";
import { eventHandler, EventObject } from "./eventHandler";

const assistantsRouter = Router();
export type EmitSocketEvent = (eventName: string, data: any) => void;

// schema for request body
const requestBodySchema = z.object({
  threadId: z.string(),
  assistantId: z.string(),
  userMessage: z.string(),
  userId: z.string(),
  userContextString: z.string().optional(),
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
    const {
      threadId,
      assistantId,
      userMessage,
      secondaryMessages,
      userContextString,
      userId,
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
    // const memories = await db.memory.findMany({ where: { userId } });
    const statements: string[] = [];
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
    const additional_instructions = [userContextString, memoryInstruction]
      .filter(Boolean)
      ?.join("\n--------------\n");

    const stream = openAIClient.beta.threads.runs.stream(
      threadId,
      {
        assistant_id: assistantId,
        additional_instructions: additional_instructions,
      },
      eventHandler as any
    );
    const eventObject: EventObject = {
      userId,
      emitSocketEvent,
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
export default assistantsRouter;
