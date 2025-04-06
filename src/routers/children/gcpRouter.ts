import { Router } from "express";
import { z } from "zod";
import getGoogleDocData from "../../lib/gcp/getGoogleDocData.js";
import getGoogleSheetData from "../../lib/gcp/getGoogleSheetData.js";
import updateGoogleSheet from "../../lib/gcp/updateGoogleSheet.js";
const gcpRouter = Router();
const googleDocQuerySchema = z.object({
  documentId: z.string(),
});
gcpRouter.get("/google-doc", async (req, res, next) => {
  try {
    const { documentId } = googleDocQuerySchema.parse(req.query);
    const output = await getGoogleDocData({ documentId });
    return res.json({ output });
  } catch (err) {
    return next(err);
  }
});
const googleSheetQuerySchema = z.object({
  spreadsheetId: z.string(),
  range: z.string().optional(),
});
gcpRouter.get("/google-sheet", async (req, res, next) => {
  try {
    const { spreadsheetId, range } = googleSheetQuerySchema.parse(req.query);
    const result = await getGoogleSheetData({
      spreadsheetId,
      range,
      type: "string",
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

gcpRouter.get("/google-sheet/raw", async (req, res, next) => {
  try {
    const { spreadsheetId, range } = googleSheetQuerySchema.parse(req.query);
    const result = await getGoogleSheetData({
      spreadsheetId,
      range,
      type: "raw",
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
gcpRouter.get("/google-sheet/csv", async (req, res, next) => {
  try {
    const { spreadsheetId, range } = googleSheetQuerySchema.parse(req.query);
    const result = await getGoogleSheetData({
      spreadsheetId,
      range,
      type: "csv",
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

const updateGoogleSheetBodySchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  values: z.any(),
});

gcpRouter.patch("/google-sheet", async (req, res, next) => {
  try {
    const { spreadsheetId, range, values } = updateGoogleSheetBodySchema.parse(
      req.body
    );
    const data = await updateGoogleSheet({
      spreadsheetId,
      range,
      values,
    });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

export default gcpRouter;
