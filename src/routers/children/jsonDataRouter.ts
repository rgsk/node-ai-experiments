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
      const { key } = zodSchemaKey.parse(req.query);
      const jsonDataArray = await jsonDataService.findByKeyLike(
        getPopulatedKey(key, userEmail)
      );
      return res.json(jsonDataArray);
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

export default jsonDataRouter;
