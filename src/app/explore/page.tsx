import { prisma } from "@/lib/prisma";
import ExploreList, { type ExploreItem, type CreatorRailItem } from "./ExploreList";

import { auth } from "@/lib/auth";
import { validatePageAccess } from "@/lib/settings";

export const metadata = {
  title: "Explore — Interviewpad",
  description: "Browse public snippets shared by the Interviewpad community.",
};

const PAGE_SIZE = 20;

export default async function ExplorePage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/explore", session);
  const rows = await prisma.snippet.findMany({
    where: { visibility: "public" },
    orderBy: { updatedAt: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      slug: true,
      title: true,
      template: true,
      updatedAt: true,
      tags: true,
      user: { select: { name: true, image: true } },
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const initial: ExploreItem[] = page.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    template: s.template,
    updatedAt: s.updatedAt.toISOString(),
    tags: parseTags(s.tags),
    author: s.user
      ? { name: s.user.name, image: s.user.image }
      : null,
  }));

  return (
    <ExploreList
      initial={initial}
      initialCursor={hasMore ? page[page.length - 1].id : null}
      creatorRail={await loadCreatorRail()}
    />
  );
}

/** Latest published creator-space content for the explore rail. Failure-safe:
 *  an empty array simply hides the section. */
async function loadCreatorRail(): Promise<CreatorRailItem[]> {
  try {
    const spaces = await prisma.creatorSpace.findMany({
      where: { published: true },
      select: { id: true, name: true, handle: true, avatarUrl: true },
    });
    if (spaces.length === 0) return [];
    const spaceById = new Map(spaces.map((s) => [s.id, s]));
    const ids = spaces.map((s) => s.id);

    const [tutorials, qas, experiences] = await Promise.all([
      prisma.tutorial.findMany({
        where: { spaceId: { in: ids }, published: true },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, spaceId: true, slug: true, title: true, updatedAt: true },
      }),
      prisma.interviewQA.findMany({
        where: { spaceId: { in: ids }, published: true },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, spaceId: true, slug: true, title: true, updatedAt: true },
      }),
      prisma.interviewExperience.findMany({
        where: { spaceId: { in: ids }, published: true },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, spaceId: true, slug: true, title: true, updatedAt: true },
      }),
    ]);

    return [
      ...tutorials.map((t) => ({ kindLabel: "Tutorial", path: "tutorials", ...t })),
      ...qas.map((q) => ({ kindLabel: "Interview Q&A", path: "interview", ...q })),
      ...experiences.map((e) => ({ kindLabel: "Experience", path: "experience", ...e })),
    ]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 3)
      .flatMap((row) => {
        const space = spaceById.get(row.spaceId);
        if (!space) return [];
        return [
          {
            key: `${row.kindLabel}:${row.id}`,
            title: row.title,
            kindLabel: row.kindLabel,
            href: `/c/${space.handle}/${row.path}/${row.slug}`,
            spaceName: space.name,
            spaceHandle: space.handle,
            spaceAvatar: space.avatarUrl,
          },
        ];
      });
  } catch {
    return [];
  }
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
