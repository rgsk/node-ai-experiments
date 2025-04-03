import { Router } from "express";
import { z } from "zod";
import { s3ClientBuckets } from "../../lib/s3Client.js";
import {
  deleteS3Url,
  getPresignedUrl,
  getUploadURL,
} from "../../lib/s3Utils.js";
const awsRouter = Router();

const uploadUrlSchema = z.object({
  key: z.string(),
  access: z.enum(["public", "private"]).optional(),
});
awsRouter.get("/upload-url", async (req, res, next) => {
  try {
    const { key, access } = uploadUrlSchema.parse(req.query);
    const url = await getUploadURL({
      key,
      bucket:
        access === "public" ? s3ClientBuckets.public : s3ClientBuckets.private,
    });
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
