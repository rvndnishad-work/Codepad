import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import "@/components/wow/wow.css";
import "@/components/home-wow/home-wow.css";
import HomeWowHero from "@/components/home-wow/HomeWowHero";
import HomeWowPortals, { type PortalCounts, type TechLink } from "@/components/home-wow/HomeWowPortals";
import HomeWowSteps from "@/components/home-wow/HomeWowSteps";
import HomeWowArena from "@/components/home-wow/HomeWowArena";
import HomeWowCreators from "@/components/home-wow/HomeWowCreators";
import HomeWowStories from "@/components/home-wow/HomeWowStories";
import WowFinal from "@/components/wow/WowFinal";
import { type BlogFeedEntry } from "@/components/BlogFeedItem";
import { techLabel } from "@/lib/interview-questions/shared";

async function loadStats() {
  try {
    const [total, byDifficulty, sumMinutes, sessions, prepQuestions] = await Promise.all([
      prisma.challenge.count({ where: { published: true } }),
      prisma.challenge.groupBy({
        by: ["difficulty"],
        where: { published: true },
        _count: true,
      }),
      prisma.challenge.aggregate({
        where: { published: true },
        _sum: { estimatedMinutes: true },
      }),
      prisma.interviewSession.count(),
      prisma.prepQuestion.count({ where: { status: "published" } }),
    ]);
    const counts: Record<string, number> = {};
    for (const g of byDifficulty) {
      const n = typeof g._count === "number" ? g._count : 0;
      counts[g.difficulty] = n;
    }
    return {
      totalChallenges: total,
      easy: counts.easy ?? 0,
      medium: counts.medium ?? 0,
      hard: counts.hard ?? 0,
      totalMinutes: sumMinutes._sum.estimatedMinutes ?? 0,
      interviewsRun: sessions,
      prepQuestions,
    };
  } catch {
    return { totalChallenges: 0, easy: 0, medium: 0, hard: 0, totalMinutes: 0, interviewsRun: 0, prepQuestions: 0 };
  }
}

async function loadArsenalCounts(): Promise<{ counts: PortalCounts; techs: TechLink[] }> {
  try {
    const [prepQuestions, techGroups, companies, reviewChallenges, promptScenarios, challenges, journeys] =
      await Promise.all([
        prisma.prepQuestion.count({ where: { status: "published" } }),
        prisma.prepQuestion.groupBy({
          by: ["technology"],
          where: { status: "published" },
          _count: { _all: true },
        }),
        prisma.company.count(),
        prisma.reviewChallenge.count({ where: { published: true } }),
        prisma.promptScenario.count(),
        prisma.challenge.count({ where: { published: true } }),
        prisma.prepJourney.count(),
      ]);
    // Biggest tracks first; these become the "questions by technology" links.
    const techs: TechLink[] = techGroups
      .filter((g): g is typeof g & { technology: string } => g.technology !== null)
      .map((g) => ({ slug: g.technology, label: techLabel(g.technology), count: g._count._all }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return {
      counts: {
        prepQuestions,
        techCount: techs.length,
        companies,
        reviewChallenges,
        promptScenarios,
        challenges,
        journeys,
      },
      techs,
    };
  } catch {
    return {
      counts: { prepQuestions: 0, techCount: 0, companies: 0, reviewChallenges: 0, promptScenarios: 0, challenges: 0, journeys: 0 },
      techs: [],
    };
  }
}

export const metadata: Metadata = {
  title: "Interviewpad — Interview Prep, Coding Challenges & Developer Portfolio",
  description:
    "Prep with 1,000+ hand-written interview questions across 14 technologies, solve runnable challenges in 8 languages, train AI-readiness skills, and turn it all into a shareable developer portfolio.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/", session);

  const userType = (session?.user as { userType?: string | null } | undefined)?.userType;
  if (userType === "recruiter") redirect("/hire");

  const userId = session?.user?.id;
  const [stats, arsenal] = await Promise.all([loadStats(), loadArsenalCounts()]);

  let welcomeData: {
    name: string | null;
    recent: { slug: string; title: string } | null;
  } | null = null;

  if (userId) {
    const recent = await prisma.snippet.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true },
    }).catch(() => null);
    welcomeData = { name: session.user?.name ?? null, recent };
  }

  // ── Editorial blog feed (same honest dedupe as before) ──
  function safeTags(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
    } catch {
      return [];
    }
  }

  type BlogRow = Awaited<ReturnType<typeof prisma.blogPost.findMany>>[number] & {
    user: { name: string | null; image: string | null };
  };

  function toEntry(b: BlogRow): BlogFeedEntry {
    return {
      id: b.id,
      slug: b.slug,
      title: b.title,
      excerpt: b.excerpt,
      coverImage: b.coverImage,
      viewCount: b.viewCount,
      createdAt: b.createdAt.toISOString(),
      readingMinutes: Math.max(1, Math.round(b.content.trim().split(/\s+/).length / 200)),
      tags: safeTags(b.tags),
      user: { name: b.user.name, image: b.user.image },
    };
  }

  // Lead story: the newest featured post, else the newest post. Most read
  // and the three cards below it skip anything already shown.
  const [featuredRows, popularRows, recentRows] = await Promise.all([
    prisma.blogPost.findMany({
      where: { published: true, featured: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
      include: { user: { select: { name: true, image: true } } },
    }).catch(() => []),
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { user: { select: { name: true, image: true } } },
    }).catch(() => []),
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, image: true } } },
    }).catch(() => []),
  ]);

  const leadRow = featuredRows[0] ?? recentRows[0];
  const homeHero: BlogFeedEntry | null = leadRow ? toEntry(leadRow as BlogRow) : null;
  const usedIds = new Set<string>(homeHero ? [homeHero.id] : []);
  const popularEntries: BlogFeedEntry[] = popularRows
    .filter((b) => !usedIds.has(b.id))
    .slice(0, 5)
    .map((b) => {
      usedIds.add(b.id);
      return toEntry(b as BlogRow);
    });
  const homeGrid: BlogFeedEntry[] = recentRows
    .filter((b) => !usedIds.has(b.id))
    .slice(0, 3)
    .map((b) => toEntry(b as BlogRow));

  const hasAnyBlog = !!homeHero || homeGrid.length > 0 || popularEntries.length > 0;

  return (
    <div className="wow-scope min-h-screen bg-bg transition-colors">
      <HomeWowHero
        stats={{ questions: stats.prepQuestions, challenges: stats.totalChallenges, sessions: stats.interviewsRun }}
        userName={welcomeData?.name}
        recentSnippet={welcomeData?.recent}
      />

      <HomeWowPortals counts={arsenal.counts} techs={arsenal.techs} />

      <HomeWowSteps />

      <HomeWowArena />

      <HomeWowCreators />

      {hasAnyBlog && (
        <HomeWowStories
          hero={homeHero}
          grid={homeGrid}
          popular={popularEntries}
          signedIn={!!userId}
        />
      )}

      <WowFinal />
    </div>
  );
}
