import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TrackForm, {
  type AvailableChallenge,
  type TrackFormInput,
} from "@/app/admin/tracks/TrackForm";

export const metadata = {
  title: "Create a track — Interviewpad",
};

export default async function NewUserTrackPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/dashboard/tracks/new");

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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          Create a track
        </h1>
        <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">
          Group existing challenges into an ordered series — a learning path or
          interview prep set you want to share. Toggle{" "}
          <strong className="text-fg">Published</strong> when you&apos;re ready
          and it&apos;ll appear on{" "}
          <a href="/challenges" className="text-accent hover:underline">
            /challenges
          </a>{" "}
          for everyone.
        </p>
      </div>
      <TrackForm
        mode="create"
        initial={initial}
        availableChallenges={available}
        surface={{
          redirectTo: "/dashboard",
          createEndpoint: "/api/tracks",
          itemEndpoint: "/api/tracks",
          allowFeatured: false,
        }}
      />
    </div>
  );
}
