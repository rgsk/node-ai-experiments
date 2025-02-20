import axios from "axios";
import { JSDOM } from "jsdom";
import getGoogleDocData from "lib/gcp/getGoogleDocData";
import getGoogleSheetData from "lib/gcp/getGoogleSheetData";
import pdf from "pdf-parse";

// Function to determine if the URL is a PDF, ignoring query parameters and fragments
const isPDF = (url: string): boolean => {
  try {
    // Use the URL constructor to parse the URL and extract the pathname
    const parsedUrl = new URL(url);

    // Check if the pathname ends with ".pdf"
    return parsedUrl.pathname.endsWith(".pdf");
  } catch (error) {
    throw new Error(`nvalid URL provided: ${error}`);
  }
};

// Function to fetch and extract text from a webpage
const fetchWebPage = async (url: string): Promise<string> => {
  try {
    // Fetch the HTML content of the page
    const response = await axios.get(url);
    const html = response.data;

    // Load the HTML into jsdom
    const dom = new JSDOM(html);
    // Get the page title
    const pageTitle = dom.window.document.title;

    // Extract the text content of the body (similar to innerText)
    const pageText = dom.window.document.body.textContent?.trim() || "";

    return `Page Title: ${pageTitle}\nPage Content: ${pageText}`;
  } catch (error) {
    throw new Error(`Failed to fetch webpage content: ${error}`);
  }
};

// Function to fetch and extract text from a PDF
const fetchPDF = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const pdfBuffer = response.data;

    // Parse the PDF content
    const data = await pdf(pdfBuffer);
    return data.text; // Extract the text from the PDF
  } catch (error) {
    throw new Error(`Failed to fetch PDF content: ${error}`);
  }
};

function checkIsGoogleDoc(url: string): boolean {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);

    // Check if the host belongs to Google Docs and the URL pattern matches a document URL
    const isGoogleDocsHost = parsedUrl.hostname === "docs.google.com";
    const isDocumentPath = parsedUrl.pathname.startsWith("/document/d/");

    return isGoogleDocsHost && isDocumentPath;
  } catch (error) {
    // If URL parsing fails, return false
    return false;
  }
}

function checkIsGoogleSheet(url: string): boolean {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);

    // Check if the host belongs to Google Sheets and the URL pattern matches a sheet URL
    const isGoogleSheetsHost = parsedUrl.hostname === "docs.google.com";
    const isSpreadsheetPath = parsedUrl.pathname.startsWith("/spreadsheets/d/");

    return isGoogleSheetsHost && isSpreadsheetPath;
  } catch (error) {
    // If URL parsing fails, return false
    return false;
  }
}

function extractGoogleDocId(url: string): string | null {
  try {
    // Create a URL object
    const urlObj = new URL(url);

    // Check if the URL path matches the Google Docs format
    if (
      urlObj.hostname === "docs.google.com" &&
      urlObj.pathname.startsWith("/document/d/")
    ) {
      // Extract the document ID, which is the part after "/document/d/" and before the next "/"
      const parts = urlObj.pathname.split("/");

      // The ID is usually the fourth part in the path: "/document/d/{documentId}"
      return parts[3] || null;
    }

    return null;
  } catch (error) {
    // Return null if parsing fails
    return null;
  }
}
function extractGoogleSheetId(url: string): string | null {
  try {
    // Create a URL object
    const urlObj = new URL(url);

    // Check if the URL path matches the Google Sheets format
    if (
      urlObj.hostname === "docs.google.com" &&
      urlObj.pathname.startsWith("/spreadsheets/d/")
    ) {
      // Extract the spreadsheet ID, which is the part after "/spreadsheets/d/" and before the next "/"
      const parts = urlObj.pathname.split("/");

      // The ID is usually the fourth part in the path: "/spreadsheets/d/{spreadsheetId}"
      return parts[3] || null;
    }

    return null;
  } catch (error) {
    // Return null if parsing fails
    return null;
  }
}

const fetchGoogleDoc = async (url: string) => {
  const documentId = extractGoogleDocId(url);
  if (documentId) {
    return getGoogleDocData({ documentId });
  }
};
const fetchGoogleSheet = async (url: string) => {
  const sheetId = extractGoogleSheetId(url);
  if (sheetId) {
    const response = await axios.get(url);
    const html = response.data;

    // Load the HTML into jsdom
    const dom = new JSDOM(html);
    // Get the page title
    const pageTitle = dom.window.document.title;
    const content = await getGoogleSheetData({
      spreadsheetId: sheetId,
    });
    return `Page Title: ${pageTitle}\nPage Content:\n${content}`;
  }
};
export type UrlContentType = "pdf" | "google_doc" | "google_sheet" | "web_page";
export const getUrlContentType = (url: string): UrlContentType => {
  if (isPDF(url)) return "pdf";
  if (checkIsGoogleDoc(url)) return "google_doc";
  if (checkIsGoogleSheet(url)) return "google_sheet";
  return "web_page";
};
// Main function to fetch content based on file type
const getUrlContent = async (url: string) => {
  let output: string;
  const contentType = getUrlContentType(url);
  try {
    const content = await (contentType === "pdf"
      ? fetchPDF(url)
      : contentType === "google_doc"
      ? fetchGoogleDoc(url)
      : contentType === "google_sheet"
      ? fetchGoogleSheet(url)
      : fetchWebPage(url));

    if (content) {
      output = content;
    } else {
      output = "An error occurred while fetching the URL contents.";
    }
  } catch (err: any) {
    if (err.status === 401 || err.status === 403) {
      if (contentType === "google_doc") {
        output = `Unauthorized to access the Google Doc in given URL, make it "Public" by setting the "General Access" to "Anyone with the link" and try again.`;
      } else if (contentType === "google_sheet") {
        output = `Unauthorized to access the Google Sheet in given URL, make it "Public" by setting the "General Access" to "Anyone with the link" and try again.`;
      } else {
        // this won't happen most likely
        output = "Unauthorized to access the current page";
      }
    } else {
      output = "An error occurred while fetching the URL contents.";
    }
  }
  return output;
};

export default getUrlContent;
