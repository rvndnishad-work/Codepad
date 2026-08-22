import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Candidate presence heartbeat. The workspace pings every 30s while the tab is
 * visible; each ping banks 30s of time-spent (bounded server-side so a
 * tampered client can't inflate it faster than wall-clock).
 */
const MAX_PING_SEC = 45; // > the 30s client interval, tolerates jitter

export async function POST(req: NextRequest) {
  try {
    const { inviteToken, seconds } = (await req.json()) as {
      inviteToken?: string;
      seconds?: number;
    };
    if (!inviteToken) {
      return NextResponse.json({ error: "Missing inviteToken" }, { status: 400 });
    }
    const delta = Math.max(0, Math.min(MAX_PING_SEC, Math.floor(Number(seconds) || 0)));

    // Only live sessions accumulate time.
    const result = await prisma.aIInterviewSession.updateMany({
      where: { inviteToken, finishedAt: null },
      data: { timeSpentSec: { increment: delta } },
    });
    if (result.count === 0) {
      return NextResponse.json({ ok: false }, { status: 409 });
    }

    const row = await prisma.aIInterviewSession.findUnique({
      where: { inviteToken },
      select: { timeSpentSec: true },
    });

    return NextResponse.json({ ok: true, timeSpentSec: row?.timeSpentSec ?? 0 });
  } catch {
    return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
  }
}
