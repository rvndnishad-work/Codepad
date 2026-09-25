import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadTakeHomes } from "@/lib/take-home/list-server";
import { DEFAULT_QUESTION_MINUTES, parseTemplateItems } from "@/lib/take-home/status";
import { loadTakeHomeAccess } from "../_lib";
import Composer, { type ComposerCandidate, type ComposerQuestion, type ComposerTemplate } from "../_components/Composer";

export const metadata = { title: "New take home — Interviewpad", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ candidates?: string; candidateId?: string; template?: string }>;
};

export default async function NewTakeHomePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const access = await loadTakeHomeAccess(slug, `/w/${slug}/take-homes/new`);
  if (!access.canCreate) redirect(`/w/${slug}/take-homes`);
  const wsId = access.workspace.id;

  const [challenges, candidates, templates, rows] = await Promise.all([
    // Coding challenges only: they run tests, so every answer gets a score.
    prisma.challenge.findMany({
      where: { OR: [{ workspaceId: wsId }, { published: true, workspaceId: null }] },
      orderBy: [{ workspaceId: "desc" }, { difficulty: "asc" }, { title: "asc" }],
      select: { id: true, title: true, difficulty: true, estimatedMinutes: true, category: true, workspaceId: true },
    }),
    prisma.candidate.findMany({
      where: { workspaceId: wsId, email: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 2000,
      select: { id: true, name: true, email: true, stage: true },
    }),
    prisma.takeHomeTemplate.findMany({
      where: { workspaceId: wsId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, itemsJson: true },
    }),
    loadTakeHomes(wsId),
  ]);

  // People who already have an open take home get a note, not a block.
  const open = new Map<string, string>();
  for (const r of rows) {
    if (r.candidate.id && (r.state === "not_started" || r.state === "in_progress") && !open.has(r.candidate.id)) open.set(r.candidate.id, r.sentAt);
  }

  const questions: ComposerQuestion[] = challenges.map((c) => ({
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    category: c.category,
    minutes: Math.min(Math.max(c.estimatedMinutes || DEFAULT_QUESTION_MINUTES, 15), 240),
    own: c.workspaceId === wsId,
  }));
  const known = new Set(questions.map((q) => q.id));
  const tpls: ComposerTemplate[] = templates
    .map((t) => ({ id: t.id, name: t.name, items: parseTemplateItems(t.itemsJson).filter((i) => known.has(i.challengeId)) }))
    .filter((t) => t.items.length > 0);
  const people: ComposerCandidate[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email!,
    stage: c.stage,
    openSince: open.get(c.id) ?? null,
  }));

  const wanted = [...(sp.candidates?.split(",") ?? []), ...(sp.candidateId ? [sp.candidateId] : [])].map((s) => s.trim()).filter(Boolean);
  const byId = new Set(people.map((p) => p.id));

  return (
    <Composer
      slug={slug}
      workspaceName={access.workspace.name}
      questions={questions}
      templates={tpls}
      candidates={people}
      initialCandidateIds={wanted.filter((id) => byId.has(id)).slice(0, 100)}
      initialTemplateId={tpls.some((t) => t.id === sp.template) ? sp.template! : null}
    />
  );
}
