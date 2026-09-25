/**
 * Question library data: the workspace's questionnaires (conversation question
 * sets) and the public interview question bank they can copy from.
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canMember } from "@/lib/permissions";
import { effectivePlanAllowsAiScreening } from "@/lib/billing/trial";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";
import { parseQuestionnaire, type QuestionItem } from "@/lib/ai-interview/questionnaire";

export class LibraryError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type LibraryActor = {
  workspaceId: string;
  userId: string;
  email: string | null;
  canManage: boolean;
  aiScreening: boolean;
};

export async function resolveLibraryActor(slug: string): Promise<LibraryActor> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new LibraryError("Sign in again to continue.", 401);
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { where: { userId: session.user.id }, select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new LibraryError("Workspace not found.", 404);
  const member = workspace.members[0];
  if (!member) throw new LibraryError("You are not a member of this workspace.", 403);
  return {
    workspaceId: workspace.id,
    userId: session.user.id,
    email: session.user.email ?? null,
    canManage: await canMember(member, "interview:conduct"),
    aiScreening: effectivePlanAllowsAiScreening(workspace),
  };
}

export type Questionnaire = {
  id: string;
  title: string;
  brief: string;
  roleArea: string | null;
  minutes: number;
  items: QuestionItem[];
  updatedAt: string;
  uses: number;
};

export async function loadQuestionnaires(workspaceId: string): Promise<Questionnaire[]> {
  const rows = await prisma.aIInterviewTemplate.findMany({
    where: { workspaceId, kind: "conversation" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, description: true, frameworkLabel: true, estimatedMinutes: true, testsCode: true, updatedAt: true },
  });
  const uses = rows.length
    ? await prisma.aIInterviewRound.groupBy({ by: ["templateId"], where: { templateId: { in: rows.map((r) => r.id) } }, _count: true })
    : [];
  const useCount = new Map(uses.map((u) => [u.templateId, u._count]));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    brief: r.description,
    roleArea: r.frameworkLabel,
    minutes: r.estimatedMinutes,
    items: parseQuestionnaire(r.testsCode),
    updatedAt: r.updatedAt.toISOString(),
    uses: useCount.get(r.id) ?? 0,
  }));
}

export type PublicCategory = { slug: string; label: string; count: number };

/** Categories straight from the bank, so a new technology shows up once it has published questions. */
export async function loadPublicCategories(): Promise<{ categories: PublicCategory[]; rounds: string[]; total: number }> {
  const [byTech, byRound] = await Promise.all([
    prisma.prepQuestion.groupBy({ by: ["technology"], where: { status: "published", technology: { not: null } }, _count: true }),
    prisma.prepQuestion.groupBy({ by: ["round"], where: { status: "published", round: { not: null } }, _count: true }),
  ]);
  const label = (slug: string) => TECHNOLOGIES.find((t) => t.slug === slug)?.label ?? slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const categories = byTech
    .filter((t) => t.technology)
    .map((t) => ({ slug: t.technology as string, label: label(t.technology as string), count: t._count }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return {
    categories,
    rounds: byRound.map((r) => r.round as string).sort(),
    total: categories.reduce((n, c) => n + c.count, 0),
  };
}

export type PublicQuery = { tech?: string | null; difficulty?: string | null; round?: string | null; q?: string | null; page?: number };
export type PublicRow = { id: string; slug: string; title: string; summary: string | null; difficulty: string; technology: string | null; round: string | null };

export const PUBLIC_PAGE_SIZE = 25;

export async function searchPublicQuestions(query: PublicQuery): Promise<{ rows: PublicRow[]; total: number; page: number }> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const q = query.q?.trim().slice(0, 100);
  const where = {
    status: "published",
    ...(query.tech ? { technology: query.tech } : {}),
    ...(query.difficulty && ["easy", "medium", "hard"].includes(query.difficulty) ? { difficulty: query.difficulty } : {}),
    ...(query.round ? { round: query.round } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { tags: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.prepQuestion.findMany({
      where,
      orderBy: [{ views: "desc" }, { title: "asc" }],
      skip: (page - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: { id: true, slug: true, title: true, description: true, difficulty: true, technology: true, round: true },
    }),
    prisma.prepQuestion.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.description ? r.description.replace(/\s+/g, " ").slice(0, 220) : null,
      difficulty: r.difficulty,
      technology: r.technology,
      round: r.round,
    })),
    total,
    page,
  };
}

export async function loadPublicAnswer(id: string): Promise<{ answer: string | null; slug: string } | null> {
  const row = await prisma.prepQuestion.findFirst({ where: { id, status: "published" }, select: { answer: true, slug: true } });
  return row ? { answer: row.answer, slug: row.slug } : null;
}

/** Bank questions as questionnaire items, in the order given. */
export async function publicItems(ids: string[]): Promise<QuestionItem[]> {
  const rows = await prisma.prepQuestion.findMany({
    where: { id: { in: ids.slice(0, 40) }, status: "published" },
    select: { id: true, slug: true, title: true, answer: true, technology: true, difficulty: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    if (!r) return [];
    const item: QuestionItem = { q: r.title.trim(), src: r.slug, difficulty: r.difficulty };
    if (r.answer?.trim()) item.a = r.answer.trim();
    if (r.technology) item.tech = r.technology;
    return [item];
  });
}

export type LibraryChallenge = { id: string; slug: string; title: string; difficulty: string; template: string; published: boolean };

export async function loadWorkspaceChallenges(workspaceId: string): Promise<LibraryChallenge[]> {
  return prisma.challenge.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, difficulty: true, template: true, published: true },
  });
}
