"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { slugify } from "@/lib/interview-questions/shared";
import { revalidatePath } from "next/cache";

/** Gate every mutation on the content-curation permission. */
async function assertCurate() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "content:curate"))) {
    throw new Error("Forbidden");
  }
  return session!;
}

async function uniqueSlug(base: string, table: "company" | "prepQuestion", ignoreId?: string): Promise<string> {
  const root = slugify(base) || "item";
  let slug = root;
  let n = 1;
  // Loop until free (tiny N in practice).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing =
      table === "company"
        ? await prisma.company.findUnique({ where: { slug }, select: { id: true } })
        : await prisma.prepQuestion.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${root}-${n++}`;
  }
}

// ── Companies ──────────────────────────────────────────────────────────────

export async function saveCompany(input: {
  id?: string;
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  industry?: string;
  hiringRoles?: string[];
}) {
  await assertCurate();
  const data = {
    name: input.name.trim(),
    logo: input.logo?.trim() || null,
    description: input.description?.trim() || null,
    website: input.website?.trim() || null,
    industry: input.industry?.trim() || null,
    hiringRoles: JSON.stringify(input.hiringRoles ?? []),
  };
  if (input.id) {
    await prisma.company.update({ where: { id: input.id }, data });
  } else {
    const slug = await uniqueSlug(input.name, "company");
    await prisma.company.create({ data: { ...data, slug } });
  }
  revalidatePath("/admin/interview-questions/companies");
  revalidatePath("/interview-questions");
}

export async function deleteCompany(id: string) {
  await assertCurate();
  await prisma.company.delete({ where: { id } });
  revalidatePath("/admin/interview-questions/companies");
  revalidatePath("/interview-questions");
}

// ── Questions ──────────────────────────────────────────────────────────────

/**
 * Validate a raw-JSON form field (examplesData / frameworksData). Empty →
 * null (clears the column); invalid JSON or wrong shape → throws so the form
 * surfaces it instead of persisting a string the question page can't parse.
 */
function normalizeJsonField(raw: string, kind: "array" | "object", label: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  const ok = kind === "array" ? Array.isArray(parsed) : typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  if (!ok) throw new Error(`${label} must be a JSON ${kind}.`);
  return JSON.stringify(parsed);
}

export async function saveQuestion(input: {
  id?: string;
  title: string;
  description?: string;
  answer?: string;
  companyId?: string;
  technology?: string;
  role?: string;
  difficulty: string;
  round?: string;
  experienceLevel?: string;
  tags?: string[];
  yearsAsked?: number[];
  status?: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Raw JSON array of runnable examples; omit to leave untouched, "" to clear. */
  examplesData?: string;
  /** Raw JSON map of per-framework bundles; omit to leave untouched, "" to clear. */
  frameworksData?: string;
}): Promise<{ id: string }> {
  const session = await assertCurate();
  const data = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    answer: input.answer?.trim() || null,
    companyId: input.companyId || null,
    technology: input.technology?.trim() || null,
    role: input.role?.trim() || null,
    difficulty: input.difficulty || "medium",
    round: input.round?.trim() || null,
    experienceLevel: input.experienceLevel?.trim() || null,
    tags: JSON.stringify(input.tags ?? []),
    yearsAsked: JSON.stringify(input.yearsAsked ?? []),
    status: input.status || "draft",
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    // Only touch the rich-content columns when the caller sends them, so
    // callers that predate these fields can never wipe seeded content.
    ...(input.examplesData !== undefined
      ? { examplesData: normalizeJsonField(input.examplesData, "array", "Examples data") }
      : {}),
    ...(input.frameworksData !== undefined
      ? { frameworksData: normalizeJsonField(input.frameworksData, "object", "Frameworks data") }
      : {}),
  };
  let id = input.id;
  if (id) {
    const existing = await prisma.prepQuestion.findUnique({
      where: { id },
      select: { title: true, description: true, answer: true },
    });
    if (!existing) throw new Error("Question not found.");
    // The cached AI hint is derived from the question content — drop it when
    // that content changes so the next request regenerates it.
    const contentChanged =
      existing.title !== data.title ||
      (existing.description ?? null) !== data.description ||
      (existing.answer ?? null) !== data.answer;
    await prisma.prepQuestion.update({ where: { id }, data: contentChanged ? { ...data, aiHint: null } : data });
  } else {
    const slug = await uniqueSlug(input.title, "prepQuestion");
    const created = await prisma.prepQuestion.create({
      data: { ...data, slug, createdById: session.user?.id ?? null },
    });
    id = created.id;
  }
  revalidatePath("/admin/interview-questions");
  revalidatePath("/interview-questions");
  return { id: id! };
}

export async function setQuestionStatus(id: string, status: "draft" | "published" | "archived") {
  await assertCurate();
  await prisma.prepQuestion.update({ where: { id }, data: { status } });
  revalidatePath("/admin/interview-questions");
  revalidatePath("/interview-questions");
}

export async function deleteQuestion(id: string) {
  await assertCurate();
  await prisma.prepQuestion.delete({ where: { id } });
  revalidatePath("/admin/interview-questions");
  revalidatePath("/interview-questions");
}

/** Bulk import questions from a parsed JSON array. Returns created count. */
export async function bulkImportQuestions(items: Record<string, unknown>[]): Promise<{ created: number; errors: string[] }> {
  await assertCurate();
  const errors: string[] = [];
  let created = 0;

  // Resolve company names → ids once.
  const companies = await prisma.company.findMany({ select: { id: true, name: true, slug: true } });
  const byName = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]));
  const bySlug = new Map(companies.map((c) => [c.slug, c.id]));

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const title = String(raw.title ?? "").trim();
    if (!title) {
      errors.push(`Row ${i + 1}: missing title`);
      continue;
    }
    const companyRef = String(raw.company ?? "").trim().toLowerCase();
    const companyId = companyRef ? byName.get(companyRef) ?? bySlug.get(companyRef) ?? null : null;
    try {
      const slug = await uniqueSlug(String(raw.slug ?? title), "prepQuestion");
      await prisma.prepQuestion.create({
        data: {
          title,
          slug,
          description: raw.description ? String(raw.description) : null,
          answer: raw.answer ? String(raw.answer) : null,
          companyId,
          technology: raw.technology ? String(raw.technology) : null,
          role: raw.role ? String(raw.role) : null,
          difficulty: ["easy", "medium", "hard"].includes(String(raw.difficulty)) ? String(raw.difficulty) : "medium",
          round: raw.round ? String(raw.round) : null,
          experienceLevel: raw.experienceLevel ? String(raw.experienceLevel) : null,
          tags: JSON.stringify(Array.isArray(raw.tags) ? raw.tags : []),
          yearsAsked: JSON.stringify(Array.isArray(raw.yearsAsked) ? raw.yearsAsked : []),
          status: String(raw.status ?? "published"),
        },
      });
      created++;
    } catch (e) {
      errors.push(`Row ${i + 1} (${title}): ${(e as Error).message}`);
    }
  }
  revalidatePath("/admin/interview-questions");
  revalidatePath("/interview-questions");
  return { created, errors };
}

// ── Experiences (moderation) ────────────────────────────────────────────────

export async function setExperienceStatus(
  id: string,
  status: "pending" | "approved" | "published" | "rejected",
) {
  await assertCurate();
  await prisma.prepExperience.update({ where: { id }, data: { status } });
  revalidatePath("/admin/interview-questions/experiences");
  revalidatePath("/interview-questions");
}

export async function deleteExperience(id: string) {
  await assertCurate();
  await prisma.prepExperience.delete({ where: { id } });
  revalidatePath("/admin/interview-questions/experiences");
}
