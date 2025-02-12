import { Router } from "express";
import { deepSeekClient } from "lib/deepSeekClient";
import environmentVars from "lib/environmentVars";
import openAIClient from "lib/openAIClient";
import attachUserEmail from "middlewares/attachUserEmail";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";
import awsRouter from "./children/awsRouter";
import friendsRouter from "./children/friendsRouter";
import jsonDataRouter from "./children/jsonDataRouter";

const rootRouter = Router();
rootRouter.use("/friends", friendsRouter);
rootRouter.use("/json-data", attachUserEmail, jsonDataRouter);
rootRouter.use("/aws", awsRouter);
rootRouter.get("/", async (req, res, next) => {
  res.json({
    message: `Server is running on http://localhost:${environmentVars.PORT}`,
  });
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

rootRouter.post("/text", async (req, res, next) => {
  try {
    const { messages } = req.body;
    const textStream = getTextStreamOpenAI(messages);
    for await (const chunk of textStream) {
      res.write(chunk);
    }
    return res.end();
  } catch (err) {
    return next(err);
  }
});

export const getTextStreamOpenAI = async function* (messages: any) {
  const stream = await getClient().chat.completions.create({
    messages: messages,
    model: getModel(),
    stream: true,
  });
  for await (const part of stream) {
    const content = part.choices[0].delta.content ?? "";
    yield content;
  }
};

export function extractVideoId(url: string) {
  // Create a URL object
  const urlObj = new URL(url);

  // Use URLSearchParams to get the 'v' parameter
  const params = new URLSearchParams(urlObj.search);

  // Get the 'v' parameter value
  const v = params.get("v");
  if (!v) {
    throw new Error("Invalid YouTube URL");
  }
  return v;
}

function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

const ytSchema = z.object({
  s: z.string(),
});

rootRouter.get("/youtube-transcript", async (req, res, next) => {
  try {
    const { s } = ytSchema.parse(req.query);
    const videoId = isUrl(s) ? extractVideoId(s) : s;
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return res.json(transcript);
  } catch (err) {
    return next(err);
  }
});

export default rootRouter;
