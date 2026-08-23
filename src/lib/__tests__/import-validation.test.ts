import { describe, it, expect } from "vitest";
import {
  normalizeEnum,
  normalizeDate,
  normalizeNumber,
  normalizePercent,
  IMPORT_ENUMS,
} from "@/lib/import-validation";

// ---------------------------------------------------------------------------
// Unit Tests: Import Validation
// ---------------------------------------------------------------------------

describe("normalizeEnum", () => {
  it("returns valid enum value as-is (lowercase)", () => {
    const result = normalizeEnum("High", IMPORT_ENUMS.leadScore, null);
    expect(result.value).toBe("high");
  });

  it("case-insensitive match", () => {
    expect(normalizeEnum("high", IMPORT_ENUMS.leadScore, null).value).toBe("high");
    expect(normalizeEnum("MEDIUM", IMPORT_ENUMS.leadScore, null).value).toBe("medium");
  });

  it("returns fallback for invalid value", () => {
    const result = normalizeEnum("invalid", IMPORT_ENUMS.leadScore, null);
    expect(result.value).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("returns fallback for empty string", () => {
    const result = normalizeEnum("", IMPORT_ENUMS.leadScore, null);
    expect(result.value).toBeNull();
    expect(result.error).toBeUndefined();
  });

  it("handles outreach status enums", () => {
    expect(normalizeEnum("New", IMPORT_ENUMS.outreachStatus, null).value).toBe("new");
    expect(normalizeEnum("contacted", IMPORT_ENUMS.outreachStatus, null).value).toBe("contacted");
    expect(normalizeEnum("WON", IMPORT_ENUMS.outreachStatus, null).value).toBe("won");
  });

  it("handles country enums", () => {
    expect(normalizeEnum("United States", IMPORT_ENUMS.country, null).value).toBe("united states");
    expect(normalizeEnum("united kingdom", IMPORT_ENUMS.country, null).value).toBe("united kingdom");
  });
});

describe("normalizeDate", () => {
  it("parses YYYY-MM-DD format", () => {
    const result = normalizeDate("2026-08-24");
    expect(result.value).toBe("2026-08-24");
  });

  it("parses MM/DD/YYYY format", () => {
    const result = normalizeDate("08/24/2026");
    expect(result.value).toBe("2026-08-24");
  });

  it("returns null for invalid date", () => {
    const result = normalizeDate("not-a-date");
    expect(result.value).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = normalizeDate("");
    expect(result.value).toBeNull();
  });

  it("returns null for null input", () => {
    const result = normalizeDate(null);
    expect(result.value).toBeNull();
  });
});

describe("normalizeNumber", () => {
  it("parses integer string", () => {
    const result = normalizeNumber("42", 0);
    expect(result.value).toBe(42);
  });

  it("parses decimal string", () => {
    const result = normalizeNumber("3.14", 0);
    expect(result.value).toBeCloseTo(3.14);
  });

  it("handles comma-separated numbers", () => {
    const result = normalizeNumber("1,000", 0);
    expect(result.value).toBe(1000);
  });

  it("returns fallback for non-numeric string", () => {
    const result = normalizeNumber("abc", 0);
    expect(result.value).toBe(0);
    expect(result.error).toBeDefined();
  });

  it("returns fallback for empty string", () => {
    const result = normalizeNumber("", 0);
    expect(result.value).toBe(0);
  });
});

describe("normalizePercent", () => {
  it("parses percentage string", () => {
    const result = normalizePercent("50%", 0);
    expect(result.value).toBe(50);
  });

  it("parses decimal percentage", () => {
    const result = normalizePercent("3.5%", 0);
    expect(result.value).toBeCloseTo(3.5);
  });

  it("clamps out-of-range values", () => {
    const result = normalizePercent("150%", 0);
    expect(result.value).toBe(100);
  });

  it("clamps negative values", () => {
    const result = normalizePercent("-5%", 0);
    expect(result.value).toBe(0);
  });
});
