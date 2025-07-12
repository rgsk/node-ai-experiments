import { Router } from "express";
import { z } from "zod";
import { db } from "../../lib/db.js";
import { jsonDataService } from "./jsonDataService.js";

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

export const classOptions = [
  "PRE-NURSERY",
  "NURSERY",
  "LKG",
  "UKG",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
];

sdCentralAcademyWebRouter.post("/promote-students", async (req, res, next) => {
  try {
    const result = await jsonDataService.findByKeyLike({
      key: "sdCentralAcademyWeb/students/%",
    });
    const promises: any[] = [];
    for (const entry of result.data) {
      const { value } = entry;
      const student = value as any;
      if (student["Class"]) {
        const currentIndex = classOptions.indexOf(student["Class"]);
        if (currentIndex !== -1) {
          student["Class"] =
            currentIndex === classOptions.length - 1
              ? `${new Date().getFullYear()} Passout`
              : classOptions[currentIndex + 1];
          promises.push(
            jsonDataService.createOrUpdate({ key: entry.key, value: student })
          );
        }
      }
    }
    await Promise.all(promises);
    return res.json({ message: "all students promoted successfully" });
  } catch (err) {
    return next(err);
  }
});
sdCentralAcademyWebRouter.post("/demote-students", async (req, res, next) => {
  try {
    const result = await jsonDataService.findByKeyLike({
      key: "sdCentralAcademyWeb/students/%",
    });

    const currentYear = new Date().getFullYear();
    const promises: any[] = [];

    for (const entry of result.data) {
      const { value } = entry;
      const student = value as any;

      if (student["Class"]) {
        const currentClass = student["Class"];
        const currentIndex = classOptions.indexOf(currentClass);

        // Case 1: Valid class (e.g., I, II, ..., VIII)
        if (currentIndex > 0) {
          student["Class"] = classOptions[currentIndex - 1];
        }

        // Case 2: Was "PRE-NURSERY", can't demote
        else if (currentIndex === 0) {
          continue; // skip demotion
        }

        // Case 3: Year Passout string, e.g., "2025 Passout"
        else if (
          typeof currentClass === "string" &&
          currentClass.endsWith("Passout")
        ) {
          const match = currentClass.match(/^(\d{4}) Passout$/);
          if (match) {
            const passoutYear = parseInt(match[1]);

            if (passoutYear === currentYear) {
              // Move to last class
              student["Class"] = classOptions[classOptions.length - 1];
            } else if (passoutYear > currentYear) {
              // Reduce passout year by 1
              student["Class"] = `${passoutYear - 1} Passout`;
            } else {
              continue; // Ignore outdated passouts
            }
          }
        } else {
          continue; // Skip unknown values
        }

        promises.push(
          jsonDataService.createOrUpdate({ key: entry.key, value: student })
        );
      }
    }

    await Promise.all(promises);
    return res.json({ message: "all students demoted successfully" });
  } catch (err) {
    return next(err);
  }
});

export default sdCentralAcademyWebRouter;
