import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/interview/[id]/report/pdf?token=...
 * Generates an executive candidate report data payload optimized for PDF rendering and ATS integrations.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.nextUrl.searchParams.get("token");

    const interview = await prisma.interviewSession.findUnique({
      where: { id },
      include: {
        rubric: true,
        proctorReport: true,
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (token !== interview.shareToken) {
      return NextResponse.json({ error: "Unauthorized access token" }, { status: 401 });
    }

    let ratings: Record<string, number> = {};
    if (interview.rubric?.ratings) {
      try {
        ratings = JSON.parse(interview.rubric.ratings);
      } catch {
        ratings = {};
      }
    }

    const report = {
      sessionId: interview.id,
      candidateName: interview.candidateName || "Candidate",
      title: interview.title,
      status: interview.status,
      verdict: interview.verdict || "PENDING",
      scheduledAt: interview.scheduledAt,
      startedAt: interview.startedAt,
      finishedAt: interview.finishedAt,
      durationSec: interview.totalSec,
      notes: interview.notes || interview.rubric?.notes || null,
      rubric: {
        ratings,
        overallScore: Object.keys(ratings).length
          ? Math.round(
              Object.values(ratings).reduce((a, b) => a + b, 0) /
                Object.keys(ratings).length
            )
          : null,
      },
      proctoring: interview.proctorReport
        ? {
            suspicionScore: interview.proctorReport.suspicionScore,
            peakSuspicion: interview.proctorReport.peakSuspicion,
            scannedWindows: interview.proctorReport.scannedWindows,
            reportCount: interview.proctorReport.reportCount,
            lastSeenAt: interview.proctorReport.lastSeenAt,
          }
        : null,
      exportedAt: new Date().toISOString(),
    };

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/interview/report/pdf] Error:", err);
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 });
  }
}
