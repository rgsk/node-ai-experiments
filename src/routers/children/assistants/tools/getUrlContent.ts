import axios from "axios";
import { JSDOM } from "jsdom";
import tesseract from "node-tesseract-ocr";
// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse.js";
import { YoutubeTranscript } from "youtube-transcript";
import getGoogleDocData from "../../../../lib/gcp/getGoogleDocData.js";
import getGoogleSheetData from "../../../../lib/gcp/getGoogleSheetData.js";
import { UrlContentType } from "../../../../lib/mcpServer.js";
import openAIClient from "../../../../lib/openAIClient.js";
import pythonRunner from "../../../../lib/pythonRunner.js";
import { extractVideoId } from "../../youtubeRouter.js";

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

function isImageUrl(url: string): boolean {
  // Define common image file extensions.
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  // Convert the URL to lowercase to ensure the check is case-insensitive.
  const lowerUrl = url.split("?")[0].toLowerCase();

  // Check if the URL ends with any of the defined image extensions.
  return imageExtensions.some((extension) => lowerUrl.endsWith(extension));
}
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",

  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
};

// Function to fetch and extract text from a webpage
const fetchWebPage = async (url: string) => {
  try {
    const { data } = await axios.get(url as string, {
      headers: headers,
    });
    const output = await pythonRunner.runCode(`
from bs4 import BeautifulSoup
soup = BeautifulSoup(${JSON.stringify(data)}, 'html.parser')
title = soup.title.string.strip() if soup.title else "No Title Found"
# Extract description from meta tag
description = soup.find("meta", attrs={"name": "description"})
description = description["content"].strip(
) if description and "content" in description.attrs else "No Description Found"

# Extract all Open Graph tags
og_tags = {}
for meta in soup.find_all("meta"):
    if meta.get("property", "").startswith("og:"):
        og_tags[meta["property"].replace("og:", "")] = meta["content"].strip(
        ) if "content" in meta.attrs else ""

# Extract text content
content = soup.get_text(separator=' ', strip=True)

print({
    "title": title,
    "description": description,
    "og": og_tags,
    "content": content,
})
        `);
    return output;
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

// New helper function to check if the URL points to a CSV file
function isCSVUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.endsWith(".csv");
  } catch (error) {
    throw new Error(`Invalid URL provided: ${error}`);
  }
}

// New function to fetch CSV content
const fetchCSV = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url, { responseType: "text" });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch CSV content: ${error}`);
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

function checkIsYoutubeVideo(url: string): boolean {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);

    // Check if the host belongs to YouTube
    const isYouTubeHost = parsedUrl.hostname === "www.youtube.com";
    // Check if there's a video ID in the "v" query param
    const hasVideoId = parsedUrl.searchParams.has("v");

    return isYouTubeHost && hasVideoId;
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
const getPageTitle = async (url: string) => {
  const response = await axios.get(url);
  const html = response.data;

  // Load the HTML into jsdom
  const dom = new JSDOM(html);
  // Get the page title
  const pageTitle = dom.window.document.title;
  return pageTitle;
};
const fetchGoogleSheet = async (url: string) => {
  const sheetId = extractGoogleSheetId(url);
  if (sheetId) {
    const pageTitle = await getPageTitle(url);
    const content = await getGoogleSheetData({
      spreadsheetId: sheetId,
    });
    return `Page Title: ${pageTitle}\nPage Content:\n${content}`;
  }
};
const fetchYoutubeTranscript = async (url: string) => {
  const videoId = extractVideoId(url);
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const lines = transcript.map((i) => `${i.offset}-${i.text}`);
  const content = lines.join("");
  const pageTitle = await getPageTitle(url);
  return `Youtube Video Title: ${pageTitle}\nTranscript:\n${content}`;
};
const getImageDescription = async (imageUrl: string) => {
  const response = await openAIClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe what's present in this image, you don't need to identify individuals, just describe what's present",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
  });
  return response.choices[0].message.content;
};
const fetchImage = async (url: string) => {
  const [imageModelOutput, imageOCROutput] = await Promise.all([
    getImageDescription(url),
    tesseract.recognize(url),
  ]);

  return JSON.stringify({ imageModelOutput, imageOCROutput });
};

export const getUrlContentType = (url: string): UrlContentType => {
  if (isPDF(url)) return "pdf";
  if (isImageUrl(url)) return "image";
  if (checkIsYoutubeVideo(url)) return "youtube_video";
  if (checkIsGoogleDoc(url)) return "google_doc";
  if (checkIsGoogleSheet(url)) return "google_sheet";
  if (isCSVUrl(url)) return "csv";
  return "web_page";
};
// Main function to fetch content based on file type
const getUrlContent = async (url: string, type?: UrlContentType) => {
  let output: string;
  const contentType = type ?? getUrlContentType(url);
  try {
    const content = await (contentType === "pdf"
      ? fetchPDF(url)
      : contentType === "google_doc"
      ? fetchGoogleDoc(url)
      : contentType === "google_sheet"
      ? fetchGoogleSheet(url)
      : contentType === "youtube_video"
      ? fetchYoutubeTranscript(url)
      : contentType === "image"
      ? fetchImage(url)
      : contentType === "csv"
      ? fetchCSV(url)
      : fetchWebPage(url));

    if (content) {
      output = content;
    } else {
      throw new Error("An error occurred while fetching the URL contents.");
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
      throw err;
    }
  }
  return output;
};

export default getUrlContent;
