import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import InterviewRunner, {
  type SessionChallenge,
  type SessionPlayground,
} from "./InterviewRunner";

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

  const sourceType = (interview.sourceType ?? "challenge") as "challenge" | "playground";

  // Auto-redirect guest to active challenge (challenge sessions only)
  if (
    sourceType === "challenge" &&
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

  function parseIds(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  }

  const challengeIds = parseIds(interview.challengeIds);
  const playgroundIds = parseIds(interview.playgroundIds);

  const [challengeRows, snippetRows] = await Promise.all([
    challengeIds.length > 0
      ? prisma.challenge.findMany({
          where: { id: { in: challengeIds } },
          select: { id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true },
        })
      : Promise.resolve([]),
    playgroundIds.length > 0
      ? prisma.snippet.findMany({
          where: { id: { in: playgroundIds }, userId: interview.userId },
          select: { id: true, slug: true, title: true, template: true },
        })
      : Promise.resolve([]),
  ]);

  const challengeById = new Map(challengeRows.map((c) => [c.id, c]));
  const ordered: SessionChallenge[] = challengeIds
    .map((id) => challengeById.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      difficulty: c.difficulty as "easy" | "medium" | "hard",
      estimatedMinutes: c.estimatedMinutes,
    }));

  const playgroundById = new Map(snippetRows.map((s) => [s.id, s]));
  const orderedPlaygrounds: SessionPlayground[] = playgroundIds
    .map((id) => playgroundById.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      template: s.template,
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
        sourceType,
        scenario: interview.scenario,
        activePlaygroundId: interview.activePlaygroundId,
      }}
      challenges={ordered}
      playgrounds={orderedPlaygrounds}
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
