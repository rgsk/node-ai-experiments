import { google } from "googleapis";
import { uploadFileToS3 } from "../s3Utils.js";
import { getCsvFile } from "../utils.js";
import getGoogleAuth from "./getGoogleAuth.js";
const getSheetDetails = async ({
  spreadsheetId,
  auth,
}: {
  spreadsheetId: string;
  auth: any;
}) => {
  // Fetch spreadsheet metadata to get sheet names
  const spreadsheetMeta = await google.sheets("v4").spreadsheets.get({
    spreadsheetId: spreadsheetId,
    auth: auth,
  });
  const title = spreadsheetMeta.data.properties?.title;
  const sheetNames = spreadsheetMeta.data.sheets?.map(
    (s) => s.properties?.title
  );
  return { title, sheetNames };
};

const getGoogleSheetData = async ({
  spreadsheetId,
  range,
  type = "string",
}: {
  spreadsheetId: string;
  range?: string;
  type?: "string" | "raw" | "csv";
}) => {
  const auth = await getGoogleAuth();
  const sheetDetails = await getSheetDetails({ spreadsheetId, auth });
  const finalRange = range || sheetDetails.sheetNames?.[0];
  if (!finalRange) {
    throw new Error("finalRange could not be determined");
  }
  const result = await google.sheets("v4").spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: finalRange,
    auth: auth,
  });

  if (type === "raw") {
    return { sheetDetails, data: result.data };
  }
  const tab = finalRange;
  const content = result.data.values!.reduce((str: string, row: string[]) => {
    return `${str}${row.join(", ")}\n`;
  }, "");
  if (type === "csv") {
    const csvFile = getCsvFile({
      csvContent: content,
      filename: `${sheetDetails.title}-${tab}.csv`,
    });
    const csvUrl = await uploadFileToS3(csvFile);
    return { sheetDetails, url: csvUrl };
  }
  // const title = result.data.range;

  const output = `Tab: ${tab}\nContent:\n${content}`;
  return { sheetDetails, output };
};

export default getGoogleSheetData;
