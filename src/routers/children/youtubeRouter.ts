import { Router } from "express";
import { fetchTranscript } from "youtube-transcript-plus";
import { z } from "zod";
import { generateChapters } from "../../lib/youtube.js";

const youtubeRouter = Router();

export const fetchYoutubeTranscriptCustom = async (urlOrVideoId: string) => {
  const transcript = await fetchTranscript(urlOrVideoId, { lang: "en" });
  return transcript;
};

const ytSchema = z.object({
  s: z.string(),
});

youtubeRouter.get("/transcript", async (req, res, next) => {
  try {
    const { s } = ytSchema.parse(req.query);
    const transcript = await fetchYoutubeTranscriptCustom(s);
    return res.json(transcript);
  } catch (err) {
    return next(err);
  }
});

youtubeRouter.get("/chapters", async (req, res, next) => {
  try {
    const { s } = ytSchema.parse(req.query);
    const transcript = await fetchYoutubeTranscriptCustom(s);
    const chapters = await generateChapters(transcript);
    return res.json(chapters);
  } catch (err) {
    return next(err);
  }
});

export default youtubeRouter;
