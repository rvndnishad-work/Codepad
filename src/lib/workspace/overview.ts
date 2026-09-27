/**
 * Derives everything the workspace Overview shows from data the dashboard
 * page already loads. Pure, so it runs on the client and in unit tests.
 *
 * The batch and date filters narrow the input first (scopeToBatch,
 * scopeToRange); buildAttention and buildOverview then work on whatever
 * they are given.
 */
import { awaitsReview } from "./display";
import { normalizeStage } from "@/lib/crm/stages";
import { takeHomeVerdict } from "@/lib/take-home/pass-mark";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Extra data the attention list and the filters read. Loaded next to the
 * dashboard data; every part is optional so older callers and tests work
 * without it.
 */
export type OverviewExtras = {
  /** Hiring batches, for the filter. */
  batches: { id: string; name: string }[];
  /** candidateId to batchId, for candidates in a batch. */
  candidateBatch: Record<string, string>;
  /** Submitted session take-homes: score and pass mark. */
  takeHomeScores: Record<string, { score: number | null; passMark: number }>;
  /**
   * Finished live interviews that have a scorecard. When this is present,
   * finished interviews missing from it show as "no scorecard yet".
   */
  scorecardSessionIds?: string[];
  /** Invites that bounced and were not delivered since. */
  bounced: { id: string; email: string; template: string; at: string; candidateId: string | null; candidateName: string | null }[];
  /** Failed calls to a connected tool (ATS, Slack...). Empty until a connection reports errors. */
  connectionErrors: { id: string; name: string; detail: string; at: string; href: string; candidateId?: string | null }[];
};

export type OverviewInput = {
  slug: string;
  candidates: { id: string; name: string; stage: string; createdAt: string; stageChangedAt: string | null }[];
  /** Live (non take-home) interview sessions. */
  sessions: {
    id: string;
    title: string;
    candidateName: string | null;
    candidateId: string | null;
    shareToken: string;
    scheduledAt: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    interviewerName: string | null;
  }[];
  /** Legacy single-challenge take-homes. */
  takeHomes: {
    id: string;
    candidateName: string;
    challengeTitle: string;
    status: string;
    expiresAt: string;
    submittedAt: string | null;
    attemptId: string | null;
    candidateId?: string | null;
    candidateStage?: string | null;
    createdAt?: string;
    score?: number | null;
  }[];
  /** Session-backed take-homes. */
  takeHomeSessions: {
    id: string;
    title: string;
    candidateName: string | null;
    status: string;
    deadlineAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    candidateId?: string | null;
    candidateStage?: string | null;
  }[];
  aiInterviewSessions: {
    id: string;
    candidateName: string;
    positionTitle: string;
    status: string;
    score: number | null;
    candidateId: string | null;
    candidateStage?: string | null;
    finishedAt: string | null;
    createdAt: string;
  }[];
  extras?: OverviewExtras;
};

export type AttentionKind = "review" | "expiring" | "interview" | "scorecard" | "email" | "connection";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  icon: "take-home" | "screening" | "clock" | "interview" | "scorecard" | "email" | "connection";
  /** What the item is about, shown as a small tag: "AI screening", "Take home", "Interview", "Email", "Connection". */
  tag: string;
  name: string;
  detail: string;
  /** When it became actionable (for sorting and the age column). */
  at: string;
  action: string;
  href: string;
};

export type OverviewData = {
  kpis: {
    active: number;
    addedThisWeek: number;
    toReview: number;
    reviewOverdue: number;
    upcomingInterviews: number;
    interviewsThisWeek: number;
    passed: number;
    passedThisMonth: number;
  };
  attention: AttentionItem[];
  upcoming: { id: string; at: string | null; name: string; detail: string; href: string }[];
  weekly: { label: string; count: number }[];
  /** Eight weekly counts, oldest first, for the KPI sparklines. */
  trends: { added: number[]; completed: number[]; interviews: number[]; passed: number[] };
  /** Finished AI screenings with a score. */
  scores: { count: number; average: number | null; buckets: { label: string; count: number }[] };
  activity: { id: string; who: string; what: string; at: string }[];
};

const within = (iso: string | null | undefined, ms: number, now: number) =>
  !!iso && now - new Date(iso).getTime() <= ms && new Date(iso).getTime() <= now;

/* ── Filters ─────────────────────────────────────────────────────────────── */

export type OverviewRange = "7d" | "30d" | "90d" | "all";

export const OVERVIEW_RANGES: { id: OverviewRange; label: string; days: number | null }[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

export type OverviewFilter = { batch: string; range: OverviewRange };

export const ALL_BATCHES = "all";

/** Filter from the URL: unknown batches and ranges fall back to everything. */
export function parseOverviewFilter(
  sp: { batch?: string | null; range?: string | null },
  batches: { id: string }[],
): OverviewFilter {
  const batch = sp.batch && batches.some((b) => b.id === sp.batch) ? sp.batch : ALL_BATCHES;
  const range = OVERVIEW_RANGES.some((r) => r.id === sp.range) ? (sp.range as OverviewRange) : "all";
  return { batch, range };
}

/** Only what belongs to candidates in one batch. Workspace-wide connection errors stay. */
export function scopeToBatch(input: OverviewInput, batchId: string): OverviewInput {
  if (batchId === ALL_BATCHES) return input;
  const map = input.extras?.candidateBatch ?? {};
  const inBatch = (id: string | null | undefined) => !!id && map[id] === batchId;
  return {
    ...input,
    candidates: input.candidates.filter((c) => inBatch(c.id)),
    sessions: input.sessions.filter((s) => inBatch(s.candidateId)),
    takeHomes: input.takeHomes.filter((t) => inBatch(t.candidateId)),
    takeHomeSessions: input.takeHomeSessions.filter((t) => inBatch(t.candidateId)),
    aiInterviewSessions: input.aiInterviewSessions.filter((s) => inBatch(s.candidateId)),
    extras: input.extras && {
      ...input.extras,
      bounced: input.extras.bounced.filter((b) => inBatch(b.candidateId)),
      connectionErrors: input.extras.connectionErrors.filter((e) => !e.candidateId || inBatch(e.candidateId)),
    },
  };
}

/**
 * Only records with activity in the range: a candidate added or moved in it,
 * an assessment sent, started or finished in it. Drives the KPI cards.
 */
export function scopeToRange(input: OverviewInput, range: OverviewRange, now: Date = new Date()): OverviewInput {
  const days = OVERVIEW_RANGES.find((r) => r.id === range)?.days ?? null;
  if (days == null) return input;
  const t = now.getTime();
  const any = (...iso: (string | null | undefined)[]) => iso.some((x) => within(x, days * DAY, t));
  return {
    ...input,
    candidates: input.candidates.filter((c) => any(c.createdAt, c.stageChangedAt)),
    // Upcoming interviews count however far ahead they are booked.
    sessions: input.sessions.filter((s) => any(s.createdAt, s.startedAt, s.finishedAt, s.scheduledAt) || (!!s.scheduledAt && new Date(s.scheduledAt).getTime() > t)),
    takeHomes: input.takeHomes.filter((x) => any(x.createdAt, x.submittedAt) || (!x.createdAt && !x.submittedAt)),
    takeHomeSessions: input.takeHomeSessions.filter((x) => any(x.createdAt, x.finishedAt)),
    aiInterviewSessions: input.aiInterviewSessions.filter((x) => any(x.createdAt, x.finishedAt)),
  };
}

/* ── Needs your attention ────────────────────────────────────────────────── */

const pct = (n: number) => `${Math.round(n)}%`;

/**
 * Everything waiting on someone in the workspace, each with a direct link:
 * interviews today, AI screenings and take-homes ready for a decision,
 * finished interviews with no scorecard, bounced invites, connection errors
 * and take-home links about to close. Today's interviews come first, then
 * the rest oldest first within each group.
 */
export function buildAttention(input: OverviewInput, now: Date = new Date()): AttentionItem[] {
  const t = now.getTime();
  const base = `/w/${input.slug}`;
  const extras = input.extras;
  const stageById = new Map(input.candidates.map((c) => [c.id, c.stage]));

  // AI screenings and take-homes waiting for a decision ---------------------
  const review: AttentionItem[] = [];
  for (const s of input.aiInterviewSessions) {
    if (s.status !== "COMPLETED" || !awaitsReview("screening", s.candidateStage)) continue;
    review.push({
      id: `ai-${s.id}`,
      kind: "review",
      icon: "screening",
      tag: "AI screening",
      name: s.candidateName,
      detail: `Ready for review${s.score !== null ? ` · ${pct(s.score)}` : ""} · ${s.positionTitle}`,
      at: s.finishedAt ?? s.createdAt,
      action: "Review",
      href: `${base}/ai-interviews/${s.id}`,
    });
  }
  for (const th of input.takeHomes) {
    if (th.status !== "SUBMITTED" || !awaitsReview("take-home", th.candidateStage)) continue;
    const v = takeHomeVerdict(th.score);
    review.push({
      id: `th-${th.id}`,
      kind: "review",
      icon: "take-home",
      tag: "Take home",
      name: th.candidateName,
      detail: `Take-home submitted · ${th.challengeTitle}${v && th.score != null ? ` · ${pct(th.score)}, ${v.label.toLowerCase()}` : ""}`,
      at: th.submittedAt ?? th.expiresAt,
      action: "Review",
      href: `${base}/take-homes/${th.id}`,
    });
  }
  for (const s of input.takeHomeSessions) {
    if (!s.finishedAt || !awaitsReview("take-home", s.candidateStage)) continue;
    const scored = extras?.takeHomeScores[s.id];
    const v = scored ? takeHomeVerdict(scored.score, scored.passMark) : null;
    review.push({
      id: `ths-${s.id}`,
      kind: "review",
      icon: "take-home",
      tag: "Take home",
      name: s.candidateName || "Unnamed candidate",
      detail: `Take-home submitted · ${s.title}${v && scored?.score != null ? ` · ${pct(scored.score)}, ${v.label.toLowerCase()}` : ""}`,
      at: s.finishedAt,
      action: "Review",
      href: `${base}/take-homes/${s.id}`,
    });
  }

  // Finished interviews with no scorecard (only when scorecards are loaded) -
  const scorecards: AttentionItem[] = [];
  if (extras?.scorecardSessionIds) {
    const has = new Set(extras.scorecardSessionIds);
    for (const s of input.sessions) {
      if (!s.finishedAt || has.has(s.id) || !within(s.finishedAt, 14 * DAY, t)) continue;
      const stage = s.candidateId ? stageById.get(s.candidateId) : undefined;
      // Once the recruiter has decided, a late scorecard changes nothing.
      if (stage && ["PASSED", "REJECTED"].includes(normalizeStage(stage))) continue;
      scorecards.push({
        id: `sc-${s.id}`,
        kind: "scorecard",
        icon: "scorecard",
        tag: "Interview",
        name: s.candidateName || "Unnamed candidate",
        detail: `${s.title} · ${s.interviewerName ? `${s.interviewerName} has` : "The interviewer has"} not sent a scorecard`,
        at: s.finishedAt,
        action: "Add scorecard",
        href: `${base}/interviews/${s.id}/report`,
      });
    }
  }

  // Bounced invites ----------------------------------------------------------
  const email: AttentionItem[] = (extras?.bounced ?? []).map((b) => ({
    id: `em-${b.id}`,
    kind: "email",
    icon: "email",
    tag: "Email",
    name: b.candidateName || b.email,
    detail: `Invite to ${b.email} bounced`,
    at: b.at,
    action: "Fix",
    href: b.candidateId ? `${base}/candidates/${b.candidateId}` : `${base}/emails`,
  }));

  // Connection errors --------------------------------------------------------
  const connection: AttentionItem[] = (extras?.connectionErrors ?? []).map((e) => ({
    id: `cx-${e.id}`,
    kind: "connection",
    icon: "connection",
    tag: "Connection",
    name: e.name,
    detail: e.detail,
    at: e.at,
    action: "Open",
    href: e.href,
  }));

  // Take-homes that expire in the next 48 hours and are not submitted -------
  const expiring: AttentionItem[] = [];
  for (const th of input.takeHomes) {
    const left = new Date(th.expiresAt).getTime() - t;
    if ((th.status === "PENDING" || th.status === "STARTED") && left > 0 && left <= 2 * DAY) {
      expiring.push({
        id: `exp-${th.id}`,
        kind: "expiring",
        icon: "clock",
        tag: "Take home",
        name: th.candidateName,
        detail: `${th.status === "STARTED" ? "Started, not submitted" : "Not started"} · link expires ${left <= DAY ? "today" : "tomorrow"}`,
        at: th.expiresAt,
        action: "Open",
        href: `${base}/take-homes/${th.id}`,
      });
    }
  }
  for (const s of input.takeHomeSessions) {
    if (s.finishedAt || !s.deadlineAt) continue;
    if (s.status === "cancelled" || s.status === "completed") continue;
    const left = new Date(s.deadlineAt).getTime() - t;
    if (left > 0 && left <= 2 * DAY) {
      expiring.push({
        id: `exps-${s.id}`,
        kind: "expiring",
        icon: "clock",
        tag: "Take home",
        name: s.candidateName || "Unnamed candidate",
        detail: `${s.title} · due ${left <= DAY ? "today" : "tomorrow"}`,
        at: s.deadlineAt,
        action: "Open",
        href: `${base}/take-homes/${s.id}`,
      });
    }
  }

  // Live interviews in the next 24 hours -------------------------------------
  const interviews: AttentionItem[] = input.sessions
    .filter((s) => !s.startedAt && !s.finishedAt && s.scheduledAt && new Date(s.scheduledAt).getTime() - t <= DAY)
    .map((s) => ({
      id: `iv-${s.id}`,
      kind: "interview",
      icon: "interview",
      tag: "Interview",
      name: s.candidateName || "Unnamed candidate",
      detail: `${s.title} · ${new Date(s.scheduledAt!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      at: s.scheduledAt!,
      action: "Open room",
      href: `${base}/interviews/${s.id}`,
    }));

  const oldestFirst = (a: AttentionItem, b: AttentionItem) => a.at.localeCompare(b.at);
  return [
    ...interviews.sort(oldestFirst),
    ...review.sort(oldestFirst),
    ...scorecards.sort(oldestFirst),
    ...email.sort(oldestFirst),
    ...connection.sort(oldestFirst),
    ...expiring.sort(oldestFirst),
  ];
}

export function buildOverview(input: OverviewInput, now: Date = new Date()): OverviewData {
  const t = now.getTime();
  const base = `/w/${input.slug}`;

  const attention = buildAttention(input, now);
  const review = attention.filter((a) => a.kind === "review");

  // Live interviews that have not happened yet ------------------------------
  const pendingLive = input.sessions
    .filter((s) => !s.startedAt && !s.finishedAt)
    .sort((a, b) => (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt));

  // KPIs -------------------------------------------------------------------
  const stageOf = (c: { stage: string }) => normalizeStage(c.stage);
  const open = input.candidates.filter((c) => stageOf(c) === "NEW" || stageOf(c) === "SCREENING");
  const liveFinished = input.sessions.filter((s) => within(s.finishedAt, 7 * DAY, t)).length;
  const aiFinished = input.aiInterviewSessions.filter((s) => within(s.finishedAt, 7 * DAY, t)).length;
  const kpis = {
    active: open.length,
    addedThisWeek: input.candidates.filter((c) => within(c.createdAt, 7 * DAY, t)).length,
    toReview: review.length,
    reviewOverdue: review.filter((r) => t - new Date(r.at).getTime() > 48 * HOUR).length,
    upcomingInterviews: pendingLive.length,
    interviewsThisWeek: liveFinished + aiFinished,
    passed: input.candidates.filter((c) => stageOf(c) === "PASSED").length,
    passedThisMonth: input.candidates.filter((c) => stageOf(c) === "PASSED" && within(c.stageChangedAt, 30 * DAY, t)).length,
  };

  // Completed assessments per week, oldest to newest, over 8 weeks ---------
  const weekStart = (i: number) => t - (8 - i) * 7 * DAY;
  const perWeek = (dates: (string | null | undefined)[]) =>
    Array.from({ length: 8 }, (_, i) =>
      dates.filter((iso) => {
        if (!iso) return false;
        const at = new Date(iso).getTime();
        return at > weekStart(i) && at <= weekStart(i) + 7 * DAY;
      }).length,
    );
  const finishedAt: string[] = [
    ...input.sessions.map((s) => s.finishedAt),
    ...input.aiInterviewSessions.map((s) => s.finishedAt),
    ...input.takeHomeSessions.map((s) => s.finishedAt),
    ...input.takeHomes.map((s) => s.submittedAt),
  ].filter((x): x is string => !!x);
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const end = t - (7 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    const count = finishedAt.filter((iso) => {
      const at = new Date(iso).getTime();
      return at > start && at <= end;
    }).length;
    const label = i === 7 ? "This week" : new Date(end - 6 * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return { label, count };
  });
  const trends = {
    added: perWeek(input.candidates.map((c) => c.createdAt)),
    completed: weekly.map((w) => w.count),
    interviews: perWeek([
      ...input.sessions.map((s) => s.finishedAt),
      ...input.aiInterviewSessions.map((s) => s.finishedAt),
    ]),
    passed: perWeek(input.candidates.filter((c) => stageOf(c) === "PASSED").map((c) => c.stageChangedAt)),
  };

  // AI screening scores ----------------------------------------------------
  const scored = input.aiInterviewSessions
    .filter((s) => s.status === "COMPLETED" && s.score !== null)
    .map((s) => s.score as number);
  const scores = {
    count: scored.length,
    average: scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
    buckets: [
      { label: "85 and up", count: scored.filter((x) => x >= 85).length },
      { label: "70 to 84", count: scored.filter((x) => x >= 70 && x < 85).length },
      { label: "50 to 69", count: scored.filter((x) => x >= 50 && x < 70).length },
      { label: "Under 50", count: scored.filter((x) => x < 50).length },
    ],
  };

  // Recent activity, newest first -----------------------------------------
  const activity = [
    ...input.candidates.map((c) => ({ id: `c-${c.id}`, who: c.name, what: "was added as a candidate", at: c.createdAt })),
    ...input.takeHomes
      .filter((th) => th.submittedAt)
      .map((th) => ({ id: `ths-${th.id}`, who: th.candidateName, what: `submitted ${th.challengeTitle}`, at: th.submittedAt! })),
    ...input.takeHomeSessions
      .filter((s) => s.finishedAt)
      .map((s) => ({ id: `tss-${s.id}`, who: s.candidateName || "A candidate", what: `submitted ${s.title}`, at: s.finishedAt! })),
    ...input.aiInterviewSessions
      .filter((s) => s.finishedAt && s.status === "COMPLETED")
      .map((s) => ({
        id: `ai-${s.id}`,
        who: s.candidateName,
        what: `finished an AI screening${s.score !== null ? ` (${Math.round(s.score)}%)` : ""}`,
        at: s.finishedAt!,
      })),
    ...input.sessions
      .filter((s) => s.finishedAt)
      .map((s) => ({ id: `iv-${s.id}`, who: s.candidateName || "A candidate", what: `finished ${s.title.toLowerCase()}`, at: s.finishedAt! })),
  ]
    .filter((a) => new Date(a.at).getTime() <= t)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const upcoming = pendingLive.slice(0, 4).map((s) => ({
    id: s.id,
    at: s.scheduledAt,
    name: s.candidateName || "Unnamed candidate",
    detail: [s.title, s.interviewerName].filter(Boolean).join(" · "),
    href: `${base}/interviews/${s.id}`,
  }));

  return { kpis, attention, upcoming, weekly, trends, scores, activity };
}
