import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { sendTakeHomeReminder, sendTakeHomeSessionReminder } from "@/lib/take-home/emails";
import { dueReminder, LAST_CALL_CHOICES, START_REMINDER_CHOICES } from "@/lib/take-home/reminders";

/**
 * IP-27 AC #3 — 24h take-home reminder email.
 *
 * Sweeps take-homes whose `expiresAt` falls in the next REMIND_WINDOW_HOURS and
 * that the candidate hasn't submitted (status PENDING|ACTIVE). Sends one
 * reminder email and stamps `reminderSentAt` so re-runs don't double-fire —
 * idempotency lives in the DB flag, not in cron cadence.
 *
 * Session take-homes follow their own schedule (a "not started" nudge and a
 * last call, each optional, or off); legacy assignments keep the fixed 24h
 * email.
 *
 * Cadence: hourly (vercel.json). Distinct from the IP-46 in-app "take-home
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

  // ── Session-backed take-homes (IP-89) ──────────────────────────────────
  // Each send sets its own schedule (see lib/take-home/reminders.ts): a
  // "not started" nudge some days after the invite and a last call some hours
  // before the deadline, or none when a recruiter switched them off. The
  // query narrows to rows that could be due; dueReminder decides.
  const lastCallHorizon = new Date(now.getTime() + Math.max(...LAST_CALL_CHOICES) * 3_600_000);
  const earliestNudge = new Date(now.getTime() - Math.min(...START_REMINDER_CHOICES) * 3_600_000);
  const dueSessions = await prisma.interviewSession.findMany({
    where: {
      type: "take-home",
      status: { in: ["scheduled", "in_progress"] },
      deadlineAt: { gt: now },
      remindersOff: false,
      OR: [
        { reminderSentAt: null, reminderBeforeDeadlineHours: { not: null }, deadlineAt: { lt: lastCallHorizon } },
        { status: "scheduled", reminderSentAt: null, startReminderSentAt: null, reminderStartAfterHours: { not: null }, createdAt: { lte: earliestNudge } },
      ],
    },
    select: {
      id: true, title: true, candidateName: true, deadlineAt: true, workspaceId: true, status: true, createdAt: true,
      candidateAccessToken: true,
      reminderSentAt: true, startReminderSentAt: true,
      reminderStartAfterHours: true, reminderBeforeDeadlineHours: true, remindersOff: true,
      candidate: { select: { email: true } },
      workspace: { select: { name: true } },
    },
    orderBy: { deadlineAt: "asc" },
    take: MAX_BATCH,
  });
  // Opening any question counts as started, whatever the stored status says.
  const startedIds = new Set(
    dueSessions.length
      ? (
          await prisma.challengeAttempt.findMany({
            where: { sessionId: { in: dueSessions.map((s) => s.id) } },
            select: { sessionId: true },
            distinct: ["sessionId"],
          })
        ).map((a) => a.sessionId)
      : [],
  );

  let sessionsSent = 0;
  let sessionsNudged = 0;
  let sessionsSkipped = 0;
  for (const s of dueSessions) {
    const email = s.candidate?.email ?? null;
    const kind = dueReminder(
      {
        status: s.status,
        sentAt: s.createdAt,
        deadlineAt: s.deadlineAt,
        started: startedIds.has(s.id),
        reminderSentAt: s.reminderSentAt,
        startReminderSentAt: s.startReminderSentAt,
        hasEmail: !!email,
      },
      { startAfterHours: s.reminderStartAfterHours, beforeDeadlineHours: s.reminderBeforeDeadlineHours, off: s.remindersOff },
      now,
    );
    if (!kind) continue;
    if (!email || !s.deadlineAt || !s.workspace || !s.candidateAccessToken) { sessionsSkipped++; continue; }
    const hoursLeft = Math.max(1, Math.ceil((s.deadlineAt.getTime() - now.getTime()) / 3_600_000));
    const res = await sendTakeHomeSessionReminder({
      candidateName: s.candidateName ?? "there",
      candidateEmail: email,
      title: s.title,
      workspaceName: s.workspace.name,
      token: s.candidateAccessToken,
      deadlineAt: s.deadlineAt,
      hoursLeft,
      workspaceId: s.workspaceId ?? undefined,
      sessionId: s.id,
      nudge: kind === "not_started",
    });
    if (res.sent || (!res.sent && /suppress/i.test(res.reason ?? ""))) {
      await prisma.interviewSession.update({
        where: { id: s.id },
        data: kind === "last_call" ? { reminderSentAt: new Date() } : { startReminderSentAt: new Date() },
      });
      if (kind === "last_call") sessionsSent++;
      else sessionsNudged++;
    } else {
      console.warn(`[take-home-reminder:session] ${email}: ${res.reason}`);
      sessionsSkipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    task: "take-home-reminders",
    scanned: due.length,
    sent,
    skipped,
    sessionsScanned: dueSessions.length,
    sessionsSent,
    sessionsNudged,
    sessionsSkipped,
    horizon: horizon.toISOString(),
  });
}

// GET allowed for easy curl testing in dev — same auth, same body.
export async function GET(req: NextRequest) {
  return POST(req);
}
