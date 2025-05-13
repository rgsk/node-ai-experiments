import { Router } from "express";
import { z } from "zod";
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

const getReportCardsSchema = z.object({
  registrationNumber: z.string(),
});

sdCentralAcademyWebRouter.get("/report-cards", async (req, res, next) => {
  try {
    const { registrationNumber } = getReportCardsSchema.parse(req.query);
    const result = await db.$queryRaw`
    SELECT *
FROM "JsonData"
WHERE key LIKE 'sdCentralAcademyWeb/reportCards/%'
  AND value->>'Regn. No.' = ${registrationNumber};
    `;
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
const getClassDetailsQuerySchema = z.object({
  academicSession: z.string(),
  classValue: z.string(),
});
sdCentralAcademyWebRouter.get("/class-details", async (req, res, next) => {
  try {
    const { academicSession, classValue } = getClassDetailsQuerySchema.parse(
      req.query
    );
    const result = await db.$queryRaw`
    SELECT *
FROM "JsonData"
WHERE key LIKE 'sdCentralAcademyWeb/classDetails1/%'
  AND value->>'Academic Session' = ${academicSession}
  AND value->>'Class' = ${classValue};
    `;
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export default sdCentralAcademyWebRouter;
