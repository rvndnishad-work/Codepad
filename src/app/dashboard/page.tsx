import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardHero from "./DashboardHero";
import DashboardJourney from "./DashboardJourney";
import DashboardStats from "./DashboardStats";
import DashboardSidebar from "./DashboardSidebar";
import DashboardWorkspace from "./DashboardWorkspace";
import DashboardCreatorFeed from "./DashboardCreatorFeed";
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

  const feedUserSelect = {
    id: true,
    slug: true,
    title: true,
    template: true,
    updatedAt: true,
    viewCount: true,
    user: { select: { name: true, image: true } },
  } as const;

  const myTakeHomesPromise = prisma.user
    .findUnique({ where: { id: userId }, select: { email: true } })
    .then((me) =>
      me?.email
        ? prisma.takeHomeAssignment.findMany({
            where: { candidateEmail: me.email.toLowerCase() },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              token: true,
              status: true,
              expiresAt: true,
              challenge: { select: { title: true } },
              workspace: { select: { name: true } },
            },
          })
        : [],
    );

  const feedSnippetsPromise = prisma.follow
    .findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    .then((following) =>
      following.length === 0
        ? []
        : prisma.snippet.findMany({
            where: {
              userId: { in: following.map((f) => f.followingId) },
              visibility: "public",
            },
            orderBy: { updatedAt: "desc" },
            take: 6,
            select: feedUserSelect,
          }),
    );

  const [
    myTakeHomes,
    mySnippets,
    feedSnippets,
    trendingSnippets,
    myBlogs,
    myChallenges,
    myWorkspaces,
    snippetGroups,
    pinnedCount,
    blogsCount,
    challengesCount,
  ] = await Promise.all([
    myTakeHomesPromise,
    prisma.snippet.findMany({
      where: { userId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 100,
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
    }),
    feedSnippetsPromise,
    prisma.snippet.findMany({
      where: { visibility: "public" },
      orderBy: { viewCount: "desc" },
      take: 6,
      select: feedUserSelect,
    }),
    prisma.blogPost.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        published: true,
        createdAt: true,
        viewCount: true,
      },
    }),
    prisma.challenge.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        difficulty: true,
        updatedAt: true,
        _count: { select: { steps: true, attempts: true } },
      },
    }),
    prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          select: { name: true, slug: true, planName: true },
        },
      },
      orderBy: { role: "asc" },
    }),
    prisma.snippet.groupBy({
      by: ["visibility"],
      where: { userId },
      _count: { _all: true },
      _sum: { viewCount: true },
    }),
    prisma.snippet.count({ where: { userId, pinned: true } }),
    prisma.blogPost.count({ where: { userId } }),
    prisma.challenge.count({ where: { authorId: userId } }),
  ]);

  const stats = {
    total: snippetGroups.reduce((acc, g) => acc + g._count._all, 0),
    publicCount:
      snippetGroups.find((g) => g.visibility === "public")?._count._all ?? 0,
    privateCount:
      snippetGroups.find((g) => g.visibility === "private")?._count._all ?? 0,
    totalViews: snippetGroups.reduce(
      (acc, g) => acc + (g._sum.viewCount ?? 0),
      0,
    ),
    pinnedCount,
    blogsCount,
    challengesCount,
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

  type FeedSource = {
    id: string;
    slug: string;
    title: string;
    template: string;
    updatedAt: Date;
    viewCount: number;
    user: { name: string | null; image: string | null } | null;
  };
  const mapToFeed = (s: FeedSource): FeedItem => ({
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

      <DashboardJourney userId={userId} />

      <DashboardStats stats={stats} />

      <DashboardCreatorFeed userId={userId} />

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
          <DashboardSidebar
            workspaces={myWorkspaces.map((m) => ({
              name: m.workspace.name,
              slug: m.workspace.slug,
              plan: m.workspace.planName,
            }))}
            takeHomes={myTakeHomes}
          />
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
