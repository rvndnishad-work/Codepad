import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TrackForm, {
  type AvailableChallenge,
  type TrackFormInput,
  type TrackFormItem,
} from "../../TrackForm";

type Params = { params: Promise<{ id: string }> };

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

export default async function EditTrackPage({ params }: Params) {
  const { id } = await params;

  const [track, challenges] = await Promise.all([
    prisma.challengeTrack.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            challenge: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                estimatedMinutes: true,
                category: true,
              },
            },
          },
        },
      },
    }),
    prisma.challenge.findMany({
      where: { published: true },
      orderBy: [{ difficulty: "asc" }, { title: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        estimatedMinutes: true,
        category: true,
      },
    }),
  ]);

  if (!track) notFound();

  const available: AvailableChallenge[] = challenges.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    estimatedMinutes: c.estimatedMinutes,
    category: c.category,
  }));

  const items: TrackFormItem[] = track.items.map((it) => ({
    challengeId: it.challengeId,
    note: it.note,
    videoUrl: it.videoUrl,
    hint: it.hint,
    title: it.challenge.title,
    difficulty: it.challenge.difficulty as "easy" | "medium" | "hard",
    estimatedMinutes: it.challenge.estimatedMinutes,
    category: it.challenge.category,
  }));

  const initial: TrackFormInput = {
    id: track.id,
    slug: track.slug,
    title: track.title,
    description: track.description,
    tagline: track.tagline ?? "",
    coverImage: track.coverImage ?? "",
    tech: track.tech,
    tagsCsv: parseTags(track.tags).join(", "),
    difficulty: track.difficulty as TrackFormInput["difficulty"],
    published: track.published,
    visibility: (track.visibility === "private" ? "private" : "public") as TrackFormInput["visibility"],
    featured: track.featured,
    items,
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight">Edit track</h2>
        <p className="text-sm text-muted mt-1">
          /tracks/<span className="font-mono">{track.slug}</span>
        </p>
      </div>
      <TrackForm
        mode="edit"
        initial={initial}
        availableChallenges={available}
        surface={{
          redirectTo: "/admin/tracks",
          createEndpoint: "/api/admin/tracks",
          itemEndpoint: `/api/admin/tracks/${track.id}`,
          allowFeatured: true,
        }}
      />
    </div>
  );
}
