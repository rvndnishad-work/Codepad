import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import {
  computeSignature,
  generateWebhookSecret,
  parseSignatureHeader,
  signatureHeader,
  verifySignature,
} from "@/lib/events/signing";
import {
  AUTO_PAUSE_AFTER,
  MAX_ATTEMPTS,
  RETRY_DELAYS_MS,
  isSuccessStatus,
  planAfterAttempt,
  retryDelayMs,
  shouldAutoPause,
  validateEndpointUrl,
} from "@/lib/events/policy";
import { cleanEventList, describeEventList, summarizeDelivery, WORKSPACE_EVENTS } from "@/lib/events/catalog";
import { buildEnvelope, newEventId } from "@/lib/events/envelope";

const MIN = 60_000;
const HOUR = 60 * MIN;

describe("webhook signing", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ id: "evt_1", event: "candidate.decided", data: { decision: "passed" } });
  const ts = 1_727_350_000;

  it("signs t.body with HMAC-SHA256 hex", () => {
    const expected = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
    expect(computeSignature(secret, ts, body)).toBe(expected);
    expect(signatureHeader(secret, ts, body)).toBe(`t=${ts},v1=${expected}`);
  });

  it("parses the header", () => {
    expect(parseSignatureHeader("t=10,v1=abc")).toEqual({ t: 10, v1: ["abc"] });
    expect(parseSignatureHeader("v1=abc")).toBeNull();
    expect(parseSignatureHeader("t=10")).toBeNull();
  });

  it("verifies a fresh, untouched request", () => {
    const header = signatureHeader(secret, ts, body);
    expect(verifySignature(secret, header, body, { nowSec: ts + 10 })).toBe(true);
  });

  it("rejects a changed body, a wrong secret and a stale timestamp", () => {
    const header = signatureHeader(secret, ts, body);
    expect(verifySignature(secret, header, body + " ", { nowSec: ts })).toBe(false);
    expect(verifySignature("whsec_other", header, body, { nowSec: ts })).toBe(false);
    expect(verifySignature(secret, header, body, { nowSec: ts + 301 })).toBe(false);
    expect(verifySignature(secret, "t=abc,v1=zz", body, { nowSec: ts })).toBe(false);
  });

  it("makes distinct whsec_ secrets", () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a).toMatch(/^whsec_[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe("retry schedule", () => {
  it("is 1m, 5m, 30m, 2h, 6h then stops", () => {
    expect(RETRY_DELAYS_MS).toEqual([1 * MIN, 5 * MIN, 30 * MIN, 2 * HOUR, 6 * HOUR]);
    expect(MAX_ATTEMPTS).toBe(6);
    expect([1, 2, 3, 4, 5].map(retryDelayMs)).toEqual([1 * MIN, 5 * MIN, 30 * MIN, 2 * HOUR, 6 * HOUR]);
    expect(retryDelayMs(6)).toBeNull();
  });

  it("schedules the next try from now after a failure", () => {
    const now = new Date("2026-09-26T10:00:00Z");
    const plan = planAfterAttempt({ ok: false, attemptsMade: 3, failureCount: 0, now });
    expect(plan.status).toBe("pending");
    expect(plan.nextAttemptAt?.toISOString()).toBe("2026-09-26T10:30:00.000Z");
  });

  it("gives up after the last retry", () => {
    const plan = planAfterAttempt({ ok: false, attemptsMade: MAX_ATTEMPTS, failureCount: 0 });
    expect(plan.status).toBe("failed");
    expect(plan.nextAttemptAt).toBeNull();
  });

  it("marks success and resets the failure streak", () => {
    const plan = planAfterAttempt({ ok: true, attemptsMade: 4, failureCount: 7 });
    expect(plan).toMatchObject({ status: "succeeded", nextAttemptAt: null, failureCount: 0, pauseEndpoint: false });
  });

  it("tries test pings once and never counts them toward a pause", () => {
    const plan = planAfterAttempt({ ok: false, attemptsMade: 1, failureCount: AUTO_PAUSE_AFTER - 1, isTest: true });
    expect(plan).toMatchObject({ status: "failed", failureCount: AUTO_PAUSE_AFTER - 1, pauseEndpoint: false });
  });

  it("treats only 2xx as delivered", () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(204)).toBe(true);
    expect(isSuccessStatus(301)).toBe(false);
    expect(isSuccessStatus(410)).toBe(false);
    expect(isSuccessStatus(500)).toBe(false);
  });
});

describe("auto-pause", () => {
  it("pauses on the tenth consecutive failure", () => {
    expect(AUTO_PAUSE_AFTER).toBe(10);
    expect(shouldAutoPause(9)).toBe(false);
    expect(shouldAutoPause(10)).toBe(true);
  });

  it("counts failures across attempts until one crosses the line", () => {
    let failureCount = 0;
    const pausedAt: number[] = [];
    for (let i = 1; i <= 12; i++) {
      // Different deliveries, each on its first try: every failure counts.
      const plan = planAfterAttempt({ ok: false, attemptsMade: 1, failureCount });
      failureCount = plan.failureCount;
      if (plan.pauseEndpoint) pausedAt.push(i);
    }
    expect(pausedAt[0]).toBe(10);
  });

  it("a success in between restarts the count", () => {
    let failureCount = 0;
    for (let i = 0; i < 9; i++) failureCount = planAfterAttempt({ ok: false, attemptsMade: 1, failureCount }).failureCount;
    failureCount = planAfterAttempt({ ok: true, attemptsMade: 1, failureCount }).failureCount;
    const next = planAfterAttempt({ ok: false, attemptsMade: 1, failureCount });
    expect(next.failureCount).toBe(1);
    expect(next.pauseEndpoint).toBe(false);
  });
});

describe("endpoint URL rules", () => {
  it("accepts public https URLs", () => {
    expect(validateEndpointUrl("https://hooks.zapier.com/hooks/catch/1#x")).toEqual({
      ok: true,
      url: "https://hooks.zapier.com/hooks/catch/1",
    });
  });

  it("rejects http, credentials and private targets", () => {
    expect(validateEndpointUrl("http://example.com/x").ok).toBe(false);
    expect(validateEndpointUrl("https://user:pw@example.com/x").ok).toBe(false);
    expect(validateEndpointUrl("https://localhost/x").ok).toBe(false);
    expect(validateEndpointUrl("https://10.0.0.5/x").ok).toBe(false);
    expect(validateEndpointUrl("https://169.254.169.254/latest").ok).toBe(false);
    expect(validateEndpointUrl("https://[::1]/x").ok).toBe(false);
    expect(validateEndpointUrl("not a url").ok).toBe(false);
  });

  it("allows local http only when asked (development)", () => {
    expect(validateEndpointUrl("http://localhost:4000/hook", { allowLocal: true }).ok).toBe(true);
    expect(validateEndpointUrl("http://example.com/hook", { allowLocal: true }).ok).toBe(false);
  });
});

describe("event catalog and envelope", () => {
  it("cleans and describes event lists", () => {
    expect(cleanEventList(["invite.bounced", "nope", "candidate.decided", "invite.bounced"])).toEqual([
      "candidate.decided",
      "invite.bounced",
    ]);
    expect(describeEventList([...WORKSPACE_EVENTS])).toBe("All events");
    expect(describeEventList(["screening.completed"])).toBe("screening.completed");
  });

  it("builds the envelope with an absolute report link", () => {
    const now = new Date("2026-09-26T09:42:10Z");
    const env = buildEnvelope(
      "evt_1",
      "candidate.decided",
      { id: "ws1", slug: "northwind", name: "Northwind" },
      { candidate: { id: "c1", name: "Emma Clarke" }, decision: "passed", reportPath: "candidates/c1" },
      "https://app.example.com/",
      now,
    );
    expect(env).toEqual({
      id: "evt_1",
      event: "candidate.decided",
      createdAt: "2026-09-26T09:42:10.000Z",
      workspace: { id: "ws1", slug: "northwind", name: "Northwind" },
      data: {
        candidate: { id: "c1", name: "Emma Clarke" },
        decision: "passed",
        reportUrl: "https://app.example.com/w/northwind/candidates/c1",
      },
    });
    expect(summarizeDelivery("candidate.decided", env)).toBe("Emma Clarke, Passed");
    expect(newEventId()).toMatch(/^evt_[0-9a-f]{24}$/);
  });
});
