import { randomBytes } from "node:crypto";

export function createPortalToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isPortalTokenValid(portal: {
  is_active: boolean;
  expires_at: string | null;
}): boolean {
  if (!portal.is_active) return false;
  if (portal.expires_at && new Date(portal.expires_at).getTime() < Date.now()) {
    return false;
  }
  return true;
}
