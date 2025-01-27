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
  };
  const mountPath = path.join(
    process.cwd(),
    "code-runners",
    languageToRunners[language]
  );
  const tempFileName = "execute-code-temp-file";
  const tempFileLocalPath = path.join(mountPath, "src", tempFileName);
  fs.writeFileSync(tempFileLocalPath, code);

  const languageToCommands: Record<string, string> = {
    node: "node",
    python: "python",
    typescript: "yarn --silent run:file",
  };
  // Command to run the Anaconda Docker container and execute the Python script
  const dockerCommand = `docker run --rm -v ${mountPath}:/app ${languageToRunners[language]} ${languageToCommands[language]} /app/src/${tempFileName}`;

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
