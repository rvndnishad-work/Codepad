import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import ChallengeForm from "@/app/admin/challenges/ChallengeForm";
import {
  blankStep,
  type ChallengeFormInput,
  type ChallengeStepInput,
} from "@/app/admin/challenges/challenge-form-types";

type Params = { params: Promise<{ id: string }> };

export default async function EditUserChallengePage({ params }: Params) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect(`/login?next=/dashboard/challenges/${id}/edit`);

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { steps: { orderBy: { position: "asc" } } },
  });
  if (!challenge) notFound();

  // Ownership check — author or admin only. Admins should normally edit at
  // /admin/challenges/[id]/edit, but allowing the dashboard path too means
  // a moderator can deep-link from a user report later.
  if (challenge.authorId !== userId && !isAdmin(session)) {
    notFound();
  }

  let tags: string[] = [];
  try {
    const parsed = challenge.tags ? JSON.parse(challenge.tags) : [];
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t): t is string => typeof t === "string");
    }
  } catch {
    tags = [];
  }

  const steps: ChallengeStepInput[] =
    challenge.steps.length > 0
      ? challenge.steps.map((s) => ({
          title: s.title ?? "",
          description: s.description,
          template: s.template,
          starterFilesJson: prettyJson(s.starterFiles),
          testFilesJson: prettyJson(s.testFiles),
          estimatedMinutes: s.estimatedMinutes,
          hint: s.hint ?? "",
          videoUrl: s.videoUrl ?? "",
          testCases: parseTestCases(s.testCasesJson),
        }))
      : [
          {
            ...blankStep(),
            description: challenge.description,
            template: challenge.template,
            starterFilesJson: prettyJson(challenge.starterFiles),
            testFilesJson: prettyJson(challenge.testFiles),
            estimatedMinutes: challenge.estimatedMinutes,
          },
        ];

  const initial: ChallengeFormInput = {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    description: challenge.description,
    difficulty: challenge.difficulty as "easy" | "medium" | "hard",
    tagsCsv: tags.join(", "),
    category: challenge.category ?? "",
    published: challenge.published,
    visibility:
      challenge.visibility === "private" ? "private" : "public",
    featured: challenge.featured,
    steps,
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <ChallengeForm
        mode="edit"
        initial={initial}
        surface={{
          redirectTo: "/dashboard",
          createEndpoint: "/api/challenges",
          itemEndpoint: `/api/challenges/${challenge.slug}`,
          isAdmin: false,
        }}
      />
    </div>
  );
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function parseTestCases(raw: string | null | undefined): any[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
