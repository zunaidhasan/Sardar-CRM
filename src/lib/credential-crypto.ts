import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { isDemoMode } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Secret encryption for project credential passwords (WP admin, cPanel, FTP…).
//
// Passwords are encrypted with AES-256-GCM before they touch the database so
// a leaked DB / demo JSON file never contains plaintext client logins.
//
// The key comes from the CREDENTIALS_ENCRYPTION_KEY env var (any non-empty
// string; it is SHA-256-derived to a 32-byte key). Set a strong, stable value
// in your host's env — if it changes, previously stored passwords can no
// longer be decrypted.
//
// Keying behaviour:
//   - Env var set          -> used everywhere (demo AND Supabase mode).
//   - Demo mode, no env    -> stored as-is (the local demo store is ephemeral
//                             anyway); set the env var to encrypt there too.
//   - Supabase, no env     -> encrypt/decrypt THROWS with a clear message, so
//                             production fails closed instead of storing
//                             secrets in plaintext.
//
// Stored format: "v1:<iv b64>.<authTag b64>.<ciphertext b64>"
// Values that don't start with "v1:" are treated as legacy plaintext and
// passed through unchanged, so rows written before this feature keep working.
// ---------------------------------------------------------------------------

const PREFIX = "v1:";
const IV_LENGTH = 12;

/** True when encryption is active (key configured, or non-demo production). */
export function isEncryptionEnabled(): boolean {
  return Boolean(process.env.CREDENTIALS_ENCRYPTION_KEY) || !isDemoMode();
}

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (raw) return createHash("sha256").update(raw).digest();
  throw new Error(
    "CREDENTIALS_ENCRYPTION_KEY is not configured — set it in your environment to store credential passwords encrypted.",
  );
}

/** Encrypt a plaintext secret for storage. Empty strings stay empty. */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  if (!isEncryptionEnabled()) return plaintext; // demo without a key -> as-is
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

/**
 * Decrypt a stored secret. Legacy plaintext (not "v1:" prefixed) passes
 * through unchanged so old rows keep working. Throws when an encrypted value
 * cannot be decrypted (wrong/missing key or tampered data).
 */
export function decryptSecret(payload: string): string {
  if (!payload) return "";
  if (!payload.startsWith(PREFIX)) return payload; // legacy plaintext
  if (!isEncryptionEnabled()) {
    // An encrypted value exists but we no longer have a key — surface a clear
    // error instead of leaking the raw ciphertext to the reveal UI.
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY is not configured — set it to decrypt stored passwords.",
    );
  }
  // Strip the "v1:" prefix first so split(".") yields exactly [iv, tag, data].
  const parts = payload.slice(PREFIX.length).split(".");
  if (parts.length !== 3) throw new Error("Malformed encrypted secret");
  const [ivB64, tagB64, dataB64] = parts;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getKey(),
      Buffer.from(ivB64!, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64!, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64!, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error(
      "Could not decrypt this password — is CREDENTIALS_ENCRYPTION_KEY set to the same value used when it was saved?",
    );
  }
}

/** True when the stored value is an encrypted payload (vs legacy plaintext). */
export function isEncryptedSecret(payload: string | null | undefined): boolean {
  return Boolean(payload && payload.startsWith(PREFIX));
}
