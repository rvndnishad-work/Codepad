import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CRON_JOBS } from "@/lib/admin/cron-run";
import { getMaintenanceConfig } from "@/lib/maintenance";

/**
 * Shared health reads for /admin (Home) and /admin/jobs. Every check is
 * bounded: one DB round trip each, Piston with a 3 s timeout and a 60 s
 * per-instance cache so Home does not ping it on every load.
 */

export type Tone = "ok" | "warn" | "bad" | "off";

export type JobRun = {
  id: string;
  job: string;
  startedAt: Date;
  finishedAt: Date | null;
  ok: boolean | null;
  error: string | null;
  summary: string | null;
};

export type JobStatus = {
  job: string;
  path: string;
  every: string;
  expectedMinutes: number;
  last: JobRun | null;
  lastFailure: JobRun | null;
  late: boolean;
  /** "ok" | "failed" | "running" | "unfinished" | "never" */
  result: "ok" | "failed" | "running" | "unfinished" | "never";
};

const RUNNING_GRACE_MS = 15 * 60_000;

export function runResult(r: JobRun | null, now = Date.now()): JobStatus["result"] {
  if (!r) return "never";
  if (r.finishedAt) return r.ok ? "ok" : "failed";
  return now - r.startedAt.getTime() < RUNNING_GRACE_MS ? "running" : "unfinished";
}

/** Latest run and latest failure of every known job, via DISTINCT ON (index job, startedAt). */
export async function loadJobStatuses(now = new Date()): Promise<JobStatus[]> {
  const jobs = CRON_JOBS.map((j) => j.job);
  const [latest, failures] = await Promise.all([
    prisma.$queryRaw<JobRun[]>(Prisma.sql`
      SELECT DISTINCT ON (job) id, job, "startedAt", "finishedAt", ok, error, summary
      FROM "CronRun" WHERE job IN (${Prisma.join(jobs)})
      ORDER BY job, "startedAt" DESC`),
    prisma.$queryRaw<JobRun[]>(Prisma.sql`
      SELECT DISTINCT ON (job) id, job, "startedAt", "finishedAt", ok, error, summary
      FROM "CronRun" WHERE job IN (${Prisma.join(jobs)}) AND ok = false
      ORDER BY job, "startedAt" DESC`),
  ]);
  const lastBy = new Map(latest.map((r) => [r.job, r]));
  const failBy = new Map(failures.map((r) => [r.job, r]));
  return CRON_JOBS.map((j) => {
    const last = lastBy.get(j.job) ?? null;
    const late = !last || now.getTime() - last.startedAt.getTime() > 2 * j.expectedMinutes * 60_000;
    return {
      job: j.job,
      path: j.path,
      every: j.every,
      expectedMinutes: j.expectedMinutes,
      last,
      lastFailure: failBy.get(j.job) ?? null,
      late,
      result: runResult(last, now.getTime()),
    };
  });
}

/** Last `limit` runs of one job (index job, startedAt). */
export async function loadRunHistory(job: string, limit = 20): Promise<JobRun[]> {
  return prisma.cronRun.findMany({
    where: { job },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: { id: true, job: true, startedAt: true, finishedAt: true, ok: true, error: true, summary: true },
  });
}

export function jobsSummary(statuses: JobStatus[]) {
  const failing = statuses.filter((s) => s.result === "failed").length;
  const late = statuses.filter((s) => s.late).length;
  const ran = statuses.filter((s) => s.result === "ok").length;
  const tone: Tone = failing > 0 ? "bad" : late > 0 ? "warn" : "ok";
  return { total: statuses.length, ran, failing, late, tone };
}

// ── Services ─────────────────────────────────────────────────────────────────

export type ServiceCheck = { name: string; tone: Tone; detail: string };

async function checkDatabase(): Promise<ServiceCheck> {
  const t = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ms = Math.round(performance.now() - t);
    return { name: "Database", tone: ms > 500 ? "warn" : "ok", detail: `${ms} ms` };
  } catch {
    return { name: "Database", tone: "bad", detail: "Not reachable" };
  }
}

let pistonCache: { at: number; value: ServiceCheck } | null = null;

async function checkPiston(): Promise<ServiceCheck> {
  if (pistonCache && Date.now() - pistonCache.at < 60_000) return pistonCache.value;
  const raw = process.env.PISTON_URL;
  let value: ServiceCheck;
  if (!raw) {
    value = { name: "Piston", tone: "off", detail: "PISTON_URL not set" };
  } else {
    const base = raw.replace(/\/+$/, "");
    const headers: Record<string, string> = {};
    if (process.env.PISTON_AUTH_TOKEN) headers.Authorization = process.env.PISTON_AUTH_TOKEN;
    const t = performance.now();
    try {
      const res = await fetch(`${base}/api/v2/runtimes`, { headers, signal: AbortSignal.timeout(3000), cache: "no-store" });
      const ms = Math.round(performance.now() - t);
      value = res.ok
        ? { name: "Piston", tone: ms > 1500 ? "warn" : "ok", detail: `${ms} ms` }
        : { name: "Piston", tone: "bad", detail: `HTTP ${res.status}` };
    } catch {
      value = { name: "Piston", tone: "bad", detail: "No answer in 3 s" };
    }
  }
  pistonCache = { at: Date.now(), value };
  return value;
}

function configured(name: string, keys: string[]): ServiceCheck {
  const missing = keys.filter((k) => !process.env[k]);
  return missing.length === 0
    ? { name, tone: "ok", detail: "Configured" }
    : { name, tone: "off", detail: `Missing ${missing.join(", ")}` };
}

export async function loadServices(): Promise<ServiceCheck[]> {
  const [db, piston] = await Promise.all([checkDatabase(), checkPiston()]);
  return [
    db,
    piston,
    configured("LiveKit", ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]),
    configured("Stripe", ["STRIPE_SECRET_KEY"]),
  ];
}

// ── Email and maintenance ────────────────────────────────────────────────────

export async function loadEmail24h() {
  const since = new Date(Date.now() - 24 * 3600_000);
  const groups = await prisma.emailLog.groupBy({
    by: ["status"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  const by = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  const total = groups.reduce((a, g) => a + g._count._all, 0);
  const failed = (by.failed ?? 0) + (by.bounced ?? 0) + (by.complained ?? 0);
  const tone: Tone = total === 0 ? "off" : failed === 0 ? "ok" : failed / total > 0.05 ? "bad" : "warn";
  return { total, failed, bounced: by.bounced ?? 0, tone };
}

export async function loadMaintenance(now = new Date()) {
  const [rules, legacy] = await Promise.all([
    prisma.maintenanceRule.findMany({
      where: {
        endedAt: null,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, area: true, message: true, endsAt: true },
    }),
    getMaintenanceConfig(),
  ]);
  const site = legacy.enabled || rules.some((r) => r.area === "site");
  const label = site
    ? "Whole site in maintenance"
    : rules.length > 0
      ? `${rules.length} area${rules.length === 1 ? "" : "s"} in maintenance`
      : "Live, no maintenance";
  const tone: Tone = site ? "bad" : rules.length > 0 ? "warn" : "ok";
  return { rules, legacyEnabled: legacy.enabled, label, tone };
}
