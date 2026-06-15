import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  safeEqual,
  verifySignature,
  issueAgentCredentials,
  isSessionEnded,
} from "../../src/lib/proctoring/agent";

/**
 * Server-side auth for the native proctor agent: constant-time token compare,
 * HMAC body verification, credential issuance, and the session-ended signal
 * that drives the agent's self-uninstall.
 */

describe("safeEqual", () => {
  it("matches identical strings and rejects differences", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
    expect(safeEqual("abc123", "abc124")).toBe(false);
  });
  it("rejects different lengths without throwing", () => {
    expect(safeEqual("short", "longer-value")).toBe(false);
  });
});

describe("verifySignature", () => {
  const secret = "per-session-secret";
  const body = JSON.stringify({ session_id: "s", seq: 1 });
  const goodSig = createHmac("sha256", secret).update(body, "utf8").digest("hex");

  it("accepts a correct HMAC over the raw body", () => {
    expect(verifySignature(secret, body, goodSig)).toBe(true);
  });
  it("rejects a tampered body", () => {
    const tampered = body.replace('"seq":1', '"seq":999');
    expect(verifySignature(secret, tampered, goodSig)).toBe(false);
  });
  it("rejects the wrong secret", () => {
    expect(verifySignature("other-secret", body, goodSig)).toBe(false);
  });
});

describe("issueAgentCredentials", () => {
  it("returns distinct 64-hex-char token and secret", () => {
    const a = issueAgentCredentials();
    const b = issueAgentCredentials();
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect(a.secret).toMatch(/^[0-9a-f]{64}$/);
    expect(a.token).not.toBe(a.secret);
    expect(a.token).not.toBe(b.token); // randomness
  });
});

describe("isSessionEnded", () => {
  it("is false for an active session", () => {
    expect(isSessionEnded({ status: "in_progress", finishedAt: null })).toBe(false);
  });
  it("is true for terminal statuses", () => {
    for (const status of ["completed", "finished", "ended", "cancelled", "expired"]) {
      expect(isSessionEnded({ status, finishedAt: null })).toBe(true);
    }
  });
  it("is true once finishedAt is in the past", () => {
    expect(isSessionEnded({ status: "in_progress", finishedAt: new Date(Date.now() - 1000) })).toBe(true);
  });
  it("is false when finishedAt is in the future", () => {
    expect(isSessionEnded({ status: "scheduled", finishedAt: new Date(Date.now() + 60_000) })).toBe(false);
  });
});
