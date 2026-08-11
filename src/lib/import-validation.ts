import {
  BID_STATUS_META,
  KANBAN_STAGES,
  PLATFORM_META,
  PRIORITY_META,
  PROJECT_STATUS_META,
} from "./constants";
import { format, isValid, parse } from "date-fns";

// ---------------------------------------------------------------------------
// Import validation
// Spreadsheet exports often contain mixed-case statuses ("Delivered") or
// values that don't match the app's enums at all. These helpers trim +
// lowercase enum-ish columns and reject anything that can't be mapped, so bad
// data never reaches the database.
// ---------------------------------------------------------------------------

// Allowed values derived from the single source of truth (the META records),
// so adding a status in constants.ts automatically updates validation here.
export const IMPORT_ENUMS = {
  platform: new Set<string>(Object.keys(PLATFORM_META)),
  projectStatus: new Set<string>(Object.keys(PROJECT_STATUS_META)),
  bidStatus: new Set<string>(Object.keys(BID_STATUS_META)),
  priority: new Set<string>(Object.keys(PRIORITY_META)),
  stage: new Set<string>(KANBAN_STAGES),
  opportunityType: new Set<string>(["bid", "pre_sales", "direct"]),
} as const;

/**
 * Trim + lowercase an enum-ish value and verify it is one of `allowed`.
 *
 * - Empty / missing values resolve to `fallback` with no error (optional
 *   columns stay optional).
 * - Valid values are normalized to canonical lowercase (e.g. "Delivered" ->
 *   "delivered").
 * - Invalid values return `fallback` plus a descriptive error so the caller
 *   can reject the row with a useful message.
 */
export function normalizeEnum<T extends string | null>(
  value: unknown,
  allowed: ReadonlySet<string>,
  fallback: T,
): { value: T; error?: string } {
  const raw = value == null ? "" : String(value).trim();
  if (raw === "") return { value: fallback };
  const normalized = raw.toLowerCase();
  if (allowed.has(normalized)) return { value: normalized as T };
  return {
    value: fallback,
    error: `Invalid value "${raw}" — expected one of: ${[...allowed].join(", ")}`,
  };
}

/**
 * Parse a percentage-like cell (progress, fee %) into a number clamped to
 * 0–100.
 *
 * - Blank / missing values resolve to `fallback` with no error (optional
 *   columns stay optional).
 * - Accepts the same money formats as normalizeNumber, plus a trailing
 *   "%" ("50%", "12.5 %").
 * - Out-of-range numeric values are clamped ("150" -> 100, "-5" -> 0).
 * - Non-numeric values return `fallback` plus a descriptive error so the
 *   caller can reject the row with a useful message instead of silently
 *   defaulting.
 */
export function normalizePercent(
  value: unknown,
  fallback: number,
): { value: number; error?: string } {
  const res = normalizeNumber(value, fallback);
  if (res.error) return res;
  return { value: Math.min(100, Math.max(0, res.value)) };
}

/**
 * Parse a spreadsheet money/number cell into a finite number.
 *
 * - Empty / missing values resolve to `fallback` (0) with no error
 *   (optional columns stay optional).
 * - Accepts plain numbers and common money formats: "$1,500.50", "1,500",
 *   "(1,500)" (Excel accounting negative), and trailing currency codes
 *   ("1500 USD").
 * - Non-numeric values return `fallback` plus a descriptive error so the
 *   caller can reject the row with a useful message instead of silently
 *   importing 0.
 * - With `{ nonNegative: true }`, negative results ("-250", "(1,500)") are
 *   rejected too — money-like columns are almost always data errors when
 *   negative.
 */
export function normalizeNumber(
  value: unknown,
  fallback = 0,
  opts: { nonNegative?: boolean } = {},
): { value: number; error?: string } {
  const reject = (message: string) => ({ value: fallback, error: message });
  const check = (n: number): { value: number; error?: string } => {
    if (opts.nonNegative && n < 0) {
      return reject(`Negative value "${String(value)}" — expected zero or more`);
    }
    return { value: n };
  };
  if (value == null || String(value).trim() === "") return { value: fallback };
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? check(value)
      : reject(`Invalid number "${String(value)}"`);
  }
  let raw = String(value).trim();
  // Excel accounting negative: "(1,500)" -> -1500.
  let negative = false;
  if (raw.startsWith("(") && raw.endsWith(")")) {
    negative = true;
    raw = raw.slice(1, -1).trim();
  }
  // Strip currency symbols, the percent sign and whitespace ("50%" -> "50",
  // "$1,500.50" -> "1500.50").
  raw = raw.replace(/[$\u20AC\u00A3\u00A5%\s]/g, "");
  // Thousand separators: strip a comma ONLY when it groups exactly three
  // digits ("1,500" -> "1500", "1,234,567" -> "1234567"). A comma followed
  // by 1–2 digits ("1,5") is a European decimal comma — it is left alone so
  // it gets rejected below instead of silently misread as 15. (Lookbehind
  // so consecutive groups like "1,234,567" all strip.)
  raw = raw.replace(/(?<=\d),(\d{3})(?!\d)/g, "$1");
  // Trailing currency codes ("1500 USD" -> "1500", "1500BDT" -> "1500").
  // Whitelisted so typos like "1500five" are rejected instead of stripped.
  raw = raw.replace(
    /(\d)(USD|BDT|EUR|GBP|INR|AED|SAR|SGD|AUD|CAD|NZD|JPY|CNY|MYR|NPR|PKR)$/i,
    "$1",
  );
  if (raw === "") return { value: fallback };
  // Strict decimal check BEFORE Number() — rejects hex ("0x10" -> 16 in
  // JS), binary/octal prefixes and partial parses ("12abc" -> 12).
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(raw)) {
    return {
      value: fallback,
      error: `Invalid number "${String(value)}" — expected a numeric value`,
    };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return reject(`Invalid number "${String(value)}" — expected a numeric value`);
  }
  return check(negative ? -n : n);
}

// ---------------------------------------------------------------------------
// Date validation
// Spreadsheet dates arrive in every shape imaginable: Excel serial numbers
// (46150, sometimes with a time fraction), localized text ("9-Mar-26",
// "Jun 13, 9:04 PM"), ISO strings, or real Date objects. normalizeDate turns
// all of them into canonical "YYYY-MM-DD" or reports a clear error so invalid
// dates never silently become "—" in the UI.
// ---------------------------------------------------------------------------

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "yyyy.MM.dd",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "MM-dd-yyyy",
  "dd-MMM-yy",
  "d-MMM-yy",
  "dd-MMM-yyyy",
  "d-MMM-yyyy",
  "MMM d, yyyy",
  "MMM dd, yyyy",
  "MMM d yyyy",
  "dd MMM yyyy",
  "d MMM yyyy",
  "dd MMM yy",
  "d MMM yy",
  "MMM d, h:mm a",
  "MMM dd, h:mm a",
  "dd MMM, HH:mm",
  "d MMM, HH:mm",
  "dd MMM HH:mm",
  "yyyyMMdd",
];

function isReasonableYear(d: Date): boolean {
  const y = d.getFullYear();
  return y >= 1900 && y <= 2100;
}

// Excel serial dates are timezone-naive day counts since 1900-01-00
// (serial 25569 == Unix epoch). Convert via UTC milliseconds and read the
// date back in UTC so the result never drifts across timezones.
function fromExcelSerial(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400000));
}

/**
 * Normalize any spreadsheet-ish date value to "YYYY-MM-DD".
 *
 * - Empty / missing -> null (optional columns stay optional).
 * - Date objects, ISO strings, Excel serial numbers (incl. time fractions)
 *   and common text formats are all accepted.
 * - Unparseable values return null + a descriptive error so the caller can
 *   reject the row with a useful message.
 */
export function normalizeDate(value: unknown): { value: string | null; error?: string } {
  if (value == null || String(value).trim() === "") return { value: null };

  if (value instanceof Date) {
    return isValid(value) && isReasonableYear(value)
      ? { value: format(value, "yyyy-MM-dd") }
      : { value: null, error: `Invalid date "${String(value)}"` };
  }

  if (typeof value === "number") {
    const d = fromExcelSerial(value);
    if (isValid(d) && isReasonableYear(d)) return { value: d.toISOString().slice(0, 10) };
    return { value: null, error: `Invalid date value "${value}"` };
  }

  const raw = String(value).trim();

  // Strict ISO date (no timezone drift) with real calendar validation.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const [, y, m, d] = iso;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (
      isValid(dt) &&
      dt.getFullYear() === Number(y) &&
      dt.getMonth() === Number(m) - 1 &&
      dt.getDate() === Number(d) &&
      isReasonableYear(dt)
    ) {
      return { value: raw };
    }
    return { value: null, error: `Invalid date "${raw}" — use YYYY-MM-DD` };
  }

  // Numeric strings. 8-digit values are almost certainly YYYYMMDD dates
  // (e.g. "20260518") — Excel serials for years 1900–2100 are never that
  // large — so try that first; everything else is an Excel serial stored
  // as text (e.g. "46150.21").
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    if (/^\d{8}$/.test(raw)) {
      const y = Number(raw.slice(0, 4));
      const m = Number(raw.slice(4, 6));
      const d = Number(raw.slice(6, 8));
      const dt = new Date(y, m - 1, d);
      if (
        isValid(dt) &&
        dt.getFullYear() === y &&
        dt.getMonth() === m - 1 &&
        dt.getDate() === d &&
        isReasonableYear(dt)
      ) {
        return { value: format(dt, "yyyy-MM-dd") };
      }
      return { value: null, error: `Invalid date "${raw}" — use YYYY-MM-DD` };
    }
    const d = fromExcelSerial(Number(raw));
    if (isValid(d) && isReasonableYear(d)) return { value: d.toISOString().slice(0, 10) };
    return { value: null, error: `Invalid date value "${raw}"` };
  }

  // Common text formats ("9-Mar-26", "Jun 13, 9:04 PM", "18 May, 20:29").
  // NOTE: formats without a year token resolve to the reference (current)
  // year — a deliberate trade-off for yearless spreadsheet dates.
  for (const f of DATE_FORMATS) {
    const parsed = parse(raw, f, new Date());
    if (isValid(parsed) && isReasonableYear(parsed)) {
      return { value: format(parsed, "yyyy-MM-dd") };
    }
  }

  // Last resort: engine parsing (ISO with time, "August 1, 2026", ...).
  const fallback = new Date(raw);
  if (isValid(fallback) && isReasonableYear(fallback)) {
    return { value: format(fallback, "yyyy-MM-dd") };
  }

  return { value: null, error: `Invalid date "${raw}" — use YYYY-MM-DD` };
}
