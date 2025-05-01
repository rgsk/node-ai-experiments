import { Router } from "express";
import { db } from "../../lib/db.js";

const sdCentralAcademyWebRouter = Router();

sdCentralAcademyWebRouter.get("/createdBy-emails", async (req, res, next) => {
  try {
    const result: { email: string }[] = await db.$queryRaw`
    SELECT DISTINCT value->>'createdBy' AS email
FROM "JsonData"
WHERE key LIKE 'sdCentralAcademyWeb/reportCards/%'
  AND value->>'createdBy' IS NOT NULL;
    `;
    const emails = result.map((r) => r.email);
    return res.json({ emails });
  } catch (err) {
    return next(err);
  }
});

export default sdCentralAcademyWebRouter;
