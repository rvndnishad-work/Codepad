import { prisma } from "@/lib/prisma";
import ExploreList, { type ExploreItem } from "./ExploreList";

export const metadata = {
  title: "Explore — Codepad",
  description: "Browse public snippets shared by the Codepad community.",
};

const PAGE_SIZE = 20;

export default async function ExplorePage() {
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
    />
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
