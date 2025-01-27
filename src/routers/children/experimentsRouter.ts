import { exec } from "child_process";
import { Router } from "express";
import fs from "fs";
import path from "path";
const experimentsRouter = Router();
// Endpoint to execute Python code
experimentsRouter.post("/execute-code", async (req, res) => {
  const { code, language } = req.body;
  const languageToRunners: Record<string, string> = {
    node: "node-runner",
    python: "python-runner",
    typescript: "node-runner",
    cpp: "cpp-runner",
  };
  const fileExtensions: Record<string, string> = {
    node: ".js",
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
  fs.writeFileSync(tempFileLocalPath, code);

  const languageToCommands: Record<string, string> = {
    node: `node /app/src/${tempFileName}`,
    python: `python /app/src/${tempFileName}`,
    typescript: `yarn --silent run:file /app/src/${tempFileName}`,
    cpp: `bash -c "g++ -o /app/src/temp /app/src/${tempFileName} && /app/src/temp"`,
  };
  // Command to run the Anaconda Docker container and execute the Python script
  const dockerCommand = `docker run --rm -v ${mountPath}:/app ${languageToRunners[language]} ${languageToCommands[language]}`;

  // Execute the Docker command
  exec(dockerCommand, (error, stdout, stderr) => {
    // Delete the temporary Python file
    fs.unlinkSync(tempFileLocalPath);

    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }

    // Return the output
    return res.json({ output: stdout });
  });
});
export default experimentsRouter;
