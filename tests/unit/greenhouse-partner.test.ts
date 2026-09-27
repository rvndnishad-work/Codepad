import { describe, expect, it } from "vitest";
import {
  buildTestStatus,
  callbackHostAllowed,
  candidateDisplayName,
  decisionFor,
  generatePartnerKey,
  hashPartnerKey,
  parseSendTest,
  partnerKeyFromAuthHeader,
  type StatusInput,
} from "@/lib/ats/greenhouse";
import { parseAtsSettings, stepIndex } from "@/lib/ats/settings";

const basic = (user: string, pass = "") => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

describe("partner key", () => {
  it("is short enough for Greenhouse and hashes stably", () => {
    const k = generatePartnerKey();
    expect(k.startsWith("cpgh_")).toBe(true);
    expect(k.length).toBeLessThan(171);
    expect(hashPartnerKey(k)).toBe(hashPartnerKey(k));
    expect(hashPartnerKey(k)).not.toBe(hashPartnerKey(k + "x"));
  });

  it("reads the key from Basic auth with an empty password", () => {
    expect(partnerKeyFromAuthHeader(basic("cpgh_abc"))).toBe("cpgh_abc");
    expect(partnerKeyFromAuthHeader(basic("cpgh_abc", "ignored"))).toBe("cpgh_abc");
  });

  it("rejects missing or malformed headers", () => {
    expect(partnerKeyFromAuthHeader(null)).toBeNull();
    expect(partnerKeyFromAuthHeader("Bearer cpgh_abc")).toBeNull();
    expect(partnerKeyFromAuthHeader(basic(""))).toBeNull();
    expect(partnerKeyFromAuthHeader(basic("x".repeat(200)))).toBeNull();
  });
});

describe("parseSendTest", () => {
  const body = {
    partner_test_id: "map_1",
    candidate: {
      first_name: "Ana",
      last_name: "Lima",
      preferred_name: null,
      email: "Ana.Lima@Example.com",
      phone_number: "+1 555",
      greenhouse_profile_url: "https://app.greenhouse.io/people/4417",
      id: 4417,
    },
    application: { id: 9001 },
    sent_by: "priya@example.com",
    url: "https://api.greenhouse.io/v1/partner/test_status/abc",
  };

  it("reads a Greenhouse send_test body", () => {
    const r = parseSendTest(body);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.partnerTestId).toBe("map_1");
    expect(r.value.candidate.email).toBe("ana.lima@example.com");
    expect(r.value.candidate.id).toBe("4417");
    expect(r.value.applicationId).toBe("9001");
    expect(r.value.callbackUrl).toBe("https://api.greenhouse.io/v1/partner/test_status/abc");
    expect(candidateDisplayName(r.value.candidate)).toBe("Ana Lima");
  });

  it("prefers the preferred name", () => {
    const r = parseSendTest({ ...body, candidate: { ...body.candidate, preferred_name: "Nana" } });
    expect(r.ok && candidateDisplayName(r.value.candidate)).toBe("Nana Lima");
  });

  it("lists every problem with a bad body", () => {
    const r = parseSendTest({ candidate: { email: "nope" } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toHaveLength(3);
  });

  it("drops a non-https callback", () => {
    const r = parseSendTest({ ...body, url: "http://api.greenhouse.io/x" });
    expect(r.ok && r.value.callbackUrl).toBeNull();
  });
});

describe("callbackHostAllowed", () => {
  it("allows Greenhouse hosts by default", () => {
    expect(callbackHostAllowed("https://api.greenhouse.io/v1/x", undefined)).toBe(true);
    expect(callbackHostAllowed("https://greenhouse.io/x", undefined)).toBe(true);
  });
  it("refuses other hosts, lookalikes and plain http", () => {
    expect(callbackHostAllowed("https://evil.example.com/x", undefined)).toBe(false);
    expect(callbackHostAllowed("https://greenhouse.io.evil.com/x", undefined)).toBe(false);
    expect(callbackHostAllowed("https://notgreenhouse.io/x", undefined)).toBe(false);
    expect(callbackHostAllowed("http://api.greenhouse.io/x", undefined)).toBe(false);
  });
  it("follows GREENHOUSE_CALLBACK_HOSTS", () => {
    expect(callbackHostAllowed("https://sandbox.example.com/x", "sandbox.example.com")).toBe(true);
    expect(callbackHostAllowed("https://api.greenhouse.io/x", "sandbox.example.com")).toBe(false);
  });
});

describe("test_status", () => {
  const asked = new Date("2026-09-20T10:00:00Z");
  const later = new Date("2026-09-21T10:00:00Z");
  const base: StatusInput = {
    requestStatus: "sent",
    requestCreatedAt: asked,
    result: { state: "scored", score: 84 },
    candidateStage: "SCREENING",
    stageChangedAt: later,
    profileUrl: "https://codepad.example/w/acme/candidates/c1",
    includeScore: true,
    screeningLabel: "AI screening for Senior Frontend Engineer",
  };

  it("never completes on a score alone", () => {
    expect(buildTestStatus(base)).toEqual({ partner_status: "completed_awaiting_decision" });
  });

  it("completes after a recruiter decision, with profile link and score", () => {
    const s = buildTestStatus({ ...base, candidateStage: "PASSED" });
    expect(s.partner_status).toBe("complete");
    expect(s.partner_profile_url).toBe(base.profileUrl);
    expect(s.partner_score).toBe(84);
    expect(s.metadata?.Decision).toBe("Passed");
  });

  it("leaves the score out when the workspace turned it off", () => {
    const s = buildTestStatus({ ...base, candidateStage: "REJECTED", includeScore: false });
    expect(s.partner_status).toBe("complete");
    expect(s.partner_score).toBeUndefined();
    expect(s.metadata?.Decision).toBe("Not passed");
  });

  it("waits for the screening to close even after a decision", () => {
    expect(buildTestStatus({ ...base, candidateStage: "PASSED", result: { state: "in_progress", score: null } }).partner_status).toBe("in_progress");
    expect(buildTestStatus({ ...base, candidateStage: "PASSED", result: { state: "invited", score: null } }).partner_status).toBe("invited");
  });

  it("ignores a decision made before Greenhouse asked", () => {
    const s = buildTestStatus({ ...base, candidateStage: "PASSED", stageChangedAt: new Date("2026-09-01T00:00:00Z") });
    expect(s.partner_status).toBe("completed_awaiting_decision");
    expect(decisionFor("PASSED", null, asked)).toBeNull();
  });

  it("reports a decision on an expired or never-sent screening", () => {
    expect(buildTestStatus({ ...base, candidateStage: "REJECTED", result: { state: "expired", score: null } }).partner_status).toBe("complete");
    expect(buildTestStatus({ ...base, candidateStage: "REJECTED", requestStatus: "waiting", result: null }).partner_status).toBe("complete");
    expect(buildTestStatus({ ...base, requestStatus: "waiting", result: null }).partner_status).toBe("waiting_for_recruiter");
  });
});

describe("settings", () => {
  it("fills defaults and ignores junk", () => {
    expect(parseAtsSettings("not json")).toEqual({ triggerStage: "", sendScore: true, setupComplete: false });
    expect(parseAtsSettings(JSON.stringify({ triggerStage: "Technical screen", sendScore: false, setupComplete: true })).sendScore).toBe(false);
    expect(parseAtsSettings(JSON.stringify({ webhookUrl: "https://x.test" })).webhookUrl).toBe("https://x.test");
  });
  it("clamps the wizard step", () => {
    expect(stepIndex("3")).toBe(3);
    expect(stepIndex("9")).toBe(1);
    expect(stepIndex(undefined)).toBe(1);
  });
});
