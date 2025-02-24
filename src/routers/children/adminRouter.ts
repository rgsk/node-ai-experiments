import { Router } from "express";
import { z } from "zod";
import { jsonDataService } from "./jsonDataService";

const adminRouter = Router();
const setCreditsSchema = z.object({
  email: z.string(),
  balance: z.number().int(),
});
adminRouter.post("/set-credits", async (req, res, next) => {
  try {
    const { email, balance } = setCreditsSchema.parse(req.body);
    const result = await jsonDataService.createOrUpdate({
      key: `reactAIExperiments/admin/public/creditDetails/${email}`,
      value: {
        balance: balance,
        userEmail: email,
      },
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
export default adminRouter;
