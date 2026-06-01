import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/prompt-attempts?scenarioId=…
 *
 * Returns the community feed for a scenario: prompts that *other* users have
 * shared (shared = true), sorted by upvotes. This is the source of truth for
 * the Community tab — the page's own-attempts query is self-scoped and can
 * never surface another developer's prompt.
 *
 * Public-safe projection only: never leak userId, raw feedback, or sessionId.
 * Anonymous callers get the feed (read-only); signed-in callers also get
 * `upvotedIds` so the toggle renders correctly on first paint.
 *
 * PromptAttempt has no FK relation to User (just a bare userId column), so
 * author names are resolved with a single batched lookup rather than a join.
 */
const MAX_RESULTS = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId");
  if (!scenarioId) {
    return NextResponse.json({ error: "Missing scenarioId" }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  const currentUserId = session?.user?.id ?? null;

  // Shared attempts for this scenario authored by anyone *other* than the
  // current viewer. Uses the @@index([scenarioId, shared, shareUpvotes]).
  const attempts = await prisma.promptAttempt.findMany({
    where: {
      scenarioId,
      shared: true,
      ...(currentUserId ? { NOT: { userId: currentUserId } } : {}),
    },
    orderBy: [{ shareUpvotes: "desc" }, { createdAt: "desc" }],
    take: MAX_RESULTS,
    select: {
      id: true,
      promptText: true,
      score: true,
      rubricScores: true,
      tokenEstimate: true,
      shareTitle: true,
      shareNote: true,
      shareUpvotes: true,
      createdAt: true,
      scenarioId: true,
      userId: true, // server-only — used for author lookup, never returned
      scenario: { select: { title: true, category: true, difficulty: true } },
    },
  });

  // Resolve author display info in one batched query.
  const authorIds = [...new Set(attempts.map((a) => a.userId).filter((id): id is string => !!id))];
  const authors = authorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, image: true },
      })
    : [];
  const authorById = new Map(authors.map((u) => [u.id, u]));

  // Which of these the current user has already upvoted — for initial toggle
  // state. One query instead of N.
  let upvotedIds: string[] = [];
  if (currentUserId && attempts.length > 0) {
    const rows = await prisma.promptUpvote.findMany({
      where: { userId: currentUserId, attemptId: { in: attempts.map((a) => a.id) } },
      select: { attemptId: true },
    });
    upvotedIds = rows.map((r) => r.attemptId);
  }

  return NextResponse.json({
    attempts: attempts.map((a) => {
      const author = a.userId ? authorById.get(a.userId) : null;
      return {
        id: a.id,
        promptText: a.promptText,
        charCount: a.promptText.length,
        tokenEstimate: a.tokenEstimate,
        score: a.score,
        rubricScores: a.rubricScores,
        feedback: null,
        graderType: null,
        durationSec: null,
        createdAt: a.createdAt.toISOString(),
        scenarioId: a.scenarioId,
        scenarioTitle: a.scenario.title,
        scenarioCategory: a.scenario.category,
        scenarioDifficulty: a.scenario.difficulty,
        shared: true,
        shareTitle: a.shareTitle,
        shareNote: a.shareNote,
        shareUpvotes: a.shareUpvotes,
        authorName: author?.name ?? null,
        authorImage: author?.image ?? null,
      };
    }),
    upvotedIds,
  });
}
