import { loadPyodide } from "pyodide"; // Ensure you have a Node-compatible Pyodide package

export let pyodideInstance: Awaited<ReturnType<typeof loadPyodide>>;

export async function initializePyodide() {
  pyodideInstance = await loadPyodide({
    indexURL: "pyodide",
  });
  await pyodideInstance.loadPackage([
    "numpy",
    "matplotlib",
    "scipy",
    "scikit-learn",
    "pandas",
    "beautifulsoup4",
  ]);
}
