import { prisma } from "./prisma";

export interface Badge {
  id: string;
  title: string;
  description: string;
  category: "challenges" | "prompts" | "interviews";
  tier: "bronze" | "silver" | "gold" | "platinum";
  iconName: string;
}

export interface PortfolioData {
  userId: string;
  name: string | null;
  bio: string | null;
  hireMeUrl: string | null;
  image: string | null;
  portfolioPublic: boolean;
  createdAt: Date;
  stats: {
    challengesSolved: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    languagesUsed: string[];
    averagePromptScore: number | null;
    promptsAttempted: number;
    promptPercentile: number | null; // e.g. 5 means top 5%
    mocksCompleted: number;
    mocksPassed: number;
  };
  badges: Badge[];
  solvedChallenges: Array<{
    challengeId: string;
    title: string;
    slug: string;
    difficulty: string;
    category: string;
    finishedAt: Date;
  }>;
  pinnedPlaygrounds: Array<{
    id: string;
    slug: string;
    title: string;
    template: string;
    updatedAt: Date;
    pinned: boolean;
  }>;
  recentMocks: Array<{
    id: string;
    title: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    verdict: string | null;
    sourceType: string;
  }>;
}

// In-memory cache for portfolio data (TTL: 60 seconds)
interface CacheEntry {
  data: PortfolioData;
  expiresAt: number;
}
const portfolioCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export async function getPortfolioData(userId: string): Promise<PortfolioData | null> {
  const now = Date.now();
  const cached = portfolioCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // Fetch candidate base information
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      bio: true,
      hireMeUrl: true,
      image: true,
      portfolioPublic: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  // 1. Challenges Solved
  const passedAttempts = await prisma.challengeAttempt.findMany({
    where: { userId, status: "passed" },
    orderBy: { finishedAt: "desc" },
    select: {
      challengeId: true,
      files: true,
      finishedAt: true,
      durationSec: true,
      challenge: {
        select: {
          title: true,
          slug: true,
          difficulty: true,
          category: true,
        },
      },
    },
  });

  // De-dupe passed attempts by challengeId
  const solvedMap = new Map<string, typeof passedAttempts[0]>();
  for (const attempt of passedAttempts) {
    if (!solvedMap.has(attempt.challengeId)) {
      solvedMap.set(attempt.challengeId, attempt);
    }
  }
  const uniqueSolved = Array.from(solvedMap.values());

  const easyCount = uniqueSolved.filter((s) => s.challenge.difficulty === "easy").length;
  const mediumCount = uniqueSolved.filter((s) => s.challenge.difficulty === "medium").length;
  const hardCount = uniqueSolved.filter((s) => s.challenge.difficulty === "hard").length;

  // Detect languages used from file extensions in challenge attempts
  const languagesSet = new Set<string>();
  for (const s of uniqueSolved) {
    if (!s.files) continue;
    try {
      const parsedFiles = JSON.parse(s.files);
      const fileKeys = Object.keys(parsedFiles);
      for (const key of fileKeys) {
        const ext = key.split(".").pop()?.toLowerCase();
        if (!ext) continue;
        if (["js", "jsx"].includes(ext)) languagesSet.add("JavaScript");
        else if (["ts", "tsx"].includes(ext)) languagesSet.add("TypeScript");
        else if (ext === "py") languagesSet.add("Python");
        else if (ext === "go") languagesSet.add("Go");
        else if (ext === "rs") languagesSet.add("Rust");
        else if (ext === "java") languagesSet.add("Java");
        else if (ext === "cpp" || ext === "cc" || ext === "h") languagesSet.add("C++");
        else if (ext === "rb") languagesSet.add("Ruby");
      }
    } catch {
      // safe fallback if JSON parsing fails
    }
  }
  const languagesUsed = Array.from(languagesSet);

  // 2. Prompt Practice Stats
  const promptAttempts = await prisma.promptAttempt.findMany({
    where: { userId },
    select: { score: true },
  });
  const promptsAttempted = promptAttempts.length;
  const promptAttemptsWithScore = promptAttempts.filter((p) => p.score !== null);
  const averagePromptScore =
    promptAttemptsWithScore.length > 0
      ? Math.round(
          promptAttemptsWithScore.reduce((acc, curr) => acc + (curr.score || 0), 0) /
            promptAttemptsWithScore.length
        )
      : null;

  // Calculate dynamic percentile for prompt practice averages
  let promptPercentile: number | null = null;
  if (averagePromptScore !== null) {
    const promptUsers = await prisma.promptAttempt.groupBy({
      by: ["userId"],
      where: {
        userId: { not: null },
        score: { not: null },
      },
      _avg: {
        score: true,
      },
    });

    const userAverages = promptUsers
      .map((pu) => ({
        userId: pu.userId,
        avgScore: pu._avg.score || 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const userIndex = userAverages.findIndex((ua) => ua.userId === userId);
    if (userIndex !== -1 && userAverages.length > 0) {
      promptPercentile = Math.max(1, Math.round(((userIndex + 1) / userAverages.length) * 100));
    }
  }

  // 3. Mock Interviews Completed
  const mockInterviews = await prisma.interviewSession.findMany({
    where: { userId, type: "mock" },
    select: {
      id: true,
      title: true,
      startedAt: true,
      finishedAt: true,
      status: true,
      verdict: true,
      sourceType: true,
      aiSuspicionScore: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mocksCompleted = mockInterviews.filter((m) => m.status === "completed").length;
  const mocksPassed = mockInterviews.filter(
    (m) => m.status === "completed" && m.verdict === "success"
  ).length;

  // 4. Playgrounds & Snippets
  const publicSnippets = await prisma.snippet.findMany({
    where: { userId, visibility: "public" },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 6,
    select: {
      id: true,
      slug: true,
      title: true,
      template: true,
      updatedAt: true,
      pinned: true,
    },
  });

  // 5. Badge Computation Logic
  const badges: Badge[] = [];

  // Challenges Badges
  if (uniqueSolved.length >= 1) {
    badges.push({
      id: "challenge-novice",
      title: "Challenge Novice",
      description: "Solved their first coding challenge on Codepad.",
      category: "challenges",
      tier: "bronze",
      iconName: "trophy",
    });
  }
  if (uniqueSolved.length >= 5) {
    badges.push({
      id: "challenge-knight",
      title: "Challenge Knight",
      description: "Demonstrated strong puzzle resolution with 5+ solved challenges.",
      category: "challenges",
      tier: "silver",
      iconName: "award",
    });
  }
  if (uniqueSolved.length >= 10) {
    badges.push({
      id: "challenge-champion",
      title: "Challenge Champion",
      description: "A master problem solver with 10+ solved challenges.",
      category: "challenges",
      tier: "gold",
      iconName: "shield",
    });
  }
  if (languagesUsed.length >= 2) {
    badges.push({
      id: "polyglot-coder",
      title: "Polyglot Coder",
      description: "Demonstrated versatility by solving puzzles in 2+ languages.",
      category: "challenges",
      tier: "silver",
      iconName: "globe",
    });
  }
  if (hardCount >= 1) {
    badges.push({
      id: "elite-solver",
      title: "Elite Solver",
      description: "Conquered at least one highly complex HARD challenge.",
      category: "challenges",
      tier: "platinum",
      iconName: "zap",
    });
  }

  // Prompt practice badges
  if (promptsAttempted >= 1) {
    badges.push({
      id: "prompt-novice",
      title: "Prompt Novice",
      description: "Submitted their first engineering prompt evaluation.",
      category: "prompts",
      tier: "bronze",
      iconName: "message-square",
    });
  }
  if (promptsAttempted >= 5) {
    badges.push({
      id: "prompt-specialist",
      title: "Prompt Specialist",
      description: "Polished their LLM instruction skills with 5+ prompt attempts.",
      category: "prompts",
      tier: "silver",
      iconName: "cpu",
    });
  }
  if (averagePromptScore !== null && averagePromptScore >= 80 && promptsAttempted >= 3) {
    badges.push({
      id: "elite-prompter",
      title: "Elite Prompter",
      description: "Averages a superb score of 80% or higher across prompt practice rounds.",
      category: "prompts",
      tier: "gold",
      iconName: "star",
    });
  }
  if (promptPercentile !== null && promptPercentile <= 5) {
    badges.push({
      id: "top-prompter",
      title: "Top 5% Prompter",
      description: "Stands inside the elite top 5% of prompt engineers site-wide.",
      category: "prompts",
      tier: "platinum",
      iconName: "sparkles",
    });
  }

  // Mock Interview badges
  if (mocksCompleted >= 3) {
    badges.push({
      id: "interview-veteran",
      title: "Interview Veteran",
      description: "Acquired substantial experience with 3+ mock interviews completed.",
      category: "interviews",
      tier: "silver",
      iconName: "users",
    });
  }
  if (mocksPassed >= 1) {
    badges.push({
      id: "mock-champion",
      title: "Mock Champion",
      description: "Achieved full approval status in at least one mock interview.",
      category: "interviews",
      tier: "gold",
      iconName: "check-circle",
    });
  }
  // Perfect mock run
  const perfectMock = mockInterviews.find(
    (m) =>
      m.status === "completed" &&
      m.verdict === "success" &&
      (m.aiSuspicionScore === null || m.aiSuspicionScore < 0.1)
  );
  if (perfectMock) {
    badges.push({
      id: "perfect-mock-run",
      title: "Perfect Run",
      description: "Successfully cleared a mock interview with a clean integrity rating.",
      category: "interviews",
      tier: "platinum",
      iconName: "activity",
    });
  }

  const result: PortfolioData = {
    userId: user.id,
    name: user.name,
    bio: user.bio,
    hireMeUrl: user.hireMeUrl,
    image: user.image,
    portfolioPublic: user.portfolioPublic,
    createdAt: user.createdAt,
    stats: {
      challengesSolved: uniqueSolved.length,
      easyCount,
      mediumCount,
      hardCount,
      languagesUsed,
      averagePromptScore,
      promptsAttempted,
      promptPercentile,
      mocksCompleted,
      mocksPassed,
    },
    badges,
    solvedChallenges: uniqueSolved.map((s) => ({
      challengeId: s.challengeId,
      title: s.challenge.title,
      slug: s.challenge.slug,
      difficulty: s.challenge.difficulty,
      category: s.challenge.category || "General",
      finishedAt: s.finishedAt || new Date(),
    })),
    pinnedPlaygrounds: publicSnippets,
    recentMocks: mockInterviews.slice(0, 5).map((m) => ({
      id: m.id,
      title: m.title,
      startedAt: m.startedAt,
      finishedAt: m.finishedAt,
      verdict: m.verdict,
      sourceType: m.sourceType,
    })),
  };

  // Save to cache before returning
  portfolioCache.set(userId, {
    data: result,
    expiresAt: now + CACHE_TTL_MS,
  });

  return result;
}
