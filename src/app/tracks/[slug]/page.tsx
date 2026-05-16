import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Clock, Layers, Lock, Sparkles, User } from "lucide-react";
import TrackDetailClient from "./TrackDetailClient";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ invite?: string }>;
};

const TECH_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  react: "React",
  vue: "Vue",
  node: "Node",
  algorithms: "Algorithms",
  general: "General",
};

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const t = await prisma.challengeTrack.findUnique({
    where: { slug },
    select: { title: true, tagline: true, description: true, published: true },
  });
  if (!t || !t.published) return { title: "Track not found — Interviewpad" };
  return {
    title: `${t.title} — Interviewpad`,
    description: t.tagline ?? t.description.slice(0, 160),
  };
}

export default async function TrackPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { invite: inviteToken } = (await searchParams) ?? {};
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.toLowerCase() ?? null;

  const track = await prisma.challengeTrack.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          challenge: {
            select: {
              id: true,
              slug: true,
              title: true,
              difficulty: true,
              estimatedMinutes: true,
              category: true,
              tags: true,
            },
          },
        },
      },
      author: { select: { id: true, name: true, image: true } },
    },
  });

  if (!track) notFound();

  // ── Access control ────────────────────────────────────────────────────
  // Three independent gates:
  //   1. Author / admin can always view.
  //   2. published+public → anyone can view (anon OK).
  //   3. published+private → invitation-only:
  //        - valid magic-link token in ?invite=… → access granted (and
  //          mark the invitation accepted if signed in)
  //        - signed-in user whose email matches an existing invitation →
  //          access granted (re-visits without the token still work)
  //        - otherwise: 404 to keep the URL non-enumerable, or redirect
  //          unauth users with a token to /login first.
  const isOwner = !!userId && track.authorId === userId;
  const callerIsAdmin = isAdmin(session);
  let canView = isOwner || callerIsAdmin;

  if (!canView) {
    if (!track.published) {
      // Drafts are invisible to everyone except author/admin.
      notFound();
    }

    if (track.visibility === "public") {
      canView = true;
    } else {
      // ── private ──
      // If a token is in the URL, validate it.
      if (inviteToken) {
        const inv = await prisma.trackInvitation.findUnique({
          where: { token: inviteToken },
          select: { id: true, trackId: true, status: true, email: true, userId: true },
        });
        const tokenIsValid =
          !!inv && inv.trackId === track.id && inv.status !== "revoked";

        if (tokenIsValid) {
          if (!userId) {
            // Anon visitor with a real token → send to login, preserve token.
            redirect(
              `/login?next=${encodeURIComponent(`/tracks/${slug}?invite=${inviteToken}`)}`
            );
          }
          // Signed-in: mark accepted and link userId. Idempotent — repeat
          // visits with the token just refresh acceptedAt's existence check.
          if (inv.status === "pending" || inv.userId !== userId) {
            await prisma.trackInvitation.update({
              where: { id: inv.id },
              data: {
                status: "accepted",
                userId,
                acceptedAt: inv.status === "pending" ? new Date() : undefined,
              },
            });
          }
          canView = true;
        }
      }

      // No (or invalid) token but signed in → check for a matching invite
      // by email or userId. Lets accepted users re-visit without the link.
      if (!canView && userId) {
        const orClauses: Array<
          { userId: string } | { email: string }
        > = [{ userId }];
        if (userEmail) orClauses.push({ email: userEmail });
        const matched = await prisma.trackInvitation.findFirst({
          where: {
            trackId: track.id,
            status: { not: "revoked" },
            OR: orClauses,
          },
          select: { id: true },
        });
        if (matched) canView = true;
      }
    }
  }

  if (!canView) {
    // 404 rather than 403 — we don't want to leak the existence of private
    // tracks to people who don't have the invite. Same trick GitHub uses.
    notFound();
  }

  // Per-user status per challenge (best status wins: passed > in_progress > failed).
  let statusByChallenge: Record<string, "passed" | "failed" | "in_progress"> = {};
  let enrollment: {
    id: string;
    status: string;
    startedAt: Date;
    lastVisitedAt: Date;
    completedAt: Date | null;
  } | null = null;

  if (userId) {
    const [attempts, enr] = await Promise.all([
      prisma.challengeAttempt.findMany({
        where: { userId, challengeId: { in: track.items.map((it) => it.challengeId) } },
        select: { challengeId: true, status: true },
      }),
      prisma.challengeTrackEnrollment.findUnique({
        where: { userId_trackId: { userId, trackId: track.id } },
      }),
    ]);
    for (const a of attempts) {
      const status = a.status as "passed" | "failed" | "in_progress" | "abandoned";
      if (status === "abandoned") continue;
      const prev = statusByChallenge[a.challengeId];
      if (
        status === "passed" ||
        !prev ||
        (status === "failed" && prev === "in_progress")
      ) {
        statusByChallenge[a.challengeId] = status;
      }
    }
    enrollment = enr;
  }

  const totalMinutes = track.items.reduce(
    (s, it) => s + it.challenge.estimatedMinutes,
    0
  );
  const passedCount = track.items.filter(
    (it) => statusByChallenge[it.challengeId] === "passed"
  ).length;
  const progressPct =
    track.items.length > 0
      ? Math.round((passedCount / track.items.length) * 100)
      : 0;

  // Next-up: first item not yet passed; falls back to first item.
  const nextItem =
    track.items.find((it) => statusByChallenge[it.challengeId] !== "passed") ??
    track.items[0];

  return (
    <div className="relative min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[820px] h-[360px] bg-accent/5 rounded-full blur-[140px]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-12 md:py-16">
          <Link
            href="/challenges"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to challenges
          </Link>

          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
              <Sparkles className="w-3 h-3" />
              {TECH_LABELS[track.tech] ?? track.tech}
            </span>
            <DifficultyChip difficulty={track.difficulty} />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted">
              <Clock className="w-3 h-3" />
              {totalMinutes}m total
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted">
              <Layers className="w-3 h-3" />
              {track.items.length}{" "}
              {track.items.length === 1 ? "challenge" : "challenges"}
            </span>
            {track.visibility === "private" && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Private
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-fg leading-[1.05] mb-3">
            {track.title}
          </h1>
          {track.tagline && (
            <p className="text-muted text-base md:text-lg leading-relaxed max-w-2xl mb-4">
              {track.tagline}
            </p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <User className="w-3 h-3" />
              {track.author?.name ? `Curated by ${track.author.name}` : "Curated by Interviewpad"}
            </span>
          </div>

          {/* Personal progress + action bar */}
          <TrackDetailClient
            trackId={track.id}
            trackSlug={track.slug}
            firstChallengeSlug={nextItem?.challenge.slug ?? null}
            initialEnrollment={
              enrollment
                ? {
                    status: enrollment.status,
                    startedAt: enrollment.startedAt.toISOString(),
                    lastVisitedAt: enrollment.lastVisitedAt.toISOString(),
                  }
                : null
            }
            signedIn={!!userId}
            progressPct={progressPct}
            passedCount={passedCount}
            totalCount={track.items.length}
          />
        </div>
      </section>

      {/* Description + ordered item list */}
      <div className="mx-auto max-w-5xl px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">
            About this track
          </h2>
          {/* Render description as plain markdown for v1 — Markdown rendering
              is already used elsewhere in the project, but plain text keeps
              this PR scoped. Swap to MD renderer later if needed. */}
          <p className="text-fg text-sm md:text-base leading-relaxed whitespace-pre-wrap">
            {track.description}
          </p>

          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3 mt-10">
            Challenges in order
          </h2>
          <ol className="flex flex-col gap-2">
            {track.items.map((it, i) => {
              const status = statusByChallenge[it.challengeId] ?? null;
              return (
                <li key={it.id}>
                  <Link
                    href={`/challenges/${it.challenge.slug}/attempt?track=${track.slug}`}
                    className="group flex items-start gap-4 p-4 rounded-xl bg-surface border border-border hover:border-border-strong hover:bg-elevated transition"
                  >
                    <div className="w-9 h-9 rounded-lg bg-bg/40 border border-border grid place-items-center text-sm font-black text-muted shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-fg truncate">
                          {it.challenge.title}
                        </span>
                        <DifficultyChip difficulty={it.challenge.difficulty} small />
                        <span className="text-[10px] text-muted shrink-0 tabular-nums">
                          {it.challenge.estimatedMinutes}m
                        </span>
                      </div>
                      {it.challenge.category && (
                        <div className="text-[10px] text-muted/60 uppercase tracking-wider mt-0.5">
                          {it.challenge.category}
                        </div>
                      )}
                      {it.note && (
                        <p className="text-xs text-muted/80 italic mt-2 leading-relaxed">
                          {it.note}
                        </p>
                      )}
                    </div>
                    <StatusDot status={status} />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Sidebar — quick stats */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-3">
              At a glance
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Difficulty</dt>
                <dd>
                  <DifficultyChip difficulty={track.difficulty} small />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Tech</dt>
                <dd className="font-bold text-fg">
                  {TECH_LABELS[track.tech] ?? track.tech}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Total time</dt>
                <dd className="font-mono tabular-nums text-fg">{totalMinutes} min</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Challenges</dt>
                <dd className="font-mono tabular-nums text-fg">{track.items.length}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DifficultyChip({
  difficulty,
  small = false,
}: {
  difficulty: string;
  small?: boolean;
}) {
  const tone =
    difficulty === "easy"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : difficulty === "medium"
      ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
      : difficulty === "hard"
      ? "text-rose-500 bg-rose-500/10 border-rose-500/30"
      : "text-muted bg-muted/10 border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wider border ${tone} ${
        small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      {difficulty}
    </span>
  );
}

function StatusDot({
  status,
}: {
  status: "passed" | "failed" | "in_progress" | null;
}) {
  if (status === "passed") {
    return (
      <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/40 grid place-items-center shrink-0">
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 text-emerald-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/40 grid place-items-center shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/40 grid place-items-center text-[10px] text-rose-500 shrink-0">
        ✕
      </span>
    );
  }
  return (
    <span className="w-6 h-6 rounded-full border border-border grid place-items-center shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-muted/30" />
    </span>
  );
}
