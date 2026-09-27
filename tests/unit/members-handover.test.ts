import { describe, expect, it } from "vitest";
import { checkHandover, handoverSummary, handoverTargets, planInterviewChange, type HandoverCounts } from "@/lib/workspace/handover";
import { classifyInvites, parseInviteList, roleCounts, sendableInvites } from "@/lib/workspace/bulk-invite";
import { checkOwnerChange, isSingleOwner, ownerChangeAudit, ownersAfter } from "@/lib/workspace/ownership";

const none: HandoverCounts = { candidates: 0, batches: 0, hostedInterviews: 0, panelInterviews: 0, reviews: 0, apiKeys: 0, calendar: false };

describe("handover targets", () => {
  it("leaves out the person leaving and viewers", () => {
    const members = [
      { id: "m1", userId: "u1", role: "OWNER" },
      { id: "m2", userId: "u2", role: "VIEWER" },
      { id: "m3", userId: "u3", role: "INTERVIEWER" },
    ];
    expect(handoverTargets(members, "m3").map((m) => m.id)).toEqual(["m1"]);
  });
});

describe("checkHandover", () => {
  const eligible = new Set(["u1", "u3"]);
  const choices = { ownerUserId: null, interviewMode: "reassign" as const, interviewerUserId: null, reviewerUserId: null };

  it("needs nothing when there is nothing to hand over", () => {
    expect(checkHandover(none, choices, eligible)).toEqual({ ok: true });
  });

  it("asks for each kind of work that exists", () => {
    const res = checkHandover({ ...none, candidates: 2, hostedInterviews: 1, reviews: 3 }, choices, eligible);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["interviewer", "owner", "reviewer"]);
  });

  it("does not need a replacement when interviews are cancelled or only panel seats", () => {
    expect(checkHandover({ ...none, hostedInterviews: 2 }, { ...choices, interviewMode: "cancel" }, eligible)).toEqual({ ok: true });
    expect(checkHandover({ ...none, panelInterviews: 2 }, choices, eligible)).toEqual({ ok: true });
  });

  it("rejects people who cannot take work", () => {
    const res = checkHandover({ ...none, batches: 1 }, { ...choices, ownerUserId: "u2" }, eligible);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.owner).toMatch(/staying/);
    const optional = checkHandover({ ...none, panelInterviews: 1 }, { ...choices, interviewerUserId: "u9" }, eligible);
    expect(optional.ok).toBe(false);
  });
});

describe("planInterviewChange", () => {
  const s = { id: "s1", userId: "leaver", panelJson: JSON.stringify(["p1"]), questionsOwnerId: null };

  it("moves a hosted interview to the replacement", () => {
    expect(planInterviewChange(s, "leaver", "reassign", "new")).toEqual({ id: "s1", kind: "update", userId: "new", hostChanged: true });
  });

  it("cancels a hosted interview in cancel mode", () => {
    expect(planInterviewChange(s, "leaver", "cancel", null)).toEqual({ id: "s1", kind: "cancel", hostChanged: true });
  });

  it("takes the replacement off the panel when they become host", () => {
    const withReplacement = { ...s, panelJson: JSON.stringify(["new", "p1"]) };
    expect(planInterviewChange(withReplacement, "leaver", "reassign", "new")).toMatchObject({ userId: "new", panelJson: JSON.stringify(["p1"]) });
  });

  it("swaps a panel seat for the replacement", () => {
    const panel = { id: "s2", userId: "host", panelJson: JSON.stringify(["leaver", "p1"]), questionsOwnerId: "leaver" };
    expect(planInterviewChange(panel, "leaver", "reassign", "new")).toEqual({
      id: "s2",
      kind: "update",
      hostChanged: false,
      panelJson: JSON.stringify(["p1", "new"]),
      questionsOwnerId: "new",
    });
  });

  it("only drops a panel seat in cancel mode, and hands questions to the host", () => {
    const panel = { id: "s2", userId: "host", panelJson: JSON.stringify(["leaver"]), questionsOwnerId: "leaver" };
    expect(planInterviewChange(panel, "leaver", "cancel", null)).toEqual({ id: "s2", kind: "update", hostChanged: false, panelJson: "[]", questionsOwnerId: "host" });
  });

  it("does not seat the replacement twice when they already host", () => {
    const panel = { id: "s3", userId: "new", panelJson: JSON.stringify(["leaver"]), questionsOwnerId: null };
    expect(planInterviewChange(panel, "leaver", "reassign", "new")).toMatchObject({ panelJson: "[]" });
  });

  it("ignores interviews they have nothing to do with", () => {
    expect(planInterviewChange({ id: "s4", userId: "a", panelJson: null, questionsOwnerId: null }, "leaver", "reassign", "new")).toBeNull();
  });
});

describe("handoverSummary", () => {
  it("says what happens in plain words", () => {
    const lines = handoverSummary({ ...none, candidates: 1, hostedInterviews: 2, apiKeys: 1, calendar: true }, "cancel");
    expect(lines).toEqual([
      "1 candidate get a new owner.",
      "2 upcoming interviews they host are cancelled and the candidate is told.",
      "1 API key they made is revoked.",
      "Their calendar is disconnected.",
    ]);
  });
});

describe("parseInviteList", () => {
  it("splits commas, lines and mail-client names, lowercased and de-duplicated", () => {
    const rows = parseInviteList("Ana Lopez <Ana@Acme.com>, bo@acme.com\nbo@acme.com; not-an-email; cy@acme");
    expect(rows).toEqual([
      { email: "ana@acme.com", valid: true },
      { email: "bo@acme.com", valid: true },
      { email: "cy@acme", valid: false },
    ]);
  });
});

describe("classifyInvites", () => {
  const ctx = { memberEmails: ["Owner@acme.com"], pendingEmails: ["pending@acme.com"], allowedDomains: ["acme.com"], seatsRemaining: 1 };

  it("flags members, outside domains, duplicates and rows past the seat cap", () => {
    const rows = classifyInvites(
      [
        { email: "owner@acme.com", role: "ADMIN" },
        { email: "x@gmail.com", role: "VIEWER" },
        { email: "pending@acme.com", role: "RECRUITER" },
        { email: "new@eu.acme.com", role: "INTERVIEWER" },
        { email: "late@acme.com", role: "INTERVIEWER" },
        { email: "new@eu.acme.com", role: "VIEWER" },
      ],
      ctx,
    );
    expect(rows.map((r) => r.issue)).toEqual(["member", "domain", null, null, "seats", "duplicate"]);
    expect(rows[2].reinvite).toBe(true);
    expect(sendableInvites(rows).map((r) => r.email)).toEqual(["pending@acme.com", "new@eu.acme.com"]);
    expect(roleCounts(sendableInvites(rows))).toEqual({ RECRUITER: 1, INTERVIEWER: 1 });
  });

  it("allows any domain and any number when uncapped", () => {
    const rows = classifyInvites([{ email: "a@x.io", role: "VIEWER" }, { email: "b@y.io", role: "VIEWER" }], {
      memberEmails: [],
      pendingEmails: [],
      allowedDomains: [],
      seatsRemaining: null,
    });
    expect(rows.every((r) => r.issue === null)).toBe(true);
  });
});

describe("owner changes", () => {
  const owner = { id: "o", role: "OWNER" };
  const admin = { id: "a", role: "ADMIN" };

  it("only lets an owner make owners", () => {
    expect(checkOwnerChange({ caller: admin, target: { id: "r", role: "RECRUITER" }, mode: "add" }).ok).toBe(false);
    expect(checkOwnerChange({ caller: owner, target: admin, mode: "transfer" }).ok).toBe(true);
    expect(checkOwnerChange({ caller: owner, target: owner, mode: "add" }).ok).toBe(false);
    expect(checkOwnerChange({ caller: owner, target: { id: "o2", role: "OWNER" }, mode: "add" }).ok).toBe(false);
  });

  it("works out who owns the workspace afterwards", () => {
    const members = [owner, admin, { id: "v", role: "VIEWER" }];
    expect(ownersAfter(members, "a", "o", "add")).toEqual(["o", "a"]);
    expect(ownersAfter(members, "a", "o", "transfer")).toEqual(["a"]);
    expect(ownerChangeAudit(1, "transfer")).toBe("MEMBER_OWNERSHIP_TRANSFERRED");
    expect(ownerChangeAudit(2, "transfer")).toBe("MEMBER_OWNER_ADDED");
    expect(ownerChangeAudit(2, "add")).toBe("MEMBER_OWNER_ADDED");
    expect(isSingleOwner(members)).toBe(true);
    expect(isSingleOwner([owner, { id: "o2", role: "OWNER" }])).toBe(false);
  });
});
