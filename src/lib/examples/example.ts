import { loadPyodide } from "pyodide";
const codeWrapper = (code: string) => {
  return `
import numpy as np
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
const example = async () => {
  async function hello_python() {
    let pyodide = await loadPyodide({
      indexURL: "pyodide",
    });
    await pyodide.loadPackage([
      "numpy",
      "matplotlib",
      "scipy",
      "scikit-learn",
      "pandas",
    ]);
    try {
      const result = await pyodide.runPythonAsync(
        codeWrapper(`
print(188 * 18)
print('rahul')
print(name)
              `)
      );
      console.log({ result });
    } catch (err: any) {
      //   console.error(err);
    }
  }
};

export default example;
