import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InterviewBuilder, { type ChallengeOption } from "./InterviewBuilder";

import { validatePageAccess } from "@/lib/settings";

export const metadata = {
  title: "New Interview Session — Interviewpad",
};

export default async function NewInterviewPage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/interview/new", session);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/interview/new")}`);
  }

  const rows = await prisma.challenge.findMany({
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
  });

  const challenges: ChallengeOption[] = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    estimatedMinutes: c.estimatedMinutes,
    category: c.category,
  }));

  return <InterviewBuilder challenges={challenges} />;
}
