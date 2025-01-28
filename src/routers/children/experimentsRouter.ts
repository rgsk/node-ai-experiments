import axios from "axios";
import * as cheerio from "cheerio";
import { exec } from "child_process";
import { Router } from "express";
import fs from "fs";
import ogs from "open-graph-scraper";
import path from "path";
const experimentsRouter = Router();
// Endpoint to execute Python code
type SupportedLangugages =
  | "node"
  | "javascript"
  | "python"
  | "typescript"
  | "cpp";
experimentsRouter.post("/execute-code", async (req, res) => {
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
    process.cwd(),
    "code-runners",
    languageToRunners[language]
  );
  const tempFileName = `temp${fileExtensions[language]}`;
  const tempFileLocalPath = path.join(mountPath, "src", tempFileName);
  const executableFileName = "temp";
  const executableFileLocalPath = path.join(
    mountPath,
    "src",
    executableFileName
  );

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
});

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

experimentsRouter.get("/meta", async (req, res, next) => {
  const { url } = req.query;
  try {
    console.log("sending user agent");
    const { data } = await axios.get(url as string, {
      headers: {
        "User-Agent": userAgent,
      },
    });
    const $ = cheerio.load(data);

    const meta = {
      title:
        $('meta[property="og:title"]').attr("content") || $("title").text(),
      description: $('meta[property="og:description"]').attr("content") || "",
      image: $('meta[property="og:image"]').attr("content") || "",
      url: $('meta[property="og:url"]').attr("content") || url,
    };

    return res.json(meta);
  } catch (err) {
    return next(err);
  }
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
