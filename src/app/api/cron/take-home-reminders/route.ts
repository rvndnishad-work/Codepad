import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { sendTakeHomeReminder } from "@/lib/take-home/emails";

/**
 * IP-27 AC #3 — 24h take-home reminder email.
 *
 * Sweeps take-homes whose `expiresAt` falls in the next REMIND_WINDOW_HOURS and
 * that the candidate hasn't submitted (status PENDING|ACTIVE). Sends one
 * reminder email and stamps `reminderSentAt` so re-runs don't double-fire —
 * idempotency lives in the DB flag, not in cron cadence.
 *
 * Recommended cadence: hourly. Distinct from the IP-46 in-app "take-home
 * expiring" notification cron — that pings recruiters in-app; this emails the
 * candidate.
 *
 * Auth: `X-Cron-Secret` or `Authorization: Bearer <CRON_SECRET>`.
 */
const REMIND_WINDOW_HOURS = 24;
const MAX_BATCH = 200;

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  const now = new Date();
  const horizon = new Date(now.getTime() + REMIND_WINDOW_HOURS * 60 * 60 * 1000);

  const due = await prisma.takeHomeAssignment.findMany({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      expiresAt: { gt: now, lt: horizon },
      reminderSentAt: null,
    },
    select: {
      id: true,
      token: true,
      candidateName: true,
      candidateEmail: true,
      expiresAt: true,
      workspaceId: true,
      workspace: { select: { name: true } },
      challenge: { select: { title: true } },
    },
    take: MAX_BATCH,
  });

  let sent = 0;
  let skipped = 0;
  for (const a of due) {
    if (!a.candidateEmail || !a.workspace) {
      skipped++;
      continue;
    }
    const hoursLeft = Math.max(1, Math.ceil((a.expiresAt.getTime() - now.getTime()) / 3_600_000));
    const res = await sendTakeHomeReminder({
      candidateName: a.candidateName,
      candidateEmail: a.candidateEmail,
      challengeTitle: a.challenge.title,
      workspaceName: a.workspace.name,
      token: a.token,
      expiresAt: a.expiresAt,
      hoursLeft,
      workspaceId: a.workspaceId ?? undefined,
      takeHomeId: a.id,
    });

    // Stamp the flag whenever we actually dispatched (sent or console-stub).
    // On a hard transport failure we leave reminderSentAt null so the next
    // run retries — but a `suppressed` recipient counts as "handled" (we never
    // want to retry a suppressed address).
    if (res.sent || (!res.sent && /suppress/i.test(res.reason ?? ""))) {
      await prisma.takeHomeAssignment.update({
        where: { id: a.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } else {
      console.warn(`[take-home-reminder] ${a.candidateEmail}: ${res.reason}`);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    task: "take-home-reminders",
    scanned: due.length,
    sent,
    skipped,
    horizon: horizon.toISOString(),
  });
}

// GET allowed for easy curl testing in dev — same auth, same body.
export async function GET(req: NextRequest) {
  return POST(req);
}
