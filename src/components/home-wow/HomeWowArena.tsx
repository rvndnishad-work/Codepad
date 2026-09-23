import { prisma } from "@/lib/prisma";
import ArenaGrid, { type ArenaPick } from "./ArenaGrid";

const IMAGES = [
  "/images/wow/code-dark.jpg",
  "/images/wow/code-editor.jpg",
  "/images/wow/hackathon.jpg",
  "/images/wow/whiteboard.jpg",
];

function safeTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Live arena: staff-picked challenges first, freshest next — each with its
 * real attempt count. Hides entirely when nothing is published.
 */
export default async function HomeWowArena() {
  let picks: ArenaPick[] = [];
  try {
    const rows = await prisma.challenge.findMany({
      where: { published: true, visibility: "public" },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 4,
      select: {
        slug: true,
        title: true,
        difficulty: true,
        template: true,
        category: true,
        estimatedMinutes: true,
        featured: true,
        premium: true,
        tags: true,
        _count: { select: { attempts: true } },
      },
    });
    picks = rows.map((r, i) => ({
      slug: r.slug,
      title: r.title,
      difficulty: r.difficulty,
      lang: r.category ?? r.template,
      minutes: r.estimatedMinutes,
      solves: r._count.attempts,
      featured: r.featured,
      premium: r.premium,
      tags: safeTags(r.tags).slice(0, 2),
      img: IMAGES[i % IMAGES.length],
    }));
  } catch {
    return null;
  }
  if (picks.length === 0) return null;

  return <ArenaGrid picks={picks} />;
}
