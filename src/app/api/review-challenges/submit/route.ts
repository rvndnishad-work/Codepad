import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitDistributed } from "@/lib/rate-limit";
import { gradeAttempt, type Mark } from "@/lib/review-challenges/grader";

// POST /api/review-challenges/submit
// Grades a code-review submission deterministically against the challenge's
// planted findings and returns the full reveal (all findings + per-finding
// result). No LLM involved. Anonymous submissions are graded but not saved.
export async function POST(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;

    // Grading is cheap (pure computation) but the reveal exposes answers, so
    // cap throughput per identity to blunt scraping of the finding data.
    const rlKey = `review-grade:${userId ?? req.headers.get("x-forwarded-for") ?? "anon"}`;
    const rl = await rateLimitDistributed(rlKey, 60, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "You're submitting too fast. Please wait a moment." },
        { status: 429, headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) } },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Missing body" }, { status: 400 });
    }

    const { challengeId, marks, durationSec, mode } = body as {
      challengeId?: string;
      marks?: unknown;
      durationSec?: unknown;
      mode?: unknown;
    };

    if (!challengeId || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: "Missing required fields: challengeId and marks[]" },
        { status: 400 },
      );
    }

    // Normalize client marks defensively — the grader is the source of truth.
    const cleanMarks: Mark[] = marks
      .filter((m): m is { line: unknown; category: unknown } => !!m && typeof m === "object")
      .map((m) => ({ line: Number((m as any).line), category: String((m as any).category ?? "") }))
      .filter((m) => Number.isFinite(m.line));

    const challenge = await prisma.reviewChallenge.findUnique({
      where: { id: challengeId },
      include: { findings: true },
    });
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const result = gradeAttempt(
      challenge.findings.map((f) => ({
        id: f.id,
        lineStart: f.lineStart,
        lineEnd: f.lineEnd,
        category: f.category,
        points: f.points,
      })),
      cleanMarks,
    );

    const attemptMode = mode === "hunt" ? "hunt" : "standard";
    const dur =
      durationSec !== undefined && Number.isFinite(Number(durationSec))
        ? Math.max(0, Math.round(Number(durationSec)))
        : null;

    // Persist only for signed-in users (mirrors PromptAttempt behaviour).
    let attemptId: string | null = null;
    if (userId) {
      const saved = await prisma.reviewAttempt.create({
        data: {
          challengeId,
          userId,
          marks: JSON.stringify(cleanMarks),
          score: result.score,
          foundCount: result.foundCount,
          partialCount: result.partialCount,
          totalFindings: result.totalFindings,
          falsePositives: result.falsePositives,
          durationSec: dur,
          mode: attemptMode,
        },
      });
      attemptId = saved.id;
    }

    // The reveal — full finding detail, keyed so the client can align each
    // result row with its finding.
    const findingsById = new Map(challenge.findings.map((f) => [f.id, f]));
    const reveal = result.findingResults.map((r) => {
      const f = findingsById.get(r.findingId)!;
      return {
        id: f.id,
        lineStart: f.lineStart,
        lineEnd: f.lineEnd,
        category: f.category,
        title: f.title,
        explanation: f.explanation,
        points: f.points,
        status: r.status,
        markedLine: r.markedLine,
        markedCategory: r.markedCategory,
        earned: r.earned,
      };
    });

    return NextResponse.json({
      success: true,
      attemptId,
      score: result.score,
      foundCount: result.foundCount,
      partialCount: result.partialCount,
      missedCount: result.missedCount,
      totalFindings: result.totalFindings,
      falsePositives: result.falsePositives,
      falsePositiveMarks: result.falsePositiveMarks,
      reveal,
    });
  } catch (error) {
    console.error("Failed to grade review challenge:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
