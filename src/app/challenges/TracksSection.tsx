import Link from "next/link";
import { ArrowRight, Layers, Plus, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import TrackCard, { type TrackCardData } from "./TrackCard";

type SectionProps = { userId: string | null };

const TECH_OPTIONS = [
  { value: null, label: "All" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "node", label: "Node" },
  { value: "algorithms", label: "Algorithms" },
  { value: "general", label: "General" },
];

/**
 * Server component owning the three track strips on /challenges:
 *   1. "Continue where you left off" — signed-in users with active enrollments
 *   2. "Featured tracks" — admin-marked tracks
 *   3. "Browse all tracks" — every published track, with tech filter chips
 *
 * Data fetching is colocated here so /challenges/page.tsx stays focused on
 * its own data (the challenge list). All three strips share one initial fetch
 * of published tracks; per-user enrollment data only fires when `userId` is
 * set, keeping anon page loads cheap.
 */
export default async function TracksSection({ userId }: SectionProps) {
  // Only public+published tracks land here. Private tracks are invitation-
  // only and stay unlisted no matter who's browsing.
  const tracks = await prisma.challengeTrack.findMany({
    where: { published: true, visibility: "public" },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { items: true } },
      items: {
        orderBy: { position: "asc" },
        select: {
          challengeId: true,
          challenge: { select: { estimatedMinutes: true } },
        },
      },
      author: { select: { name: true } },
    },
  });

  // Per-user data: enrollments + passed-attempt counts. We compute progress as
  // a count of passed attempts on challenges that belong to each track. Done
  // here once for all tracks the user is enrolled in to keep things O(1) per
  // track at render time.
  let enrollmentsByTrack: Record<
    string,
    { status: string; lastVisitedAt: Date }
  > = {};
  let passedByTrack: Record<string, number> = {};
  if (userId) {
    const enrollments = await prisma.challengeTrackEnrollment.findMany({
      where: { userId, trackId: { in: tracks.map((t) => t.id) } },
      select: { trackId: true, status: true, lastVisitedAt: true },
    });
    for (const e of enrollments) {
      enrollmentsByTrack[e.trackId] = {
        status: e.status,
        lastVisitedAt: e.lastVisitedAt,
      };
    }
    // Count passed attempts across all challenges the user touched, then bin
    // them by track. One query, server-side aggregation.
    const allChallengeIds = Array.from(
      new Set(tracks.flatMap((t) => t.items.map((it) => it.challengeId)))
    );
    if (allChallengeIds.length > 0) {
      const passedAttempts = await prisma.challengeAttempt.findMany({
        where: {
          userId,
          status: "passed",
          challengeId: { in: allChallengeIds },
        },
        select: { challengeId: true },
        distinct: ["challengeId"],
      });
      const passedSet = new Set(passedAttempts.map((a) => a.challengeId));
      for (const t of tracks) {
        passedByTrack[t.id] = t.items.filter((it) =>
          passedSet.has(it.challengeId)
        ).length;
      }
    }
  }

  const cards: TrackCardData[] = tracks.map((t) => {
    const totalMinutes = t.items.reduce(
      (s, it) => s + it.challenge.estimatedMinutes,
      0
    );
    const enrollment = enrollmentsByTrack[t.id];
    const passed = passedByTrack[t.id] ?? 0;
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      tagline: t.tagline,
      coverImage: t.coverImage,
      tech: t.tech,
      difficulty: t.difficulty,
      featured: t.featured,
      itemCount: t._count.items,
      totalMinutes,
      authorName: t.author?.name ?? null,
      progress:
        userId && enrollment
          ? { passed, status: enrollment.status }
          : null,
    };
  });

  const continueCards = cards
    .filter((c) => c.progress?.status === "active")
    // Sort by most recently visited within active enrollments. We use the
    // tracks array order as a tiebreaker since enrollmentsByTrack already
    // has lastVisitedAt; sort on the source for stability.
    .sort((a, b) => {
      const av = enrollmentsByTrack[a.id]?.lastVisitedAt?.getTime() ?? 0;
      const bv = enrollmentsByTrack[b.id]?.lastVisitedAt?.getTime() ?? 0;
      return bv - av;
    })
    .slice(0, 3);

  const featuredCards = cards.filter((c) => c.featured).slice(0, 3);
  const browseCards = cards;

  if (cards.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-12">
        <EmptyState signedIn={!!userId} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 space-y-14">
      {continueCards.length > 0 && (
        <StripBlock
          eyebrow="Resume"
          title="Continue where you left off"
          accent
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueCards.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        </StripBlock>
      )}

      {featuredCards.length > 0 && (
        <StripBlock eyebrow="Staff picks" title="Featured tracks">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredCards.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        </StripBlock>
      )}

      <StripBlock
        eyebrow="Browse"
        title="All tracks"
        cta={
          userId ? (
            <Link
              href="/dashboard/tracks/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-black hover:bg-accent/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Create your own track
            </Link>
          ) : null
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {browseCards.map((t) => (
            <TrackCard key={t.id} track={t} />
          ))}
        </div>
      </StripBlock>
    </section>
  );
}

function StripBlock({
  eyebrow,
  title,
  cta,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  cta?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div
            className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${
              accent ? "text-accent" : "text-muted"
            }`}
          >
            {eyebrow}
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-fg">
            {title}
          </h2>
        </div>
        {cta}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center mb-4">
        <Layers className="w-5 h-5 text-accent" />
      </div>
      <h3 className="text-fg font-black">No tracks yet</h3>
      <p className="text-muted text-sm mt-1 max-w-md mx-auto leading-relaxed">
        Tracks group multiple challenges into a curated series — a JavaScript
        warmup, a React interview prep set, an algorithms refresher.
      </p>
      {signedIn ? (
        <Link
          href="/dashboard/tracks/new"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-black hover:bg-accent-soft transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Be the first to publish one
        </Link>
      ) : (
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 mt-4 text-xs text-muted hover:text-fg transition"
        >
          Sign in to author a track
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
