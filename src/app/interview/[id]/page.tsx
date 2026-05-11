import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import InterviewRunner, { type SessionChallenge } from "./InterviewRunner";

export const metadata = {
  title: "Interview Session — Interviewpad",
};

export default async function InterviewRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const session = await auth().catch(() => null);
  const interview = await prisma.interviewSession.findUnique({ where: { id } });
  if (!interview) notFound();

  // Access: owner OR holder of correct shareToken (read-only).
  const isOwner = !!session?.user?.id && session.user.id === interview.userId;
  const hasShareToken = !!token && token === interview.shareToken;
  if (!isOwner && !hasShareToken) {
    if (!session?.user?.id) {
      redirect(`/login?next=${encodeURIComponent(`/interview/${id}`)}`);
    }
    notFound();
  }
  const interviewerView = !isOwner && hasShareToken;

  const ids: string[] = (() => {
    try {
      const parsed = JSON.parse(interview.challengeIds);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  })();

  const challenges = await prisma.challenge.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      estimatedMinutes: true,
    },
  });
  const byId = new Map(challenges.map((c) => [c.id, c]));
  const ordered: SessionChallenge[] = ids
    .map((id) => byId.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      difficulty: c.difficulty as "easy" | "medium" | "hard",
      estimatedMinutes: c.estimatedMinutes,
    }));

  // Fetch attempts already made within this session.
  const attempts = await prisma.challengeAttempt.findMany({
    where: { sessionId: interview.id },
    select: {
      id: true,
      challengeId: true,
      status: true,
      durationSec: true,
      finishedAt: true,
    },
    orderBy: { startedAt: "asc" },
  });

  return (
    <InterviewRunner
      interview={{
        id: interview.id,
        title: interview.title,
        totalSec: interview.totalSec,
        status: interview.status as "scheduled" | "in_progress" | "completed" | "abandoned",
        shareToken: interview.shareToken,
        startedAtIso: interview.startedAt ? interview.startedAt.toISOString() : null,
        finishedAtIso: interview.finishedAt ? interview.finishedAt.toISOString() : null,
      }}
      challenges={ordered}
      attempts={attempts.map((a) => ({
        challengeId: a.challengeId,
        status: a.status as "passed" | "failed" | "in_progress" | "abandoned",
        durationSec: a.durationSec ?? null,
      }))}
      interviewerView={interviewerView}
    />
  );
}
