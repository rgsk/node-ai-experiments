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
