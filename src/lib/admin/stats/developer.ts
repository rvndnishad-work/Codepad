/**
 * Stats for the Developers dashboard (/admin/developers).
 *
 * Every number is counted in the database: groupBy / aggregate / count, or a
 * date_trunc GROUP BY in raw SQL. Nothing fetches rows to bucket in JS.
 *
 * Long ranges (90 days, 12 months) read AdminDailyStat roll-ups for the
 * ActivityEvent-based series when the roll-up reaches back to the start of
 * the window (raw events are kept for 90 days only). Roll-up metric names
 * read here, one row per UTC day with dim "":
 *   active_users      distinct signed-in people who did something that day
 *   playground_runs   playground runs that day
 *   question_views    question page views that day
 *
 * Results are cached per range for 60 s per server instance.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { developerUserSql, developerUserWhere } from "@/lib/users/user-type";
import {
  type Bucket,
  type Comparison,
  type DevRange,
  type ProviderShare,
  type RangeWindow,
  type SeriesPoint,
  comparePeriods,
  fillBuckets,
  isNewTracking,
  peakOf,
  providerShares,
  rangeWindow,
  ratio,
  shouldUseRollup,
  utcDay,
} from "./developer-helpers";

export * from "./developer-helpers";

/** Same threshold the copilot, telemetry scan and emails use for a flagged attempt. */
export const AI_SUSPICION_THRESHOLD = 60;

const DAY_MS = 86_400_000;

export type DeveloperStats = {
  range: DevRange;
  window: RangeWindow;
  generatedAt: Date;

  signups: {
    total: number;
    comparison: Comparison;
    series: SeriesPoint[];
    peak: SeriesPoint | null;
    providers: ProviderShare[];
  };
  active: {
    /** Average distinct active people per day across the covered days. */
    daily: number | null;
    /** Distinct active people in the last 7 days. */
    weekly: number | null;
    source: "rollup" | "live";
    newTracking: boolean;
  };
  playground: {
    runs: number;
    runsPerDay: number;
    errors: number;
    errorRate: number | null;
    p95Ms: number | null;
    series: SeriesPoint[];
    languages: { label: string; count: number; pct: number }[];
    judgeRuns: number;
    judgeErrors: number;
    source: "rollup" | "live";
    newTracking: boolean;
  };
  challenges: {
    attempts: number;
    comparison: Comparison;
    passed: number;
    finished: number;
    passRate: number | null;
    medianSec: number | null;
  };
  questionViews: {
    /** Views in range from ActivityEvent; null when there are no view events (fallback in use). */
    total: number | null;
    series: SeriesPoint[];
    top: { id: string; title: string; views: number }[];
    /** "events": top in range from view events; "counter": all-time PrepQuestion.views. */
    topSource: "events" | "counter";
    /** "events": views in range; "counter": all-time PrepQuestion.views. */
    source: "events" | "rollup" | "counter";
    allTimeCounter: number;
    newTracking: boolean;
  };
  content: {
    questions: { published: number; total: number };
    challenges: { published: number; total: number };
    blogs: { published: number; total: number };
    publicSnippets: number;
    journeys: { started: number; finished: number };
  };
  moderation: {
    blogsPending: number;
    experiencesPending: number;
    reportsOpen: number;
    creatorApplications: number;
    flaggedAttempts: number;
  };
  creators: {
    currency: string;
    grossCents: number;
    feeCents: number;
    netCents: number;
    sales: number;
    otherCurrencies: { currency: string; grossCents: number; feeCents: number; netCents: number; sales: number }[];
    payoutsDue: number;
    payoutsDueCents: number;
  };
};

// ── cache ────────────────────────────────────────────────────────────────────

const TTL_MS = 60_000;
const cache = new Map<DevRange, { at: number; promise: Promise<DeveloperStats> }>();

export function clearDeveloperStatsCache() {
  cache.clear();
}

export function getDeveloperStats(range: DevRange): Promise<DeveloperStats> {
  const hit = cache.get(range);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = computeDeveloperStats(range).catch((err) => {
    cache.delete(range);
    throw err;
  });
  cache.set(range, { at: Date.now(), promise });
  return promise;
}

// ── SQL helpers ──────────────────────────────────────────────────────────────

/** Fixed literal, never user input. */
function truncUnit(b: Bucket) {
  return Prisma.raw(b === "week" ? "'week'" : "'day'");
}

type BucketRow = { at: Date; value: number };
type KindBucketRow = { kind: string; at: Date; value: number };

const TRACKED_KINDS = ["playground_run", "judge_run", "question_view"];

async function signupSeries(w: RangeWindow): Promise<BucketRow[]> {
  return prisma.$queryRaw<BucketRow[]>`
    SELECT date_trunc(${truncUnit(w.bucket)}, u."createdAt") AS "at", COUNT(*)::int AS "value"
    FROM "User" u
    WHERE u."createdAt" >= ${w.start} AND u."createdAt" < ${w.end}
      AND ${developerUserSql}
    GROUP BY 1 ORDER BY 1`;
}

async function signupProviders(w: RangeWindow): Promise<{ provider: string | null; count: number }[]> {
  return prisma.$queryRaw`
    SELECT (
      SELECT a."provider" FROM "Account" a WHERE a."userId" = u."id" ORDER BY a."provider" LIMIT 1
    ) AS "provider", COUNT(*)::int AS "count"
    FROM "User" u
    WHERE u."createdAt" >= ${w.start} AND u."createdAt" < ${w.end}
      AND ${developerUserSql}
    GROUP BY 1`;
}

type KindSummary = { kind: string; total: number; errors: number; p95: number | null; users: number };

async function activitySummary(w: RangeWindow): Promise<KindSummary[]> {
  return prisma.$queryRaw<KindSummary[]>`
    SELECT e."kind" AS "kind",
           COUNT(*)::int AS "total",
           (COUNT(*) FILTER (WHERE NOT e."ok"))::int AS "errors",
           percentile_cont(0.95) WITHIN GROUP (ORDER BY e."durationMs") AS "p95",
           COUNT(DISTINCT e."userId")::int AS "users"
    FROM "ActivityEvent" e
    WHERE e."createdAt" >= ${w.start} AND e."createdAt" < ${w.end}
      AND e."kind" IN (${Prisma.join(TRACKED_KINDS)})
    GROUP BY e."kind"`;
}

async function activitySeries(w: RangeWindow): Promise<KindBucketRow[]> {
  return prisma.$queryRaw<KindBucketRow[]>`
    SELECT e."kind" AS "kind", date_trunc(${truncUnit(w.bucket)}, e."createdAt") AS "at", COUNT(*)::int AS "value"
    FROM "ActivityEvent" e
    WHERE e."createdAt" >= ${w.start} AND e."createdAt" < ${w.end}
      AND e."kind" IN ('playground_run', 'question_view')
    GROUP BY 1, 2`;
}

/** Sum of per-day distinct active people, and the number of days with any. */
async function dailyActiveLive(w: RangeWindow): Promise<{ sum: number; days: number }> {
  const rows = await prisma.$queryRaw<{ sum: number | null; days: number }[]>`
    SELECT SUM(t."n")::int AS "sum", COUNT(*)::int AS "days" FROM (
      SELECT date_trunc('day', e."createdAt") AS "d", COUNT(DISTINCT e."userId") AS "n"
      FROM "ActivityEvent" e
      WHERE e."userId" IS NOT NULL AND e."createdAt" >= ${w.start} AND e."createdAt" < ${w.end}
      GROUP BY 1
    ) t`;
  return { sum: Number(rows[0]?.sum ?? 0), days: Number(rows[0]?.days ?? 0) };
}

async function weeklyActiveLive(now: Date): Promise<number> {
  const since = new Date(utcDay(now).getTime() - 6 * DAY_MS);
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(DISTINCT e."userId")::int AS "n" FROM "ActivityEvent" e
    WHERE e."userId" IS NOT NULL AND e."createdAt" >= ${since}`;
  return Number(rows[0]?.n ?? 0);
}

async function topLanguages(w: RangeWindow): Promise<{ label: string; count: number }[]> {
  return prisma.$queryRaw`
    SELECT COALESCE(NULLIF(e."label", ''), 'unknown') AS "label", COUNT(*)::int AS "count"
    FROM "ActivityEvent" e
    WHERE e."kind" = 'playground_run' AND e."createdAt" >= ${w.start} AND e."createdAt" < ${w.end}
    GROUP BY 1 ORDER BY 2 DESC LIMIT 5`;
}

async function topViewedQuestions(w: RangeWindow): Promise<{ id: string; title: string | null; views: number }[]> {
  return prisma.$queryRaw`
    SELECT e."targetId" AS "id", q."title" AS "title", COUNT(*)::int AS "views"
    FROM "ActivityEvent" e
    LEFT JOIN "PrepQuestion" q ON q."id" = e."targetId"
    WHERE e."kind" = 'question_view' AND e."targetId" IS NOT NULL
      AND e."createdAt" >= ${w.start} AND e."createdAt" < ${w.end}
    GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 5`;
}

type AttemptRow = { attempts: number; passed: number; finished: number; median: number | null };

async function challengeSummary(w: RangeWindow): Promise<AttemptRow> {
  const rows = await prisma.$queryRaw<AttemptRow[]>`
    SELECT COUNT(*)::int AS "attempts",
           (COUNT(*) FILTER (WHERE a."status" = 'passed'))::int AS "passed",
           (COUNT(*) FILTER (WHERE a."status" <> 'in_progress'))::int AS "finished",
           percentile_cont(0.5) WITHIN GROUP (ORDER BY a."durationSec") AS "median"
    FROM "ChallengeAttempt" a
    WHERE a."startedAt" >= ${w.start} AND a."startedAt" < ${w.end}`;
  const r = rows[0];
  return {
    attempts: Number(r?.attempts ?? 0),
    passed: Number(r?.passed ?? 0),
    finished: Number(r?.finished ?? 0),
    median: r?.median == null ? null : Number(r.median),
  };
}

const ROLLUP_METRICS = ["active_users", "playground_runs", "question_views"] as const;

async function rollupSeries(metric: string, w: RangeWindow): Promise<BucketRow[]> {
  return prisma.$queryRaw<BucketRow[]>`
    SELECT date_trunc(${truncUnit(w.bucket)}, s."day") AS "at", SUM(s."value")::float AS "value"
    FROM "AdminDailyStat" s
    WHERE s."metric" = ${metric} AND s."dim" = '' AND s."day" >= ${w.start} AND s."day" < ${w.end}
    GROUP BY 1 ORDER BY 1`;
}

// ── main ─────────────────────────────────────────────────────────────────────

/** "Published in range": publishedAt in range, or for rows that predate the column, createdAt. */
function publishedIn(w: RangeWindow) {
  return {
    OR: [
      { publishedAt: { gte: w.start, lt: w.end } },
      { publishedAt: null, createdAt: { gte: w.start, lt: w.end } },
    ],
  };
}

async function computeDeveloperStats(range: DevRange): Promise<DeveloperStats> {
  const now = new Date();
  const w = rangeWindow(range, now);
  const inRange = { gte: w.start, lt: w.end };
  const devUser = developerUserWhere;

  const [
    signupRows, providerRows, signupsPrev,
    firstEvents, firstRollups,
    summary, series, dau, wau, languages, topViewed,
    attempts, attemptsPrev,
    qPub, qTotal, cPub, cTotal, bPub, bTotal, snippetsPublic, journeysStarted, journeysFinished,
    blogsPending, experiencesPending, reportsOpen, creatorApplications, flaggedAttempts,
    earnings, payouts,
    questionCounter, topCounter,
  ] = await Promise.all([
    signupSeries(w),
    signupProviders(w),
    prisma.user.count({ where: { createdAt: { gte: w.prevStart, lt: w.prevEnd }, ...devUser } }),

    prisma.activityEvent.groupBy({ by: ["kind"], _min: { createdAt: true } }),
    prisma.adminDailyStat.groupBy({
      by: ["metric"],
      where: { metric: { in: [...ROLLUP_METRICS] }, dim: "" },
      _min: { day: true },
    }),

    activitySummary(w),
    activitySeries(w),
    dailyActiveLive(w),
    weeklyActiveLive(now),
    topLanguages(w),
    topViewedQuestions(w),

    challengeSummary(w),
    prisma.challengeAttempt.count({ where: { startedAt: { gte: w.prevStart, lt: w.prevEnd } } }),

    prisma.prepQuestion.count({ where: { status: "published", ...publishedIn(w) } }),
    prisma.prepQuestion.count({ where: { status: "published" } }),
    prisma.challenge.count({ where: { published: true, archivedAt: null, ...publishedIn(w) } }),
    prisma.challenge.count({ where: { published: true, archivedAt: null } }),
    prisma.blogPost.count({ where: { status: "PUBLISHED", ...publishedIn(w) } }),
    prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    prisma.snippet.count({ where: { visibility: "public", createdAt: inRange } }),
    prisma.prepJourney.count({ where: { createdAt: inRange } }),
    prisma.prepJourney.count({ where: { createdAt: inRange, status: "completed" } }),

    prisma.blogPost.count({ where: { status: "PENDING" } }),
    prisma.prepExperience.count({ where: { status: "pending" } }),
    prisma.contentReport.count({ where: { status: "open" } }),
    prisma.creatorApplication.count({ where: { status: "PENDING" } }),
    prisma.challengeAttempt.count({
      where: { aiSuspicionScore: { gte: AI_SUSPICION_THRESHOLD }, startedAt: inRange },
    }),

    prisma.creatorEarning.groupBy({
      by: ["currency"],
      where: { status: "paid", createdAt: inRange },
      _sum: { grossCents: true, feeCents: true, netCents: true },
      _count: { _all: true },
    }),
    prisma.creatorPayout.aggregate({
      where: { status: { in: ["pending", "in_transit"] } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),

    prisma.prepQuestion.aggregate({ _sum: { views: true } }),
    prisma.prepQuestion.findMany({
      where: { status: "published" },
      orderBy: { views: "desc" },
      take: 5,
      select: { id: true, title: true, views: true },
    }),
  ]);

  // First data per tracked metric: the earlier of raw events and roll-ups.
  const firstEvent = (kind: string) => firstEvents.find((r) => r.kind === kind)?._min.createdAt ?? null;
  const firstRollup = (metric: string) => firstRollups.find((r) => r.metric === metric)?._min.day ?? null;
  const earliest = (...ds: (Date | null)[]) => {
    const t = ds.filter((d): d is Date => !!d).map((d) => d.getTime());
    return t.length ? new Date(Math.min(...t)) : null;
  };
  const anyEventFirst = earliest(...firstEvents.map((r) => r._min.createdAt ?? null));

  // Sign-ups
  const signupSeriesDense = fillBuckets(signupRows, w.start, w.end, w.bucket);
  const signupTotal = signupRows.reduce((a, r) => a + Number(r.value), 0);

  // Active
  const activeRollup = shouldUseRollup(range, firstRollup("active_users"), w.start);
  let daily: number | null = null;
  if (activeRollup) {
    const rows = await rollupSeries("active_users", { ...w, bucket: "day" });
    daily = rows.length ? rows.reduce((a, r) => a + Number(r.value), 0) / range : null;
  } else if (anyEventFirst) {
    const coveredFrom = Math.max(w.start.getTime(), utcDay(anyEventFirst).getTime());
    const coveredDays = Math.max(1, Math.round((utcDay(now).getTime() - coveredFrom) / DAY_MS) + 1);
    daily = dau.days ? dau.sum / coveredDays : 0;
  }

  // Playground
  const kind = (k: string) => summary.find((s) => s.kind === k);
  const pg = kind("playground_run");
  const judge = kind("judge_run");
  const qv = kind("question_view");
  const pgRollup = shouldUseRollup(range, firstRollup("playground_runs"), w.start);
  const pgSeriesRows = pgRollup
    ? await rollupSeries("playground_runs", w)
    : series.filter((r) => r.kind === "playground_run");
  const pgSeries = fillBuckets(pgSeriesRows, w.start, w.end, w.bucket);
  const pgRuns = pgRollup ? pgSeries.reduce((a, p) => a + p.value, 0) : Number(pg?.total ?? 0);
  const pgFirst = earliest(firstEvent("playground_run"), firstRollup("playground_runs"));
  const pgDays = pgFirst
    ? Math.max(1, Math.round((utcDay(now).getTime() - Math.max(w.start.getTime(), utcDay(pgFirst).getTime())) / DAY_MS) + 1)
    : range;
  const langTotal = languages.reduce((a, l) => a + Number(l.count), 0);

  // Question views
  const qvRollup = shouldUseRollup(range, firstRollup("question_views"), w.start);
  const qvSeriesRows = qvRollup ? await rollupSeries("question_views", w) : series.filter((r) => r.kind === "question_view");
  const qvSeries = fillBuckets(qvSeriesRows, w.start, w.end, w.bucket);
  const qvTotal = qvRollup ? qvSeries.reduce((a, p) => a + p.value, 0) : Number(qv?.total ?? 0);
  const qvHasEvents = qvTotal > 0;
  const topFromEvents = qvHasEvents && topViewed.length > 0;

  // Creators
  const usd = earnings.find((e) => e.currency.toLowerCase() === "usd");
  const lead = usd ?? earnings[0];
  const toMoney = (e: (typeof earnings)[number]) => ({
    currency: e.currency,
    grossCents: e._sum.grossCents ?? 0,
    feeCents: e._sum.feeCents ?? 0,
    netCents: e._sum.netCents ?? 0,
    sales: e._count._all,
  });

  return {
    range,
    window: w,
    generatedAt: now,
    signups: {
      total: signupTotal,
      comparison: comparePeriods(signupTotal, signupsPrev),
      series: signupSeriesDense,
      peak: peakOf(signupSeriesDense),
      providers: providerShares(providerRows),
    },
    active: {
      daily,
      weekly: anyEventFirst ? wau : null,
      source: activeRollup ? "rollup" : "live",
      newTracking: isNewTracking(earliest(anyEventFirst, firstRollup("active_users")), now),
    },
    playground: {
      runs: pgRuns,
      runsPerDay: pgRuns / pgDays,
      errors: Number(pg?.errors ?? 0),
      errorRate: ratio(Number(pg?.errors ?? 0), Number(pg?.total ?? 0)),
      p95Ms: pg?.p95 == null ? null : Number(pg.p95),
      series: pgSeries,
      languages: languages.map((l) => ({
        label: l.label,
        count: Number(l.count),
        pct: Math.round((Number(l.count) / Math.max(1, Number(pg?.total ?? 0), langTotal)) * 100),
      })),
      judgeRuns: Number(judge?.total ?? 0),
      judgeErrors: Number(judge?.errors ?? 0),
      source: pgRollup ? "rollup" : "live",
      newTracking: isNewTracking(pgFirst, now),
    },
    challenges: {
      attempts: attempts.attempts,
      comparison: comparePeriods(attempts.attempts, attemptsPrev),
      passed: attempts.passed,
      finished: attempts.finished,
      passRate: ratio(attempts.passed, attempts.attempts),
      medianSec: attempts.median,
    },
    questionViews: {
      total: qvHasEvents ? qvTotal : null,
      series: qvSeries,
      top: topFromEvents
        ? topViewed.map((t) => ({ id: t.id, title: t.title ?? "Deleted question", views: Number(t.views) }))
        : topCounter.map((t) => ({ id: t.id, title: t.title, views: t.views })),
      topSource: topFromEvents ? "events" : "counter",
      source: qvHasEvents ? (qvRollup ? "rollup" : "events") : "counter",
      allTimeCounter: questionCounter._sum.views ?? 0,
      newTracking: isNewTracking(earliest(firstEvent("question_view"), firstRollup("question_views")), now),
    },
    content: {
      questions: { published: qPub, total: qTotal },
      challenges: { published: cPub, total: cTotal },
      blogs: { published: bPub, total: bTotal },
      publicSnippets: snippetsPublic,
      journeys: { started: journeysStarted, finished: journeysFinished },
    },
    moderation: { blogsPending, experiencesPending, reportsOpen, creatorApplications, flaggedAttempts },
    creators: {
      currency: lead?.currency ?? "usd",
      grossCents: lead?._sum.grossCents ?? 0,
      feeCents: lead?._sum.feeCents ?? 0,
      netCents: lead?._sum.netCents ?? 0,
      sales: lead?._count._all ?? 0,
      otherCurrencies: earnings.filter((e) => e !== lead).map(toMoney),
      payoutsDue: payouts._count._all,
      payoutsDueCents: payouts._sum.amountCents ?? 0,
    },
  };
}
