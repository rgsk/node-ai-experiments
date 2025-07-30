import axios from "axios";
import * as cheerio from "cheerio";
import { exec } from "child_process";
import { Router } from "express";
import fs from "fs";
import { JSDOM } from "jsdom";
import tesseract from "node-tesseract-ocr";
import ogs from "open-graph-scraper";
import path from "path";
import puppeteer from "puppeteer";
import { v4 } from "uuid";
import { z } from "zod";
import environmentVars from "../../lib/environmentVars.js";
import { UrlContentTypeEnum } from "../../lib/mcpServer.js";
import pythonRunner from "../../lib/pythonRunner.js";
import { upload } from "../../lib/upload.js";
import executeCode, {
  executeCodeSchema,
} from "./assistants/tools/executeCode.js";
import getUrlContent, {
  fetchWebsiteMeta,
} from "./assistants/tools/getUrlContent.js";
const experimentsRouter = Router();
experimentsRouter.get("/", async (req, res, next) => {
  try {
    return res.json({
      message: `Experiments Server is running on http://localhost:${environmentVars.PORT}`,
    });
  } catch (err) {
    return next(err);
  }
});
// Endpoint to execute Python code
experimentsRouter.get("/test-error", async (req, res, next) => {
  try {
    throw new Error("this is again a new error");
  } catch (err) {
    return next(err);
  }
});

const executeCodeBodySchema = z.object(executeCodeSchema);
experimentsRouter.post("/execute-code", async (req, res, next) => {
  try {
    const { code, language } = executeCodeBodySchema.parse(req.body);
    if (language === "unknown") {
      throw new Error("This programming language is not supported");
    }
    const result = await executeCode({ code, language });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

experimentsRouter.post("/execute-latex", async (req, res, next) => {
  try {
    // Retrieve LaTeX code from the request body
    const latexCode = req.body.code;
    // return res.json({ message: "" });
    if (!latexCode) {
      return res.status(400).json({ error: "No LaTeX code provided" });
    }

    // Create a unique base name for temporary files
    const uniqueBase = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const tempDir = "temp";
    const tempTexFile = path.join(tempDir, uniqueBase + ".tex");
    const tempPdfFile = path.join(tempDir, uniqueBase + ".pdf");

    // Write the LaTeX code to the temporary .tex file
    await fs.promises.writeFile(tempTexFile, latexCode, "utf8");

    // Build the pdflatex command.
    // -interaction=nonstopmode ensures that the process does not hang waiting for user input.
    // -output-directory directs output (including the PDF) to the temp directory.
    const command = `pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${tempTexFile}`;

    // Execute the pdflatex command
    exec(command, async (error, stdout, stderr) => {
      // Clean up the temporary .tex file
      fs.unlink(tempTexFile, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Error deleting temporary .tex file:", unlinkErr);
        }
      });

      if (error) {
        // If an error occurred, pass it along to the error handling middleware
        return next(new Error(stderr || error.message));
      }

      try {
        // Read the generated PDF file
        const pdfData = await fs.promises.readFile(tempPdfFile);

        // Set appropriate headers to return the PDF
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="output.pdf"'
        );

        // Clean up the temporary .pdf file after reading
        fs.unlink(tempPdfFile, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting temporary .pdf file:", unlinkErr);
          }
        });
        fs.unlink(tempPdfFile.replace(".pdf", ".aux"), (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting temporary .aux file:", unlinkErr);
          }
        });
        fs.unlink(tempPdfFile.replace(".pdf", ".log"), (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting temporary .log file:", unlinkErr);
          }
        });

        return res.send(pdfData);
      } catch (readErr) {
        return next(readErr);
      }
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

const urlContentSchema = z.object({
  url: z.string(),
  type: UrlContentTypeEnum.optional(),
});

experimentsRouter.get("/url-content", async (req, res, next) => {
  try {
    const { url, type } = urlContentSchema.parse(req.query);
    const content = await getUrlContent({ url, collectionName: v4(), type });
    return res.send(content);
  } catch (err) {
    return next(err);
  }
});

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

experimentsRouter.get("/meta-old", async (req, res, next) => {
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

experimentsRouter.get("/meta", async (req, res, next) => {
  const { url } = req.query;
  try {
    const result = await fetchWebsiteMeta(url as string);
    return res.json(result);
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
const fileDownloadUrlSchema = z.object({
  url: z.string(),
  filename: z.string(),
});
experimentsRouter.get("/file-download-url", async (req, res, next) => {
  try {
    const { url, filename } = fileDownloadUrlSchema.parse(req.query);
    const response = await axios.get(url, { responseType: "stream" });

    // Set headers to force download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Pipe the response to the client
    return response.data.pipe(res);
  } catch (err) {
    return next(err);
  }
});

experimentsRouter.get("/run-python", async (req, res, next) => {
  try {
    const { code } = req.body;
    const output = await pythonRunner.runCode(code);
    return res.json({
      output,
    });
  } catch (err) {
    return next(err);
  }
});

experimentsRouter.post("/execute-cpp", async (req, res, next) => {
  try {
    const cppCode: string = req.body.code;
    if (!cppCode) {
      return res.status(400).json({ error: "No C++ code provided" });
    }

    // Setup paths
    const tempDir = "temp";
    const srcDir = path.join(tempDir, "src");
    const distDir = path.join(tempDir, "dist");

    const cppPath = path.join(srcDir, "main.cpp");
    const outputPath = path.join(distDir, "main");

    // Ensure folders exist
    await fs.promises.mkdir(srcDir, { recursive: true });
    await fs.promises.mkdir(distDir, { recursive: true });

    // Write C++ code to temp file
    await fs.promises.writeFile(cppPath, cppCode, "utf8");

    const command = `g++-15 ${cppPath} -Wall -Wno-sign-compare -std=c++20 -o ${outputPath} && ${outputPath}`;

    // Execute the compile + run command
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: stderr || error.message });
      }

      return res.json({ output: stdout });
    });
  } catch (err) {
    return next(err);
  }
});

export default experimentsRouter;
