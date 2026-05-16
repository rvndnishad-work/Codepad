import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ChallengeAttemptClient from "./ChallengeAttemptClient";
import TrackHelpPanel, { type TrackHelpContext } from "./TrackHelpPanel";
import { parseVideoUrl } from "@/lib/video";

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
  searchParams: Promise<{ session?: string; track?: string }>;
}) {
  const { slug } = await params;
  const { session: sessionIdParam, track: trackSlugParam } = await searchParams;

  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/challenges/${slug}/attempt`)}`);
  }

  const challenge = await prisma.challenge.findUnique({ where: { slug } });
  if (!challenge || !challenge.published) notFound();

  const starterFiles = JSON.parse(challenge.starterFiles) as Record<string, string>;
  const testFiles = JSON.parse(challenge.testFiles) as Record<string, string>;

  // If the user arrived from a track detail page, load that track's per-item
  // walkthrough metadata (note, hint, video) and pass it to the help panel.
  // Silently skip if the track or its link to this challenge isn't found —
  // a stale ?track=… param shouldn't break the attempt page.
  let trackContext: TrackHelpContext | null = null;
  if (trackSlugParam) {
    const track = await prisma.challengeTrack.findUnique({
      where: { slug: trackSlugParam },
      select: {
        slug: true,
        title: true,
        published: true,
        items: {
          orderBy: { position: "asc" },
          select: {
            position: true,
            challengeId: true,
            note: true,
            videoUrl: true,
            hint: true,
          },
        },
      },
    });
    if (track && track.published) {
      const item = track.items.find((i) => i.challengeId === challenge.id);
      if (item) {
        trackContext = {
          trackSlug: track.slug,
          trackTitle: track.title,
          positionLabel: `Step ${item.position + 1} of ${track.items.length}`,
          authorNote: item.note,
          hint: item.hint,
          video: parseVideoUrl(item.videoUrl),
        };
      }
    }
  }

  return (
    <>
      {trackContext && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <TrackHelpPanel context={trackContext} />
        </div>
      )}
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
    </>
  );
}
