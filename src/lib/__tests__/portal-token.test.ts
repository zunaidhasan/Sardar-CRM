import { describe, it, expect } from "vitest";
import { createPortalToken, isPortalTokenValid } from "@/lib/portal";

describe("portal tokens", () => {
  it("creates a long unguessable token", () => {
    const token = createPortalToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("creates unique tokens", () => {
    const a = createPortalToken();
    const b = createPortalToken();
    expect(a).not.toBe(b);
  });

  it("rejects expired or inactive portals", () => {
    expect(
      isPortalTokenValid({
        is_active: false,
        expires_at: null,
      }),
    ).toBe(false);
    expect(
      isPortalTokenValid({
        is_active: true,
        expires_at: "2000-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isPortalTokenValid({
        is_active: true,
        expires_at: null,
      }),
    ).toBe(true);
  });
});
