import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Scrypt password hashing for demo-mode user accounts. Format: "salt:hash"
// (both hex). Supabase mode delegates to Supabase Auth, so these helpers are
// only used by the file-backed demo store.
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, KEYLEN);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
