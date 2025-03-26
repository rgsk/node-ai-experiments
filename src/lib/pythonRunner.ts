import { pyodideInstance } from "./pyodideInstance.js";

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

const codeWrapper = (code: string) => {
  return `
  import matplotlib
  matplotlib.use("Agg")  # Set backend to avoid GUI-related errors
  
  import sys
  from io import StringIO
  
  output = StringIO()
  sys.stdout = output
  
  ${code}
  
  # Reset stdout so further prints go to the console.
  sys.stdout = sys.__stdout__
  output.getvalue()
  `;
};

const pythonRunner = {
  runCode: async (code: string) => {
    const result = await pyodideInstance.runPythonAsync(
      codeWrapper(wrapLastLineInPrint(code))
    );
    return result;
  },
};
export default pythonRunner;
