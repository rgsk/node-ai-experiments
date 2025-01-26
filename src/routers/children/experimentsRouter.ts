import { exec } from "child_process";
import { Router } from "express";
import fs from "fs";
import path from "path";
const experimentsRouter = Router();
// Endpoint to execute Python code
experimentsRouter.post("/execute-code", async (req, res) => {
  const { code, language } = req.body;
  // Save the Python code to a temporary file
  const mountPath = path.join(
    process.cwd(),
    "code-runners",
    `${language}-runner`
  );
  const tempFileName = "execute-code-temp-file";
  const tempFileLocalPath = path.join(mountPath, "src", tempFileName);
  fs.writeFileSync(tempFileLocalPath, code);

  // Command to run the Anaconda Docker container and execute the Python script
  const dockerCommand = `docker run -t -v ${mountPath}:/app python-runner python /app/src/${tempFileName}`;

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
