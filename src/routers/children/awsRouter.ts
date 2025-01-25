import { Router } from "express";
import { getPresignedUrl, getUploadURL } from "lib/s3Utils";
import { z } from "zod";

const awsRouter = Router();

const uploadUrlSchema = z.object({
  key: z.string(),
});
awsRouter.get("/upload-url", async (req, res, next) => {
  try {
    const { key } = uploadUrlSchema.parse(req.query);
    const url = await getUploadURL({ key });
    return res.json({
      url,
    });
  } catch (err) {
    return next(err);
  }
});

const downloadUrlSchema = z.object({
  url: z.string(),
});
awsRouter.get("/download-url", async (req, res, next) => {
  try {
    const { url } = downloadUrlSchema.parse(req.query);
    const presignedUrl = await getPresignedUrl(url);
    return res.json({
      url: presignedUrl,
    });
  } catch (err) {
    return next(err);
  }
});

export default awsRouter;
