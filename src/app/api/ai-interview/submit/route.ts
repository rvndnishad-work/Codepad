import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gradeSessionById } from "@/lib/ai-interview/grade";
import { checkFilesSize } from "@/lib/ai-interview/files-size";
import type { TelemetryEvent } from "@/lib/proctoring/ai-detection";

/**
 * Candidate submit path. All grading/persistence/notify logic lives in
 * src/lib/ai-interview/grade.ts (shared with the abandonment cron, which
 * grades sessions the candidate never submitted). This handler validates the
 * payload and delegates.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inviteToken, files, roundFiles, telemetry } = body as {
      inviteToken: string;
      files: Record<string, string>;
      /** Per-round files keyed by round id (multi-round screenings). */
      roundFiles?: Record<string, Record<string, string>>;
      telemetry?: TelemetryEvent[];
    };

    if (!inviteToken || !files) {
      return NextResponse.json({ error: "Missing inviteToken or files" }, { status: 400 });
    }

    // Cap each submitted file map — a screening can't end with a bigger payload
    // than the in-flight chat tolerates.
    for (const map of [files, ...Object.values(roundFiles ?? {})]) {
      const sizeCheck = checkFilesSize(map);
      if (!sizeCheck.ok) {
        return NextResponse.json({ error: sizeCheck.reason }, { status: 413 });
      }
    }

    // Resolve the session first so "not found" / "already graded" map to their
    // original status codes (the shared grader is id-based).
    const existing = await prisma.aIInterviewSession.findUnique({
      where: { inviteToken },
      select: { id: true, finishedAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (existing.finishedAt) {
      return NextResponse.json(
        { error: "This interview has already been submitted." },
        { status: 410 }
      );
    }

    const origin = req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host")}`
      : new URL(req.url).origin;

    const result = await gradeSessionById({
      sessionId: existing.id,
      submittedFiles: files,
      roundFilesOverride: roundFiles,
      telemetry,
      origin,
    });

    if (!result.ok) {
      // Lost a race against the abandonment cron — treat like already graded.
      return NextResponse.json(
        { error: "This interview has already been submitted." },
        { status: 410 }
      );
    }

    const updated = await prisma.aIInterviewSession.findUnique({
      where: { id: result.sessionId },
    });

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error("AI submission grading error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
