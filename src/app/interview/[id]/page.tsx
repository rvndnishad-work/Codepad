import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import InterviewRunner, { type SessionChallenge } from "./InterviewRunner";

import { validatePageAccess } from "@/lib/settings";

export const metadata = {
  title: "Interview Session — Interviewpad",
};

export default async function InterviewRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; lobby?: string }>;
}) {
  const { id } = await params;
  const { token, lobby } = await searchParams;

  const session = await auth().catch(() => null);
  await validatePageAccess("/interview/new", session);
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
  // Resolving role alignment based on creator selection
  let interviewerView = false;
  if (interview.creatorRole === "interviewer") {
    // If the creator chose "I am the Interviewer", then the Owner IS the Interviewer.
    // Therefore, the Guest (who has the token) is the Candidate.
    if (isOwner) interviewerView = true;
    else if (hasShareToken) interviewerView = false;
  } else {
    // Default fallback: Creator is Candidate. Owner IS Candidate. Guest is Interviewer.
    if (isOwner) interviewerView = false;
    else if (hasShareToken) interviewerView = true;
  }

  // Auto-redirect guest to active challenge if not explicitly visiting lobby
  if (
    !isOwner &&
    hasShareToken &&
    interview.status === "in_progress" &&
    interview.activeChallengeId &&
    lobby !== "true"
  ) {
    const activeChallenge = await prisma.challenge.findUnique({
      where: { id: interview.activeChallengeId },
      select: { slug: true },
    });
    if (activeChallenge) {
      redirect(
        `/challenges/${activeChallenge.slug}/attempt?session=${interview.id}&multiplayer=true&token=${token}`
      );
    }
  }

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
        candidateName: interview.candidateName,
        type: interview.type,
        verdict: interview.verdict,
        notes: interview.notes,
        totalSec: interview.totalSec,
        status: interview.status as "scheduled" | "in_progress" | "completed" | "abandoned",
        shareToken: interview.shareToken,
        shortCode: interview.shortCode,
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
      isOwner={isOwner}
    />
  );
}
