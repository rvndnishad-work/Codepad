import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ChallengeForm from "../../ChallengeForm";
import {
  blankStep,
  stepInputFromDb,
  type ChallengeFormInput,
  type ChallengeStepInput,
} from "../../challenge-form-types";

type Props = { params: Promise<{ id: string }> };

export default async function EditChallengePage({ params }: Props) {
  const { id } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { steps: { orderBy: { position: "asc" } } },
  });
  if (!challenge) notFound();

  let tags: string[] = [];
  try {
    const parsed = challenge.tags ? JSON.parse(challenge.tags) : [];
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t): t is string => typeof t === "string");
    }
  } catch {
    tags = [];
  }

  // After Stage 1 backfill every Challenge has at least one step. If a row
  // pre-dates the migration script for any reason, synthesize a step from
  // the legacy columns so the form never opens empty.
  const steps: ChallengeStepInput[] =
    challenge.steps.length > 0
      ? challenge.steps.map((s) => stepInputFromDb(s))
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
    premium: challenge.premium,
    steps,
  };

  return (
    <ChallengeForm
      mode="edit"
      initial={initial}
      surface={{
        redirectTo: "/admin/challenges",
        createEndpoint: "/api/admin/challenges",
        itemEndpoint: `/api/admin/challenges/${challenge.id}`,
        isAdmin: true,
      }}
    />
  );
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

