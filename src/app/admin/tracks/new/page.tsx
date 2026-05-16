import { prisma } from "@/lib/prisma";
import TrackForm, {
  type AvailableChallenge,
  type TrackFormInput,
} from "../TrackForm";

export default async function NewTrackPage() {
  const challenges = await prisma.challenge.findMany({
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
  });

  const available: AvailableChallenge[] = challenges.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    estimatedMinutes: c.estimatedMinutes,
    category: c.category,
  }));

  const initial: TrackFormInput = {
    slug: "",
    title: "",
    description: "",
    tagline: "",
    coverImage: "",
    tech: "general",
    tagsCsv: "",
    difficulty: "mixed",
    published: false,
    visibility: "public",
    featured: false,
    items: [],
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight">New track</h2>
        <p className="text-sm text-muted mt-1">
          Curate an ordered group of existing challenges into a series.
        </p>
      </div>
      <TrackForm
        mode="create"
        initial={initial}
        availableChallenges={available}
        surface={{
          redirectTo: "/admin/tracks",
          createEndpoint: "/api/admin/tracks",
          // Unused in create mode; provide a string for the type.
          itemEndpoint: "/api/admin/tracks",
          allowFeatured: true,
        }}
      />
    </div>
  );
}
