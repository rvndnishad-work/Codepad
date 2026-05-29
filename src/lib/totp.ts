/**
 * TOTP / 2FA helper (IP-42). Wraps `otplib` with the project conventions:
 *
 *  - Secrets are stored AES-GCM-encrypted at rest via `crypto/at-rest.ts`
 *    (same `v1:iv:tag:ct` format as MCP authTokens and ATS apiKeys).
 *  - Backup codes are stored as SHA-256 hex digests (one-way) plus a
 *    `usedAt` timestamp so we can mark them spent without ever round-tripping
 *    plaintext through the DB.
 *  - Code verification allows a ±1 step (≈ 30s either side) drift window —
 *    standard for authenticator apps; tight enough that brute-force needs
 *    significant rate.
 *
 * The functions are intentionally *pure where possible* so they're easy to
 * unit-test without standing up Prisma.
 */
import { authenticator } from "otplib";
import { createHash, randomBytes } from "crypto";
import { encryptAtRest, decryptAtRest } from "./crypto/at-rest";

// 1 step = 30s. ±1 step window means a code stays valid for ~60s total, which
// matches what users actually experience switching between Authy / Google
// Authenticator / 1Password.
authenticator.options = { window: 1, step: 30 };

export type BackupCode = { hash: string; usedAt: string | null };

const ISSUER = "Interviewpad";
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_BYTES = 5; // 5 bytes → 10 hex chars → 1.1e12 keyspace

/**
 * Generates a fresh base32 TOTP secret. Caller is responsible for encrypting
 * before persist via `encryptTotpSecret`.
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Builds the otpauth:// URI that the QR encodes. Both the issuer and the
 * account label are URI-encoded by otplib internally.
 */
export function buildOtpauthUri(secret: string, accountLabel: string): string {
  return authenticator.keyuri(accountLabel, ISSUER, secret);
}

/**
 * Verifies a 6-digit code against a plaintext secret. Drift window is fixed
 * to ±1 step (see options above).
 */
export function verifyTotpCode(plaintextSecret: string, token: string): boolean {
  if (!plaintextSecret || !token) return false;
  // otplib expects a 6-digit string; trim spaces in case the user pasted from
  // an authenticator app that copies "123 456".
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    return authenticator.verify({ token: clean, secret: plaintextSecret });
  } catch {
    return false;
  }
}

export function encryptTotpSecret(plaintextSecret: string): string {
  return encryptAtRest(plaintextSecret);
}

export function decryptTotpSecret(stored: string): string {
  return decryptAtRest(stored);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Backup codes
 * ──────────────────────────────────────────────────────────────────────────
 * Format shown to user: groups of 4 hex chars separated by "-", e.g.
 * "a1b2-c3d4-e5". Stored as SHA-256(hex) of the un-grouped lowercase form so
 * lookups are O(N) over the (≤10) array and a leak of the DB never reveals
 * plaintext codes.
 */

function formatCodeForUser(rawHex: string): string {
  // "a1b2c3d4e5" → "a1b2-c3d4-e5"
  return rawHex.match(/.{1,4}/g)?.join("-") ?? rawHex;
}

function normalizeCodeFromUser(input: string): string {
  return input.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
}

function hashCode(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Mint a fresh batch of backup codes. Returns:
 *   - `plaintext`: the codes to show the user ONCE (display-only)
 *   - `stored`:    the JSON-encoded array of hashes to write to
 *                  `User.totpBackupCodes`
 */
export function mintBackupCodes(): { plaintext: string[]; stored: string } {
  const plaintext: string[] = [];
  const records: BackupCode[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const hex = randomBytes(BACKUP_CODE_BYTES).toString("hex");
    plaintext.push(formatCodeForUser(hex));
    records.push({ hash: hashCode(hex), usedAt: null });
  }
  return { plaintext, stored: JSON.stringify(records) };
}

/**
 * Verify a user-typed backup code. Returns:
 *   - `{ ok: true, stored }` — updated JSON with the matching code marked
 *     `usedAt`. Caller persists this back to `User.totpBackupCodes`.
 *   - `{ ok: false }` — no match (already-used codes don't count as a match).
 */
export function consumeBackupCode(
  storedJson: string | null,
  userInput: string,
): { ok: true; stored: string } | { ok: false } {
  if (!storedJson) return { ok: false };
  let codes: BackupCode[];
  try {
    const parsed = JSON.parse(storedJson);
    if (!Array.isArray(parsed)) return { ok: false };
    codes = parsed;
  } catch {
    return { ok: false };
  }

  const normalized = normalizeCodeFromUser(userInput);
  if (!normalized) return { ok: false };
  const expectedHash = hashCode(normalized);

  const idx = codes.findIndex((c) => c.hash === expectedHash && c.usedAt === null);
  if (idx === -1) return { ok: false };

  codes[idx] = { ...codes[idx], usedAt: new Date().toISOString() };
  return { ok: true, stored: JSON.stringify(codes) };
}

export function countUnusedBackupCodes(storedJson: string | null): number {
  if (!storedJson) return 0;
  try {
    const parsed = JSON.parse(storedJson);
    if (!Array.isArray(parsed)) return 0;
    return parsed.filter((c) => c && c.usedAt === null).length;
  } catch {
    return 0;
  }
}
