import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardHero from "./DashboardHero";
import DashboardStats from "./DashboardStats";
import DashboardSidebar from "./DashboardSidebar";
import DashboardWorkspace from "./DashboardWorkspace";
import type {
  SnippetItem,
  BlogItem,
  ChallengeItem,
  FeedItem,
} from "./types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

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

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const feedSnippets = await prisma.snippet.findMany({
    where: { userId: { in: followingIds }, visibility: "public" },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { user: { select: { name: true, image: true } } },
  });

  const trendingSnippets = await prisma.snippet.findMany({
    where: { visibility: "public" },
    orderBy: { viewCount: "desc" },
    take: 6,
    include: { user: { select: { name: true, image: true } } },
  });

  const myBlogs = await prisma.blogPost.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const myChallenges = await prisma.challenge.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { steps: true, attempts: true } } },
  });

  const stats = {
    total: mySnippets.length,
    publicCount: mySnippets.filter((s) => s.visibility === "public").length,
    privateCount: mySnippets.filter((s) => s.visibility === "private").length,
    totalViews: mySnippets.reduce((acc, s) => acc + s.viewCount, 0),
    pinnedCount: mySnippets.filter((s) => s.pinned).length,
    blogsCount: myBlogs.length,
    challengesCount: myChallenges.length,
  };

  const snippets: SnippetItem[] = mySnippets.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    template: s.template,
    updatedAt: s.updatedAt.toISOString(),
    visibility: s.visibility as "public" | "private",
    tags: parseTags(s.tags),
    pinned: s.pinned,
    viewCount: s.viewCount,
  }));

  const blogs: BlogItem[] = myBlogs.map((b) => ({
    id: b.id,
    title: b.title,
    published: b.published,
    createdAt: b.createdAt.toISOString(),
    viewCount: b.viewCount,
  }));

  const challenges: ChallengeItem[] = myChallenges.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    published: c.published,
    difficulty: c.difficulty,
    updatedAt: c.updatedAt.toISOString(),
    stepCount: c._count.steps,
    attemptCount: c._count.attempts,
  }));

  const mapToFeed = (s: any): FeedItem => ({
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

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <DashboardWorkspace
            snippets={snippets}
            blogs={blogs}
            challenges={challenges}
            following={feedSnippets.map(mapToFeed)}
            trending={trendingSnippets.map(mapToFeed)}
          />
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
