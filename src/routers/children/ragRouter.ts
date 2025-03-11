import { Router } from "express";
import { z } from "zod";
import { createEmbeddings } from "../../lib/rag.js";

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
ragRouter.post("/createEmbeddings", async (req, res, next) => {
  try {
    const { data } = createEmbeddingsBodySchema.parse(req.body);
    const { count } = await createEmbeddings(data);
    return res.json({ count });
  } catch (err) {
    return next(err);
  }
});
export default ragRouter;
