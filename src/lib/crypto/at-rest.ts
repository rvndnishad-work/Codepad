/**
 * AES-256-GCM encryption-at-rest helper for customer-supplied secrets we
 * never want to round-trip through the UI (auth tokens for outbound MCP
 * calls, ATS API keys, etc.). Uses node:crypto built-ins so no new dep.
 *
 * Stored payload format (string): `v1:<iv-base64>:<tag-base64>:<ciphertext-base64>`
 *
 * - `v1` prefix lets us rotate the algorithm later by introducing v2 without
 *   needing to migrate v1 ciphertexts in lockstep.
 * - IV is 12 bytes (GCM standard), random per encryption.
 * - Tag is 16 bytes — separated so the format is self-describing for
 *   verification without parsing the length-prefixed concat layout.
 *
 * Plaintext values that don't carry the `v1:` prefix are assumed to be
 * legacy plaintext (pre-encryption) and returned as-is by `decryptAtRest`.
 * That's the migration path: read old rows, write back encrypted on next
 * mutation, until eventually no plaintext remains. A future cleanup pass
 * can scan + re-encrypt anything still in the legacy format.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "v1:";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const b64 = process.env.ENCRYPTION_KEY_BASE64;
  if (!b64) {
    throw new Error(
      "ENCRYPTION_KEY_BASE64 is not set. Generate one with: `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` and add to your env."
    );
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes (256-bit). Got ${key.length} bytes.`
    );
  }
  return key;
}

export function encryptAtRest(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX.slice(0, -1), // "v1" without trailing colon
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptAtRest(stored: string): string {
  if (!stored) return stored;
  // Backwards compatibility: legacy plaintext rows have no prefix. We treat
  // anything without `v1:` as plaintext and return as-is. The caller's write
  // path will re-encrypt on next save.
  if (!stored.startsWith(PREFIX)) return stored;

  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Malformed encrypted payload (wrong shape).");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Malformed encrypted payload (IV length ${iv.length}).`);
  }
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Detect whether a stored value is already in the encrypted format. Used by
 * the migration script and by save-paths that want to avoid double-encrypting.
 */
export function isEncrypted(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(PREFIX);
}
