import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Newspaper, Edit3, Layers, Plus, Sparkles, Eye, EyeOff } from "lucide-react";
import DashboardHero from "./DashboardHero";
import DashboardStats from "./DashboardStats";
import DashboardFeed from "./DashboardFeed";
import DashboardSidebar from "./DashboardSidebar";
import DashboardList from "./DashboardList";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // 1. Fetch User's Snippets
  const mySnippets = await prisma.snippet.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      template: true,
      updatedAt: true,
      visibility: true,
      tags: true,
      pinned: true,
      viewCount: true,
    },
  });

  // 2. Fetch Following Feed
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const feedSnippets = await prisma.snippet.findMany({
    where: {
      userId: { in: followingIds },
      visibility: "public",
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { user: { select: { name: true, image: true } } },
  });

  // 3. Fetch Trending Snippets
  const trendingSnippets = await prisma.snippet.findMany({
    where: { visibility: "public" },
    orderBy: { viewCount: "desc" },
    take: 6,
    include: { user: { select: { name: true, image: true } } },
  });

  // 4. Compute Stats
  const stats = {
    total: mySnippets.length,
    publicCount: mySnippets.filter((s) => s.visibility === "public").length,
    privateCount: mySnippets.filter((s) => s.visibility === "private").length,
    totalViews: mySnippets.reduce((acc, s) => acc + s.viewCount, 0),
    pinnedCount: mySnippets.filter((s) => s.pinned).length,
  };

  // 5. Fetch User's Blogs
  const myBlogs = await prisma.blogPost.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // 6. Fetch User's Challenges (authored). Stage 1 of Option B — users can
  // now author their own coding questions; this widget surfaces them so
  // they can edit, publish, or delete from one place. Migrated Tracks
  // (Stage 2) show up here as multi-step Challenges with a step-count pill.
  const myChallenges = await prisma.challenge.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { steps: true, attempts: true } } },
  });

  const initialItems = mySnippets.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    template: s.template,
    updatedAt: s.updatedAt.toISOString(),
    visibility: s.visibility as "public" | "private",
    tags: parseTags(s.tags),
    pinned: s.pinned,
  }));

  const mapToFeed = (s: any) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    template: s.template,
    updatedAt: s.updatedAt.toISOString(),
    viewCount: s.viewCount,
    userName: s.user?.name ?? "Anonymous",
    userImage: s.user?.image ?? null,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <DashboardHero userName={session.user?.name ?? null} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <DashboardStats stats={stats} />
          
          <DashboardFeed 
            following={feedSnippets.map(mapToFeed)} 
            trending={trendingSnippets.map(mapToFeed)} 
          />

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-fg tracking-tight">Your Snippets</h2>
              <div className="text-xs text-muted">{mySnippets.length} items total</div>
            </div>
            <DashboardList initial={initialItems} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-fg tracking-tight">Your Blog Posts</h2>
              <div className="text-xs text-muted">{myBlogs.length} posts total</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link 
                href="/dashboard/blogs/new"
                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border hover:border-accent hover:bg-accent/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Newspaper className="w-6 h-6 text-accent" />
                </div>
                <span className="text-sm font-bold text-fg">Create New Blog</span>
                <span className="text-xs text-muted">Share your knowledge</span>
              </Link>

              {myBlogs.map(blog => (
                <Link
                  key={blog.id}
                  href={`/dashboard/blogs/${blog.id}/edit`}
                  className="flex flex-col p-6 rounded-2xl border border-border bg-surface hover:border-border-strong transition-all shadow-sm group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${blog.published ? "text-accent bg-accent/10 border-accent/20" : "text-muted bg-panel border-border"}`}>
                      {blog.published ? "Published" : "Draft"}
                    </span>
                    <span className="text-[10px] font-bold text-muted/40 uppercase tabular-nums">
                      {blog.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-fg group-hover:text-accent transition-colors line-clamp-1">{blog.title}</h3>
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      {blog.viewCount} views
                    </span>
                    <Edit3 className="w-3 h-3 text-muted group-hover:text-fg transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Stage 2: "Your Tracks" retired. Migrated tracks now live in
              "Your Challenges" below (as multi-step Challenges). The Track
              data is preserved in the DB but no longer surfaced — the older
              myTracks query is left in place for the transitional period
              but its UI is gone. */}

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-fg tracking-tight">Your Challenges</h2>
              <div className="text-xs text-muted">
                {myChallenges.length} challenge{myChallenges.length === 1 ? "" : "s"} total
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/dashboard/challenges/new"
                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border hover:border-accent hover:bg-accent/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-accent" />
                </div>
                <span className="text-sm font-bold text-fg">Create New Challenge</span>
                <span className="text-xs text-muted text-center">
                  Write your own coding question — single or multi-step
                </span>
              </Link>

              {myChallenges.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/challenges/${c.id}/edit`}
                  className="flex flex-col p-6 rounded-2xl border border-border bg-surface hover:border-border-strong transition-all shadow-sm group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                        c.published
                          ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                          : "text-muted bg-panel border-border"
                      }`}
                    >
                      {c.published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      {c.published ? "Published" : "Draft"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted/60 uppercase tracking-wider">
                      {c._count.steps > 1 ? `${c._count.steps} steps` : c.difficulty}
                    </span>
                  </div>
                  <h3 className="font-bold text-fg group-hover:text-accent transition-colors line-clamp-1">
                    {c.title}
                  </h3>
                  <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed font-mono">
                    /{c.slug}
                  </p>
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      {c._count.attempts} attempts
                    </span>
                    <Edit3 className="w-3 h-3 text-muted group-hover:text-fg transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <DashboardSidebar />
        </aside>
      </div>
    </div>
  );
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
