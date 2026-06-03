import Link from "next/link";
import { ArrowRight, Layers, Play } from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * Thin "Continue where you left off" row that sits above the main
 * challenge grid for signed-in users with active enrollments. Hidden for
 * anon visitors and for users with no active enrollments.
 *
 * Shows up to 3 most-recently-visited enrollments. Each card includes a
 * mini progress bar (passed steps / total) and a Play button that drops
 * the user back into the right step.
 */
export default async function ContinueStrip({ userId }: { userId: string | null }) {
  if (!userId) return null;

  const enrollments = await prisma.challengeEnrollment.findMany({
    where: { userId, status: "active" },
    orderBy: { lastVisitedAt: "desc" },
    take: 3,
    include: {
      challenge: {
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          steps: { select: { id: true, position: true }, orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (enrollments.length === 0) return null;

  // Compute passed-steps-per-enrollment in one query (vs N+1).
  const stepIds = enrollments.flatMap((e) => e.challenge.steps.map((s) => s.id));
  const passedAttempts =
    stepIds.length > 0
      ? await prisma.challengeAttempt.findMany({
          where: {
            userId,
            stepId: { in: stepIds },
            status: "passed",
          },
          select: { stepId: true },
          distinct: ["stepId"],
        })
      : [];
  const passedSet = new Set(passedAttempts.map((a) => a.stepId));

  const cards = enrollments.map((e) => {
    const total = e.challenge.steps.length;
    const passed = e.challenge.steps.filter((s) => passedSet.has(s.id)).length;
    const nextIdx = e.challenge.steps.findIndex((s) => !passedSet.has(s.id));
    const resumeStep = nextIdx < 0 ? 0 : nextIdx;
    return {
      slug: e.challenge.slug,
      title: e.challenge.title,
      difficulty: e.challenge.difficulty,
      passed,
      total,
      resumeStep,
      isMulti: total > 1,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 pt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
          Continue where you left off
        </h2>
        <Link
          href="/dashboard"
          className="text-[11px] font-bold text-muted hover:text-fg transition inline-flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Link
            key={c.slug}
            href={`/challenges/${c.slug}/attempt${c.isMulti ? `?step=${c.resumeStep}` : ""}`}
            className="group rounded-xl border border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent/50 p-4 transition-colors flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-accent text-bg">
                <Play className="w-3 h-3 fill-current" />
              </span>
              {c.isMulti && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-[10px] font-bold uppercase tracking-wider text-accent">
                  <Layers className="w-2.5 h-2.5" />
                  {c.total} steps
                </span>
              )}
              <span className="ml-auto text-[10px] font-bold text-muted/70 uppercase tracking-wider">
                {c.difficulty}
              </span>
            </div>
            <h3 className="font-black text-fg text-sm line-clamp-2 mb-3">
              {c.title}
            </h3>
            {c.isMulti && (
              <div className="mt-auto">
                <div className="flex items-center justify-between text-[10px] text-muted mb-1.5">
                  <span className="uppercase tracking-wider font-bold">Progress</span>
                  <span className="font-mono tabular-nums">
                    {c.passed} / {c.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${(c.passed / Math.max(1, c.total)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
