import { Prisma } from "@prisma/client";
import { Router } from "express";
import { v4 } from "uuid";
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
  sessionValue: z.string(),
  termValue: z.string(),
});

sdCentralAcademyWebRouter.get("/report-cards", async (req, res, next) => {
  try {
    const { registrationNumber, sessionValue, termValue } =
      getReportCardsSchema.parse(req.query);
    const studentsResult: any = await db.$queryRaw`
    SELECT *
FROM "JsonData"
WHERE key LIKE 'sdCentralAcademyWeb/students/%'
  AND value->>'Regn. No.' = ${registrationNumber};
    `;
    const studentIds = studentsResult.map(
      ({ value }: any) => (value as any).id
    );
    const reportCardsResult = await db.$queryRaw`
        SELECT *
    FROM "JsonData"
    WHERE key LIKE 'sdCentralAcademyWeb/reportCards/%'
      AND value->>'studentId' IN (${Prisma.join(studentIds)})
      AND value->>'Academic Session' = ${sessionValue}
      AND value->>'Term' = ${termValue};
`;
    return res.json(reportCardsResult);
  } catch (err) {
    return next(err);
  }
});

const getExamMarksSchema = z.object({
  sessionValue: z.string(),
  termValue: z.string(),
});

sdCentralAcademyWebRouter.get("/exam-marks", async (req, res, next) => {
  try {
    const { sessionValue, termValue } = getExamMarksSchema.parse(req.query);

    const examMarksResult = await db.$queryRaw`
        SELECT *
    FROM "JsonData"
    WHERE key LIKE 'sdCentralAcademyWeb/examMarks/____-____/%'
      AND value->>'academicSessionValue' = ${sessionValue}
      AND value->>'termValue' = ${termValue};
`;
    return res.json(examMarksResult);
  } catch (err) {
    return next(err);
  }
});

const getStudentsSchema = z.object({
  registrationNumber: z.string(),
});

sdCentralAcademyWebRouter.get("/students", async (req, res, next) => {
  try {
    const { registrationNumber } = getStudentsSchema.parse(req.query);
    const result = await db.$queryRaw`
    SELECT *
FROM "JsonData"
WHERE key LIKE 'sdCentralAcademyWeb/students/%'
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
WHERE key LIKE 'sdCentralAcademyWeb/classDetails/%'
  AND value->>'Academic Session' = ${academicSession}
  AND value->>'Class' = ${classValue};
    `;
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

const getDateSheetsSchema = z.object({
  classValue: z.string(),
  sessionValue: z.string(),
  termValue: z.string(),
});

sdCentralAcademyWebRouter.get("/date-sheets", async (req, res, next) => {
  try {
    const { classValue, sessionValue, termValue } = getDateSheetsSchema.parse(
      req.query
    );
    const result = await db.$queryRaw`
    SELECT *
FROM "JsonData"
WHERE key LIKE 'sdCentralAcademyWeb/dateSheets/%'
  AND value->>'Class' = ${classValue}
  AND value->>'Session' = ${sessionValue}
  AND value->>'Term' = ${termValue};
    `;
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export const knownClassOrder = [
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
      const classIndex = knownClassOrder.indexOf(currentClass);

      if (classIndex !== -1) {
        student["Class"] =
          classIndex === knownClassOrder.length - 1
            ? `${currentYear} Passout`
            : knownClassOrder[classIndex + 1];
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
      const classIndex = knownClassOrder.indexOf(currentClass);

      // Case 1: Regular class demotion
      if (classIndex > 0) {
        student["Class"] = knownClassOrder[classIndex - 1];
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
            student["Class"] = knownClassOrder[knownClassOrder.length - 1]; // demote to VIII
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

sdCentralAcademyWebRouter.get("/assigned-classes", async (req, res, next) => {
  try {
    const classesSet = new Set<string>(knownClassOrder); // standard classes should always be available

    const result = await jsonDataService.findByKeyLike({
      key: "sdCentralAcademyWeb/students/%",
    });

    for (const entry of result.data) {
      const student = entry.value as any;
      if (student["Class"]) {
        classesSet.add(student["Class"]);
      }
    }

    const classes = Array.from(classesSet);

    const sorted = classes.sort((a, b) => {
      const getRank = (cls: string): number => {
        // PRE-NURSERY MINUS N (higher N comes first → lower rank)
        const minusMatch = cls.match(/^PRE-NURSERY MINUS (\d+)$/);
        if (minusMatch) return -parseInt(minusMatch[1]) * 10;

        // Exact match for PRE-NURSERY
        if (cls === "PRE-NURSERY") return 0;

        // Known class ordering
        const knownIndex = knownClassOrder.indexOf(cls);
        if (knownIndex !== -1) return 100 + knownIndex;

        // Passouts
        const passoutMatch = cls.match(/^(\d{4}) Passout$/);
        if (passoutMatch) return 1000 + parseInt(passoutMatch[1]);

        // Unknowns last
        return 9999;
      };

      return getRank(a) - getRank(b);
    });

    return res.json(sorted);
  } catch (err) {
    return next(err);
  }
});

const createReportCardsIfNotExistsSchema = z
  .object({
    classValue: z.string().optional(),
    studentIds: z.array(z.string()).optional(),
    sessionValue: z.string(),
    termValue: z.string(),
  })
  .refine(
    (data) =>
      (data.classValue && !data.studentIds) ||
      (!data.classValue && data.studentIds),
    {
      message:
        "Either classValue OR studentIds must be provided, but not both.",
      path: ["classValue", "studentIds"], // error appears on these fields
    }
  );
sdCentralAcademyWebRouter.post(
  "/create-report-cards-if-not-exists",
  async (req, res, next) => {
    try {
      let { studentIds, classValue, sessionValue, termValue } =
        createReportCardsIfNotExistsSchema.parse(req.body);
      if (!studentIds) {
        const result: any = await db.$queryRaw`
    SELECT *
FROM "JsonData"
WHERE key LIKE 'sdCentralAcademyWeb/students/%'
  AND value->>'Class' = ${classValue};`;
        studentIds = result.map((r: any) => r.value.id) as string[];
      }

      // create report card for every student if not exists
      const reportCardsResult: any = await db.$queryRaw`
              SELECT *
          FROM "JsonData"
          WHERE key LIKE 'sdCentralAcademyWeb/reportCards/%'
            AND value->>'studentId' IN (${Prisma.join(studentIds)})
            AND value->>'Academic Session' = ${sessionValue}
            AND value->>'Term' = ${termValue};
      `;
      const studentsWithReportCards = new Set(
        reportCardsResult.map((rc: any) => rc.value.studentId)
      );
      const result = await jsonDataService.createMany(
        studentIds
          .filter((id) => !studentsWithReportCards.has(id))
          .map((studentId) => {
            const id = v4();
            return {
              key: `sdCentralAcademyWeb/reportCards/${id}`,
              value: {
                id,
                Term: termValue,
                studentId: studentId,
                "Academic Session": sessionValue,
              },
            };
          })
      );

      return res.json(result);
    } catch (err) {
      return next(err);
    }
  }
);

export default sdCentralAcademyWebRouter;
