import "server-only";

/**
 * Module 41 — Excel formula-injection protection. A cell value that begins
 * with =, +, -, or @ is interpreted by Excel/Sheets as a formula when the
 * file is opened, not as text — so any user-controlled string that reaches
 * an export (a product name, description, category name, CMS-adjacent
 * text, an admin note) could execute a formula in whoever opens the sheet
 * next (e.g. a value like "=cmd|'/c calc'!A1" or a link-exfiltration
 * formula). Prefixing a leading '=' '+' '-' '@' with a single quote forces
 * Excel to treat the cell as literal text while leaving every other value
 * completely unchanged. Applied to every export/template writer in this
 * module (getProductsForExport already existed before this fix and did not
 * have this protection — patched alongside the new export paths).
 */
const DANGEROUS_LEADING_CHARS = new Set(["=", "+", "-", "@"]);

export function sanitizeExcelCell(value: string): string {
  if (!value) return value;
  if (DANGEROUS_LEADING_CHARS.has(value[0])) {
    return `'${value}`;
  }
  return value;
}

/** Applies sanitizeExcelCell to every string value in a flat row object —
 *  the shape every export row in this module uses (Record<string, string>). */
export function sanitizeExcelRow<T extends Record<string, string>>(row: T): T {
  const out = {} as T;
  for (const key of Object.keys(row) as (keyof T)[]) {
    const v = row[key];
    out[key] = (typeof v === "string" ? sanitizeExcelCell(v) : v) as T[keyof T];
  }
  return out;
}
