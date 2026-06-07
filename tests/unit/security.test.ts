import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptAtRest, decryptAtRest, isEncrypted } from "../../src/lib/crypto/at-rest";
import {
  generateTotpSecret,
  buildOtpauthUri,
  encryptTotpSecret,
  decryptTotpSecret,
  mintBackupCodes,
  consumeBackupCode,
  countUnusedBackupCodes,
} from "../../src/lib/totp";

describe("Encryption At Rest (crypto/at-rest.ts)", () => {
  const originalEnvKey = process.env.ENCRYPTION_KEY_BASE64;
  // A valid 256-bit AES key in base64 (used for testing)
  const TEST_KEY = "2v88HCfVDb38rwzUCojXAA8T9HaXxglDiKaqPwWqmx4=";

  beforeEach(() => {
    process.env.ENCRYPTION_KEY_BASE64 = TEST_KEY;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY_BASE64 = originalEnvKey;
  });

  it("should encrypt and decrypt a plaintext string correctly", () => {
    const secret = "super-secret-mcp-key-123";
    const encrypted = encryptAtRest(secret);
    expect(encrypted).toBeDefined();
    expect(encrypted.startsWith("v1:")).toBe(true);

    const decrypted = decryptAtRest(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("should pass through empty, undefined or null values", () => {
    expect(encryptAtRest("")).toBe("");
    expect(decryptAtRest("")).toBe("");
  });

  it("should support legacy plaintext rows (no v1 prefix)", () => {
    const legacyText = "my-legacy-plaintext-key";
    const decrypted = decryptAtRest(legacyText);
    expect(decrypted).toBe(legacyText);
  });

  it("should detect if a stored string is in the encrypted format", () => {
    const encrypted = encryptAtRest("test");
    expect(isEncrypted(encrypted)).toBe(true);
    expect(isEncrypted("plain")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
  });

  it("should throw an error if key env is not set", () => {
    delete process.env.ENCRYPTION_KEY_BASE64;
    expect(() => encryptAtRest("test")).toThrowError(/ENCRYPTION_KEY_BASE64/);
  });

  it("should throw an error if key is not exactly 32 bytes (256-bit)", () => {
    process.env.ENCRYPTION_KEY_BASE64 = Buffer.from("too-short-key").toString("base64");
    expect(() => encryptAtRest("test")).toThrowError(/exactly 32 bytes/);
  });

  it("should throw an error for malformed GCM payloads", () => {
    expect(() => decryptAtRest("v1:badiv:badtag:badct")).toThrow();
  });
});

describe("TOTP and Backup Codes (totp.ts)", () => {
  const TEST_KEY = "2v88HCfVDb38rwzUCojXAA8T9HaXxglDiKaqPwWqmx4=";
  const originalEnvKey = process.env.ENCRYPTION_KEY_BASE64;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY_BASE64 = TEST_KEY;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY_BASE64 = originalEnvKey;
  });

  it("should generate a valid secret and build the correct QR URI", () => {
    const secret = generateTotpSecret();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe("string");

    const uri = buildOtpauthUri(secret, "rvndnishad@gmail.com");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("issuer=Interviewpad");
    expect(uri).toContain("rvndnishad%40gmail.com");
  });

  it("should encrypt and decrypt TOTP secret via GCM helpers", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    expect(encrypted.startsWith("v1:")).toBe(true);

    const decrypted = decryptTotpSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("should mint backup codes correctly", () => {
    const { plaintext, stored } = mintBackupCodes();
    expect(plaintext).toHaveLength(10);
    expect(plaintext[0]).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{2}$/); // "a1b2-c3d4-e5" format

    const parsed = JSON.parse(stored);
    expect(parsed).toHaveLength(10);
    expect(parsed[0]).toHaveProperty("hash");
    expect(parsed[0]).toHaveProperty("usedAt", null);
  });

  it("should consume backup codes correctly and mark them spent", () => {
    const { plaintext, stored } = mintBackupCodes();
    const targetCode = plaintext[3];

    const unusedCountBefore = countUnusedBackupCodes(stored);
    expect(unusedCountBefore).toBe(10);

    const res = consumeBackupCode(stored, targetCode);
    expect(res.ok).toBe(true);

    if (res.ok) {
      const unusedCountAfter = countUnusedBackupCodes(res.stored);
      expect(unusedCountAfter).toBe(9);

      // Re-consuming same code should fail
      const retryRes = consumeBackupCode(res.stored, targetCode);
      expect(retryRes.ok).toBe(false);

      // Spacing and case insensitive matching on a different unused code should still consume
      const unusedCode = plaintext[4];
      const modifiedCode = unusedCode.replace(/-/g, " ").toUpperCase();
      const resAnother = consumeBackupCode(res.stored, modifiedCode);
      expect(resAnother.ok).toBe(true);
    }
  });

  it("should return ok:false for invalid codes or bad json format", () => {
    expect(consumeBackupCode(null, "abcd")).toEqual({ ok: false });
    expect(consumeBackupCode("badjson", "abcd")).toEqual({ ok: false });
    expect(consumeBackupCode("[]", "abcd")).toEqual({ ok: false });
  });
});
