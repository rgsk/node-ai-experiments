import fs from "fs";
export const encodeQueryParams = (
  params: Record<
    string,
    string | number | boolean | undefined | (string | number | boolean)[]
  >
): string => {
  return Object.entries(params)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(
          (val) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(val.toString())}`
        );
      }
      if (value === undefined) return;
      return `${encodeURIComponent(key)}=${encodeURIComponent(
        value.toString()
      )}`;
    })
    .filter(Boolean)
    .join("&");
};

export const readFile = async (filePath: string) => {
  try {
    const data = await fs.promises.readFile(filePath);
    return data.toString();
  } catch (error: any) {
    throw new Error(`Error reading file: ${error.message}`);
  }
};

export const writeFile = async (filePath: string, data: string) => {
  try {
    await fs.promises.writeFile(filePath, data);
  } catch (error: any) {
    throw new Error(`Error writing file: ${error.message}`);
  }
};

export function schemaToTools(inputSchema: any) {
  if (!inputSchema.tools || !Array.isArray(inputSchema.tools)) {
    throw new Error("Input must contain a tools array");
  }

  return inputSchema.tools.map((tool: any) => {
    // Get the input schema from the tool
    const schema = tool.inputSchema;

    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || `Execute the ${tool.name} function`,
        parameters: {
          ...schema,
          $schema: undefined, // Remove the $schema property as it's not needed
        },
        strict: true,
      },
    };
  });
}
