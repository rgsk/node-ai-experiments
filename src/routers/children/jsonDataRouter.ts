import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { getProps } from "../../lib/middlewareProps.js";
import checkAdminOperation from "../../middlewares/checkAdminOperation.js";
import { Middlewares } from "../../middlewares/middlewaresNamespace.js";
import { jsonDataService } from "./jsonDataService.js";

const jsonDataRouter = Router();

// Zod schema for validating a single key-value pair
const zodSchemaKey = z.object({
  key: z.string(),
});

// Zod schema for validating bulk key-value pairs
const zodSchemaBulk = z.object({
  data: z.array(
    z.object({
      key: z.string(),
      value: z.any(),
      version: z.string().optional(),
      expireAt: z.string().datetime().optional(), // Optional ISO date string
    })
  ),
});

export const getPopulatedKey = (key: string, userEmail: string) => {
  return key.replace("$userEmail", userEmail);
};
// Route to fetch a single record by key
jsonDataRouter.get(
  "/",
  checkAdminOperation({ keySource: "query", operationType: "read" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const { key } = zodSchemaKey.parse(req.query);
      const jsonData = await jsonDataService.findByKey(
        getPopulatedKey(key, userEmail)
      );
      return res.json(jsonData);
    } catch (err) {
      next(err);
    }
  }
);

const keyLikeSchema = z.object({
  key: z.string(),
  page: z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val, 10) : val),
    z.number().int().min(1).optional()
  ),
  perPage: z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val, 10) : val),
    z.number().int().min(1).optional()
  ),
});

// Route to fetch records where the key matches a pattern
jsonDataRouter.get(
  "/key-like",
  checkAdminOperation({ keySource: "query", operationType: "read" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const { key, page, perPage } = keyLikeSchema.parse(req.query);
      const result = await jsonDataService.findByKeyLike({
        key: getPopulatedKey(key, userEmail),
        page,
        perPage,
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
const selectedIdsSchema = z
  .preprocess((val) => {
    if (typeof val === "string") return [val]; // wrap single string in array
    return val; // otherwise leave it as is
  }, z.string().array())
  .optional();

const dateSheetsKeyLikeSchema = keyLikeSchema.extend({
  searchTerm: z.string().optional(),
  classValue: z.string().optional(),
  sessionValue: z.string().optional(),
  termValue: z.string().optional(),
  selectedIds: selectedIdsSchema,
});

jsonDataRouter.get(
  "/key-like/date-sheets",
  checkAdminOperation({ keySource: "query", operationType: "read" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const {
        key,
        page,
        perPage,
        searchTerm,
        classValue,
        sessionValue,
        termValue,
        selectedIds,
      } = dateSheetsKeyLikeSchema.parse(req.query);

      const result = await jsonDataService.findByKeyLike({
        key: getPopulatedKey(key, userEmail),
        page,
        perPage,
        valueFilters: Prisma.sql`
          ${
            searchTerm
              ? Prisma.sql`AND (
      "value"->>'id' = ${searchTerm}
    )`
              : Prisma.sql``
          }
            ${
              !!selectedIds && selectedIds.length > 0
                ? Prisma.sql`AND "value"->>'id' IN (${Prisma.join(
                    selectedIds
                  )})`
                : Prisma.sql``
            }
          ${
            classValue
              ? Prisma.sql`AND "value"->>'Class' = ${classValue}`
              : Prisma.sql``
          }
         
          ${
            sessionValue
              ? Prisma.sql`AND "value"->>'Session' = ${sessionValue}`
              : Prisma.sql``
          }
          ${
            termValue
              ? Prisma.sql`AND "value"->>'Term' = ${termValue}`
              : Prisma.sql``
          }
         
        `,
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

const studentsKeyLikeSchema = keyLikeSchema.extend({
  searchTerm: z.string().optional(),
  classValue: z.string().optional(),
  sectionValue: z.string().optional(),
  selectedIds: selectedIdsSchema,
});

jsonDataRouter.get(
  "/key-like/students",
  checkAdminOperation({ keySource: "query", operationType: "read" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const {
        key,
        page,
        perPage,
        searchTerm,
        classValue,
        sectionValue,
        selectedIds,
      } = studentsKeyLikeSchema.parse(req.query);

      const result = await jsonDataService.findByKeyLike({
        key: getPopulatedKey(key, userEmail),
        page,
        perPage,
        orderBy: Prisma.sql`"value"->>'Student Name' ASC`,
        valueFilters: Prisma.sql`
          ${
            searchTerm
              ? Prisma.sql`AND (
      "value"->>'Student Name' ILIKE ${"%" + searchTerm + "%"}
      OR "value"->>'Regn. No.' = ${searchTerm}
      OR "value"->>'id' = ${searchTerm}
    )`
              : Prisma.sql``
          }
           ${
             !!selectedIds && selectedIds.length > 0
               ? Prisma.sql`AND "value"->>'id' IN (${Prisma.join(selectedIds)})`
               : Prisma.sql``
           }
          ${
            classValue
              ? Prisma.sql`AND "value"->>'Class' = ${classValue}`
              : Prisma.sql``
          }
         
          ${
            sectionValue
              ? Prisma.sql`AND "value"->>'Section' = ${sectionValue}`
              : Prisma.sql``
          }
         
        `,
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

const reportCardsKeyLikeSchema = keyLikeSchema.extend({
  selectedIds: selectedIdsSchema,
  searchTerm: z.string().optional(),
  classValue: z.string().optional(),
  termValue: z.string().optional(),
  academicSessionValue: z.string().optional(),
  sectionValue: z.string().optional(),
  createdBy: z.string().optional(),
});

jsonDataRouter.get(
  "/key-like/report-cards",
  checkAdminOperation({ keySource: "query", operationType: "read" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const {
        key,
        page,
        perPage,
        searchTerm,
        classValue,
        termValue,
        sectionValue,
        createdBy,
        academicSessionValue,
        selectedIds,
      } = reportCardsKeyLikeSchema.parse(req.query);

      let studentIds: string[] | undefined;
      if (searchTerm || classValue || sectionValue) {
        const studentsResult = await jsonDataService.findByKeyLike({
          key: getPopulatedKey(key, userEmail).replace(
            "reportCards",
            "students"
          ),
          valueFilters: Prisma.sql`
          ${
            searchTerm
              ? Prisma.sql`AND (
      "value"->>'Student Name' ILIKE ${"%" + searchTerm + "%"}
      OR "value"->>'Regn. No.' = ${searchTerm}
      OR "value"->>'id' = ${searchTerm}
    )`
              : Prisma.sql``
          }
          ${
            !!selectedIds && selectedIds.length > 0
              ? Prisma.sql`AND "value"->>'id' IN (${Prisma.join(selectedIds)})`
              : Prisma.sql``
          }
          ${
            classValue
              ? Prisma.sql`AND "value"->>'Class' = ${classValue}`
              : Prisma.sql``
          }
          ${
            sectionValue
              ? Prisma.sql`AND "value"->>'Section' = ${sectionValue}`
              : Prisma.sql``
          }
        `,
        });
        studentIds = studentsResult.data.map(({ value }) => (value as any).id);
      }

      const result = await jsonDataService.findByKeyLike({
        key: getPopulatedKey(key, userEmail),
        page,
        perPage,
        valueFilters: Prisma.sql`
          ${
            studentIds
              ? Prisma.sql`AND (
      ${
        studentIds.length > 0
          ? Prisma.sql`"value"->>'studentId' IN (${Prisma.join(studentIds)})`
          : Prisma.sql`FALSE`
      }
      ${
        searchTerm
          ? Prisma.sql`OR "value"->>'id' = ${searchTerm}`
          : Prisma.sql``
      }
    )`
              : Prisma.sql``
          }
          ${
            termValue
              ? Prisma.sql`AND "value"->>'Term' = ${termValue}`
              : Prisma.sql``
          }
          ${
            academicSessionValue
              ? Prisma.sql`AND "value"->>'Academic Session' = ${academicSessionValue}`
              : Prisma.sql``
          }
          ${
            createdBy
              ? Prisma.sql`AND "value"->>'createdBy' = ${createdBy}`
              : Prisma.sql``
          }
        `,
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

const rowNumberSchema = z.object({
  key: z.string(),
  keyLike: z.string(),
});
jsonDataRouter.get(
  "/row-number",
  checkAdminOperation({ keySource: "query", operationType: "read" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const { key, keyLike } = rowNumberSchema.parse(req.query);
      const result = await jsonDataService.getRowNumber({
        key: getPopulatedKey(key, userEmail),
        keyLike: getPopulatedKey(keyLike, userEmail),
      });
      return res.json({ rowNumber: result });
    } catch (err) {
      next(err);
    }
  }
);

// Route to create or update a single record
jsonDataRouter.post(
  "/",
  checkAdminOperation({ keySource: "body", operationType: "write" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const { key, value, version, expireAt } = req.body;
      const jsonData = await jsonDataService.createOrUpdate({
        key: getPopulatedKey(key, userEmail),
        value,
        version,
        expireAt: expireAt ? new Date(expireAt) : undefined,
      });
      return res.json(jsonData);
    } catch (err) {
      next(err);
    }
  }
);

// Route for bulk insert of key-value pairs
jsonDataRouter.post(
  "/bulk",
  checkAdminOperation({
    keySource: "body",
    operationType: "write",
    bulk: true,
  }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const { data } = zodSchemaBulk.parse(req.body);

      // Map and ensure correct date format for `expireAt` field
      const formattedData = data.map((item) => ({
        ...item,
        key: getPopulatedKey(item.key, userEmail),
        value: item.value!,
        expireAt: item.expireAt ? new Date(item.expireAt) : undefined,
      }));

      const result = await jsonDataService.createMany(formattedData);
      return res.json({
        message: "Bulk insert successful",
        insertedCount: result.count,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Route to delete a record by key
jsonDataRouter.delete(
  "/",
  checkAdminOperation({ keySource: "query", operationType: "write" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const { key } = zodSchemaKey.parse(req.query);
      const jsonData = await jsonDataService.deleteByKey(
        getPopulatedKey(key, userEmail)
      );
      return res.json(jsonData);
    } catch (err) {
      next(err);
    }
  }
);

// Route to delete records where the key matches a pattern
jsonDataRouter.delete(
  "/key-like",
  checkAdminOperation({ keySource: "query", operationType: "write" }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const { key } = zodSchemaKey.parse(req.query);
      const deletedCount = await jsonDataService.deleteByKeyLike(
        getPopulatedKey(key, userEmail)
      );
      return res.json({ deletedCount });
    } catch (err) {
      next(err);
    }
  }
);

const deleteKeysSchema = z.object({
  keys: z.string().array(),
});

jsonDataRouter.delete(
  "/keys",
  checkAdminOperation({
    keySource: "body",
    operationType: "write",
    bulk: true,
    getKeys: (req) => {
      const { keys } = deleteKeysSchema.parse(req.body);
      return keys;
    },
  }),
  async (req, res, next) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const { keys } = deleteKeysSchema.parse(req.body);
      const { count } = await jsonDataService.deleteKeys(
        keys.map((key) => getPopulatedKey(key, userEmail))
      );
      return res.json({ deletedCount: count });
    } catch (err) {
      next(err);
    }
  }
);

export default jsonDataRouter;
