/**
 * Saving scorecards against a fake database: drafts and submits write the
 * author's card, a submitted card is locked, amendments need a reason and
 * leave an edit row, the report stays blind for a panel member who has not
 * submitted, and the nudge emails only the people still missing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Card = {
  id: string;
  sessionId: string;
  reviewerKey: string;
  reviewerName: string;
  userId: string | null;
  guestId: string | null;
  criteriaJson: string;
  ratingsJson: string;
  notes: string | null;
  recommendation: string | null;
  status: string;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const state = vi.hoisted(() => ({
  cards: [] as Card[],
  edits: [] as { scorecardId: string; actorKey: string; reason: string; beforeJson: string; afterJson: string; actorName: string; createdAt: Date }[],
  nudgedAt: null as Date | null,
  audits: [] as { action: string }[],
  emails: [] as { to: string; props: { scorecardUrl: string; hasDraft: boolean } }[],
}));

const session = {
  id: "s1",
  userId: "host",
  panelJson: JSON.stringify(["dan"]),
  workspaceId: "w1",
  title: "Frontend panel",
  format: "coding",
  type: "live",
  candidateName: "Ana Lima",
  candidate: null,
  creatorRole: "interviewer",
  shareToken: "share",
  createdById: null,
  status: "completed",
};

const db = vi.hoisted(() => ({}) as Record<string, unknown>);
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/workspace-audit", () => ({
  WORKSPACE_AUDIT_ACTIONS: new Proxy({}, { get: (_t, k) => String(k) }),
  writeWorkspaceAuditEntry: vi.fn(async (e: { action: string }) => void state.audits.push(e)),
}));
vi.mock("@/lib/interview/report-server", () => ({
  loadInterviewReport: vi.fn(async () => ({ rounds: [{ key: "c:ch1", title: "Debounced search" }], guide: { items: [] } })),
}));
vi.mock("@/lib/email", () => ({
  sendTemplatedBatch: vi.fn(async (_t: string, items: { to: string; props: { scorecardUrl: string; hasDraft: boolean } }[]) => {
    state.emails.push(...items);
    return { total: items.length, sent: items.length, suppressed: 0, failed: 0, outcomes: items.map(() => ({ status: "sent", provider: "resend" })) };
  }),
}));

function match(c: Card, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => (c as unknown as Record<string, unknown>)[k] === v);
}

Object.assign(db, {
  interviewSession: {
    findUnique: vi.fn(async () => ({ ...session, scorecardPassMark: null, scorecardNudgedAt: state.nudgedAt })),
    updateMany: vi.fn(async ({ where, data }: { where: { scorecardNudgedAt: Date | null }; data: { scorecardNudgedAt: Date } }) => {
      if (where.scorecardNudgedAt !== state.nudgedAt) return { count: 0 };
      state.nudgedAt = data.scorecardNudgedAt;
      return { count: 1 };
    }),
  },
  user: {
    findMany: vi.fn(async () => [
      { id: "host", name: "Priya Shah", email: "priya@acme.io" },
      { id: "dan", name: "Daniel Kim", email: "dan@acme.io" },
    ]),
  },
  interviewGuest: {
    findMany: vi.fn(async () => [{ id: "gm", email: "marco@guest.io", token: "tok_marco_1234567890" }]),
  },
  workspace: { findUnique: vi.fn(async () => ({ name: "Acme", slug: "acme" })) },
  workspaceMember: { findFirst: vi.fn(async () => null) },
  interviewScorecard: {
    findUnique: vi.fn(async ({ where }: { where: { sessionId_reviewerKey: { reviewerKey: string } } }) => state.cards.find((c) => c.reviewerKey === where.sessionId_reviewerKey.reviewerKey) ?? null),
    findMany: vi.fn(async () =>
      state.cards.map((c) => ({
        ...c,
        _count: { edits: state.edits.filter((e) => e.scorecardId === c.id).length },
        edits: state.edits.filter((e) => e.scorecardId === c.id),
      })),
    ),
    create: vi.fn(async ({ data }: { data: Partial<Card> }) => {
      const c = { id: `card${state.cards.length + 1}`, createdAt: new Date(), updatedAt: new Date(), notes: null, recommendation: null, submittedAt: null, ...data } as Card;
      state.cards.push(c);
      return c;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<Card> }) => {
      const hits = state.cards.filter((c) => match(c, where));
      hits.forEach((c) => Object.assign(c, data, { updatedAt: new Date() }));
      return { count: hits.length };
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Card> }) => {
      const c = state.cards.find((x) => x.id === where.id)!;
      Object.assign(c, data);
      return c;
    }),
  },
  interviewScorecardEdit: {
    create: vi.fn(async ({ data }: { data: (typeof state.edits)[number] }) => {
      state.edits.push({ ...data, createdAt: new Date() });
      return data;
    }),
  },
  $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
});

import { loadReportScorecards, nudgeMissingScorecards, reviewerFor, saveMyScorecard } from "@/lib/interview/scorecard-server";

const full = {
  ratings: { problem_solving: { r: 4, n: "Caught the race" }, code_quality: { r: 3, n: "" }, communication: { r: 3, n: "" } },
  notes: "Built the debounced search cleanly.",
  recommendation: "yes",
};

beforeEach(() => {
  state.cards = [];
  state.edits = [];
  state.nudgedAt = null;
  state.audits = [];
  state.emails = [];
});

describe("saveMyScorecard", () => {
  it("knows who is on the panel: host, panel members and emailed guests", async () => {
    expect(await reviewerFor("s1", { userId: "host" })).toMatchObject({ key: "u:host", name: "Priya Shah" });
    expect(await reviewerFor("s1", { guestId: "gm" })).toMatchObject({ key: "g:gm", kind: "guest" });
    expect(await reviewerFor("s1", { userId: "admin" })).toBeNull();
  });

  it("saves a draft with the criteria snapshotted, then submits it", async () => {
    const me = (await reviewerFor("s1", { userId: "dan" }))!;
    const d = await saveMyScorecard("s1", me, { intent: "draft", ratings: { problem_solving: { r: 2, n: "" } }, notes: "", recommendation: null });
    expect(d.ok).toBe(true);
    expect(state.cards[0]).toMatchObject({ reviewerKey: "u:dan", status: "draft", userId: "dan", guestId: null });
    expect(JSON.parse(state.cards[0].criteriaJson).map((c: { id: string }) => c.id)).toEqual(["problem_solving", "code_quality", "communication", "r:c:ch1"]);

    const bad = await saveMyScorecard("s1", me, { intent: "submit", ratings: { problem_solving: { r: 2, n: "" } }, notes: "", recommendation: null });
    expect(bad).toMatchObject({ ok: false, issues: ["Rate Code quality, Communication.", "Pick a recommendation."] });
    expect(state.cards[0].status).toBe("draft");

    const ok = await saveMyScorecard("s1", me, { intent: "submit", ...full });
    expect(ok.ok).toBe(true);
    expect(state.cards[0].status).toBe("submitted");
    expect(state.cards[0].submittedAt).toBeInstanceOf(Date);
    expect(state.audits.map((a) => a.action)).toEqual(["INTERVIEW_SCORECARD_SUBMITTED"]);
  });

  it("locks a submitted card: drafts are refused, amendments need a reason and are recorded", async () => {
    const me = (await reviewerFor("s1", { guestId: "gm" }))!;
    await saveMyScorecard("s1", me, { intent: "submit", ...full });
    expect(state.cards[0]).toMatchObject({ guestId: "gm", userId: null });

    const locked = await saveMyScorecard("s1", me, { intent: "draft", ...full, recommendation: "no" });
    expect(locked).toMatchObject({ ok: false, error: expect.stringContaining("locked") });
    expect(state.cards[0].recommendation).toBe("yes");

    expect(await saveMyScorecard("s1", me, { intent: "amend", ...full, recommendation: "no" })).toMatchObject({ ok: false });
    expect(await saveMyScorecard("s1", me, { intent: "amend", ...full, reason: "No change at all" })).toMatchObject({ ok: false, error: expect.stringContaining("Nothing changed") });

    const amended = await saveMyScorecard("s1", me, { intent: "amend", ...full, recommendation: "unsure", reason: "Rewatched my notes" });
    expect(amended.ok).toBe(true);
    expect(state.cards[0]).toMatchObject({ status: "submitted", recommendation: "unsure" });
    expect(state.edits).toHaveLength(1);
    expect(JSON.parse(state.edits[0].beforeJson).recommendation).toBe("yes");
    expect(JSON.parse(state.edits[0].afterJson).recommendation).toBe("unsure");
    expect(state.edits[0]).toMatchObject({ actorKey: "g:gm", reason: "Rewatched my notes" });
    expect(state.audits.map((a) => a.action)).toEqual(["INTERVIEW_SCORECARD_SUBMITTED", "INTERVIEW_SCORECARD_AMENDED"]);
    if (amended.ok) expect(amended.scorecard.card?.amendments).toBe(1);
  });
});

describe("loadReportScorecards", () => {
  it("keeps a panel member blind until they submit, and shows a recruiter everything submitted", async () => {
    const host = (await reviewerFor("s1", { userId: "host" }))!;
    const dan = (await reviewerFor("s1", { userId: "dan" }))!;
    await saveMyScorecard("s1", host, { intent: "submit", ...full });
    await saveMyScorecard("s1", dan, { intent: "draft", ratings: { problem_solving: { r: 1, n: "" } }, notes: "", recommendation: null });

    const blind = (await loadReportScorecards("s1", { userId: "dan" }))!;
    expect(blind.blind).toBe(true);
    expect(blind.cards).toEqual([]);
    expect(blind.summary).toBeNull();
    expect(blind.panel.map((p) => p.state)).toEqual(["submitted", "draft", "not_started"]);

    const recruiter = (await loadReportScorecards("s1", { userId: "recruiter" }))!;
    expect(recruiter.blind).toBe(false);
    expect(recruiter.viewer.state).toBeNull();
    expect(recruiter.cards.map((c) => c.key)).toEqual(["u:host"]);
    expect(recruiter.summary).toMatchObject({ average: 3.3, band: "at_or_above", submitted: 1 });

    const hostView = (await loadReportScorecards("s1", { userId: "host" }))!;
    expect(hostView.blind).toBe(false);
  });
});

describe("nudgeMissingScorecards", () => {
  it("emails only the people still missing, not the sender, with the right links, once an hour", async () => {
    const dan = (await reviewerFor("s1", { userId: "dan" }))!;
    await saveMyScorecard("s1", dan, { intent: "draft", ratings: {}, notes: "started", recommendation: null });

    const res = await nudgeMissingScorecards("s1", { userId: "host", email: "priya@acme.io", name: "Priya Shah" }, "https://app.example.com");
    expect(res).toMatchObject({ ok: true });
    expect(state.emails.map((e) => e.to)).toEqual(["dan@acme.io", "marco@guest.io"]);
    expect(state.emails[0].props).toMatchObject({ hasDraft: true, scorecardUrl: "https://app.example.com/w/acme/interviews/s1/scorecard" });
    expect(state.emails[1].props).toMatchObject({ hasDraft: false, scorecardUrl: "https://app.example.com/interview/s1/scorecard?guest=tok_marco_1234567890" });
    expect(state.audits.at(-1)?.action).toBe("INTERVIEW_SCORECARDS_NUDGED");

    const again = await nudgeMissingScorecards("s1", { userId: "host", email: null, name: "Priya" }, "https://app.example.com");
    expect(again).toMatchObject({ ok: false, error: expect.stringContaining("recently") });
    expect(state.emails).toHaveLength(2);
  });
});
