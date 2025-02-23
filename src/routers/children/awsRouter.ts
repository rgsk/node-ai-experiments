import { Router } from "express";
import { deleteS3Url, getPresignedUrl, getUploadURL } from "lib/s3Utils";
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
const deleteS3UrlSchema = z.object({
  url: z.string(),
});
awsRouter.delete("/s3-url", async (req, res, next) => {
  try {
    const { url } = deleteS3UrlSchema.parse(req.query);
    const result = await deleteS3Url(url);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export default awsRouter;
