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
