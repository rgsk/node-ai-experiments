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

    const currentYear = new Date().getFullYear();
    const promises: any[] = [];

    for (const entry of result.data) {
      const { value } = entry;
      const student = value as any;

      if (!student["Class"]) continue;

      const currentClass = student["Class"];
      const classIndex = classOptions.indexOf(currentClass);

      if (classIndex !== -1) {
        student["Class"] =
          classIndex === classOptions.length - 1
            ? `${currentYear} Passout`
            : classOptions[classIndex + 1];
      } else if (
        typeof currentClass === "string" &&
        currentClass.endsWith("Passout")
      ) {
        const match = currentClass.match(/^(\d{4}) Passout$/);
        if (match) {
          const year = parseInt(match[1]);
          student["Class"] = `${year + 1} Passout`;
        }
      } else {
        // Handle PRE-NURSERY MINUS N → promote toward PRE-NURSERY
        const match = currentClass.match(/^PRE-NURSERY MINUS (\d+)$/);
        if (match) {
          const level = parseInt(match[1]);
          if (level === 1) {
            student["Class"] = "PRE-NURSERY";
          } else {
            student["Class"] = `PRE-NURSERY MINUS ${level - 1}`;
          }
        }
      }

      promises.push(
        jsonDataService.createOrUpdate({ key: entry.key, value: student })
      );
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

      if (!student["Class"]) continue;

      const currentClass = student["Class"];
      const classIndex = classOptions.indexOf(currentClass);

      // Case 1: Regular class demotion
      if (classIndex > 0) {
        student["Class"] = classOptions[classIndex - 1];
      }

      // Case 2: PRE-NURSERY → PRE-NURSERY MINUS 1
      else if (currentClass === "PRE-NURSERY") {
        student["Class"] = "PRE-NURSERY MINUS 1";
      }

      // Case 3: PRE-NURSERY MINUS N → PRE-NURSERY MINUS N+1
      else if (/^PRE-NURSERY MINUS \d+$/.test(currentClass)) {
        const match = currentClass.match(/^PRE-NURSERY MINUS (\d+)$/);
        if (match) {
          const level = parseInt(match[1], 10);
          student["Class"] = `PRE-NURSERY MINUS ${level + 1}`;
        }
      }

      // Case 4: Passout demotion
      else if (
        typeof currentClass === "string" &&
        currentClass.endsWith("Passout")
      ) {
        const match = currentClass.match(/^(\d{4}) Passout$/);
        if (match) {
          const passoutYear = parseInt(match[1], 10);
          if (passoutYear === currentYear) {
            student["Class"] = classOptions[classOptions.length - 1]; // demote to VIII
          } else if (passoutYear > currentYear) {
            student["Class"] = `${passoutYear - 1} Passout`;
          }
        }
      }

      promises.push(
        jsonDataService.createOrUpdate({ key: entry.key, value: student })
      );
    }

    await Promise.all(promises);
    return res.json({ message: "all students demoted successfully" });
  } catch (err) {
    return next(err);
  }
});

export default sdCentralAcademyWebRouter;
