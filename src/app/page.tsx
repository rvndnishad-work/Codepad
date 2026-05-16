import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomeHero from "./HomeHero";
import HomeBento from "./HomeBento";
import HomeChallenges from "./HomeChallenges";
import HomeExplore from "./HomeExplore";
import HomeFinalCTA from "./HomeFinalCTA";
import Link from "next/link";
import { ArrowRight, BookOpen, TrendingUp, Pin, Hash, PenSquare } from "lucide-react";
import { type BlogFeedEntry } from "@/components/BlogFeedItem";
import BlogCardHero from "@/components/BlogCardHero";
import BlogLazyFeed from "@/components/BlogLazyFeed";
import BlogPopularRow from "@/components/BlogPopularRow";
import TemplatePicker from "@/components/TemplatePicker";

export default async function HomePage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

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

  const [featuredRow, popularRows, recentRows] = await Promise.all([
    // Admin-pinned hero: most recent featured post.
    prisma.blogPost.findFirst({
      where: { published: true, featured: true },
      orderBy: { createdAt: "desc" },
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
  const heroEntry: BlogFeedEntry | null = featuredRow
    ? (usedIds.add(featuredRow.id), toEntry(featuredRow as BlogRow))
    : null;
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

  // If no admin-pinned post exists, promote the freshest unused recent to hero
  // so the editorial layout doesn't fall apart.
  let homeHero = heroEntry;
  let homeGrid = latestGridEntries;
  if (!homeHero && homeGrid.length > 0) {
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
  popularEntries.forEach((p) => idsAlreadyShown.add(p.id));
  homeGrid.forEach((g) => idsAlreadyShown.add(g.id));
  const scrollerCursor: string | null =
    idsAlreadyShown.size >= totalPublished
      ? null
      : (homeGrid[homeGrid.length - 1]?.createdAt ?? null);



  const hasAnyBlog = !!homeHero || homeGrid.length > 0 || popularEntries.length > 0;

  const featured = featuredRows.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    template: s.template,
    updatedAt: s.updatedAt.toISOString(),
    author: s.user ? { name: s.user.name, image: s.user.image } : null,
  }));

  return (
    <div className="bg-bg min-h-screen">
      <HomeHero
        sessionName={welcomeData?.name}
        snippetCount={welcomeData?.snippetCount ?? 0}
        recentSnippet={welcomeData?.recent}
      />

      <HomeBento />

      <HomeExplore featured={featured} />

      <HomeChallenges />

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main column — hero + a single row of 3 grid cards. Keeps the
                  homepage section compact (the full feed lives on /blog) and
                  matches the height of the stacked sidebar widgets on the
                  right. Takes 2/3 of the width on desktop. */}
              <div className="lg:col-span-2 space-y-6">
                {homeHero && (
                  <div className="relative">
                    {/* Pin badge floats above the hero when this story was
                        explicitly featured by an admin (vs. just the freshest). */}
                    {!!featuredRow && featuredRow.id === homeHero.id && (
                      <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg/90 backdrop-blur border border-accent/40 text-[9px] font-black uppercase tracking-[0.18em] text-accent">
                        <Pin className="w-2.5 h-2.5 fill-current" />
                        Staff pick
                      </span>
                    )}
                    <BlogCardHero blog={homeHero} />
                  </div>
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

      <HomeFinalCTA />
    </div>
  );
}
