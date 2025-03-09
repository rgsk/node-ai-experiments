import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { html } from "../../../../lib/generalUtils.js";
export const executeCodeSchema = {
  code: z.string({
    description: html`the code to execute.
      <important>
        make sure you perform print/console.log, so you can the see the code
        execution output, if you won't do that you would get empty string as
        output.
      </important>`,
  }),
  language: z.enum(
    ["node", "javascript", "python", "typescript", "cpp", "unknown"],
    {
      description: html`programming language to use. If the user explicitly
      tells about which language to use, use that language. if it's not one of
      known language pass the value "unknown", I will throw an error.`,
    }
  ),
};
export type SupportedLangugages = Exclude<
  z.infer<typeof executeCodeSchema.language>,
  "unknown"
>;
function wrapLastLineInPrint(codeStr: string): string {
  const lines = codeStr.split("\n");
  if (lines.length === 0) return codeStr;

  // Find the last non-empty line
  let lastNonEmptyIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== "") {
      lastNonEmptyIndex = i;
      break;
    }
  }

  if (lastNonEmptyIndex === -1) return codeStr; // All lines are empty

  const lastLine = lines[lastNonEmptyIndex];
  const strippedLine = lastLine.trim();

  // Skip if already a print statement or empty/comment
  if (
    strippedLine.startsWith("print(") ||
    strippedLine === "" ||
    strippedLine.startsWith("#")
  ) {
    return codeStr;
  }

  // Capture leading whitespace (preserve indentation)
  const leadingWhitespace = lastLine.match(/^\s*/)?.[0] || "";

  // Wrap in print() while preserving whitespace
  lines[lastNonEmptyIndex] = `${leadingWhitespace}print(${strippedLine})`;

  return lines.join("\n");
}
const executeCode = ({
  code,
  language,
}: {
  code: string;
  language: SupportedLangugages;
}) => {
  if (language === "python") {
    code = wrapLastLineInPrint(code);
  }
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
    // environmentVars.HOST_DIR,
    "code-runners",
    languageToRunners[language]
  );
  const tempFileName = `temp${fileExtensions[language]}`;
  // Ensure the "src" directory exists
  const srcPath = path.join("code-runners", languageToRunners[language], "src");
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
  return new Promise<{ output: string }>((resolve, reject) => {
    // Execute the Docker command
    exec(dockerCommand, (error, stdout, stderr) => {
      // Delete the temporary Python file
      fs.unlinkSync(tempFileLocalPath);

      if (fs.existsSync(executableFileLocalPath)) {
        fs.unlinkSync(executableFileLocalPath);
      }

      if (error) {
        return reject(stderr || error.message);
      }

      // Return the output
      return resolve({ output: stdout });
    });
  });
};

export default executeCode;
