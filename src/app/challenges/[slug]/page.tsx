import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Play, Target, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import ChallengeDescription from "../ChallengeDescription";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { title: true, difficulty: true },
  });
  if (!challenge) return { title: "Challenge not found — Interviewpad" };
  return {
    title: `${challenge.title} — Interviewpad Challenges`,
    description: `Solve the "${challenge.title}" coding challenge (${challenge.difficulty}).`,
  };
}

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/30",
  medium: "bg-amber-500/10 border-amber-500/30",
  hard: "bg-rose-500/10 border-rose-500/30",
};

export default async function ChallengeDetailPage({ params }: Props) {
  const { slug } = await params;
  const challenge = await prisma.challenge.findUnique({ where: { slug } });
  if (!challenge || !challenge.published) notFound();

  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  const attempts = userId
    ? await prisma.challengeAttempt.findMany({
        where: { userId, challengeId: challenge.id },
        orderBy: { startedAt: "desc" },
        take: 5,
      })
    : [];

  const tags = parseTags(challenge.tags);
  const bestStatus = attempts.find((a) => a.status === "passed")
    ? "passed"
    : attempts.find((a) => a.status === "failed")
      ? "failed"
      : attempts[0]?.status === "in_progress"
        ? "in_progress"
        : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/challenges"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All challenges
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center shrink-0">
          <Target className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {challenge.category && (
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted/70">
                {challenge.category}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-fg">
            {challenge.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${difficultyBg[challenge.difficulty]} ${difficultyColor[challenge.difficulty]}`}
          >
            {challenge.difficulty}
          </div>
          <div className="px-2.5 py-1 rounded-md border border-border bg-surface text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {challenge.estimatedMinutes}m
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-medium text-muted"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Status banner for returning users */}
      {bestStatus === "passed" && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-fg">You've solved this!</div>
            <div className="text-xs text-muted">Feel free to revisit and refactor.</div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 mb-8">
        <ChallengeDescription markdown={challenge.description} />
      </div>

      {/* Start CTA */}
      <div className="flex flex-wrap items-center gap-3 mb-10">
        <Link
          href={`/challenges/${challenge.slug}/attempt`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_24px_rgba(var(--accent-rgb),0.25)]"
        >
          {bestStatus === "passed" ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          {bestStatus === "passed" ? "Practice again" : bestStatus === "in_progress" ? "Resume" : "Start challenge"}
        </Link>
        {!userId && (
          <span className="text-xs text-muted">
            <Link href="/login" className="text-accent hover:underline font-semibold">
              Sign in
            </Link>{" "}
            to save your progress.
          </span>
        )}
      </div>

      {/* Recent attempts */}
      {attempts.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">
            Your recent attempts
          </h2>
          <ul className="flex flex-col gap-2">
            {attempts.map((a) => {
              const passed = a.status === "passed";
              const failed = a.status === "failed";
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface/50"
                >
                  {passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : failed ? (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 animate-pulse" />
                  )}
                  <span className="text-sm text-fg font-medium capitalize">
                    {a.status.replace("_", " ")}
                  </span>
                  {a.durationSec != null && (
                    <span className="text-xs text-muted tabular-nums">
                      {formatDuration(a.durationSec)}
                    </span>
                  )}
                  <span className="text-xs text-muted/60 ml-auto">
                    <RelativeTime iso={a.startedAt.toISOString()} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
