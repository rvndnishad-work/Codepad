import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Live proctor-agent status for the interviewer's view. Read-only summary of
 * the latest agent report. Authenticated by session ownership OR the session's
 * shareToken (same access model as the report page), NOT by the agent token.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  const token = new URL(req.url).searchParams.get("token");

  const interview = await prisma.interviewSession.findUnique({
    where: { id },
    select: {
      userId: true,
      shareToken: true,
      proctorToken: true,
      proctorReport: true,
    },
  });
  if (!interview) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const isOwner = !!session?.user?.id && session.user.id === interview.userId;
  const hasShareToken = !!token && token === interview.shareToken;
  if (!isOwner && !hasShareToken) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const report = interview.proctorReport;
  // Consider the agent "live" if it reported within the last 30s. The agent
  // scans every few seconds, so a longer gap means it stopped / disconnected.
  const STALE_MS = 30_000;
  const lastSeenMs = report ? Date.now() - report.lastSeenAt.getTime() : null;
  const connected = !!report && lastSeenMs !== null && lastSeenMs < STALE_MS;

  let signals: unknown[] = [];
  if (report) {
    try {
      const parsed = JSON.parse(report.signalsData);
      if (Array.isArray(parsed)) signals = parsed;
    } catch {
      signals = [];
    }
  }

  return NextResponse.json({
    provisioned: !!interview.proctorToken,
    everConnected: !!report,
    connected,
    suspicionScore: report?.suspicionScore ?? 0,
    peakSuspicion: report?.peakSuspicion ?? 0,
    scannedWindows: report?.scannedWindows ?? 0,
    reportCount: report?.reportCount ?? 0,
    lastSeenAt: report?.lastSeenAt ?? null,
    signals,
  });
}
