import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronRun } from "@/lib/admin/cron-run";
import { appOrigin } from "@/lib/interview/links";
import { autoRemindScorecards } from "@/lib/interview/scorecard-server";
import { SCORECARD_REMINDER_STALE_DAYS, scorecardReminderState } from "@/lib/workspace/screening-defaults";

/**
 * Automatic scorecard reminders. An interview scheduled while the workspace
 * had "Scorecard reminder" on (Settings > Screening defaults) keeps that
 * number of hours; once the interview has ended and that time has passed,
 * everyone on the panel who has not submitted gets one email. The stamp on
 * the interview makes it once only; reminders more than a week late are
 * dropped rather than sent.
 *
 * Cadence: hourly (vercel.json). Auth: `X-Cron-Secret` or
 * `Authorization: Bearer <CRON_SECRET>`.
 */
const MAX_BATCH = 100;
const DAY_MS = 86_400_000;

async function run(req: NextRequest) {

  const now = new Date();
  // Longest wait (48 hours) plus the stale window, with room for long interviews.
  const since = new Date(now.getTime() - (SCORECARD_REMINDER_STALE_DAYS + 5) * DAY_MS);
  const rows = await prisma.interviewSession.findMany({
    where: {
      type: "live",
      workspaceId: { not: null },
      scorecardReminderHours: { not: null },
      scorecardAutoRemindedAt: null,
      status: { in: ["completed", "in_progress"] },
      OR: [{ finishedAt: { gte: since } }, { scheduledAt: { gte: since } }],
    },
    orderBy: { scheduledAt: "asc" },
    take: MAX_BATCH * 3,
    select: { id: true, status: true, scheduledAt: true, finishedAt: true, totalSec: true, scorecardReminderHours: true, scorecardAutoRemindedAt: true },
  });

  const origin = await appOrigin();
  let sent = 0;
  let emails = 0;
  let dropped = 0;
  for (const r of rows) {
    const state = scorecardReminderState(r, now);
    if (state === "wait") continue;
    if (state === "drop") {
      await prisma.interviewSession.updateMany({ where: { id: r.id, scorecardAutoRemindedAt: null }, data: { scorecardAutoRemindedAt: now } });
      dropped++;
      continue;
    }
    if (sent >= MAX_BATCH) break;
    try {
      const res = await autoRemindScorecards(r.id, origin);
      if (res) {
        sent++;
        emails += res.sent.filter((d) => d.status === "sent").length;
      }
    } catch (err) {
      console.error("[cron:scorecard-reminders] failed for", r.id, err);
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, reminded: sent, emails, dropped });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("scorecard-reminders", run);
export const GET = POST;
