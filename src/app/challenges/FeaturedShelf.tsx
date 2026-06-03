import Link from "next/link";
import { Clock, Layers, Play, Sparkles, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * Above-the-fold promotional row that surfaces up to 3 staff-picked
 * challenges with a richer visual treatment than the main grid cards.
 *
 * Server component — returns null when no public+published+featured
 * challenges exist, so the page collapses cleanly during early seeding.
 *
 * Note: featured challenges still appear in the main grid below the shelf.
 * The repetition is intentional — the shelf is "above the fold" promotion
 * for a first-time visitor; the grid is for browse-everything users who
 * scroll past. Same pattern as Spotify featured playlists vs all playlists.
 */
export default async function FeaturedShelf() {
  const challenges = await prisma.challenge.findMany({
    where: { published: true, visibility: "public", featured: true },
    orderBy: [{ updatedAt: "desc" }],
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      difficulty: true,
      estimatedMinutes: true,
      _count: { select: { steps: true } },
    },
  });

  if (challenges.length === 0) return null;

  // Pull a one-line teaser from the markdown description. We strip the
  // first H1/H2 heading (if any) and clamp to ~140 chars so the card
  // height stays predictable across very-short and very-long descriptions.
  function teaser(md: string): string {
    const stripped = md
      .replace(/^\s*#{1,6}\s.*$/gm, "")
      .replace(/[*_`>]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length <= 140) return stripped;
    return stripped.slice(0, 137) + "…";
  }

  return (
    <section className="mx-auto max-w-6xl px-6 pt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
          <Star className="w-3 h-3 fill-current" />
          Staff picks
        </h2>
        <span className="text-[11px] text-muted/60 font-mono tabular-nums">
          {challenges.length} {challenges.length === 1 ? "pick" : "picks"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {challenges.map((c) => {
          const isMulti = c._count.steps > 1;
          return (
            <Link
              key={c.id}
              href={`/challenges/${c.slug}`}
              className="group relative flex flex-col h-full overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-accent/[0.04] to-transparent hover:border-accent/60 hover:from-accent/15 transition-colors p-5"
            >
              {/* Accent corner glow — purely decorative, sits behind content */}
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-accent/10 blur-3xl pointer-events-none"
                aria-hidden
              />

              <div className="relative flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[9px] font-black uppercase tracking-wider text-accent">
                  <Sparkles className="w-2.5 h-2.5" />
                  {c.difficulty}
                </span>
                {isMulti && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg/40 border border-border text-[9px] font-bold uppercase tracking-wider text-muted">
                    <Layers className="w-2.5 h-2.5" />
                    {c._count.steps} steps
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-muted/70 tabular-nums">
                  <Clock className="w-3 h-3" />
                  {c.estimatedMinutes}m
                </span>
              </div>

              <h3 className="relative font-black text-fg text-lg leading-tight line-clamp-2 mb-2">
                {c.title}
              </h3>

              <p className="relative text-xs text-muted leading-relaxed line-clamp-3 mb-4">
                {teaser(c.description)}
              </p>

              <div className="relative mt-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-bg text-[11px] font-black w-fit group-hover:bg-accent-soft transition-colors">
                <Play className="w-3 h-3 fill-current" />
                Open challenge
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
