import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import TutorialEditor from "./TutorialEditor";

export const metadata = { robots: { index: false, follow: false } };

export default async function TutorialEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");
  if (!(await userCan(userId, "content:author"))) redirect("/dashboard");

  if (id === "new") return <TutorialEditor initial={null} />;

  const t = await prisma.tutorial.findUnique({
    where: { id },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  if (!t || t.authorId !== userId) notFound();

  return (
    <TutorialEditor
      initial={{
        id: t.id,
        title: t.title,
        summary: t.summary ?? "",
        published: t.published,
        sections: t.sections.map((s) => ({ title: s.title ?? "", body: s.body })),
      }}
    />
  );
}
