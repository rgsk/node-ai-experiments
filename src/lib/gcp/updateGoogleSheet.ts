import { google } from "googleapis";
import getGoogleAuth from "./getGoogleAuth";

const updateGoogleSheet = async ({
  spreadsheetId,
  range,
  values,
}: {
  spreadsheetId: string;
  range: string;
  values: any[][];
}) => {
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const result = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: values,
    },
  });
  return result.data;
};

export default updateGoogleSheet;
