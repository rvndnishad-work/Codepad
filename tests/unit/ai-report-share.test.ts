import { describe, expect, it } from "vitest";
import { SHARE_LINK_DAYS, shareExpiry, shareLinkState, signShareToken, verifyShareToken } from "@/lib/ai-interview/report-share";
import { parseTestRun, playgroundTarget, serializeTestRun, toTestRun, transcriptStamps } from "@/lib/ai-interview/report-extras";
import { PREVIEW_TOKEN, previewReply, type PreviewState } from "@/lib/ai-interview/preview-fetch";
import { toSharedReport } from "@/lib/ai-interview/report-share-view";
import type { ReportData } from "@/lib/ai-interview/console-server";

const SECRET = "test-secret-please-ignore";
const NOW = Date.UTC(2026, 8, 26, 12, 0, 0);

describe("share token signing", () => {
  const exp = shareExpiry(NOW);

  it("expires links after seven days", () => {
    expect(SHARE_LINK_DAYS).toBe(7);
    expect(exp.getTime() - NOW).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("round-trips a link id and expiry", () => {
    const raw = signShareToken("link_1", exp, SECRET);
    const r = verifyShareToken(raw, NOW, SECRET);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.linkId).toBe("link_1");
      expect(r.expiresAt.getTime()).toBe(Math.floor(exp.getTime() / 1000) * 1000);
    }
  });

  it("is deterministic, so an active link can be copied again", () => {
    expect(signShareToken("link_1", exp, SECRET)).toBe(signShareToken("link_1", exp, SECRET));
  });

  it("is URL safe", () => {
    expect(signShareToken("clx9abc_def-1", exp, SECRET)).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("works until the expiry second and not after", () => {
    const raw = signShareToken("link_1", exp, SECRET);
    expect(verifyShareToken(raw, exp.getTime() - 1000, SECRET).ok).toBe(true);
    expect(verifyShareToken(raw, exp.getTime(), SECRET)).toEqual({ ok: false, reason: "expired" });
    expect(verifyShareToken(raw, exp.getTime() + 60_000, SECRET)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a token signed with another secret", () => {
    const raw = signShareToken("link_1", exp, "another-secret");
    expect(verifyShareToken(raw, NOW, SECRET)).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects an edited payload, such as a later expiry or another link", () => {
    const raw = signShareToken("link_1", exp, SECRET);
    const [, sig] = raw.split(".");
    const later = Buffer.from(JSON.stringify({ l: "link_1", e: Math.floor(exp.getTime() / 1000) + 86400 * 30 })).toString("base64url");
    const other = Buffer.from(JSON.stringify({ l: "link_2", e: Math.floor(exp.getTime() / 1000) })).toString("base64url");
    expect(verifyShareToken(`${later}.${sig}`, NOW, SECRET)).toEqual({ ok: false, reason: "signature" });
    expect(verifyShareToken(`${other}.${sig}`, NOW, SECRET)).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects an edited signature", () => {
    const raw = signShareToken("link_1", exp, SECRET);
    const flipped = raw.slice(0, -1) + (raw.endsWith("A") ? "B" : "A");
    expect(verifyShareToken(flipped, NOW, SECRET)).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects malformed input", () => {
    for (const raw of [null, undefined, "", "abc", ".sig", "body.", "a.b.c", "x".repeat(500)]) {
      expect(verifyShareToken(raw, NOW, SECRET)).toEqual({ ok: false, reason: "malformed" });
    }
  });

  it("rejects a validly signed payload of the wrong shape", () => {
    // Sign a body by hand through the public API's format to prove shape checks run after the signature.
    const good = signShareToken("link_1", exp, SECRET);
    expect(verifyShareToken(good, NOW, SECRET).ok).toBe(true);
    const r = verifyShareToken(`${Buffer.from("not json").toString("base64url")}.${good.split(".")[1]}`, NOW, SECRET);
    expect(r.ok).toBe(false);
  });

  it("throws without a server secret rather than signing with nothing", () => {
    const saved = { a: process.env.AUTH_SECRET, n: process.env.NEXTAUTH_SECRET };
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    try {
      expect(() => signShareToken("link_1", exp)).toThrow(/AUTH_SECRET/);
    } finally {
      if (saved.a !== undefined) process.env.AUTH_SECRET = saved.a;
      if (saved.n !== undefined) process.env.NEXTAUTH_SECRET = saved.n;
    }
  });

  it("reports the state of a stored link, revoked first", () => {
    expect(shareLinkState({ expiresAt: new Date(NOW + 1000), revokedAt: null }, NOW)).toBe("active");
    expect(shareLinkState({ expiresAt: new Date(NOW), revokedAt: null }, NOW)).toBe("expired");
    expect(shareLinkState({ expiresAt: new Date(NOW + 1000), revokedAt: new Date(NOW - 1) }, NOW)).toBe("revoked");
    expect(shareLinkState({ expiresAt: new Date(NOW - 1000), revokedAt: new Date(NOW - 1) }, NOW)).toBe("revoked");
  });
});

describe("transcript stamps", () => {
  const start = "2026-09-26T10:00:00.000Z";

  it("shows time since the start of the screening", () => {
    const s = transcriptStamps(
      [{ at: "2026-09-26T10:04:12.000Z" }, { at: "2026-09-26T10:04:31.900Z" }, { at: "2026-09-26T11:02:05.000Z" }],
      start,
    );
    expect(s.map((x) => x.label)).toEqual(["04:12", "04:31", "1:02:05"]);
    expect(s.every((x) => x.timed)).toBe(true);
  });

  it("numbers messages in order when no time was recorded", () => {
    expect(transcriptStamps([{}, {}, {}], start)).toEqual([
      { label: "#1", timed: false },
      { label: "#2", timed: false },
      { label: "#3", timed: false },
    ]);
  });

  it("mixes both for a screening that straddles the change", () => {
    const s = transcriptStamps([{}, { at: "2026-09-26T10:01:00.000Z" }], start);
    expect(s).toEqual([
      { label: "#1", timed: false },
      { label: "01:00", timed: true },
    ]);
  });

  it("counts from the first timed message when the start is unknown, and never goes negative", () => {
    expect(transcriptStamps([{ at: "2026-09-26T10:00:05.000Z" }, { at: "2026-09-26T10:00:35.000Z" }], null).map((x) => x.label)).toEqual(["00:00", "00:30"]);
    expect(transcriptStamps([{ at: "2026-09-26T09:59:00.000Z" }, { at: "2026-09-26T10:00:30.000Z" }], start).map((x) => x.label)).toEqual(["00:00", "01:30"]);
  });

  it("ignores unparseable times", () => {
    expect(transcriptStamps([{ at: "yesterday" }], start)).toEqual([{ label: "#1", timed: false }]);
  });
});

describe("stored test results", () => {
  it("normalises runner output and survives a store round trip", () => {
    const run = toTestRun(
      { results: [{ name: "adds", status: "pass" }, { name: "empty", status: "fail", error: "Expected 0" }, { status: "pass" }] },
      "2026-09-26T10:00:00.000Z",
    )!;
    expect(run).toMatchObject({ passed: 1, total: 2, compileError: false, stderr: null });
    expect(run.tests[1]).toEqual({ name: "empty", status: "fail", error: "Expected 0" });
    const back = parseTestRun(serializeTestRun(run), "2026-09-26T10:00:00.000Z");
    expect(back).toEqual(run);
  });

  it("keeps a compile error and its output", () => {
    const run = toTestRun({ results: [], compileError: true, stderr: "  SyntaxError: x  " })!;
    expect(run).toMatchObject({ total: 0, compileError: true, stderr: "SyntaxError: x" });
  });

  it("returns null for nothing stored or garbage", () => {
    expect(parseTestRun(null)).toBeNull();
    expect(parseTestRun("{not json")).toBeNull();
  });
});

describe("open in playground", () => {
  it("opens React code in the React sandbox with every file", () => {
    const t = playgroundTarget({ kind: "frontend", language: null, files: { "/App.js": 'import React from "react";', "/styles.css": "a{}", "/package-lock.json": "{}" } });
    expect(t).toEqual({ templateId: "react", files: { "/App.js": 'import React from "react";', "/styles.css": "a{}" } });
  });

  it("puts a server round's main file at the template entry", () => {
    const t = playgroundTarget({ kind: "dsa", language: "python", files: { "/solution.py": "print(1)", "/README.md": "x", "/package.json": "{}" } });
    expect(t).toEqual({ templateId: "python", files: { "/index.py": "print(1)", "/README.md": "x" } });
  });

  it("keeps the entry when the candidate already used it", () => {
    const t = playgroundTarget({ kind: "backend", language: "node", files: { "/index.js": "a", "/lib.js": "b" } });
    expect(t).toEqual({ templateId: "node", files: { "/index.js": "a", "/lib.js": "b" } });
  });

  it("has nothing to open for talk rounds or empty code", () => {
    expect(playgroundTarget({ kind: "theory", language: null, files: {} })).toBeNull();
    expect(playgroundTarget({ kind: "frontend", language: null, files: {} })).toBeNull();
  });
});

describe("preview as candidate", () => {
  const state = (): PreviewState => ({ chat: [], engagementLevel: "REACTIVE" });

  it("uses a placeholder token that is not a real invite", () => {
    expect(PREVIEW_TOKEN).toBe("preview");
  });

  it("lets code runs through and answers every screening call locally", () => {
    const st = state();
    expect(previewReply("/api/execute", { method: "POST" }, st)).toBeNull();
    expect(previewReply("https://cdn.example.com/x.js", undefined, st)).toBeNull();
    for (const route of ["status", "heartbeat", "observe", "extend", "submit", "theory", "theory/audio", "tts", "anything-new"]) {
      expect(previewReply(`/api/ai-interview/${route}`, { method: "POST", body: "{}" }, st)).not.toBeNull();
    }
    expect(previewReply("/api/ai-interview/status?inviteToken=preview", undefined, st)?.status).toBe(200);
  });

  it("never submits or extends time", () => {
    expect(previewReply("/api/ai-interview/submit", { method: "POST" }, state())?.status).toBe(409);
    expect(previewReply("/api/ai-interview/extend", { method: "POST" }, state())?.body).toMatchObject({ success: false });
  });

  it("greets once, then keeps the conversation locally", () => {
    const st = state();
    const first = previewReply("/api/ai-interview/message", { method: "POST", body: JSON.stringify({ message: "hello", roundId: "r1" }) }, st);
    expect((first?.body as { chatHistory: unknown[] }).chatHistory).toHaveLength(1);
    const second = previewReply("/api/ai-interview/message", { method: "POST", body: JSON.stringify({ message: "Can I use lodash?", roundId: "r1" }) }, st);
    const hist = (second?.body as { chatHistory: { role: string; text: string }[] }).chatHistory;
    expect(hist.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
    expect(hist[1].text).toBe("Can I use lodash?");
  });
});

describe("shared report contents", () => {
  const report = {
    id: "s1",
    status: "COMPLETED",
    candidate: { id: "c1", name: "Ana Lima", email: "ana@example.com", stage: "SCREENING" },
    role: "Senior Frontend Engineer",
    screening: null,
    passMark: 70,
    score: 81,
    suggestion: { label: "Above the bar", tone: "success", aboveBar: true, detail: "x" },
    integrity: null,
    suspicion: null,
    ratings: null,
    summary: [],
    chat: [{ role: "user", text: "hi", at: "2026-09-26T10:00:00.000Z" }],
    rounds: [
      {
        id: "r1",
        order: 0,
        title: "Theory",
        description: "",
        kind: "theory",
        label: "Theory",
        language: null,
        frameworkLabel: null,
        minutes: 10,
        status: "COMPLETED",
        score: 60,
        ratings: null,
        theory: {
          settings: {},
          questions: [
            {
              q: "What is a closure?",
              ref: "SECRET REFERENCE ANSWER",
              tech: null,
              difficulty: null,
              answer: { q: "What is a closure?", a: "A function with its scope", mode: "typed", skipped: false, seconds: 30, firstWordSec: null, blurs: 0, followUps: [], grade: { score: 4, verdict: "good", covered: "scope", missed: "SECRET REFERENCE POINT", reason: "r" } },
              clips: [],
            },
          ],
        },
        starter: {},
        files: {},
        diffs: null,
        stats: null,
        linesWritten: null,
        testable: false,
        tests: null,
      },
    ],
    notes: [{ id: "n1", body: "TEAM NOTE", author: "Sam", createdAt: "", mine: false }],
    inviteToken: "INVITE_TOKEN_SECRET",
  } as unknown as ReportData;

  it("never carries reference answers, grader notes on them, team notes, email or the invite token", () => {
    const shared = toSharedReport(report);
    const json = JSON.stringify(shared);
    for (const secret of ["SECRET REFERENCE", "TEAM NOTE", "ana@example.com", "INVITE_TOKEN_SECRET"]) {
      expect(json).not.toContain(secret);
    }
    expect(shared.rounds[0].theory?.[0]).toEqual({ q: "What is a closure?", answer: "A function with its scope", skipped: false, score: 4, followUps: [] });
    expect(shared.chat[0].at).toBe("2026-09-26T10:00:00.000Z");
  });
});
