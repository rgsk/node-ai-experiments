import axios from "axios";
import { Router } from "express";
import { TranscriptResponse } from "youtube-transcript";
import { fetchTranscript } from "youtube-transcript-plus";
import { z } from "zod";
import environmentVars from "../../lib/environmentVars.js";
import { encodeQueryParams } from "../../lib/utils.js";
import { generateChapters } from "../../lib/youtube.js";

const youtubeRouter = Router();

export const fetchYoutubeTranscriptCustom = async (urlOrVideoId: string) => {
  if (environmentVars.SERVER_LOCATION === "local") {
    const transcript = await fetchTranscript(urlOrVideoId, { lang: "en" });
    return transcript;
  } else {
    const query = encodeQueryParams({ s: urlOrVideoId });
    const response = await axios.get<TranscriptResponse[]>(
      `https://deidre-boltlike-jemma.ngrok-free.dev/youtube/transcript?${query}`
    );
    const transcript = response.data;
    return transcript;
  }
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
