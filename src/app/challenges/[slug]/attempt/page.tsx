import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ChallengeAttemptClient from "./ChallengeAttemptClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { title: true },
  });
  return {
    title: challenge ? `Solve: ${challenge.title} — Interviewpad` : "Challenge not found",
  };
}

export default async function ChallengeAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const { session: sessionIdParam } = await searchParams;

  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/challenges/${slug}/attempt`)}`);
  }

  const challenge = await prisma.challenge.findUnique({ where: { slug } });
  if (!challenge || !challenge.published) notFound();

  const starterFiles = JSON.parse(challenge.starterFiles) as Record<string, string>;
  const testFiles = JSON.parse(challenge.testFiles) as Record<string, string>;

  return (
    <ChallengeAttemptClient
      challenge={{
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        template: challenge.template,
        estimatedMinutes: challenge.estimatedMinutes,
      }}
      starterFiles={starterFiles}
      testFiles={testFiles}
      sessionId={sessionIdParam ?? null}
    />
  );
}
