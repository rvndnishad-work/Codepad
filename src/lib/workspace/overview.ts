/**
 * Derives everything the workspace Overview shows from data the dashboard
 * page already loads. Pure, so it runs on the client and in unit tests.
 */
import { awaitsReview } from "./display";
import { normalizeStage } from "@/lib/crm/stages";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

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
};

export type AttentionKind = "review" | "expiring" | "interview";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  icon: "take-home" | "screening" | "clock" | "interview";
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

export function buildOverview(input: OverviewInput, now: Date = new Date()): OverviewData {
  const t = now.getTime();
  const base = `/w/${input.slug}`;
  const candidateHref = (id: string | null | undefined, fallback: string) =>
    id ? `${base}/candidates/${id}` : fallback;

  // Waiting for review ------------------------------------------------------
  const review: AttentionItem[] = [];
  for (const th of input.takeHomes) {
    if (th.status !== "SUBMITTED" || !awaitsReview("take-home", th.candidateStage)) continue;
    review.push({
      id: `th-${th.id}`,
      kind: "review",
      icon: "take-home",
      name: th.candidateName,
      detail: `Take-home submitted · ${th.challengeTitle}`,
      at: th.submittedAt ?? th.expiresAt,
      action: "Review",
      href: th.attemptId ? `${base}/attempts/${th.attemptId}` : candidateHref(th.candidateId, `${base}?section=assessments&view=take-homes`),
    });
  }
  for (const s of input.takeHomeSessions) {
    if (!s.finishedAt || !awaitsReview("take-home", s.candidateStage)) continue;
    review.push({
      id: `ths-${s.id}`,
      kind: "review",
      icon: "take-home",
      name: s.candidateName || "Unnamed candidate",
      detail: `Take-home submitted · ${s.title}`,
      at: s.finishedAt,
      action: "Review",
      href: `${base}/take-homes/${s.id}`,
    });
  }
  for (const s of input.aiInterviewSessions) {
    if (s.status !== "COMPLETED" || !awaitsReview("screening", s.candidateStage)) continue;
    review.push({
      id: `ai-${s.id}`,
      kind: "review",
      icon: "screening",
      name: s.candidateName,
      detail: `AI screening finished${s.score !== null ? ` · ${Math.round(s.score)}%` : ""}`,
      at: s.finishedAt ?? s.createdAt,
      action: "Review",
      href: s.candidateId
        ? `${base}/ai-interviews?candidate=${s.candidateId}`
        : `${base}/ai-interviews?search=${encodeURIComponent(s.candidateName)}`,
    });
  }

  // Take-homes that expire in the next 48 hours and are not submitted -------
  const expiring: AttentionItem[] = [];
  for (const th of input.takeHomes) {
    const left = new Date(th.expiresAt).getTime() - t;
    if ((th.status === "PENDING" || th.status === "STARTED") && left > 0 && left <= 2 * DAY) {
      expiring.push({
        id: `exp-${th.id}`,
        kind: "expiring",
        icon: "clock",
        name: th.candidateName,
        detail: `${th.status === "STARTED" ? "Started, not submitted" : "Not started"} · link expires ${left <= DAY ? "today" : "tomorrow"}`,
        at: th.expiresAt,
        action: "Open",
        href: candidateHref(th.candidateId, `${base}?section=assessments&view=take-homes`),
      });
    }
  }
  for (const s of input.takeHomeSessions) {
    if (s.finishedAt || !s.deadlineAt) continue;
    const left = new Date(s.deadlineAt).getTime() - t;
    if (left > 0 && left <= 2 * DAY) {
      expiring.push({
        id: `exps-${s.id}`,
        kind: "expiring",
        icon: "clock",
        name: s.candidateName || "Unnamed candidate",
        detail: `${s.title} · due ${left <= DAY ? "today" : "tomorrow"}`,
        at: s.deadlineAt,
        action: "Open",
        href: `${base}/take-homes/${s.id}`,
      });
    }
  }

  // Live interviews that have not happened yet ------------------------------
  const pendingLive = input.sessions
    .filter((s) => !s.startedAt && !s.finishedAt)
    .sort((a, b) => (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt));
  const interviewItems: AttentionItem[] = pendingLive
    .filter((s) => s.scheduledAt && new Date(s.scheduledAt).getTime() - t <= DAY)
    .map((s) => ({
      id: `iv-${s.id}`,
      kind: "interview",
      icon: "interview",
      name: s.candidateName || "Unnamed candidate",
      detail: `${s.title} · ${new Date(s.scheduledAt!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      at: s.scheduledAt!,
      action: "Open room",
      href: `/interview/${s.shareToken}`,
    }));

  const oldestFirst = (a: AttentionItem, b: AttentionItem) => a.at.localeCompare(b.at);
  const attention = [
    ...interviewItems.sort(oldestFirst),
    ...review.sort(oldestFirst),
    ...expiring.sort(oldestFirst),
  ];

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
    href: `/interview/${s.shareToken}`,
  }));

  return { kpis, attention, upcoming, weekly, trends, scores, activity };
}
