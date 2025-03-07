import { Router } from "express";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";
import { generateChapters } from "../../lib/youtube.js";

const youtubeRouter = Router();
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

youtubeRouter.get("/transcript", async (req, res, next) => {
  try {
    const { s } = ytSchema.parse(req.query);
    const videoId = isUrl(s) ? extractVideoId(s) : s;
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return res.json(transcript);
  } catch (err) {
    return next(err);
  }
});

youtubeRouter.get("/chapters", async (req, res, next) => {
  try {
    const { s } = ytSchema.parse(req.query);
    const videoId = isUrl(s) ? extractVideoId(s) : s;
    const chapters = await generateChapters(videoId);
    return res.json(chapters);
  } catch (err) {
    return next(err);
  }
});

export default youtubeRouter;
