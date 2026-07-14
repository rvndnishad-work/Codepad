import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import { getEditorContext } from "../../editor/data";
import TutorialEditor from "./TutorialEditor";

export const metadata = { robots: { index: false, follow: false } };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spaceId?: string }>;
};

export default async function TutorialEditorPage({ params, searchParams }: PageProps) {
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
    return <TutorialEditor initial={null} ctx={ctx} />;
  }

  const t = await prisma.tutorial.findUnique({
    where: { id },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  if (!t || t.authorId !== userId) notFound();

  const ctx = await getEditorContext(userId, t.spaceId, { contentType: "TUTORIAL", contentId: t.id });
  if (!ctx) notFound();

  return (
    <TutorialEditor
      initial={{
        id: t.id,
        title: t.title,
        summary: t.summary ?? "",
        coverImage: t.coverImage ?? "",
        published: t.published,
        slug: t.slug,
        sections: t.sections.map((s) => ({ title: s.title ?? "", body: s.body, bodyJson: s.bodyJson ?? null })),
      }}
      ctx={ctx}
    />
  );
}
