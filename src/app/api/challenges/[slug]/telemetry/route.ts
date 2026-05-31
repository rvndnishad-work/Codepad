import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeTelemetry } from "@/lib/proctoring/ai-detection";

const telemetrySchema = z.object({
  events: z
    .array(
      z.object({
        t: z.number().int().min(0),
        type: z.enum(["snapshot", "blur", "focus", "paste", "keystroke"]),
        payload: z.any(),
      })
    )
    .max(1000),
  token: z.string().optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  const body = await req.json().catch(() => null);
  const parsed = telemetrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { events, token } = parsed.data;

  // Resolve candidate user
  const session = await auth();
  let candidateUserId = session?.user?.id;

  if (!candidateUserId && token) {
    const assignment = await prisma.takeHomeAssignment.findUnique({
      where: { token },
      select: { candidateEmail: true },
    });
    if (assignment) {
      const candidateUser = await prisma.user.findFirst({
        where: { email: { equals: assignment.candidateEmail } },
        select: { id: true },
      });
      if (candidateUser) {
        candidateUserId = candidateUser.id;
      }
    }
  }

  if (!candidateUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Resolve active challenge
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Find active attempt in progress
  const attempt = await prisma.challengeAttempt.findFirst({
    where: {
      userId: candidateUserId,
      challengeId: challenge.id,
      status: "in_progress",
    },
    select: { id: true, files: true, sessionId: true },
    orderBy: { startedAt: "desc" },
  });

  if (!attempt) {
    // Telemetry is best-effort proctoring data. When there's no in-progress
    // attempt to attach it to — e.g. a regular practice run (attempts are only
    // persisted at submit time) or a take-home that hasn't been started — there
    // is simply nothing to record. Acknowledge with a no-op instead of a 400 so
    // the client's 10s flush loop doesn't surface an error badge and spam the
    // console every tick.
    return NextResponse.json({ ok: true, recorded: false }, { status: 200 });
  }

  const attemptId = attempt.id;

  // 1. Process Event Log (append to existing eventsData)
  let existingLog = await prisma.sessionEventLog.findUnique({
    where: { attemptId },
  });

  let combinedEvents = [];
  if (existingLog) {
    try {
      combinedEvents = JSON.parse(existingLog.eventsData);
    } catch {
      combinedEvents = [];
    }
  }

  combinedEvents = [...combinedEvents, ...events];

  await prisma.sessionEventLog.upsert({
    where: { attemptId },
    update: { eventsData: JSON.stringify(combinedEvents) },
    create: {
      attemptId,
      eventsData: JSON.stringify(combinedEvents),
    },
  });

  // 2. Compute AI Suspicion Score and Integrity Metrics
  let blurCount = 0;
  let totalBlurMs = 0;
  let pasteCount = 0;
  const pasteDetails: Array<{ t: number; length: number; snippet: string }> = [];

  let lastBlurTime: number | null = null;

  combinedEvents.forEach((ev) => {
    if (ev.type === "blur") {
      blurCount++;
      lastBlurTime = ev.payload?.timestamp || null;
    } else if (ev.type === "focus") {
      if (lastBlurTime !== null) {
        const focusTime = ev.payload?.timestamp || Date.now();
        const duration = focusTime - lastBlurTime;
        if (duration > 0) {
          totalBlurMs += duration;
        }
        lastBlurTime = null;
      }
    } else if (ev.type === "paste") {
      pasteCount++;
      const length = Number(ev.payload?.length) || 0;
      const snippet = String(ev.payload?.snippet || "").substring(0, 100);
      pasteDetails.push({ t: ev.t, length, snippet });
    }
  });

  // If currently blurred at the end of logs, add remaining time
  if (lastBlurTime !== null) {
    const duration = Date.now() - lastBlurTime;
    if (duration > 0) {
      totalBlurMs += duration;
    }
  }

  const totalBlurSec = Math.floor(totalBlurMs / 1000);

  // AI Suspicion Score calculation (capped at 100)
  // - Each paste adds 8 points
  // - Large paste blocks (> 100 chars) indicate external block inserts, adding up to 40 additional points based on length
  // - Each blur adds 5 points
  // - Blur duration adds 1.5 points per second (capped at 30 points per blur period)
  let suspicionScore = 0;
  suspicionScore += pasteCount * 8;
  
  pasteDetails.forEach((p) => {
    if (p.length > 100) {
      suspicionScore += Math.min(40, Math.floor(p.length / 10));
    }
  });

  suspicionScore += blurCount * 5;
  suspicionScore += Math.floor(totalBlurSec * 1.5);
  suspicionScore = Math.min(100, Math.max(0, suspicionScore));

  // Compute advanced AI typing & streaming metrics
  let finalCodeLength = 0;
  if (attempt?.files) {
    try {
      const filesMap = JSON.parse(attempt.files) as Record<string, string>;
      finalCodeLength = Object.values(filesMap).reduce((sum, content) => sum + content.length, 0);
    } catch {}
  }

  const aiResult = analyzeTelemetry(combinedEvents, finalCodeLength);
  const aiSuspicionScore = aiResult.aiSuspicionScore;

  // 3. Upsert Integrity Report
  await prisma.candidateIntegrityReport.upsert({
    where: { attemptId },
    update: {
      suspicionScore,
      totalBlurSec,
      blurCount,
      pasteCount,
      pasteDetails: JSON.stringify(pasteDetails),
    },
    create: {
      attemptId,
      suspicionScore,
      totalBlurSec,
      blurCount,
      pasteCount,
      pasteDetails: JSON.stringify(pasteDetails),
    },
  });

  // Update ChallengeAttempt with the new advanced AI proctoring score
  await prisma.challengeAttempt.update({
    where: { id: attemptId },
    data: { aiSuspicionScore },
  });

  // Sync to parent interview session if active
  if (attempt.sessionId) {
    await prisma.interviewSession.update({
      where: { id: attempt.sessionId },
      data: { aiSuspicionScore },
    });
  }

  return NextResponse.json({ ok: true, suspicionScore, aiSuspicionScore });
}
