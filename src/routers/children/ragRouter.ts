import { Router } from "express";
import { z } from "zod";
import rag from "../../lib/rag.js";

const ragRouter = Router();
const embedContentSchema = z.object({
  data: z.object({
    content: z.string(),
    collectionName: z.string(),
    source: z.string(),
    metadata: z.any().optional(),
  }),
  config: z.object({
    chunkLength: z.number().int(),
    overlapLength: z.number().int(),
  }),
});
ragRouter.post("/embed-content", async (req, res, next) => {
  try {
    const parsed = embedContentSchema.parse(req.body);
    const result = await rag.embedContent(parsed);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

const createEmbeddingsBodySchema = z.object({
  data: z.array(
    z.object({
      content: z.string(),
      collectionName: z.string(),
      source: z.string(),
      metadata: z.any().optional(),
    })
  ),
});
ragRouter.post("/embeddings", async (req, res, next) => {
  try {
    const { data } = createEmbeddingsBodySchema.parse(req.body);
    const result = await rag.createEmbeddings(data);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

const relevantDocsQuerySchema = z.object({
  query: z.string(),
  collectionName: z.string(),
  source: z.preprocess((data) => {
    if (typeof data === "string") {
      return [data];
    }
    return data;
  }, z.array(z.string()).optional()),
  limit: z.preprocess((a) => {
    if (typeof a === "string") {
      // Ensure the entire string is a valid integer (optional minus sign, then digits)
      if (!/^-?\d+$/.test(a)) {
        throw new Error("limit must be a valid integer");
      }
      return parseInt(a, 10);
    }
    return a;
  }, z.number().int().optional()),
});

ragRouter.get("/relevant-docs", async (req, res, next) => {
  try {
    const { query, collectionName, source, limit } =
      relevantDocsQuerySchema.parse(req.query);
    const result = await rag.retrieveRelevantDocs({
      query,
      collectionName,
      sources: source,
      limit,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
const deleteCollectionSchema = z.object({
  collectionName: z.string(),
});
ragRouter.delete("/collection", async (req, res, next) => {
  try {
    const { collectionName } = deleteCollectionSchema.parse(req.body);
    const result = await rag.deleteCollection({
      collectionName,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

const deleteSourceSchema = z.object({
  collectionName: z.string(),
  source: z.string(),
});
ragRouter.delete("/source", async (req, res, next) => {
  try {
    const { collectionName, source } = deleteSourceSchema.parse(req.body);
    const result = await rag.deleteSource({
      collectionName,
      source,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
export default ragRouter;
