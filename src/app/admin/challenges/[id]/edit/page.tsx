import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ChallengeForm from "../../ChallengeForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditChallengePage({ params }: Props) {
  const { id } = await params;
  const challenge = await prisma.challenge.findUnique({ where: { id } });
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

  return (
    <ChallengeForm
      mode="edit"
      initial={{
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty as "easy" | "medium" | "hard",
        template: challenge.template,
        starterFilesJson: prettyJson(challenge.starterFiles),
        testFilesJson: prettyJson(challenge.testFiles),
        tagsCsv: tags.join(", "),
        estimatedMinutes: challenge.estimatedMinutes,
        category: challenge.category ?? "",
        published: challenge.published,
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
