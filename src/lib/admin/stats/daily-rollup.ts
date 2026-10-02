/**
 * Nightly roll-up of product activity into AdminDailyStat, so dashboards read
 * one row per day and metric instead of scanning raw tables.
 *
 * Every day is a UTC day: [00:00, 24:00). Each run recomputes yesterday and
 * any of the last BACKFILL_DAYS days that have no rows yet, from date-truncated
 * GROUP BY queries (no row fetching). A recomputed day is replaced whole, so
 * a breakdown value that disappears does not linger.
 *
 * Metrics (dim "" is the total; other dims are breakdowns):
 *   signups (dim: sign-in provider), sign_ins (dim: provider label),
 *   active_users, playground_runs (dim: language), playground_errors
 *   (dim: language), question_views (dim: technology), judge_runs,
 *   challenge_attempts, challenge_passed, ai_credits_used, ai_credits_bought,
 *   ai_credits_included (dim: INCLUDED / TRIAL), ai_credits_refunded,
 *   ai_screenings, take_homes, live_interviews, recording_seconds.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DAY_MS = 86_400_000;
export const BACKFILL_DAYS = 14;
export const ACTIVITY_RETENTION_DAYS = 90;

export const DAILY_METRICS = [
  "signups",
  "sign_ins",
  "active_users",
  "playground_runs",
  "playground_errors",
  "question_views",
  "judge_runs",
  "challenge_attempts",
  "challenge_passed",
  "ai_credits_used",
  "ai_credits_bought",
  "ai_credits_included",
  "ai_credits_refunded",
  "ai_screenings",
  "take_homes",
  "live_interviews",
  "recording_seconds",
] as const;
export type DailyMetric = (typeof DAILY_METRICS)[number];

// ── Pure day maths (unit tested) ─────────────────────────────────────────────

/** UTC midnight of the day `d` falls in. */
export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** "2026-10-01" for any instant on that UTC day. */
export function dayKey(d: Date | string): string {
  return utcDay(typeof d === "string" ? new Date(d) : d).toISOString().slice(0, 10);
}

/**
 * Days this run should (re)compute, oldest first: yesterday always (late
 * events land after midnight), plus every day in the `backfill` days before
 * today that has no rows yet. Today is never rolled: it is not over.
 */
export function daysToRoll(now: Date, haveDays: Iterable<Date | string>, backfill = BACKFILL_DAYS): Date[] {
  const today = utcDay(now);
  const have = new Set<string>();
  for (const d of haveDays) have.add(dayKey(d));
  const out: Date[] = [];
  for (let i = backfill; i >= 1; i--) {
    const day = addDays(today, -i);
    if (i === 1 || !have.has(dayKey(day))) out.push(day);
  }
  return out;
}

export type RawStat = { day: Date; metric: string; dim: string; value: number };

/**
 * Keep only rows on the target days, add a zero total for every metric and
 * target day that had no activity (so the day reads as rolled, not missing),
 * and merge duplicate keys by summing.
 */
export function buildStatRows(targetDays: Date[], raw: RawStat[], metrics: readonly string[] = DAILY_METRICS): RawStat[] {
  const targets = new Map(targetDays.map((d) => [dayKey(d), utcDay(d)]));
  const out = new Map<string, RawStat>();
  for (const r of raw) {
    const k = dayKey(r.day);
    const day = targets.get(k);
    if (!day) continue;
    const id = `${k}|${r.metric}|${r.dim}`;
    const value = Number(r.value) || 0;
    const prev = out.get(id);
    if (prev) prev.value += value;
    else out.set(id, { day, metric: r.metric, dim: r.dim, value });
  }
  for (const [k, day] of targets) {
    for (const m of metrics) {
      const id = `${k}|${m}|`;
      if (!out.has(id)) out.set(id, { day, metric: m, dim: "", value: 0 });
    }
  }
  return [...out.values()].sort(
    (a, b) => a.day.getTime() - b.day.getTime() || a.metric.localeCompare(b.metric) || a.dim.localeCompare(b.dim),
  );
}

// ── Queries ───────────────────────────────────────────────────────────────────

type Row = { day: Date; dim: string | null; value: number | bigint | null };

function rows(metric: string, list: Row[]): RawStat[] {
  return list.map((r) => ({ day: r.day, metric, dim: r.dim ?? "", value: Number(r.value ?? 0) }));
}

type ActivityRow = { day: Date; kind: string; label: string | null; ok: boolean; n: bigint };
type LedgerRow = { day: Date; kind: string; total: bigint | null };

/** Every metric for [from, to), grouped by UTC day. */
export async function computeDailyStats(from: Date, to: Date): Promise<RawStat[]> {
  const [signupsTotal, signupsByProvider, activity, active, challenges, ledger, screenings, takeHomes, live, recording] =
    await Promise.all([
      prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT date_trunc('day', "createdAt") AS day, '' AS dim, count(*) AS value
        FROM "User" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`),
      prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT date_trunc('day', u."createdAt") AS day,
          COALESCE(
            (SELECT min(a.provider) FROM "Account" a WHERE a."userId" = u.id),
            CASE WHEN u."passwordHash" IS NOT NULL THEN 'credentials' ELSE 'email' END
          ) AS dim,
          count(*) AS value
        FROM "User" u WHERE u."createdAt" >= ${from} AND u."createdAt" < ${to} GROUP BY 1, 2`),
      prisma.$queryRaw<ActivityRow[]>(Prisma.sql`
        SELECT date_trunc('day', "createdAt") AS day, kind, label, ok, count(*) AS n
        FROM "ActivityEvent"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
          AND kind IN ('sign_in', 'playground_run', 'question_view', 'judge_run')
        GROUP BY 1, 2, 3, 4`),
      prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT date_trunc('day', "createdAt") AS day, '' AS dim, count(DISTINCT "userId") AS value
        FROM "ActivityEvent" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND "userId" IS NOT NULL
        GROUP BY 1`),
      // Practice attempts only: take-home attempts belong to the hiring side.
      prisma.$queryRaw<{ day: Date; total: bigint; passed: bigint }[]>(Prisma.sql`
        SELECT date_trunc('day', c."startedAt") AS day, count(*) AS total,
          count(*) FILTER (WHERE c.status = 'passed') AS passed
        FROM "ChallengeAttempt" c
        WHERE c."startedAt" >= ${from} AND c."startedAt" < ${to}
          AND NOT EXISTS (SELECT 1 FROM "TakeHomeAssignment" t WHERE t."attemptId" = c.id)
        GROUP BY 1`),
      prisma.$queryRaw<LedgerRow[]>(Prisma.sql`
        SELECT date_trunc('day', "createdAt") AS day, kind, sum(amount) AS total
        FROM "AIInterviewCreditLedger"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
          AND kind IN ('CONSUMPTION', 'PURCHASE', 'INCLUDED', 'TRIAL', 'REFUND')
        GROUP BY 1, 2`),
      prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT date_trunc('day', "startedAt") AS day, '' AS dim, count(*) AS value
        FROM "AIInterviewSession"
        WHERE "startedAt" >= ${from} AND "startedAt" < ${to} AND practice = false
        GROUP BY 1`),
      prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT date_trunc('day', "createdAt") AS day, '' AS dim, count(*) AS value
        FROM "TakeHomeAssignment" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`),
      prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT date_trunc('day', "startedAt") AS day, '' AS dim, count(*) AS value
        FROM "InterviewSession"
        WHERE "startedAt" >= ${from} AND "startedAt" < ${to}
          AND "workspaceId" IS NOT NULL AND type <> 'take-home'
        GROUP BY 1`),
      prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT date_trunc('day', "startedAt") AS day, '' AS dim, COALESCE(sum(seconds), 0) AS value
        FROM "InterviewRecording" WHERE "startedAt" >= ${from} AND "startedAt" < ${to} GROUP BY 1`),
    ]);

  const out: RawStat[] = [
    ...rows("signups", signupsTotal),
    ...rows("signups", signupsByProvider),
    ...rows("active_users", active),
    ...rows("ai_screenings", screenings),
    ...rows("take_homes", takeHomes),
    ...rows("live_interviews", live),
    ...rows("recording_seconds", recording),
  ];

  const ACTIVITY_METRIC: Record<string, DailyMetric> = {
    sign_in: "sign_ins",
    playground_run: "playground_runs",
    question_view: "question_views",
    judge_run: "judge_runs",
  };
  for (const a of activity) {
    const metric = ACTIVITY_METRIC[a.kind];
    if (!metric) continue;
    const n = Number(a.n);
    out.push({ day: a.day, metric, dim: "", value: n });
    if (a.label && metric !== "judge_runs") out.push({ day: a.day, metric, dim: a.label.slice(0, 64), value: n });
    if (metric === "playground_runs" && !a.ok) {
      out.push({ day: a.day, metric: "playground_errors", dim: "", value: n });
      if (a.label) out.push({ day: a.day, metric: "playground_errors", dim: a.label.slice(0, 64), value: n });
    }
  }

  for (const c of challenges) {
    out.push({ day: c.day, metric: "challenge_attempts", dim: "", value: Number(c.total) });
    out.push({ day: c.day, metric: "challenge_passed", dim: "", value: Number(c.passed) });
  }

  for (const l of ledger) {
    const total = Number(l.total ?? 0);
    if (l.kind === "CONSUMPTION") out.push({ day: l.day, metric: "ai_credits_used", dim: "", value: -total });
    else if (l.kind === "PURCHASE") out.push({ day: l.day, metric: "ai_credits_bought", dim: "", value: total });
    else if (l.kind === "REFUND") out.push({ day: l.day, metric: "ai_credits_refunded", dim: "", value: total });
    else {
      out.push({ day: l.day, metric: "ai_credits_included", dim: "", value: total });
      out.push({ day: l.day, metric: "ai_credits_included", dim: l.kind, value: total });
    }
  }
  return out;
}

export type RollupSummary = {
  days: string[];
  rows: number;
  activityDeleted: number;
};

/** The cron entry point: roll the due days, then trim raw activity. */
export async function runDailyRollup(now = new Date()): Promise<RollupSummary> {
  const today = utcDay(now);
  const windowStart = addDays(today, -BACKFILL_DAYS);
  const present = await prisma.adminDailyStat.groupBy({
    by: ["day"],
    where: { day: { gte: windowStart, lt: today }, metric: "signups", dim: "" },
  });
  const days = daysToRoll(now, present.map((p) => p.day));

  let written = 0;
  if (days.length > 0) {
    const from = days[0];
    const to = addDays(days[days.length - 1], 1);
    const raw = await computeDailyStats(from, to);
    const data = buildStatRows(days, raw);
    await prisma.$transaction([
      prisma.adminDailyStat.deleteMany({ where: { day: { in: days } } }),
      prisma.adminDailyStat.createMany({ data }),
    ]);
    written = data.length;
  }

  const cutoff = addDays(today, -ACTIVITY_RETENTION_DAYS);
  const deleted = await prisma.activityEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });

  return { days: days.map((d) => dayKey(d)), rows: written, activityDeleted: deleted.count };
}

// ── Reading ──────────────────────────────────────────────────────────────────

/** Sum of each metric's total over [from, to). Missing metrics read 0. */
export async function sumDailyStats(from: Date, to: Date, metrics: readonly string[]): Promise<{ sums: Record<string, number>; days: number }> {
  const [grouped, dayRows] = await Promise.all([
    prisma.adminDailyStat.groupBy({
      by: ["metric"],
      where: { day: { gte: from, lt: to }, dim: "", metric: { in: [...metrics] } },
      _sum: { value: true },
    }),
    prisma.adminDailyStat.groupBy({
      by: ["day"],
      where: { day: { gte: from, lt: to }, dim: "", metric: "signups" },
    }),
  ]);
  const sums: Record<string, number> = Object.fromEntries(metrics.map((m) => [m, 0]));
  for (const g of grouped) sums[g.metric] = g._sum.value ?? 0;
  return { sums, days: dayRows.length };
}
