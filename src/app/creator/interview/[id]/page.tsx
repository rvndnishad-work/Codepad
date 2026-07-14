import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import { getEditorContext } from "../../editor/data";
import InterviewEditor from "./InterviewEditor";

export const metadata = { robots: { index: false, follow: false } };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spaceId?: string }>;
};

export default async function InterviewEditorPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { spaceId } = await searchParams;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");
  if (!(await userCan(userId, "content:author"))) redirect("/dashboard");

  if (id === "new") {
    if (!spaceId) redirect("/creator");
    const ctx = await getEditorContext(userId, spaceId);
    if (!ctx) notFound();
    return <InterviewEditor initial={null} ctx={ctx} />;
  }

  const qa = await prisma.interviewQA.findUnique({
    where: { id },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!qa || qa.authorId !== userId) notFound();

  const ctx = await getEditorContext(userId, qa.spaceId, { contentType: "INTERVIEW_QA", contentId: qa.id });
  if (!ctx) notFound();

  return (
    <InterviewEditor
      initial={{
        id: qa.id,
        title: qa.title,
        summary: qa.summary ?? "",
        category: qa.category ?? "",
        coverImage: qa.coverImage ?? "",
        published: qa.published,
        slug: qa.slug,
        questions: qa.questions.map((q) => ({
          question: q.question,
          answer: q.answer,
          answerJson: q.answerJson ?? null,
          difficulty: (q.difficulty as "easy" | "medium" | "hard" | null) ?? "",
        })),
      }}
      ctx={ctx}
    />
  );
}
