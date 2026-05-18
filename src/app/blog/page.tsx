import Link from "next/link";
import { Flame, Sparkles, TrendingUp, Users, PenSquare, Hash } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import { type BlogFeedEntry } from "@/components/BlogFeedItem";
import BlogStoriesList from "@/components/BlogStoriesList";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog — Interviewpad",
  description: "Articles on engineering, AI, frontend, and interview prep from the Interviewpad community.",
};

type Tab = "latest" | "following" | "top";

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "latest", label: "Latest", icon: Sparkles },
  { id: "following", label: "Following", icon: Users },
  { id: "top", label: "Most read", icon: TrendingUp },
];

function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

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

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  await validatePageAccess("/blog", session);
  const userId = session?.user?.id ?? null;

  const requestedTab = (sp.tab as Tab) || "latest";
  const tab: Tab =
    requestedTab === "following" && !userId ? "latest" : requestedTab;
  const tag = sp.tag?.trim().toLowerCase() || null;

  // Build the where clause for the feed.
  let where: any = { published: true };
  let orderBy: any = { createdAt: "desc" as const };

  if (tab === "top") {
    orderBy = [{ viewCount: "desc" as const }, { createdAt: "desc" as const }];
  } else if (tab === "following" && userId) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    where = {
      published: true,
      userId: { in: follows.map((f) => f.followingId) },
    };
  }

  if (tag) {
    where = { ...where, tags: { contains: `"${tag}"` } };
  }

  // Featured carousel runs only on the Latest tab with no tag filter — once the
  // user has narrowed the view, a horizontal "pinned" rail just gets in the way.
  const showFeatured = tab === "latest" && !tag;
  const featuredRows = showFeatured
    ? await prisma.blogPost.findMany({
        where: { published: true, featured: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { reactions: true, comments: true } },
        },
      })
    : [];

  // Main feed — exclude carousel items so we don't show them twice, then fetch
  // the first page. Lazy load tops this up via /api/blogs.
  const mainWhere = showFeatured ? { ...where, featured: false } : where;

  const rows = await prisma.blogPost.findMany({
    where: mainWhere,
    orderBy,
    take: 12,
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { reactions: true, comments: true } },
    },
  });

  const toEntry = (b: typeof rows[number]): BlogFeedEntry => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    excerpt: b.excerpt,
    coverImage: b.coverImage,
    viewCount: b.viewCount,
    createdAt: b.createdAt.toISOString(),
    readingMinutes: readingMinutes(b.content),
    tags: safeTags(b.tags),
    reactionCount: b._count.reactions,
    commentCount: b._count.comments,
    user: { name: b.user.name, image: b.user.image },
  });

  const featured: BlogFeedEntry[] = featuredRows.map(toEntry);
  const featuredIds = featuredRows.map((r) => r.id);
  const items: BlogFeedEntry[] = rows.map(toEntry);

  // Cursor pagination on the latest tab uses createdAt; top/following can't
  // lazy-load (their order isn't a stable createdAt scan), so we ship a finite
  // first page. Empty cursor = nothing to lazy load.
  const canLazyLoad = tab === "latest" && rows.length === 12;
  const lazyCursor = canLazyLoad ? rows[rows.length - 1].createdAt.toISOString() : null;

  // Sidebar data — fetched in parallel.
  const [popularTagsRaw, suggestedUsers, mostRead] = await Promise.all([
    prisma.blogPost.findMany({
      where: { published: true, tags: { not: null } },
      select: { tags: true },
      take: 200,
    }),
    // Suggested authors: have a published post, public portfolio, and (if signed in) we don't already follow.
    (async () => {
      const followedIds = userId
        ? (await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
          })).map((f) => f.followingId)
        : [];
      const candidates = await prisma.user.findMany({
        where: {
          portfolioPublic: true,
          id: userId ? { notIn: [userId, ...followedIds] } : undefined,
          blogs: { some: { published: true } },
        },
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          _count: { select: { blogs: { where: { published: true } }, followers: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      return candidates;
    })(),
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        slug: true,
        title: true,
        viewCount: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  // Aggregate tag counts client-side from the recent-200 sample.
  const tagCounts = new Map<string, number>();
  for (const row of popularTagsRaw) {
    for (const t of safeTags(row.tags)) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const popularTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="bg-bg min-h-screen">
      {/* Hero strip (compact) */}
      <div className="border-b border-border bg-bg/50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-3 bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]">
            <Flame className="w-3 h-3 fill-current animate-pulse" />
            Insights & Engineering
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
            Stories from the Interviewpad community
          </h1>
          <p className="text-muted text-sm mt-2 max-w-2xl">
            Deep dives on frontend, AI, and interview prep — written by developers, for developers.
          </p>
        </div>
      </div>

      {featured.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pt-8">
          <FeaturedCarousel items={featured} />
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        {/* MAIN COLUMN */}
        <div>
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-border">
            {TABS.map((t) => {
              if (t.id === "following" && !userId) return null;
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  href={`/blog?tab=${t.id}${tag ? `&tag=${tag}` : ""}`}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors -mb-px ${
                    active
                      ? "border-accent text-fg"
                      : "border-transparent text-muted hover:text-fg"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </Link>
              );
            })}
          </div>

          {/* Active filter chip */}
          {tag && (
            <div className="mb-4 flex items-center gap-2 text-xs">
              <span className="text-muted">Filtered by</span>
              <Link
                href={`/blog?tab=${tab}`}
                className="px-2.5 py-1 rounded-md bg-accent/10 border border-accent/30 text-accent font-bold uppercase tracking-wider hover:bg-accent/20 transition"
              >
                #{tag} ✕
              </Link>
            </div>
          )}

          {/* Unified row feed. Lazy load runs on the Latest tab; Top and Following ship a single finite page. */}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              {tab === "following" ? (
                <>
                  <Users className="w-8 h-8 text-muted/40 mx-auto mb-3" />
                  <p className="text-fg font-bold">No posts from people you follow yet</p>
                  <p className="text-muted text-sm mt-1">
                    Follow some authors from the sidebar to see their stories here.
                  </p>
                </>
              ) : (
                <p className="text-muted">No stories match this view yet.</p>
              )}
            </div>
          ) : (
            <BlogStoriesList
              initialItems={items}
              initialCursor={lazyCursor}
              excludeIds={featuredIds}
              tag={tag}
              enableLazy={canLazyLoad}
            />
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {/* Write CTA */}
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <PenSquare className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-black tracking-tight text-fg">
                Write on Interviewpad
              </h3>
            </div>
            <p className="text-xs text-muted mb-3 leading-relaxed">
              Share what you learn. Embed runnable code, get reactions, and grow your audience.
            </p>
            <Link
              href={userId ? "/dashboard/blogs/new" : "/login?next=/dashboard/blogs/new"}
              className="block text-center px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition"
            >
              {userId ? "Start writing" : "Sign in to write"}
            </Link>
          </div>

          {/* Who to follow */}
          {suggestedUsers.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-black tracking-tight text-fg">
                  Who to follow
                </h3>
              </div>
              <ul className="flex flex-col gap-4">
                {suggestedUsers.map((u) => (
                  <li key={u.id} className="flex items-start gap-3">
                    <Link
                      href={`/u/${u.id}`}
                      className="w-9 h-9 rounded-full bg-surface overflow-hidden border border-border shrink-0"
                    >
                      {u.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-muted">
                          {(u.name ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/u/${u.id}`}
                        className="block text-sm font-bold text-fg truncate hover:text-accent"
                      >
                        {u.name ?? "Anonymous"}
                      </Link>
                      <p className="text-[11px] text-muted truncate">
                        {u._count.blogs} post{u._count.blogs === 1 ? "" : "s"} ·{" "}
                        {u._count.followers} follower{u._count.followers === 1 ? "" : "s"}
                      </p>
                    </div>
                    <FollowButton
                      userId={u.id}
                      initialFollowing={false}
                      signedIn={!!userId}
                      size="sm"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Most read */}
          {mostRead.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-black tracking-tight text-fg">
                  Most read
                </h3>
              </div>
              <ol className="flex flex-col gap-3">
                {mostRead.map((p, i) => (
                  <li key={p.id} className="flex items-start gap-3">
                    <span className="text-2xl font-black text-emerald-500/20 leading-none tabular-nums shrink-0 w-6">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="flex-1 min-w-0 group"
                    >
                      <p className="text-sm font-bold text-fg leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                        {p.title}
                      </p>
                      <p className="text-[11px] text-muted mt-1 truncate">
                        {p.user.name ?? "Anonymous"} · {p.viewCount} views
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Popular tags */}
          {popularTags.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-black tracking-tight text-fg">
                  Popular topics
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map(([t, count]) => (
                  <Link
                    key={t}
                    href={`/blog?tag=${encodeURIComponent(t)}`}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition border ${
                      tag === t
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-bg border-border text-muted hover:text-fg hover:border-border-strong"
                    }`}
                  >
                    #{t}
                    <span className="ml-1 text-muted/50 tabular-nums">{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
