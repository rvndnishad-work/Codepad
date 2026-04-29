import TemplatePicker from "@/components/TemplatePicker";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  let welcome: {
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
    welcome = {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
      snippetCount: count,
      recent,
    };
  }

  // Top public snippets — surfaced as "Featured from the community"
  const featuredRows = await prisma.snippet.findMany({
    where: { visibility: "public" },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: {
      id: true,
      slug: true,
      title: true,
      template: true,
      tags: true,
      updatedAt: true,
      user: { select: { name: true, image: true } },
    },
  });
  const featured = featuredRows.map((s) => ({
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

  return <TemplatePicker welcome={welcome} featured={featured} />;
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
