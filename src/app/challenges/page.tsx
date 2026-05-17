import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChallengeList, { type ChallengeListItem } from "./ChallengeList";
import ChallengesHero, { type ChallengesHeroStats } from "./ChallengesHero";
import ContinueStrip from "./ContinueStrip";
import FeaturedShelf from "./FeaturedShelf";

import { validatePageAccess } from "@/lib/settings";

export const metadata = {
  title: "Challenges — Interviewpad",
  description:
    "Practice coding challenges with hidden tests. Sharpen your interview skills.",
};

export default async function ChallengesPage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/challenges", session);
  const userId = session?.user?.id;

  const rows = await prisma.challenge.findMany({
    // Only public+published challenges show up in discovery. Private ones
    // stay unlisted regardless of who's browsing — the magic-link / email
    // match is what grants visibility.
    where: { published: true, visibility: "public" },
    // Featured first, then easier challenges, then newest — keeps the grid
    // welcoming for first-time visitors while still rewarding curation.
    orderBy: [
      { featured: "desc" },
      { difficulty: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      tags: true,
      category: true,
      estimatedMinutes: true,
      featured: true,
      _count: { select: { steps: true } },
    },
  });

  // Fetch user's attempts (best status per challenge) so we can show
  // "Passed" / "Attempted" badges on the list.
  let attemptsByChallenge: Record<string, "passed" | "failed" | "in_progress"> = {};
  if (userId) {
    const attempts = await prisma.challengeAttempt.findMany({
      where: { userId },
      select: { challengeId: true, status: true },
    });
    for (const a of attempts) {
      const status = a.status as "passed" | "failed" | "in_progress" | "abandoned";
      if (status === "abandoned") continue;
      const prev = attemptsByChallenge[a.challengeId];
      // passed > failed > in_progress
      if (status === "passed" || !prev || (status === "failed" && prev === "in_progress")) {
        attemptsByChallenge[a.challengeId] = status;
      }
    }
  }

  const items: ChallengeListItem[] = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    tags: parseTags(c.tags),
    category: c.category,
    estimatedMinutes: c.estimatedMinutes,
    stepCount: c._count.steps,
    featured: c.featured,
    userStatus: attemptsByChallenge[c.id] ?? null,
  }));

  // ── Hero stats ──────────────────────────────────────────────────────────
  // Total challenges + their difficulty breakdown come straight from `items`
  // so we don't pay for a second query. Interview-sessions count is a small
  // separate query so the page still works when nobody is signed in.
  const stats = computeStats(items);
  const interviewsRun = await prisma.interviewSession.count().catch(() => 0);

  const personal = userId
    ? computePersonalStats(items)
    : null;

  const heroStats: ChallengesHeroStats = {
    ...stats,
    interviewsRun,
    personal,
  };

  return (
    <>
      <ChallengesHero stats={heroStats} />
      <ContinueStrip userId={userId ?? null} />
      <FeaturedShelf />
      <ChallengeList items={items} signedIn={!!userId} />
    </>
  );
}

function computeStats(items: ChallengeListItem[]) {
  let easy = 0;
  let medium = 0;
  let hard = 0;
  let totalMinutes = 0;
  for (const c of items) {
    totalMinutes += c.estimatedMinutes;
    if (c.difficulty === "easy") easy += 1;
    else if (c.difficulty === "medium") medium += 1;
    else if (c.difficulty === "hard") hard += 1;
  }
  return {
    totalChallenges: items.length,
    easy,
    medium,
    hard,
    totalMinutes,
  };
}

function computePersonalStats(items: ChallengeListItem[]) {
  let solved = 0;
  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const c of items) {
    if (c.userStatus === "passed") {
      solved += 1;
      byDifficulty[c.difficulty] += 1;
    }
  }
  return {
    solved,
    total: items.length,
    byDifficulty,
  };
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}
