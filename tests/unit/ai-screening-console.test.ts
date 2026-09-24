import { describe, expect, it } from "vitest";
import {
  composeRoleTitle,
  parseRoleTitle,
  parseSummary,
  awaitsDecision,
  creditCheck,
  daysLeft,
  expiryDate,
  heldCredits,
  integrity,
  isExpired,
  parsePastedPeople,
  parseQueueSort,
  parseQueueView,
  queueHref,
  reminderDue,
  statusLabel,
  suggestion,
} from "@/lib/ai-interview/console";

const now = new Date("2026-09-24T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("statusLabel", () => {
  it("uses recruiter words", () => {
    expect(statusLabel("PENDING")).toBe("Invited");
    expect(statusLabel("ACTIVE")).toBe("In progress");
    expect(statusLabel("COMPLETED")).toBe("Finished");
    expect(statusLabel("EXPIRED")).toBe("Expired");
  });
});

describe("suggestion", () => {
  it("is null without a score", () => {
    expect(suggestion(null)).toBeNull();
  });
  it("maps the bands around the bar of 60", () => {
    expect(suggestion(86)?.label).toBe("Strong match");
    expect(suggestion(60)?.label).toBe("Good match");
    expect(suggestion(60)?.aboveBar).toBe(true);
    expect(suggestion(59)?.label).toBe("Borderline");
    expect(suggestion(59)?.aboveBar).toBe(false);
    expect(suggestion(12)?.label).toBe("Weak match");
  });
  it("calls out a submission with no code", () => {
    expect(suggestion(5, 0)?.label).toBe("No code written");
  });
});

describe("integrity", () => {
  it("tiers the suspicion score", () => {
    expect(integrity(null)).toBeNull();
    expect(integrity(8)?.label).toBe("Clean");
    expect(integrity(41)?.label).toBe("Some flags");
    expect(integrity(66)?.label).toBe("High risk");
  });
});

describe("queue parsing and links", () => {
  it("defaults to the review view sorted by score", () => {
    expect(parseQueueView(undefined)).toBe("review");
    expect(parseQueueView("nope")).toBe("review");
    expect(parseQueueSort(undefined, "review")).toBe("score");
    expect(parseQueueSort(undefined, "invited")).toBe("recent");
  });
  it("keeps every filter when paging", () => {
    const cur = { view: "all", q: "emma", screening: "b1", sort: "name", page: 1 };
    expect(queueHref("/x", cur, { page: 2 })).toBe("/x?view=all&q=emma&screening=b1&sort=name&page=2");
  });
  it("returns to page 1 when a filter changes", () => {
    expect(queueHref("/x", { view: "all", page: 3 }, { view: "invited" })).toBe("/x?view=invited");
  });
});

describe("awaitsDecision", () => {
  it("waits while the candidate has no decision", () => {
    expect(awaitsDecision("COMPLETED", "SCREENING", true)).toBe(true);
    expect(awaitsDecision("COMPLETED", "PASSED", true)).toBe(false);
    expect(awaitsDecision("COMPLETED", null, false)).toBe(true);
    expect(awaitsDecision("ACTIVE", "SCREENING", true)).toBe(false);
  });
});

describe("expiry and reminders", () => {
  const base = { status: "PENDING", startedAt: null, reminderSentAt: null, inviteSentAt: days(-3), createdAt: days(-3) };
  it("computes the expiry date", () => {
    expect(expiryDate(now, 7)?.toISOString()).toBe(days(7).toISOString());
    expect(expiryDate(now, null)).toBeNull();
  });
  it("expires only unstarted invites past their time", () => {
    expect(isExpired({ ...base, expiresAt: days(-1) }, now)).toBe(true);
    expect(isExpired({ ...base, expiresAt: days(1) }, now)).toBe(false);
    expect(isExpired({ ...base, expiresAt: null }, now)).toBe(false);
    expect(isExpired({ ...base, startedAt: days(-2), expiresAt: days(-1) }, now)).toBe(false);
  });
  it("sends one reminder after the chosen days", () => {
    expect(reminderDue({ ...base, expiresAt: days(4) }, 3, now)).toBe(true);
    expect(reminderDue({ ...base, expiresAt: days(4) }, 5, now)).toBe(false);
    expect(reminderDue({ ...base, expiresAt: days(4) }, 0, now)).toBe(false);
    expect(reminderDue({ ...base, expiresAt: days(4), reminderSentAt: days(-1) }, 3, now)).toBe(false);
    expect(reminderDue({ ...base, expiresAt: days(-1) }, 3, now)).toBe(false);
  });
  it("counts days left", () => {
    expect(daysLeft(days(1.5), now)).toBe(2);
    expect(daysLeft(null, now)).toBeNull();
  });
});

describe("credits", () => {
  it("holds credits for open, unstarted invites only", () => {
    const held = heldCredits(
      [
        { engagementLevel: "REACTIVE", status: "PENDING", startedAt: null, expiresAt: days(3) },
        { engagementLevel: "OBSERVER", status: "PENDING", startedAt: null, expiresAt: null },
        { engagementLevel: "COACH", status: "PENDING", startedAt: null, expiresAt: days(-1) },
        { engagementLevel: "COACH", status: "ACTIVE", startedAt: days(-1), expiresAt: null },
        { engagementLevel: "COACH", status: "PENDING", startedAt: null, expiresAt: null, practice: true },
      ],
      now,
    );
    expect(held).toBe(3);
  });
  it("checks a new screening against what is left", () => {
    expect(creditCheck(50, 4, 3, "OBSERVER")).toEqual({ needed: 6, available: 46, after: 40, ok: true });
    expect(creditCheck(5, 4, 2, "REACTIVE").ok).toBe(false);
  });
});

describe("parsePastedPeople", () => {
  it("reads names and emails in common shapes", () => {
    const people = parsePastedPeople(
      "Emma Larsen <Emma@Mail.com>\nliam.chen@mail.com, Liam Chen\nava@mail.com; noah_kim@mail.com\nemma@mail.com",
    );
    expect(people).toEqual([
      { name: "Emma Larsen", email: "emma@mail.com" },
      { name: "Liam Chen", email: "liam.chen@mail.com" },
      { name: "Ava", email: "ava@mail.com" },
      { name: "Noah Kim", email: "noah_kim@mail.com" },
    ]);
  });
});

describe("parseSummary", () => {
  it("splits a multi-round summary into strengths and gaps", () => {
    const s = parseSummary("Round 1 (54/100):\n+ [Strength] Clean hooks\n- [Flaw] No tests\n\nRound 2 (48/100):\n- Slow loop\nplain note");
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ round: 1, score: 54, strengths: ["Clean hooks"], gaps: ["No tests"] });
    expect(s[1]).toMatchObject({ round: 2, score: 48, gaps: ["Slow loop"], notes: ["plain note"] });
  });
  it("handles a single block and empty text", () => {
    expect(parseSummary("+ Good naming")).toEqual([{ round: null, score: null, strengths: ["Good naming"], gaps: [], notes: [] }]);
    expect(parseSummary(null)).toEqual([]);
  });
});


describe("role titles", () => {
  it("composes level and area", () => {
    expect(composeRoleTitle("Senior", "frontend")).toBe("Senior Frontend Engineer");
    expect(composeRoleTitle("Mid-level", "sales")).toBe("Account Executive");
    expect(composeRoleTitle("Lead", "design")).toBe("Lead Product Designer");
    expect(composeRoleTitle("Manager", "backend")).toBe("Backend Engineering Manager");
    expect(composeRoleTitle("Manager", "support")).toBe("Customer Support Manager");
    expect(composeRoleTitle("Junior", null)).toBe("Junior Engineer");
    expect(composeRoleTitle(null, "product")).toBe("Product Manager");
  });
  it("reads a composed title back", () => {
    expect(parseRoleTitle("Senior Frontend Engineer")).toEqual({ level: "Senior", area: "frontend" });
    expect(parseRoleTitle("Growth hacker")).toEqual({ level: null, area: null });
  });
});
