import { google } from "googleapis";
import getGoogleAuth from "./getGoogleAuth.js";
const getFirstTabName = async ({
  spreadsheetId,
  auth,
}: {
  spreadsheetId: string;
  auth: any;
}) => {
  try {
    // Fetch spreadsheet metadata to get sheet names
    const spreadsheetMeta = await google.sheets("v4").spreadsheets.get({
      spreadsheetId: spreadsheetId,
      auth: auth,
    });
    if (spreadsheetMeta && spreadsheetMeta.data.sheets) {
      // Extract the first sheet name
      const firstSheet = spreadsheetMeta.data.sheets[0]; // The first sheet in the spreadsheet
      if (firstSheet.properties) {
        const firstSheetName = firstSheet.properties.title; // Extract the title (name) of the sheet
        if (firstSheetName == null) return undefined;
        return firstSheetName;
      }
    }
  } catch (error) {
    console.error("Error fetching spreadsheet metadata:", error);
    throw error;
  }
};

const getGoogleSheetData = async ({
  spreadsheetId,
  range,
  stringify = true,
}: {
  spreadsheetId: string;
  range?: string;
  stringify?: boolean;
}) => {
  const auth = await getGoogleAuth();
  const finalRange = range || (await getFirstTabName({ spreadsheetId, auth }));
  const result = await google.sheets("v4").spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: finalRange,
    auth: auth,
  });
  if (stringify) {
    // const title = result.data.range;
    const tab = finalRange;
    const content = result.data.values!.reduce((str: string, row: string[]) => {
      return `${str}${row.join(", ")}\n`;
    }, "");
    const output = `Tab: ${tab}\nContent:\n${content}`;
    return output;
  } else {
    return result.data;
  }
};

export default getGoogleSheetData;
