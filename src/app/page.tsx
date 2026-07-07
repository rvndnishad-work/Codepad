import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import HomeHero from "./HomeHero";
import HomeArsenal, { type ArsenalCounts } from "./HomeArsenal";
import HomeBento from "./HomeBento";
import HomeInfographic from "./HomeInfographic";
import HomeExplore from "./HomeExplore";
import HomeChallenges from "./HomeChallenges";
import HomeFinalCTA from "./HomeFinalCTA";
import Link from "next/link";
import { ArrowRight, BookOpen, TrendingUp, PenSquare } from "lucide-react";
import { type BlogFeedEntry } from "@/components/BlogFeedItem";
import BlogCardHero from "@/components/BlogCardHero";
import BlogLazyFeed from "@/components/BlogLazyFeed";
import { snippetPeek } from "@/lib/snippet-peek";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import BlogPopularRow from "@/components/BlogPopularRow";

async function loadStats() {
  try {
    const [total, byDifficulty, sumMinutes, sessions] = await Promise.all([
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
    };
  } catch {
    return { totalChallenges: 0, easy: 0, medium: 0, hard: 0, totalMinutes: 0, interviewsRun: 0 };
  }
}

export const metadata: Metadata = {
  title: "Interviewpad — Interview Prep, Coding Challenges & Developer Portfolio",
  description:
    "Prep with 1,000+ hand-written interview questions across 14 technologies, solve runnable challenges in eight languages, train AI-readiness skills, and turn it all into a shareable developer portfolio.",
  alternates: { canonical: "/" },
};

/**
 * Real content counts for the prep-arsenal bento. Every number rendered on the
 * homepage comes from the DB — cards for features with no content hide
 * themselves rather than show zeros.
 */
async function loadArsenalCounts(): Promise<ArsenalCounts> {
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
    return {
      prepQuestions,
      techs: techGroups
        .filter((g): g is typeof g & { technology: string } => g.technology !== null)
        .map((g) => ({ technology: g.technology, count: g._count._all })),
      companies,
      reviewChallenges,
      promptScenarios,
      challenges,
      journeys,
    };
  } catch {
    return {
      prepQuestions: 0,
      techs: [],
      companies: 0,
      reviewChallenges: 0,
      promptScenarios: 0,
      challenges: 0,
      journeys: 0,
    };
  }
}

export default async function HomePage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/", session);

  // Recruiters get the hiring-focused homepage. The hero toggle on /hire
  // links straight back here, so this is a default — not a wall.
  const userType = (session?.user as { userType?: string | null } | undefined)?.userType;
  if (userType === "recruiter") redirect("/hire");

  const userId = session?.user?.id;
  const [stats, arsenal] = await Promise.all([loadStats(), loadArsenalCounts()]);

  let welcomeData: {
    name: string | null;
    image: string | null;
    snippetCount: number;
    recent: { slug: string; title: string; template: string } | null;
  } | null = null;

  if (userId) {
    const [count, recent] = await Promise.all([
      prisma.snippet.count({ where: { userId } }),
      prisma.snippet.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { slug: true, title: true, template: true },
      }),
    ]);
    welcomeData = {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
      snippetCount: count,
      recent,
    };
  }

  // Top public snippets — admin-pinned ones lead the section; remaining slots
  // fill by view count so the grid is never empty even when nothing is pinned.
  const pinnedRows = await prisma.snippet.findMany({
    where: { visibility: "public", pinned: true },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { user: { select: { name: true, image: true } } },
  });
  const fillRows =
    pinnedRows.length < 6
      ? await prisma.snippet.findMany({
        where: { visibility: "public", pinned: false },
        orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
        take: 6 - pinnedRows.length,
        include: { user: { select: { name: true, image: true } } },
      })
      : [];
  const featuredRows = [...pinnedRows, ...fillRows];

  // Editorial homepage feed: 1 admin-pinned hero, 4 latest cards, 5 popular
  // rows on the sidebar — all three sets deduped so the same story never
  // appears twice. We fetch wider-than-needed and trim after merging.
  function safeTags(raw: string | null): string[] {
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

  const [pinnedBlogRows, popularRows, recentRows] = await Promise.all([
    // Admin-pinned hero rail — show all featured posts in a carousel above the
    // editorial grid. Capped at 8 to keep the carousel sensible to swipe.
    prisma.blogPost.findMany({
      where: { published: true, featured: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, image: true } } },
    }),
    // Popular sidebar: top 6 by all-time views (over-fetch by 1 in case the
    // featured post also tops viewCount).
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { user: { select: { name: true, image: true } } },
    }),
    // Latest cards: seed the horizontal scroller with the first 8 — enough
    // to fill the visible row twice on desktop without weighing down the
    // initial page payload. The client fetches more lazily (in batches of 8)
    // as the user scrolls toward the right edge.
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, image: true } } },
    }),
  ]);

  const usedIds = new Set<string>();
  const pinnedEntries: BlogFeedEntry[] = pinnedBlogRows.map((b) => {
    usedIds.add(b.id);
    return toEntry(b as BlogRow);
  });
  const popularEntries: BlogFeedEntry[] = popularRows
    .filter((b) => !usedIds.has(b.id))
    .slice(0, 5)
    .map((b) => {
      usedIds.add(b.id);
      return toEntry(b as BlogRow);
    });
  const latestGridEntries: BlogFeedEntry[] = recentRows
    .filter((b) => !usedIds.has(b.id))
    .map((b) => toEntry(b as BlogRow));

  // When admins haven't pinned anything, promote the freshest unused recent to
  // a hero card so the section still has a focal point. With a pinned
  // carousel above, the BlogCardHero is skipped — its role is filled.
  let homeHero: BlogFeedEntry | null = null;
  let homeGrid = latestGridEntries;
  if (pinnedEntries.length === 0 && homeGrid.length > 0) {
    homeHero = homeGrid[0];
    homeGrid = homeGrid.slice(1);
  }

  // Cursor for the horizontal scroller's "load more": the createdAt of the
  // last card the SSR run included. null when we've already shown every
  // published post.
  const totalPublished = await prisma.blogPost.count({
    where: { published: true },
  });
  const idsAlreadyShown = new Set<string>();
  if (homeHero) idsAlreadyShown.add(homeHero.id);
  pinnedEntries.forEach((p) => idsAlreadyShown.add(p.id));
  popularEntries.forEach((p) => idsAlreadyShown.add(p.id));
  homeGrid.forEach((g) => idsAlreadyShown.add(g.id));
  const scrollerCursor: string | null =
    idsAlreadyShown.size >= totalPublished
      ? null
      : (homeGrid[homeGrid.length - 1]?.createdAt ?? null);



  const hasAnyBlog =
    !!homeHero ||
    pinnedEntries.length > 0 ||
    homeGrid.length > 0 ||
    popularEntries.length > 0;

  const featured = featuredRows.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    template: s.template,
    updatedAt: s.updatedAt.toISOString(),
    author: s.user ? { name: s.user.name, image: s.user.image } : null,
    views: s.viewCount,
    // Highlighted server-side so the section ships no hljs to the client.
    preview: snippetPeek(s.files),
  }));

  return (
    <div className="bg-bg min-h-screen">
      <HomeHero
        persona="candidate"
        sessionName={welcomeData?.name}
        snippetCount={welcomeData?.snippetCount ?? 0}
        recentSnippet={welcomeData?.recent}
      />

      <HomeArsenal counts={arsenal} />

      <HomeBento />

      <HomeInfographic />

      <HomeExplore featured={featured} />

      <HomeChallenges stats={stats} />

      <HomeFinalCTA />

      {/* Latest Stories — editorial mix:
            - Big hero card (admin-pinned via BlogPost.featured, else freshest)
            - 2x2 grid of recent stories beside / below it
            - Compact "Most read" sidebar with numbered popular posts
          Total ~10 stories visible without scrolling on desktop. */}
      {hasAnyBlog && (
        <section className="bg-bg py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -mr-64 -mt-64" />
          <div className="mx-auto max-w-6xl px-4 relative z-10">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-accent mb-2 bg-accent/10 px-3 py-1 rounded-full">
                  <BookOpen className="w-3.5 h-3.5" />
                  Insights
                </div>
                <h2 className="text-3xl font-black text-fg tracking-tight">Latest Stories</h2>
              </div>
              <Link
                href="/blog"
                className="text-sm font-bold text-muted hover:text-fg transition-colors flex items-center gap-2 group"
              >
                Read all articles
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Pinned posts: full-width hero carousel above the editorial grid
                so it doesn't squeeze the sidebar. Renders only when admins
                have pinned at least one post. */}
            {pinnedEntries.length > 0 && (
              <div className="mb-8">
                <FeaturedCarousel items={pinnedEntries} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main column — hero + a single row of 3 grid cards. Keeps the
                  homepage section compact (the full feed lives on /blog) and
                  matches the height of the stacked sidebar widgets on the
                  right. Takes 2/3 of the width on desktop. */}
              <div className="lg:col-span-2 space-y-6">
                {/* BlogCardHero only appears when nothing is pinned — the
                    carousel above takes its role when pinned posts exist. */}
                {homeHero && pinnedEntries.length === 0 && (
                  <BlogCardHero blog={homeHero} />
                )}

                {homeGrid.length > 0 && (
                  <BlogLazyFeed
                    initialItems={homeGrid}
                    initialCursor={scrollerCursor}
                    excludeIds={Array.from(idsAlreadyShown)}
                  />
                )}
              </div>

              {/* Sidebar — three stacked widgets so it fills the same vertical
                  space as the hero + grid in the main column on desktop. */}
              <aside className="space-y-4">
                {popularEntries.length > 0 && (
                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      <h3 className="text-sm font-black tracking-tight text-fg">
                        Most read
                      </h3>
                    </div>
                    <div className="flex flex-col">
                      {popularEntries.map((blog, i) => (
                        <BlogPopularRow key={blog.id} blog={blog} rank={i + 1} />
                      ))}
                    </div>
                    <Link
                      href="/blog?tab=top"
                      className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted hover:text-fg transition-colors py-2 rounded-lg border border-border bg-bg hover:bg-elevated"
                    >
                      See all popular
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}



                {/* Write CTA — points authenticated users straight at the
                    editor, prompts everyone else to sign in first. */}
                <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <PenSquare className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-black tracking-tight text-fg">
                      Write on Interviewpad
                    </h3>
                  </div>
                  <p className="text-xs text-muted mb-3 leading-relaxed">
                    Share what you learn. Embed runnable code, get reactions, grow your audience.
                  </p>
                  <Link
                    href={userId ? "/dashboard/blogs/new" : "/login?next=/dashboard/blogs/new"}
                    className="block text-center px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition"
                  >
                    {userId ? "Start writing" : "Sign in to write"}
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
