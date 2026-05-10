import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
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
