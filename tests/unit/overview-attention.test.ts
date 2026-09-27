import { describe, expect, it } from "vitest";
import {
  ALL_BATCHES,
  buildAttention,
  buildOverview,
  parseOverviewFilter,
  scopeToBatch,
  scopeToRange,
  type OverviewExtras,
  type OverviewInput,
} from "@/lib/workspace/overview";

const NOW = new Date("2026-09-26T12:00:00.000Z");
const H = 3_600_000;
const ago = (hours: number) => new Date(NOW.getTime() - hours * H).toISOString();
const ahead = (hours: number) => new Date(NOW.getTime() + hours * H).toISOString();

const extras: OverviewExtras = {
  batches: [
    { id: "b-fe", name: "Senior Frontend Engineer" },
    { id: "b-be", name: "Backend Engineer" },
  ],
  candidateBatch: { ana: "b-fe", julia: "b-fe", liam: "b-fe", omar: "b-be", tomasz: "b-be" },
  takeHomeScores: { "ths-julia": { score: 68, passMark: 70 } },
  scorecardSessionIds: ["iv-done-with-card"],
  bounced: [{ id: "log1", email: "omar@example.com", template: "take-home-session-invite", at: ago(5), candidateId: "omar", candidateName: "Omar Haddad" }],
  connectionErrors: [
    { id: "gh1", name: "Tomasz Nowak", detail: "Greenhouse refused a write", at: ago(3), href: "/w/acme/ats", candidateId: "tomasz" },
    { id: "slack", name: "Slack", detail: "The Slack token was revoked", at: ago(2), href: "/w/acme/connections" },
  ],
};

const input: OverviewInput = {
  slug: "acme",
  candidates: [
    { id: "ana", name: "Ana Lima", stage: "SCREENING", createdAt: ago(24 * 3), stageChangedAt: ago(24 * 3) },
    { id: "julia", name: "Julia Rossi", stage: "SCREENING", createdAt: ago(24 * 40), stageChangedAt: ago(24 * 40) },
    { id: "liam", name: "Liam Chen", stage: "SCREENING", createdAt: ago(24 * 10), stageChangedAt: ago(24 * 10) },
    { id: "omar", name: "Omar Haddad", stage: "NEW", createdAt: ago(24 * 2), stageChangedAt: null },
    { id: "tomasz", name: "Tomasz Nowak", stage: "PASSED", createdAt: ago(24 * 60), stageChangedAt: ago(24 * 50) },
  ],
  sessions: [
    {
      id: "iv-liam", title: "Pairing interview", candidateName: "Liam Chen", candidateId: "liam", shareToken: "t1",
      scheduledAt: ago(26), startedAt: ago(26), finishedAt: ago(25), createdAt: ago(24 * 5), interviewerName: "Marco",
    },
    {
      id: "iv-done-with-card", title: "System design", candidateName: "Ana Lima", candidateId: "ana", shareToken: "t2",
      scheduledAt: ago(30), startedAt: ago(30), finishedAt: ago(29), createdAt: ago(24 * 5), interviewerName: "Priya",
    },
    {
      id: "iv-old", title: "Old interview", candidateName: "Julia Rossi", candidateId: "julia", shareToken: "t3",
      scheduledAt: ago(24 * 30), startedAt: ago(24 * 30), finishedAt: ago(24 * 30), createdAt: ago(24 * 31), interviewerName: "Marco",
    },
    {
      id: "iv-decided", title: "Final", candidateName: "Tomasz Nowak", candidateId: "tomasz", shareToken: "t4",
      scheduledAt: ago(10), startedAt: ago(10), finishedAt: ago(9), createdAt: ago(24 * 5), interviewerName: "Marco",
    },
    {
      id: "iv-today", title: "Intro call", candidateName: "Omar Haddad", candidateId: "omar", shareToken: "t5",
      scheduledAt: ahead(3), startedAt: null, finishedAt: null, createdAt: ago(24), interviewerName: "Priya",
    },
  ],
  takeHomes: [],
  takeHomeSessions: [
    {
      id: "ths-julia", title: "Payments API", candidateName: "Julia Rossi", status: "completed", deadlineAt: ahead(48),
      finishedAt: ago(20), createdAt: ago(24 * 4), candidateId: "julia", candidateStage: "SCREENING",
    },
    {
      id: "ths-omar", title: "Payments API", candidateName: "Omar Haddad", status: "scheduled", deadlineAt: ahead(20),
      finishedAt: null, createdAt: ago(24 * 4), candidateId: "omar", candidateStage: "NEW",
    },
    {
      id: "ths-cancelled", title: "Payments API", candidateName: "Ana Lima", status: "cancelled", deadlineAt: ahead(20),
      finishedAt: null, createdAt: ago(24 * 4), candidateId: "ana", candidateStage: "SCREENING",
    },
  ],
  aiInterviewSessions: [
    {
      id: "ai-ana", candidateName: "Ana Lima", positionTitle: "Senior Frontend Engineer", status: "COMPLETED", score: 81.4,
      candidateId: "ana", candidateStage: "SCREENING", finishedAt: ago(30), createdAt: ago(24 * 2),
    },
  ],
  extras,
};

describe("buildAttention", () => {
  const items = buildAttention(input, NOW);
  const byId = new Map(items.map((i) => [i.id, i]));

  it("covers every kind, today's interview first and expiring links last", () => {
    expect(items.map((i) => i.id)).toEqual([
      "iv-iv-today",
      "ai-ai-ana",
      "ths-ths-julia",
      "sc-iv-liam",
      "em-log1",
      "cx-gh1",
      "cx-slack",
      "exps-ths-omar",
    ]);
  });

  it("labels an AI screening ready for review with its score", () => {
    expect(byId.get("ai-ai-ana")).toMatchObject({
      tag: "AI screening",
      detail: "Ready for review · 81% · Senior Frontend Engineer",
      action: "Review",
      href: "/w/acme/ai-interviews/ai-ana",
    });
  });

  it("labels a submitted take-home against its own pass mark", () => {
    expect(byId.get("ths-ths-julia")).toMatchObject({
      tag: "Take home",
      detail: "Take-home submitted · Payments API · 68%, borderline",
      href: "/w/acme/take-homes/ths-julia",
    });
  });

  it("flags a recent interview with no scorecard, but not one that has a card, is old, or is decided", () => {
    expect(byId.get("sc-iv-liam")).toMatchObject({
      tag: "Interview",
      detail: "Pairing interview · Marco has not sent a scorecard",
      action: "Add scorecard",
      href: "/w/acme/interviews/iv-liam/report",
    });
    expect(byId.has("sc-iv-done-with-card")).toBe(false);
    expect(byId.has("sc-iv-old")).toBe(false);
    expect(byId.has("sc-iv-decided")).toBe(false);
  });

  it("links a bounced invite to the candidate so the address can be fixed", () => {
    expect(byId.get("em-log1")).toMatchObject({ tag: "Email", name: "Omar Haddad", detail: "Invite to omar@example.com bounced", action: "Fix", href: "/w/acme/candidates/omar" });
    const unknown = buildAttention({ ...input, extras: { ...extras, bounced: [{ ...extras.bounced[0], candidateId: null, candidateName: null }] } }, NOW);
    expect(unknown.find((i) => i.kind === "email")).toMatchObject({ name: "omar@example.com", href: "/w/acme/emails" });
  });

  it("shows connection errors with a link to the connection", () => {
    expect(byId.get("cx-gh1")).toMatchObject({ tag: "Connection", detail: "Greenhouse refused a write", action: "Open", href: "/w/acme/ats" });
  });

  it("skips cancelled take-homes when listing expiring links", () => {
    expect(byId.has("exps-ths-cancelled")).toBe(false);
    expect(byId.get("exps-ths-omar")).toMatchObject({ detail: "Payments API · due today" });
  });

  it("leaves scorecards, emails and connections out when the extra data is missing", () => {
    const bare = buildAttention({ ...input, extras: undefined }, NOW);
    expect(bare.some((i) => i.kind === "scorecard" || i.kind === "email" || i.kind === "connection")).toBe(false);
    // Without scores, a submitted take-home still shows, just without a label.
    expect(bare.find((i) => i.id === "ths-ths-julia")?.detail).toBe("Take-home submitted · Payments API");
  });

  it("feeds the review count on the KPI cards", () => {
    expect(buildOverview(input, NOW).kpis.toReview).toBe(2);
  });
});

describe("Overview filters", () => {
  it("reads the filter from the URL and ignores unknown values", () => {
    expect(parseOverviewFilter({ batch: "b-fe", range: "30d" }, extras.batches)).toEqual({ batch: "b-fe", range: "30d" });
    expect(parseOverviewFilter({ batch: "nope", range: "1y" }, extras.batches)).toEqual({ batch: ALL_BATCHES, range: "all" });
    expect(parseOverviewFilter({}, [])).toEqual({ batch: ALL_BATCHES, range: "all" });
  });

  it("narrows everything to one batch, keeping workspace-wide connection errors", () => {
    const fe = scopeToBatch(input, "b-fe");
    expect(fe.candidates.map((c) => c.id)).toEqual(["ana", "julia", "liam"]);
    const ids = buildAttention(fe, NOW).map((i) => i.id);
    expect(ids).toEqual(["ai-ai-ana", "ths-ths-julia", "sc-iv-liam", "cx-slack"]);

    const be = buildAttention(scopeToBatch(input, "b-be"), NOW).map((i) => i.id);
    expect(be).toEqual(["iv-iv-today", "em-log1", "cx-gh1", "cx-slack", "exps-ths-omar"]);
    expect(scopeToBatch(input, ALL_BATCHES)).toBe(input);
  });

  it("drives the KPI cards from the date range", () => {
    const all = buildOverview(input, NOW).kpis;
    const week = buildOverview(scopeToRange(input, "7d", NOW), NOW).kpis;
    // Julia (added 40 days ago) and Liam (10 days ago) drop out of a 7 day view.
    expect(all.active).toBe(4);
    expect(week.active).toBe(2);
    // Tomasz passed 50 days ago: counted all time, not in the last 30 days.
    expect(all.passed).toBe(1);
    expect(buildOverview(scopeToRange(input, "30d", NOW), NOW).kpis.passed).toBe(0);
    // An interview booked ahead always counts as upcoming.
    expect(week.upcomingInterviews).toBe(1);
    expect(scopeToRange(input, "all", NOW)).toBe(input);
  });
});
