import { Router } from "express";
import { z } from "zod";
import { createEmbeddings, retrieveRelevantDocs } from "../../lib/rag.js";

const ragRouter = Router();
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
    const result = await createEmbeddings(data);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

const relevantDocsQuerySchema = z.object({
  query: z.string(),
  collectionName: z.string(),
  source: z.string().optional(),
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
    const result = await retrieveRelevantDocs({
      query,
      collectionName,
      source,
      limit,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
export default ragRouter;
