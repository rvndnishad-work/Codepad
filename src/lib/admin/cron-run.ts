/**
 * Records every scheduled job run in CronRun so /admin/jobs can show the last
 * run, failures and duration.
 *
 *   export const GET = withCronRun("trial-expiry", async (req) => { ...; return NextResponse.json(...) })
 *
 * Auth stays the handler's job (assertCronAuth); unauthenticated calls are
 * not recorded because the handler returns before the job runs — we only
 * record when the handler returns a 2xx or throws.
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";

type Handler = (req: NextRequest) => Promise<Response>;

export function withCronRun(job: string, handler: Handler): Handler {
  return async (req: NextRequest) => {
    const gate = assertCronAuth(req);
    if (!gate.ok) return gate.response;
    let runId: string | null = null;
    try {
      runId = (await prisma.cronRun.create({ data: { job } })).id;
    } catch {
      /* recording is best-effort */
    }
    try {
      const res = await handler(req);
      let summary: string | null = null;
      try {
        const body = await res.clone().json();
        summary = JSON.stringify(body).slice(0, 500);
      } catch {
        /* non-JSON */
      }
      if (runId) {
        await prisma.cronRun
          .update({
            where: { id: runId },
            data: { finishedAt: new Date(), ok: res.ok, summary, error: res.ok ? null : `HTTP ${res.status}` },
          })
          .catch(() => {});
      }
      return res;
    } catch (err) {
      if (runId) {
        await prisma.cronRun
          .update({
            where: { id: runId },
            data: { finishedAt: new Date(), ok: false, error: String((err as Error)?.message ?? err).slice(0, 1000) },
          })
          .catch(() => {});
      }
      return NextResponse.json({ error: "job failed" }, { status: 500 });
    }
  };
}

/** Every job in vercel.json, with its schedule in plain words, for /admin/jobs. */
export const CRON_JOBS: { job: string; path: string; schedule: string; every: string; expectedMinutes: number }[] = [
  { job: "telemetry-scan", path: "/api/cron/telemetry-scan", schedule: "0 * * * *", every: "Every hour", expectedMinutes: 60 },
  { job: "ai-screening-expiry", path: "/api/cron/ai-screening-expiry", schedule: "*/5 * * * *", every: "Every 5 minutes", expectedMinutes: 5 },
  { job: "webhook-deliveries", path: "/api/cron/webhook-deliveries", schedule: "* * * * *", every: "Every minute", expectedMinutes: 1 },
  { job: "take-home-reminders", path: "/api/cron/take-home-reminders", schedule: "15 * * * *", every: "Every hour", expectedMinutes: 60 },
  { job: "take-home-expiry", path: "/api/cron/take-home-expiry", schedule: "5 * * * *", every: "Every hour", expectedMinutes: 60 },
  { job: "scorecard-reminders", path: "/api/cron/scorecard-reminders", schedule: "40 * * * *", every: "Every hour", expectedMinutes: 60 },
  { job: "round-nudges", path: "/api/cron/round-nudges", schedule: "50 * * * *", every: "Every hour", expectedMinutes: 60 },
  { job: "recordings", path: "/api/cron/recordings", schedule: "20 * * * *", every: "Every hour", expectedMinutes: 60 },
  { job: "trial-expiry", path: "/api/cron/trial-expiry", schedule: "0 1 * * *", every: "Daily 01:00 UTC", expectedMinutes: 1440 },
  { job: "data-retention", path: "/api/cron/data-retention", schedule: "30 2 * * *", every: "Daily 02:30 UTC", expectedMinutes: 1440 },
  { job: "workspace-deletion", path: "/api/cron/workspace-deletion", schedule: "45 2 * * *", every: "Daily 02:45 UTC", expectedMinutes: 1440 },
  { job: "included-credits", path: "/api/cron/included-credits", schedule: "10 3 * * *", every: "Daily 03:10 UTC", expectedMinutes: 1440 },
  { job: "notify-ai-credits", path: "/api/cron/notifications/ai-credits-sweep", schedule: "0 8 * * *", every: "Daily 08:00 UTC", expectedMinutes: 1440 },
  { job: "notify-stale-scorecards", path: "/api/cron/notifications/stale-scorecards", schedule: "0 9 * * *", every: "Daily 09:00 UTC", expectedMinutes: 1440 },
  { job: "notify-take-home-expiring", path: "/api/cron/notifications/take-home-expiring", schedule: "30 8 * * *", every: "Daily 08:30 UTC", expectedMinutes: 1440 },
  { job: "admin-daily-stats", path: "/api/cron/admin-daily-stats", schedule: "20 0 * * *", every: "Daily 00:20 UTC", expectedMinutes: 1440 },
  { job: "admin-housekeeping", path: "/api/cron/admin-housekeeping", schedule: "*/10 * * * *", every: "Every 10 minutes", expectedMinutes: 10 },
  { job: "stripe-sync", path: "/api/cron/stripe-sync", schedule: "0 4 * * *", every: "Daily 04:00 UTC", expectedMinutes: 1440 },
];
