import { prisma } from "@/lib/prisma";
import { loadTakeHomes, countRows } from "@/lib/take-home/list-server";
import { DEFAULT_QUESTION_MINUTES, parseTemplateItems } from "@/lib/take-home/status";
import { loadTakeHomeAccess } from "../_lib";
import { TakeHomeHeader } from "../_components/kit";
import Templates, { type TemplateCard } from "../_components/Templates";
import type { ComposerQuestion } from "../_components/Composer";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Take home templates — Interviewpad", robots: { index: false, follow: false } };

export default async function TakeHomeTemplatesPage({ params }: Props) {
  const { slug } = await params;
  const access = await loadTakeHomeAccess(slug, `/w/${slug}/take-homes/templates`);
  const wsId = access.workspace.id;
  const [rows, templates, challenges] = await Promise.all([
    loadTakeHomes(wsId),
    prisma.takeHomeTemplate.findMany({ where: { workspaceId: wsId }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, itemsJson: true } }),
    prisma.challenge.findMany({
      where: { OR: [{ workspaceId: wsId }, { published: true, workspaceId: null }] },
      orderBy: [{ workspaceId: "desc" }, { difficulty: "asc" }, { title: "asc" }],
      select: { id: true, title: true, difficulty: true, estimatedMinutes: true, category: true, workspaceId: true },
    }),
  ]);
  const counts = countRows(rows);
  const titles = new Map(challenges.map((c) => [c.id, c.title]));

  const cards: TemplateCard[] = templates.map((t) => {
    const sent = rows.filter((r) => r.templateId === t.id);
    const finished = sent.filter((r) => r.state === "submitted");
    const scored = finished.filter((r) => r.score != null);
    return {
      id: t.id,
      name: t.name,
      items: parseTemplateItems(t.itemsJson).map((i) => ({ ...i, title: titles.get(i.challengeId) ?? "Deleted question", missing: !titles.has(i.challengeId) })),
      sent: sent.length,
      finished: finished.length,
      average: scored.length ? Math.round(scored.reduce((n, r) => n + (r.score ?? 0), 0) / scored.length) : null,
    };
  });

  const questions: ComposerQuestion[] = challenges.map((c) => ({
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    category: c.category,
    minutes: Math.min(Math.max(c.estimatedMinutes || DEFAULT_QUESTION_MINUTES, 15), 240),
    own: c.workspaceId === wsId,
  }));

  return (
    <div className="flex flex-col gap-5">
      <TakeHomeHeader slug={slug} active="templates" counts={{ review: counts.review, all: counts.all, templates: cards.length }} canCreate={access.canCreate} />
      <Templates slug={slug} templates={cards} questions={questions} canCreate={access.canCreate} />
    </div>
  );
}
