export const fmtNumber = (n?: number, digits = 2) =>
  n == null ? "-" : Number(n).toFixed(digits);

export const fmtTsLocal = (s?: string) => s ?? "";
