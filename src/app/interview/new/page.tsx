import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InterviewBuilder, {
  type ChallengeOption,
  type PlaygroundOption,
} from "./InterviewBuilder";

import { validatePageAccess } from "@/lib/settings";
import { templates } from "@/lib/templates";

export const metadata = {
  title: "New Interview Session — Interviewpad",
};

export default async function NewInterviewPage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/interview/new", session);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/interview/new")}`);
  }

  const [challengeRows, snippetRows] = await Promise.all([
    prisma.challenge.findMany({
      where: { published: true },
      orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        estimatedMinutes: true,
        category: true,
      },
    }),
    prisma.snippet.findMany({
      where: { userId: session.user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        template: true,
        updatedAt: true,
      },
    }),
  ]);

  const challenges: ChallengeOption[] = challengeRows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    estimatedMinutes: c.estimatedMinutes,
    category: c.category,
  }));

  const playgrounds: PlaygroundOption[] = [
    ...templates.map((t) => ({
      id: `template:${t.id}`,
      slug: t.id,
      title: t.title,
      template: t.id,
      updatedAt: new Date().toISOString(),
      isTemplate: true,
    })),
    ...snippetRows.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      template: s.template,
      updatedAt: s.updatedAt.toISOString(),
      isTemplate: false,
    })),
  ];

  return <InterviewBuilder challenges={challenges} playgrounds={playgrounds} />;
}
