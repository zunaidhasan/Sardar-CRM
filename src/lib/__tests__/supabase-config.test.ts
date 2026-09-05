import { describe, it, expect } from "vitest";
import { isSupabaseConfigured } from "@/lib/utils";

describe("isSupabaseConfigured", () => {
  it("returns false when url or anon key is missing", () => {
    expect(isSupabaseConfigured(undefined, undefined)).toBe(false);
    expect(isSupabaseConfigured("", "anon")).toBe(false);
    expect(isSupabaseConfigured("https://abc.supabase.co", "")).toBe(false);
    expect(isSupabaseConfigured("   ", "anon-key")).toBe(false);
  });

  it("returns false for placeholder env values", () => {
    expect(
      isSupabaseConfigured("https://your-project.supabase.co", "your-anon-key"),
    ).toBe(false);
    expect(
      isSupabaseConfigured("https://your-project-ref.supabase.co", "eyJhbGciOi"),
    ).toBe(false);
  });

  it("returns false for invalid urls", () => {
    expect(isSupabaseConfigured("not-a-url", "anon-key-value")).toBe(false);
  });

  it("returns true for a real supabase url and key", () => {
    expect(
      isSupabaseConfigured(
        "https://abcdefghijklmnop.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon",
      ),
    ).toBe(true);
  });
});
