import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import ReviewLabClient from "./ReviewLabClient";
import type { AttemptSummary, Challenge } from "./types";

export const metadata = {
  // Bare title — the root layout's title template appends "— Interviewpad".
  title: "Review the AI's Code",
  description:
    "Can you catch what the AI got wrong? Review plausible AI-generated code, flag the planted hallucinations, logic bugs, and security holes, and race the clock in Hallucination Hunt mode.",
};

export default async function ReviewCodePage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/candidate/ai-code-review", session);
  const userId = session?.user?.id || null;

  // Fetch challenges WITHOUT their findings — the planted answers must never be
  // sent to the client before an attempt is graded. We only expose the count.
  const [challenges, attempts] = await Promise.all([
    prisma.reviewChallenge.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        prompt: true,
        language: true,
        difficulty: true,
        code: true,
        estimatedMinutes: true,
        timeLimitSec: true,
        _count: { select: { findings: true } },
      },
    }),
    userId
      ? prisma.reviewAttempt.groupBy({
          by: ["challengeId"],
          where: { userId },
          _max: { score: true },
          _count: { _all: true },
        })
      : Promise.resolve([] as never[]),
  ]);

  const mappedChallenges: Challenge[] = challenges.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    prompt: c.prompt,
    language: c.language,
    difficulty: c.difficulty,
    code: c.code,
    estimatedMinutes: c.estimatedMinutes,
    timeLimitSec: c.timeLimitSec,
    findingCount: c._count.findings,
  }));

  const attemptSummaries: AttemptSummary[] = (attempts as Array<{
    challengeId: string;
    _max: { score: number | null };
    _count: { _all: number };
  }>).map((a) => ({
    challengeId: a.challengeId,
    best: a._max.score ?? 0,
    count: a._count._all,
  }));

  return (
    <ReviewLabClient
      userId={userId}
      challenges={mappedChallenges}
      attemptSummaries={attemptSummaries}
    />
  );
}
