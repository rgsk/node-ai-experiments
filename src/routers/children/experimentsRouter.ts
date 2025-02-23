import axios from "axios";
import * as cheerio from "cheerio";
import { exec } from "child_process";
import { Router } from "express";
import fs from "fs";
import { JSDOM } from "jsdom";
import environmentVars from "lib/environmentVars";
import { upload } from "lib/upload";
import tesseract from "node-tesseract-ocr";
import ogs from "open-graph-scraper";
import path from "path";
import puppeteer from "puppeteer";
import { z } from "zod";
import getUrlContent from "./assistants/tools/getUrlContent";

const experimentsRouter = Router();
// Endpoint to execute Python code
type SupportedLangugages =
  | "node"
  | "javascript"
  | "python"
  | "typescript"
  | "cpp";
experimentsRouter.post("/execute-code", async (req, res, next) => {
  try {
    const { code, language } = req.body as {
      code: string;
      language: SupportedLangugages;
    };
    const languageToRunners: Record<SupportedLangugages, string> = {
      node: "node-runner",
      javascript: "node-runner",
      python: "python-runner",
      typescript: "node-runner",
      cpp: "cpp-runner",
    };
    const fileExtensions: Record<SupportedLangugages, string> = {
      node: ".js",
      javascript: ".js",
      python: ".py",
      typescript: ".ts",
      cpp: ".cpp",
    };
    const mountPath = path.join(
      environmentVars.HOST_DIR,
      "code-runners",
      languageToRunners[language]
    );
    const tempFileName = `temp${fileExtensions[language]}`;
    // Ensure the "src" directory exists
    const srcPath = path.join(
      "code-runners",
      languageToRunners[language],
      "src"
    );
    if (!fs.existsSync(srcPath)) {
      fs.mkdirSync(srcPath, { recursive: true });
    }

    const tempFileLocalPath = path.join(srcPath, tempFileName);
    const executableFileName = "temp";
    const executableFileLocalPath = path.join(srcPath, executableFileName);

    fs.writeFileSync(tempFileLocalPath, code);

    const languageToCommands: Record<SupportedLangugages, string> = {
      node: `node /app/src/${tempFileName}`,
      javascript: `node /app/src/${tempFileName}`,
      python: `python /app/src/${tempFileName}`,
      typescript: `yarn --silent run:file /app/src/${tempFileName}`,
      cpp: `bash -c "g++ -o /app/src/${executableFileName} /app/src/${tempFileName} && /app/src/${executableFileName}"`,
    };
    // Command to run the Anaconda Docker container and execute the Python script
    const dockerCommand = `docker run --rm -v ${mountPath}:/app ${languageToRunners[language]} ${languageToCommands[language]}`;

    // Execute the Docker command
    exec(dockerCommand, (error, stdout, stderr) => {
      // Delete the temporary Python file
      fs.unlinkSync(tempFileLocalPath);

      if (fs.existsSync(executableFileLocalPath)) {
        fs.unlinkSync(executableFileLocalPath);
      }

      if (error) {
        return res.status(500).json({ error: stderr || error.message });
      }

      // Return the output
      return res.json({ output: stdout });
    });
  } catch (err) {
    return next(err);
  }
});
const ocrSchema = z.object({
  imageUrl: z.string(),
});
experimentsRouter.get("/ocr", async (req, res, next) => {
  try {
    const { imageUrl } = ocrSchema.parse(req.query);
    const text = await tesseract.recognize(imageUrl);
    return res.json({
      text,
    });
  } catch (err) {
    return next(err);
  }
});
experimentsRouter.post(
  "/ocr/file",
  upload.single("file") as any,
  async (req, res, next) => {
    try {
      if (!req.file) throw new Error("No file uploaded");
      const file = req.file;
      const text = await tesseract.recognize(file.path);
      return res.json({
        text,
      });
    } catch (err) {
      return next(err);
    } finally {
      if (req.file?.path) fs.unlinkSync(req.file?.path);
    }
  }
);

const UrlContentTypeEnum = z.enum([
  "pdf",
  "google_doc",
  "google_sheet",
  "web_page",
  "youtube_video",
  "image",
]);

export type UrlContentType = z.infer<typeof UrlContentTypeEnum>;

const urlContentSchema = z.object({
  url: z.string(),
  type: UrlContentTypeEnum.optional(),
});

experimentsRouter.get("/url-content", async (req, res, next) => {
  try {
    const { url, type } = urlContentSchema.parse(req.query);
    const content = await getUrlContent(url, type);
    return res.send(content);
  } catch (err) {
    return next(err);
  }
});

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

experimentsRouter.get("/meta", async (req, res, next) => {
  const { url } = req.query;
  try {
    const { data } = await axios.get(url as string, {
      headers: {
        "User-Agent": userAgent,
      },
    });
    const $ = cheerio.load(data);
    const dom = new JSDOM(data);
    const bodyTextContent = dom.window.document.body.textContent?.trim() || "";

    const meta = {
      title:
        $('meta[property="og:title"]').attr("content") || $("title").text(),
      description: $('meta[property="og:description"]').attr("content") || "",
      image: $('meta[property="og:image"]').attr("content") || "",
      url: $('meta[property="og:url"]').attr("content") || url,
      bodyTextContent,
    };
    return res.json(meta);
  } catch (err) {
    return next(err);
  }
});

async function fetchMetadataUsingPuppeteer(url: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent(userAgent);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const meta = await page.evaluate(() => {
    return {
      title:
        // @ts-ignore
        document.querySelector('meta[property="og:title"]')?.content ||
        document.title,
      description:
        // @ts-ignore
        document.querySelector('meta[property="og:description"]')?.content ||
        "",
      // @ts-ignore
      image: document.querySelector('meta[property="og:image"]')?.content || "",
      url:
        // @ts-ignore
        document.querySelector('meta[property="og:url"]')?.content ||
        window.location.href,
    };
  });

  await browser.close();
  return meta;
}

experimentsRouter.get("/scrape-meta", async (req, res, next) => {
  const { url } = req.query as { url: string };
  try {
    const meta = await fetchMetadataUsingPuppeteer(url);
    return res.json(meta);
  } catch (err) {
    return next(err);
  }
});

// Route to execute the script
experimentsRouter.get("/command", (req, res) => {
  const { url } = req.query;

  // Validate URL input
  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  // Path to the Bash script
  const scriptPath = "commands/extract_metadata.sh";
  // Run the script with the provided URL as an argument
  exec(`${scriptPath} "${url}"`, (error, stdout, stderr) => {
    if (error) {
      console.error("Error executing script:", error);
      return res.status(500).json({ error: "Failed to execute script" });
    }

    if (stderr) {
      console.error("Script stderr:", stderr);
      return res
        .status(500)
        .json({ error: "Error in script execution", stderr });
    }

    // Send the script output as JSON
    try {
      const metadata = JSON.parse(stdout);
      return res.json(metadata);
    } catch (parseError) {
      console.error("Error parsing script output:", parseError);
      return res.status(500).json({ error: "Failed to parse script output" });
    }
  });
});

experimentsRouter.get("/ogs", async (req, res, next) => {
  const { url } = req.query;
  try {
    const data = await ogs({
      url: url as string,
      fetchOptions: {
        headers: { "user-agent": userAgent },
      },
    });

    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

export default experimentsRouter;
