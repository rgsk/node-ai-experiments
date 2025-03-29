import { pyodideInstance } from "./pyodideInstance.js";

function wrapLastLineInPrint(codeStr: string): string {
  const lines = codeStr.split("\n");
  if (lines.length === 0) return codeStr;

  // Remove trailing empty lines
  while (lines.length && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  if (lines.length === 0) return codeStr;

  // Check for a multi-line print block by counting parentheses
  let inPrintCall = false;
  let parenBalance = 0;
  for (const line of lines) {
    // Check if this line starts a print statement
    if (line.includes("print(")) {
      inPrintCall = true;
    }
    for (const char of line) {
      if (char === "(") parenBalance++;
      if (char === ")") parenBalance--;
    }
  }
  // If we detected a print and the parentheses are balanced, assume the print is complete
  if (inPrintCall && parenBalance === 0) {
    return codeStr;
  }

  // Otherwise, wrap the last line
  const lastIndex = lines.length - 1;
  const lastLine = lines[lastIndex];
  const strippedLine = lastLine.trim();

  // Skip if the last line is empty or a comment
  if (strippedLine === "" || strippedLine.startsWith("#")) {
    return codeStr;
  }

  const leadingWhitespace = lastLine.match(/^\s*/)?.[0] || "";
  lines[lastIndex] = `${leadingWhitespace}print(${strippedLine})`;

  return lines.join("\n");
}

const codeWrapper = (code: string) => {
  return `
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
