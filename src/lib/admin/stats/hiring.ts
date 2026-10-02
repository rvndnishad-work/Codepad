/**
 * Hiring-side numbers for /admin/recruiters: revenue, plans, seats, AI
 * credits, trials, video, screenings, take homes and live interviews, plus
 * the "needs attention" list.
 *
 * Everything is counted in the database (aggregate, groupBy, or one raw
 * aggregate query); no rows are loaded to be summed in JS. Results are plain
 * JSON (ISO date strings, numbers) because they go through unstable_cache,
 * which serialises them; each range is cached for 60 s.
 */
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credit-packs";
import { getEffectivePricing } from "@/lib/billing/pricing-copy-store";
import { planDisplayName } from "@/lib/billing/usage";

export type HiringRange = 7 | 30 | 90 | 365;
export const HIRING_RANGES: HiringRange[] = [7, 30, 90, 365];

/** Stripe statuses that still bill. */
export const LIVE_STRIPE_STATUSES = ["active", "trialing", "past_due"];
/** Plan names that are paid. STARTER is the legacy self-serve tier. */
export const PAID_PLANS = ["STARTER", "GROWTH", "ENTERPRISE"];
/** A workspace with fewer credits than this and an active batch needs attention. */
export const LOW_CREDIT_LIMIT = 10;

const DAY_MS = 86_400_000;

// ── Pure helpers (unit tested) ───────────────────────────────────────────

export function parseRange(v: string | string[] | undefined | null): HiringRange {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw === "12m" || raw === "365" || raw === "365d") return 365;
  const n = Number.parseInt(String(raw ?? "").replace(/d$/, ""), 10);
  return (HIRING_RANGES as number[]).includes(n) ? (n as HiringRange) : 30;
}

export function rangeLabel(range: HiringRange): string {
  return range === 365 ? "12 m" : `${range} d`;
}

export function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** First UTC midnight of a range that ends today (today counts as one day). */
export function rangeStart(range: HiringRange, now: Date = new Date()): Date {
  return new Date(utcDayStart(now).getTime() - (range - 1) * DAY_MS);
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Every day key from `since` to `now`, ascending. */
export function dayKeys(since: Date, now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let t = utcDayStart(since).getTime(); t <= utcDayStart(now).getTime(); t += DAY_MS) out.push(dayKey(new Date(t)));
  return out;
}

export type CreditDay = { day: string; used: number; included: number | null; bought: number | null; refunded: number };

export type RollupRow = { day: string; metric: string; value: number };
export type LiveRow = { day: string; kind: string; amount: number };

export const CREDIT_METRICS = {
  included: "ai_credits_included",
  bought: "ai_credits_bought",
  refunded: "ai_credits_refunded",
} as const;

/**
 * One row per day. Days with AdminDailyStat roll-ups (ai_credits_included,
 * ai_credits_bought, ai_credits_refunded) take those; other days come from
 * the live ledger, where CONSUMPTION is used and REFUND refunded and the
 * included/bought split is unknown (null).
 */
export function mergeCreditDays(keys: string[], rollups: RollupRow[], live: LiveRow[]): CreditDay[] {
  const roll = new Map<string, { included: number; bought: number; refunded: number }>();
  for (const r of rollups) {
    const e = roll.get(r.day) ?? { included: 0, bought: 0, refunded: 0 };
    if (r.metric === CREDIT_METRICS.included) e.included += r.value;
    else if (r.metric === CREDIT_METRICS.bought) e.bought += r.value;
    else if (r.metric === CREDIT_METRICS.refunded) e.refunded += r.value;
    roll.set(r.day, e);
  }
  const liveMap = new Map<string, { used: number; refunded: number }>();
  for (const r of live) {
    const e = liveMap.get(r.day) ?? { used: 0, refunded: 0 };
    if (r.kind === "CONSUMPTION") e.used += -r.amount;
    else if (r.kind === "REFUND") e.refunded += r.amount;
    liveMap.set(r.day, e);
  }
  return keys.map((day) => {
    const r = roll.get(day);
    if (r) return { day, used: Math.round(r.included + r.bought), included: Math.round(r.included), bought: Math.round(r.bought), refunded: Math.round(r.refunded) };
    const l = liveMap.get(day) ?? { used: 0, refunded: 0 };
    return { day, used: Math.max(0, l.used), included: null, bought: null, refunded: Math.max(0, l.refunded) };
  });
}

/** First day (key) without a roll-up; the live query starts there. Null when every day has one. */
export function firstUncoveredDay(keys: string[], rollupDays: Set<string>, today: string): string | null {
  // Today is never final, so it is always read live.
  for (const k of keys) if (!rollupDays.has(k) || k === today) return k;
  return null;
}

/** Peak bar: the highest day, the latest one on a tie. */
export function peakDay(days: { day: string; used: number }[]): { day: string; used: number } | null {
  let best: { day: string; used: number } | null = null;
  for (const d of days) if (d.used > 0 && (!best || d.used >= best.used)) best = d;
  return best;
}

export type PackPrice = { credits: number; priceCents: number };

/**
 * Credit pack revenue from PURCHASE rows grouped by credit amount. The ledger
 * stores credits, not cents, so each pack is priced by matching its credit
 * count against today's effective packs, then the default packs. Amounts that
 * match no pack are counted in `unpriced`.
 */
export function creditPackRevenue(
  groups: { credits: number; count: number }[],
  effective: PackPrice[],
  defaults: PackPrice[],
): { cents: number; packs: number; credits: number; unpriced: number } {
  let cents = 0;
  let packs = 0;
  let credits = 0;
  let unpriced = 0;
  for (const g of groups) {
    packs += g.count;
    credits += g.credits * g.count;
    const match = effective.find((p) => p.credits === g.credits) ?? defaults.find((p) => p.credits === g.credits);
    if (match) cents += match.priceCents * g.count;
    else unpriced += g.count;
  }
  return { cents, packs, credits, unpriced };
}

export function rate(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

// ── Types ────────────────────────────────────────────────────────────────

export type HiringStats = {
  range: HiringRange;
  since: string;
  generatedAt: string;
  revenue: {
    mrrCents: number;
    subscriptions: number;
    lastSyncedAt: string | null;
    creditPacks: { cents: number; packs: number; credits: number; unpriced: number; priceSource: "pack table" };
  };
  paid: { total: number; byPlan: { plan: string; label: string; count: number }[] };
  seats: { billed: number; members: number; unbilled: number; unbilledWorkspaces: number };
  credits: {
    used: number;
    refunded: number;
    /** Range totals. From roll-ups where present, else an estimate (see estimated). */
    included: number;
    bought: number;
    estimated: boolean;
    days: CreditDay[];
    peak: { day: string; used: number } | null;
  };
  trials: { active: number; endingIn7Days: number; ended: number; converted: number; conversionRate: number | null };
  video: { workspaces: number; recordedSeconds: number; storedBytes: number; expiring48hBytes: number; expiring48hCount: number };
  screenings: { total: number; completed: number; expired: number; refunded: number; completionRate: number | null };
  takeHomes: { total: number; submitted: number; completionRate: number | null };
  interviews: { total: number; completed: number; abandoned: number; completionRate: number | null; medianMinutes: number | null };
};

// ── Queries ──────────────────────────────────────────────────────────────

async function creditDays(since: Date, now: Date) {
  const keys = dayKeys(since, now);
  const today = dayKey(now);
  const rollupRows = await prisma.adminDailyStat.findMany({
    where: { metric: { in: Object.values(CREDIT_METRICS) }, dim: "", day: { gte: since } },
    select: { day: true, metric: true, value: true },
    take: 3 * 400,
  });
  const rollups = rollupRows.map((r) => ({ day: dayKey(r.day), metric: r.metric, value: r.value })).filter((r) => r.day !== today);
  const covered = new Set(rollups.map((r) => r.day));
  const liveFrom = firstUncoveredDay(keys, covered, today);
  let live: LiveRow[] = [];
  if (liveFrom) {
    const rows = await prisma.$queryRaw<{ day: string; kind: string; amount: number }[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, kind, SUM(amount)::float8 AS amount
      FROM "AIInterviewCreditLedger"
      WHERE "createdAt" >= ${new Date(`${liveFrom}T00:00:00Z`)} AND kind IN ('CONSUMPTION', 'REFUND')
      GROUP BY 1, 2`;
    live = rows.map((r) => ({ day: r.day, kind: r.kind, amount: Number(r.amount) }));
  }
  // Live rows only fill days without a roll-up.
  live = live.filter((r) => !covered.has(r.day));
  return { days: mergeCreditDays(keys, rollups, live), anyLive: liveFrom !== null };
}

/**
 * Included credits used in the range, per workspace a lower bound:
 * granted − expired − still left, clamped to [0, used]. The ledger does not
 * mark which pool a consumption came from, so live numbers are an estimate.
 */
async function includedUsedEstimate(since: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ included: number }[]>`
    SELECT COALESCE(SUM(LEAST(l.used, GREATEST(0, l.granted - l.expired - w."includedCreditsLeft"))), 0)::float8 AS included
    FROM (
      SELECT "workspaceId",
        SUM(CASE WHEN kind = 'CONSUMPTION' THEN -amount ELSE 0 END) AS used,
        SUM(CASE WHEN kind = 'INCLUDED' THEN amount ELSE 0 END) AS granted,
        SUM(CASE WHEN kind = 'INCLUDED_EXPIRED' THEN -amount ELSE 0 END) AS expired
      FROM "AIInterviewCreditLedger"
      WHERE "createdAt" >= ${since} AND kind IN ('CONSUMPTION', 'INCLUDED', 'INCLUDED_EXPIRED')
      GROUP BY "workspaceId"
    ) l
    JOIN "Workspace" w ON w.id = l."workspaceId"`;
  return Math.round(Number(rows[0]?.included ?? 0));
}

async function seatTotals() {
  const rows = await prisma.$queryRaw<{ billed: number; members: number; unbilled: number; workspaces: number }[]>`
    SELECT
      COALESCE(SUM(COALESCE(w."stripeSeatQuantity", 0)), 0)::int AS billed,
      COALESCE(SUM(COALESCE(m.cnt, 0)), 0)::int AS members,
      COALESCE(SUM(GREATEST(COALESCE(m.cnt, 0) - COALESCE(w."stripeSeatQuantity", 0), 0)), 0)::int AS unbilled,
      COUNT(*) FILTER (WHERE COALESCE(m.cnt, 0) > COALESCE(w."stripeSeatQuantity", 0))::int AS workspaces
    FROM "Workspace" w
    LEFT JOIN (SELECT "workspaceId", COUNT(*)::int AS cnt FROM "WorkspaceMember" GROUP BY 1) m ON m."workspaceId" = w.id
    WHERE w."stripeStatus" IN (${Prisma.join(LIVE_STRIPE_STATUSES)})`;
  const r = rows[0];
  return { billed: r?.billed ?? 0, members: r?.members ?? 0, unbilled: r?.unbilled ?? 0, unbilledWorkspaces: r?.workspaces ?? 0 };
}

async function medianInterviewMinutes(since: Date): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ m: number | null }[]>`
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")))::float8 AS m
    FROM "InterviewSession"
    WHERE "workspaceId" IS NOT NULL AND type <> 'take-home' AND status = 'completed'
      AND "startedAt" IS NOT NULL AND "finishedAt" > "startedAt" AND "createdAt" >= ${since}`;
  const sec = rows[0]?.m;
  return sec == null ? null : Math.round(Number(sec) / 60);
}

async function computeHiringStats(range: HiringRange): Promise<HiringStats> {
  const now = new Date();
  const since = rangeStart(range, now);
  const in7Days = new Date(now.getTime() + 7 * DAY_MS);
  const in48h = new Date(now.getTime() + 2 * DAY_MS);
  const trialWhere = { trialEndsAt: { gt: now }, stripeSubscriptionId: null, planName: { notIn: ["GROWTH", "ENTERPRISE"] } };
  const liveSessions = { workspaceId: { not: null }, type: { not: "take-home" }, createdAt: { gte: since } };

  const [
    mrr, lastSync, packGroups, pricing, planGroups, seats, credit, includedEst,
    trialsActive, trialsEnding, trialsEnded, trialsConverted,
    videoWorkspaces, recordedAgg, storedAgg, expiringAgg,
    aiGroups, aiRefunds, thSessions, thSessionsDone, thLegacy, thLegacyDone, liveGroups, median,
  ] = await Promise.all([
    prisma.workspace.aggregate({ where: { stripeStatus: { in: LIVE_STRIPE_STATUSES } }, _sum: { stripeMrrCents: true }, _count: { _all: true } }),
    prisma.workspace.aggregate({ _max: { stripeSyncedAt: true } }),
    prisma.aIInterviewCreditLedger.groupBy({
      by: ["amount"],
      where: { kind: "PURCHASE", stripeChargeId: { not: null }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    getEffectivePricing().catch(() => null),
    prisma.workspace.groupBy({ by: ["planName"], where: { planName: { in: PAID_PLANS } }, _count: { _all: true } }),
    seatTotals(),
    creditDays(since, now),
    includedUsedEstimate(since),
    prisma.workspace.count({ where: trialWhere }),
    prisma.workspace.count({ where: { ...trialWhere, trialEndsAt: { gt: now, lte: in7Days } } }),
    prisma.workspace.count({ where: { trialEndsAt: { gte: since, lte: now } } }),
    prisma.workspace.count({
      where: { trialEndsAt: { gte: since, lte: now }, OR: [{ planName: { in: PAID_PLANS } }, { stripeSubscriptionId: { not: null } }] },
    }),
    prisma.workspace.count({ where: { videoEnabled: true } }),
    prisma.interviewRecording.aggregate({ where: { deletedAt: null, startedAt: { gte: since } }, _sum: { seconds: true } }),
    prisma.interviewRecording.aggregate({ where: { deletedAt: null }, _sum: { sizeBytes: true } }),
    prisma.interviewRecording.aggregate({
      where: { deletedAt: null, expiresAt: { gt: now, lte: in48h } },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    }),
    prisma.aIInterviewSession.groupBy({ by: ["status"], where: { practice: false, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.aIInterviewCreditLedger.count({ where: { kind: "REFUND", createdAt: { gte: since } } }),
    prisma.interviewSession.count({ where: { workspaceId: { not: null }, type: "take-home", createdAt: { gte: since } } }),
    prisma.interviewSession.count({ where: { workspaceId: { not: null }, type: "take-home", status: "completed", createdAt: { gte: since } } }),
    prisma.takeHomeAssignment.count({ where: { workspaceId: { not: null }, createdAt: { gte: since } } }),
    prisma.takeHomeAssignment.count({ where: { workspaceId: { not: null }, submittedAt: { not: null }, createdAt: { gte: since } } }),
    prisma.interviewSession.groupBy({ by: ["status"], where: liveSessions, _count: { _all: true } }),
    medianInterviewMinutes(since),
  ]);

  const packs = creditPackRevenue(
    packGroups.map((g) => ({ credits: g.amount, count: g._count._all })),
    pricing?.packs ?? [],
    AI_CREDIT_PACKS.map((p) => ({ credits: p.credits, priceCents: p.priceCents })),
  );

  const used = credit.days.reduce((s, d) => s + d.used, 0);
  const refunded = credit.days.reduce((s, d) => s + d.refunded, 0);
  // Range split: roll-up days give exact numbers; when any day is live, use the estimate for the whole range.
  const rolledIncluded = credit.days.reduce((s, d) => s + (d.included ?? 0), 0);
  const included = credit.anyLive ? Math.min(used, includedEst) : rolledIncluded;

  const byStatus = (rows: { status: string; _count: { _all: number } }[]) => {
    const m = new Map(rows.map((r) => [r.status, r._count._all]));
    return { total: rows.reduce((s, r) => s + r._count._all, 0), get: (k: string) => m.get(k) ?? 0 };
  };
  const ai = byStatus(aiGroups);
  const live = byStatus(liveGroups);
  const thTotal = thSessions + thLegacy;
  const thDone = thSessionsDone + thLegacyDone;

  const byPlan = PAID_PLANS.map((plan) => ({
    plan,
    label: plan === "STARTER" ? "Starter" : planDisplayName(plan),
    count: planGroups.find((g) => g.planName === plan)?._count._all ?? 0,
  })).filter((p) => p.count > 0);

  return {
    range,
    since: since.toISOString(),
    generatedAt: now.toISOString(),
    revenue: {
      mrrCents: mrr._sum.stripeMrrCents ?? 0,
      subscriptions: mrr._count._all,
      lastSyncedAt: lastSync._max.stripeSyncedAt?.toISOString() ?? null,
      creditPacks: { ...packs, priceSource: "pack table" },
    },
    paid: { total: byPlan.reduce((s, p) => s + p.count, 0), byPlan },
    seats,
    credits: { used, refunded, included, bought: Math.max(0, used - included), estimated: credit.anyLive, days: credit.days, peak: peakDay(credit.days) },
    trials: {
      active: trialsActive,
      endingIn7Days: trialsEnding,
      ended: trialsEnded,
      converted: trialsConverted,
      conversionRate: rate(trialsConverted, trialsEnded),
    },
    video: {
      workspaces: videoWorkspaces,
      recordedSeconds: recordedAgg._sum.seconds ?? 0,
      storedBytes: Number(storedAgg._sum.sizeBytes ?? 0),
      expiring48hBytes: Number(expiringAgg._sum.sizeBytes ?? 0),
      expiring48hCount: expiringAgg._count._all,
    },
    screenings: {
      total: ai.total,
      completed: ai.get("COMPLETED"),
      expired: ai.get("EXPIRED"),
      refunded: aiRefunds,
      completionRate: rate(ai.get("COMPLETED"), ai.total),
    },
    takeHomes: { total: thTotal, submitted: thDone, completionRate: rate(thDone, thTotal) },
    interviews: {
      total: live.total,
      completed: live.get("completed"),
      abandoned: live.get("abandoned"),
      completionRate: rate(live.get("completed"), live.total - live.get("scheduled") - live.get("cancelled")),
      medianMinutes: median,
    },
  };
}

/** Hiring stats for a range, cached 60 s per range. */
export function getHiringStats(range: HiringRange): Promise<HiringStats> {
  return unstable_cache(() => computeHiringStats(range), ["admin-hiring-stats", String(range)], {
    revalidate: 60,
    tags: ["admin-hiring-stats"],
  })();
}

// ── Needs attention ──────────────────────────────────────────────────────

export type AttentionKind = "past_due" | "trial_ending" | "low_credits" | "storage_expiring";

export type AttentionItem = {
  kind: AttentionKind;
  workspaceId: string;
  name: string;
  slug: string;
  plan: string;
  tone: "bad" | "warn";
  /** Short pill text: "Payment past due", "Trial ends in 2 days". */
  reason: string;
  /** Muted detail next to the pill. */
  detail: string;
  /** Sort key: the sooner, the higher. */
  at: string;
  action: { label: string; href: string; external?: boolean };
};

function planLabel(ws: { planName: string; trialEndsAt: Date | null; stripeSubscriptionId: string | null; stripeSeatQuantity: number | null }, now: Date) {
  const onTrial = ws.trialEndsAt && ws.trialEndsAt > now && !ws.stripeSubscriptionId && !["GROWTH", "ENTERPRISE"].includes(ws.planName);
  if (onTrial) return "Trial";
  const name = ws.planName === "STARTER" ? "Starter" : planDisplayName(ws.planName);
  return ws.stripeSeatQuantity ? `${name}, ${ws.stripeSeatQuantity} ${ws.stripeSeatQuantity === 1 ? "seat" : "seats"}` : name;
}

export function daysUntil(target: Date, now: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / DAY_MS));
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

const billingHref = (id: string) => `/admin/workspaces/${id}/billing`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "29 Sep" in UTC. */
export function shortDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

async function computeNeedsAttention(): Promise<AttentionItem[]> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * DAY_MS);
  const in48h = new Date(now.getTime() + 2 * DAY_MS);
  const LIMIT = 25;

  const [pastDue, trials, activeBatches, expiring] = await Promise.all([
    prisma.workspace.findMany({
      where: { stripeStatus: { in: ["past_due", "unpaid"] } },
      orderBy: { stripePastDueSince: "asc" },
      take: LIMIT,
      select: { id: true, stripePastDueSince: true, stripeCustomerId: true, stripeStatus: true },
    }),
    prisma.workspace.findMany({
      where: { trialEndsAt: { gt: now, lte: in3Days }, stripeSubscriptionId: null, planName: { notIn: ["GROWTH", "ENTERPRISE"] } },
      orderBy: { trialEndsAt: "asc" },
      take: LIMIT,
      select: { id: true, trialEndsAt: true, _count: { select: { aiInterviewSessions: true } } },
    }),
    prisma.aIScreeningBatch.groupBy({
      by: ["workspaceId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { workspaceId: "asc" },
      take: 1000,
    }),
    prisma.interviewRecording.groupBy({
      by: ["workspaceId"],
      where: { deletedAt: null, expiresAt: { gt: now, lte: in48h } },
      _sum: { sizeBytes: true },
      _count: { _all: true },
      _min: { expiresAt: true },
      orderBy: { workspaceId: "asc" },
      take: 200,
    }),
  ]);

  // Low credits: balance is the ledger sum, which already holds included
  // credits (includedCreditsLeft only says how much of it can expire), the
  // same rule as getWorkspaceCredits.
  const batchIds = activeBatches.map((b) => b.workspaceId);
  const [balances, waiting] = batchIds.length
    ? await Promise.all([
        prisma.aIInterviewCreditLedger.groupBy({
          by: ["workspaceId"],
          where: { workspaceId: { in: batchIds } },
          _sum: { amount: true },
        }),
        prisma.aIInterviewSession.groupBy({
          by: ["workspaceId"],
          where: { workspaceId: { in: batchIds }, status: "PENDING", batch: { status: "ACTIVE" } },
          _count: { _all: true },
        }),
      ])
    : [[], []];
  const balanceOf = new Map(balances.map((b) => [b.workspaceId, b._sum.amount ?? 0]));
  const low = batchIds
    .map((id) => ({ id, balance: balanceOf.get(id) ?? 0 }))
    .filter((r) => r.balance < LOW_CREDIT_LIMIT)
    .sort((a, b) => a.balance - b.balance)
    .slice(0, LIMIT);
  const waitingOf = new Map(waiting.map((w) => [w.workspaceId, w._count._all]));
  const batchesOf = new Map(activeBatches.map((b) => [b.workspaceId, b._count._all]));
  const expiringTop = [...expiring].sort((a, b) => Number(b._sum.sizeBytes ?? 0) - Number(a._sum.sizeBytes ?? 0)).slice(0, LIMIT);

  const ids = [...new Set([...pastDue.map((w) => w.id), ...trials.map((w) => w.id), ...low.map((w) => w.id), ...expiringTop.map((w) => w.workspaceId)])];
  const info = ids.length
    ? await prisma.workspace.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, slug: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true, stripeSeatQuantity: true },
      })
    : [];
  const byId = new Map(info.map((w) => [w.id, w]));
  const base = (id: string) => {
    const w = byId.get(id);
    return w ? { workspaceId: id, name: w.name, slug: w.slug, plan: planLabel(w, now) } : null;
  };

  const items: AttentionItem[] = [];
  for (const w of pastDue) {
    const b = base(w.id);
    if (!b) continue;
    items.push({
      ...b,
      kind: "past_due",
      tone: "bad",
      reason: w.stripeStatus === "unpaid" ? "Unpaid" : "Payment past due",
      detail: w.stripePastDueSince ? `since ${shortDate(w.stripePastDueSince)}` : "",
      at: (w.stripePastDueSince ?? now).toISOString(),
      action: w.stripeCustomerId
        ? { label: "Open in Stripe", href: `https://dashboard.stripe.com/customers/${w.stripeCustomerId}`, external: true }
        : { label: "Billing", href: billingHref(w.id) },
    });
  }
  for (const w of trials) {
    const b = base(w.id);
    if (!b || !w.trialEndsAt) continue;
    const d = daysUntil(w.trialEndsAt, now);
    const runs = w._count.aiInterviewSessions;
    items.push({
      ...b,
      kind: "trial_ending",
      tone: "warn",
      reason: d <= 1 ? "Trial ends today" : `Trial ends in ${d} days`,
      detail: `${runs} ${runs === 1 ? "screening" : "screenings"} run`,
      at: w.trialEndsAt.toISOString(),
      action: { label: "Extend trial", href: `${billingHref(w.id)}?action=extend-trial` },
    });
  }
  for (const w of low) {
    const b = base(w.id);
    if (!b) continue;
    const waitingN = waitingOf.get(w.id) ?? 0;
    const batches = batchesOf.get(w.id) ?? 0;
    items.push({
      ...b,
      kind: "low_credits",
      tone: "warn",
      reason: `${w.balance} ${w.balance === 1 ? "credit" : "credits"} left`,
      detail: waitingN > 0 ? `${waitingN} ${waitingN === 1 ? "invite" : "invites"} waiting in active batches` : `${batches} active ${batches === 1 ? "batch" : "batches"}`,
      at: now.toISOString(),
      action: { label: "Grant credits", href: `${billingHref(w.id)}?action=grant-credits` },
    });
  }
  for (const g of expiringTop) {
    const b = base(g.workspaceId);
    if (!b) continue;
    const first = g._min.expiresAt ?? in48h;
    const hours = Math.max(1, Math.round((first.getTime() - now.getTime()) / 3_600_000));
    items.push({
      ...b,
      kind: "storage_expiring",
      tone: "warn",
      reason: `Recordings ${formatBytes(Number(g._sum.sizeBytes ?? 0))}`,
      detail: `${g._count._all} ${g._count._all === 1 ? "expires" : "expire"} in ${hours < 24 ? `${hours} h` : `${Math.round(hours / 24)} days`}`,
      at: first.toISOString(),
      action: { label: "Review", href: billingHref(g.workspaceId) },
    });
  }
  const order: Record<AttentionKind, number> = { past_due: 0, trial_ending: 1, low_credits: 2, storage_expiring: 3 };
  return items.sort((a, b) => order[a.kind] - order[b.kind] || a.at.localeCompare(b.at));
}

/** Workspaces that need an admin now, cached 60 s. */
export function getNeedsAttention(): Promise<AttentionItem[]> {
  return unstable_cache(computeNeedsAttention, ["admin-hiring-attention"], { revalidate: 60, tags: ["admin-hiring-stats"] })();
}
