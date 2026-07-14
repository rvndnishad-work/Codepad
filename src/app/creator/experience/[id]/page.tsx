import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import { getEditorContext } from "../../editor/data";
import ExperienceEditor from "./ExperienceEditor";

export const metadata = { robots: { index: false, follow: false } };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spaceId?: string }>;
};

export default async function ExperienceEditorPage({ params, searchParams }: PageProps) {
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
    return <ExperienceEditor initial={null} ctx={ctx} />;
  }

  const exp = await prisma.interviewExperience.findUnique({ where: { id } });
  if (!exp || exp.authorId !== userId) notFound();

  const ctx = await getEditorContext(userId, exp.spaceId, { contentType: "INTERVIEW_EXPERIENCE", contentId: exp.id });
  if (!ctx) notFound();

  return (
    <ExperienceEditor
      initial={{
        id: exp.id,
        title: exp.title,
        company: exp.company ?? "",
        role: exp.role ?? "",
        outcome: (exp.outcome as "offer" | "rejected" | "pending" | "withdrew" | null) ?? "",
        difficulty: (exp.difficulty as "easy" | "medium" | "hard" | null) ?? "",
        summary: exp.summary ?? "",
        body: exp.body,
        bodyJson: exp.bodyJson ?? null,
        coverImage: exp.coverImage ?? "",
        published: exp.published,
        slug: exp.slug,
      }}
      ctx={ctx}
    />
  );
}
