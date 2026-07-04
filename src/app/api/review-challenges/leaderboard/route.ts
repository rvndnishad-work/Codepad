import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/review-challenges/leaderboard?challengeId=...&limit=10
// Top Hallucination-Hunt runs for a challenge: highest score first, then the
// fastest time as the tiebreak. Only "hunt"-mode, signed-in attempts qualify
// (a run must be attributable to show a name on the board).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const challengeId = searchParams.get("challengeId");
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

    if (!challengeId) {
      return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }

    // Best run per user: fetch a generous window ordered by the ranking, then
    // de-dupe to one row per user in JS (Prisma has no per-group limit).
    const rows = await prisma.reviewAttempt.findMany({
      where: { challengeId, mode: "hunt", userId: { not: null } },
      orderBy: [{ score: "desc" }, { durationSec: "asc" }, { createdAt: "asc" }],
      take: 200,
      select: {
        id: true,
        userId: true,
        score: true,
        foundCount: true,
        totalFindings: true,
        durationSec: true,
        createdAt: true,
      },
    });

    const bestByUser = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      if (r.userId && !bestByUser.has(r.userId)) bestByUser.set(r.userId, r);
    }
    const top = [...bestByUser.values()].slice(0, limit);

    // Resolve display names in one query.
    const users = await prisma.user.findMany({
      where: { id: { in: top.map((t) => t.userId!) } },
      select: { id: true, name: true, image: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const leaderboard = top.map((t, i) => ({
      rank: i + 1,
      attemptId: t.id,
      name: userById.get(t.userId!)?.name ?? "Anonymous",
      image: userById.get(t.userId!)?.image ?? null,
      score: t.score,
      foundCount: t.foundCount,
      totalFindings: t.totalFindings,
      durationSec: t.durationSec,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Failed to load review leaderboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
