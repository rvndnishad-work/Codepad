import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LibraryError, loadQuestionnaires, resolveLibraryActor } from "@/lib/library/library-server";
import { publicSummary } from "@/lib/library/summary";
import { loadQuestionStats } from "@/lib/library/question-stats-server";
import { variantsConfigured } from "@/lib/library/variants-server";
import QuestionDetail, { type DetailProps, type SavedVariant } from "./QuestionDetail";

type Props = { params: Promise<{ slug: string; kind: string; id: string }> };

export const metadata = { title: "Question — Interviewpad", robots: { index: false, follow: false } };

async function savedVariants(workspaceId: string, slug: string, originKind: "bank" | "challenge", originId: string): Promise<SavedVariant[]> {
  const rows = await prisma.questionVariant.findMany({
    where: { workspaceId, originKind, originQuestionId: originId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, prompt: true, challengeId: true, checkStatus: true, testsPassed: true, testsTotal: true, createdAt: true },
  });
  return rows.map((v) => ({
    id: v.id,
    title: v.title,
    prompt: v.prompt,
    href: v.challengeId ? `/w/${slug}/library/q/challenge/${v.challengeId}` : `/w/${slug}/library/q/variant/${v.id}`,
    checked: v.checkStatus === "passed" ? { passed: v.testsPassed ?? 0, total: v.testsTotal ?? 0 } : null,
    createdAt: v.createdAt.toISOString(),
  }));
}

export default async function QuestionDetailPage({ params }: Props) {
  const { slug, kind, id } = await params;
  const actor = await resolveLibraryActor(slug).catch((err) => {
    if (err instanceof LibraryError && err.status === 401) redirect(`/login?next=/w/${slug}/library/q/${kind}/${id}`);
    if (err instanceof LibraryError && err.status === 404) notFound();
    redirect("/dashboard");
  });
  const ws = actor.workspaceId;
  const common = { slug, canManage: actor.canManage, aiReady: variantsConfigured() };
  let props: DetailProps;

  if (kind === "bank") {
    const q = await prisma.prepQuestion.findFirst({
      where: { id, status: "published" },
      select: { id: true, slug: true, title: true, description: true, technology: true, difficulty: true },
    });
    if (!q) notFound();
    const [stats, variants] = await Promise.all([loadQuestionStats(ws, { kind: "bank", slug: q.slug }), savedVariants(ws, slug, "bank", q.id)]);
    props = {
      ...common,
      kind: "bank",
      id: q.id,
      title: q.title,
      visibility: "public",
      body: [q.title, publicSummary(q.description)].filter(Boolean).join("\n\n"),
      bodyIsMarkdown: false,
      answer: null,
      publicHref: `/interview-question/${q.slug}`,
      backHref: `/w/${slug}/library?tab=public`,
      origin: null,
      stats,
      variants,
      questionnaires: [],
    };
  } else if (kind === "challenge") {
    const c = await prisma.challenge.findFirst({
      where: { id, OR: [{ workspaceId: null, published: true }, { workspaceId: ws }] },
      select: { id: true, slug: true, title: true, description: true, workspaceId: true },
    });
    if (!c) notFound();
    const isPublic = c.workspaceId == null;
    const variantRow = isPublic ? null : await prisma.questionVariant.findUnique({ where: { challengeId: c.id }, select: { originQuestionId: true } });
    const origin = variantRow ? await prisma.challenge.findUnique({ where: { id: variantRow.originQuestionId }, select: { id: true, title: true } }) : null;
    const [stats, variants] = await Promise.all([loadQuestionStats(ws, { kind: "challenge", id: c.id }), isPublic ? savedVariants(ws, slug, "challenge", c.id) : Promise.resolve([])]);
    props = {
      ...common,
      kind: "challenge",
      id: c.id,
      title: c.title,
      visibility: isPublic ? "public" : variantRow ? "variant" : "team",
      body: c.description,
      bodyIsMarkdown: true,
      answer: null,
      publicHref: isPublic ? `/challenges/${c.slug}` : null,
      backHref: `/w/${slug}/library?tab=challenges`,
      origin: origin ? { title: origin.title, href: `/w/${slug}/library/q/challenge/${origin.id}` } : null,
      stats,
      variants,
      questionnaires: [],
    };
  } else if (kind === "variant") {
    const v = await prisma.questionVariant.findFirst({
      where: { id, workspaceId: ws, originKind: "bank" },
      select: { id: true, title: true, prompt: true, answer: true, originQuestionId: true },
    });
    if (!v) notFound();
    const [origin, stats, questionnaires] = await Promise.all([
      prisma.prepQuestion.findUnique({ where: { id: v.originQuestionId }, select: { id: true, title: true } }),
      loadQuestionStats(ws, { kind: "variant", id: v.id }),
      loadQuestionnaires(ws),
    ]);
    props = {
      ...common,
      kind: "variant",
      id: v.id,
      title: v.title,
      visibility: "variant",
      body: v.prompt,
      bodyIsMarkdown: false,
      answer: v.answer,
      publicHref: null,
      backHref: `/w/${slug}/library?tab=public`,
      origin: origin ? { title: origin.title, href: `/w/${slug}/library/q/bank/${origin.id}` } : null,
      stats,
      variants: [],
      questionnaires: questionnaires.map((q) => ({ id: q.id, title: q.title, count: q.items.length, has: q.items.some((i) => i.src === `variant:${v.id}`) })),
    };
  } else {
    notFound();
  }

  return <QuestionDetail {...props} />;
}
