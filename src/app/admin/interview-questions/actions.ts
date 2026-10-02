"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { slugify } from "@/lib/interview-questions/shared";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin/audit";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";
import { requireStaff } from "../content/_lib/guard";
import { assignUniqueSlugs } from "../content/_lib/slugs";
import { parseSchedule } from "../content/_lib/schedule";
import { fail, ok, type ActionResult } from "../content/_lib/result";
import { IMPORT_ROW_CAP } from "./list-params";

/** Every mutation here needs the content-curation permission. */
const assertCurate = () => requireStaff("content:curate");

const QUESTION_STATUSES = ["draft", "published", "archived"] as const;
type QuestionStatus = (typeof QUESTION_STATUSES)[number];
const isQuestionStatus = (s: unknown): s is QuestionStatus =>
  typeof s === "string" && (QUESTION_STATUSES as readonly string[]).includes(s);

/** Slugs already taken that start with any of `roots`, in one query. */
async function takenSlugs(table: "company" | "prepQuestion", roots: string[], ignoreId?: string): Promise<Set<string>> {
  const distinct = [...new Set(roots)];
  if (distinct.length === 0) return new Set();
  const where = { OR: distinct.map((r) => ({ slug: { startsWith: r } })) };
  const rows =
    table === "company"
      ? await prisma.company.findMany({ where, select: { id: true, slug: true } })
      : await prisma.prepQuestion.findMany({ where, select: { id: true, slug: true } });
  return new Set(rows.filter((r) => r.id !== ignoreId).map((r) => r.slug));
}

async function uniqueSlug(base: string, table: "company" | "prepQuestion"): Promise<string> {
  const root = slugify(base) || "item";
  const [slug] = assignUniqueSlugs([root], await takenSlugs(table, [root]));
  return slug;
}

function revalidateQuestions() {
  revalidatePath("/admin/interview-questions");
  revalidatePath("/interview-questions");
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
  const { actor } = await assertCurate();
  const data = {
    name: input.name.trim(),
    logo: input.logo?.trim() || null,
    description: input.description?.trim() || null,
    website: input.website?.trim() || null,
    industry: input.industry?.trim() || null,
    hiringRoles: JSON.stringify(input.hiringRoles ?? []),
  };
  let id = input.id;
  if (id) {
    await prisma.company.update({ where: { id }, data });
  } else {
    const slug = await uniqueSlug(input.name, "company");
    id = (await prisma.company.create({ data: { ...data, slug } })).id;
  }
  await logAdminAction({
    actor,
    action: input.id ? "content.company.update" : "content.company.create",
    targetType: "company",
    targetId: id,
    targetLabel: data.name,
    after: data,
  });
  revalidatePath("/admin/interview-questions/companies");
  revalidatePath("/interview-questions");
}

/** Refuses while questions still point at the company, so nothing is silently unlinked. */
export async function deleteCompany(id: string): Promise<ActionResult> {
  const { actor } = await assertCurate();
  const company = await prisma.company.findUnique({
    where: { id },
    select: { name: true, _count: { select: { questions: true, experiences: true } } },
  });
  if (!company) return fail("Company not found.");
  if (company._count.questions > 0) {
    return fail(
      `${company._count.questions} question${company._count.questions === 1 ? "" : "s"} still use ${company.name}. Move or delete them first.`,
    );
  }
  await prisma.company.delete({ where: { id } });
  await logAdminAction({
    actor,
    action: "content.company.delete",
    targetType: "company",
    targetId: id,
    targetLabel: company.name,
    before: { experiences: company._count.experiences },
  });
  revalidatePath("/admin/interview-questions/companies");
  revalidatePath("/interview-questions");
  return ok();
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
  /** ISO time to publish a draft at; "" clears it; omit to leave untouched. */
  scheduledAt?: string;
}): Promise<{ id: string }> {
  const { userId, actor } = await assertCurate();
  const status: QuestionStatus = isQuestionStatus(input.status) ? input.status : "draft";
  let scheduledAt: Date | null | undefined = undefined;
  if (input.scheduledAt !== undefined) {
    const parsed = parseSchedule(input.scheduledAt);
    if (!parsed.ok) throw new Error(parsed.error);
    scheduledAt = status === "draft" ? parsed.at : null;
  } else if (status !== "draft") {
    scheduledAt = null;
  }
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
    status,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    ...(scheduledAt !== undefined ? { scheduledAt } : {}),
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
  let before: { status: string; publishedAt: Date | null } | null = null;
  if (id) {
    const existing = await prisma.prepQuestion.findUnique({
      where: { id },
      select: { title: true, description: true, answer: true, status: true, publishedAt: true },
    });
    if (!existing) throw new Error("Question not found.");
    before = { status: existing.status, publishedAt: existing.publishedAt };
    // The cached AI hint is derived from the question content — drop it when
    // that content changes so the next request regenerates it.
    const contentChanged =
      existing.title !== data.title ||
      (existing.description ?? null) !== data.description ||
      (existing.answer ?? null) !== data.answer;
    await prisma.prepQuestion.update({
      where: { id },
      data: {
        ...data,
        ...(contentChanged ? { aiHint: null } : {}),
        ...(status === "published" && !existing.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
  } else {
    const slug = await uniqueSlug(input.title, "prepQuestion");
    const created = await prisma.prepQuestion.create({
      data: {
        ...data,
        slug,
        createdById: userId,
        ...(status === "published" ? { publishedAt: new Date() } : {}),
      },
    });
    id = created.id;
  }
  await logAdminAction({
    actor,
    action: input.id ? "content.question.update" : "content.question.create",
    targetType: "question",
    targetId: id,
    targetLabel: data.title,
    before,
    after: { status, scheduledAt: data.scheduledAt ?? undefined },
  });
  revalidateQuestions();
  return { id: id! };
}

export async function setQuestionStatus(id: string, status: QuestionStatus) {
  const { actor } = await assertCurate();
  if (!isQuestionStatus(status)) throw new Error("Unknown status.");
  const existing = await prisma.prepQuestion.findUnique({
    where: { id },
    select: { title: true, status: true, publishedAt: true },
  });
  if (!existing) throw new Error("Question not found.");
  await prisma.prepQuestion.update({
    where: { id },
    data: {
      status,
      // Any manual status change replaces a pending schedule.
      scheduledAt: null,
      ...(status === "published" && !existing.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });
  await logAdminAction({
    actor,
    action: "content.question.status",
    targetType: "question",
    targetId: id,
    targetLabel: existing.title,
    before: { status: existing.status },
    after: { status },
  });
  revalidateQuestions();
}

export async function deleteQuestion(id: string): Promise<ActionResult> {
  const { actor } = await assertCurate();
  const existing = await prisma.prepQuestion.findUnique({ where: { id }, select: { title: true, status: true, slug: true } });
  if (!existing) return fail("Question not found.");
  await prisma.prepQuestion.delete({ where: { id } });
  await logAdminAction({
    actor,
    action: "content.question.delete",
    targetType: "question",
    targetId: id,
    targetLabel: existing.title,
    before: existing,
  });
  revalidateQuestions();
  return ok();
}

/**
 * Bulk import questions from a parsed JSON/CSV array. All or nothing: rows
 * are validated first, and if any row is invalid nothing is written. Valid
 * files are written in one transaction, capped at IMPORT_ROW_CAP rows, with
 * slugs assigned from a single lookup instead of a query per row.
 */
export async function bulkImportQuestions(items: Record<string, unknown>[]): Promise<{ created: number; errors: string[] }> {
  const { userId, actor } = await assertCurate();
  if (!Array.isArray(items) || items.length === 0) return { created: 0, errors: ["Nothing to import."] };
  if (items.length > IMPORT_ROW_CAP) {
    return { created: 0, errors: [`${items.length} rows is over the limit of ${IMPORT_ROW_CAP} per import. Split the file.`] };
  }

  const errors: string[] = [];
  const companies = await prisma.company.findMany({ select: { id: true, name: true, slug: true } });
  const byName = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]));
  const bySlug = new Map(companies.map((c) => [c.slug, c.id]));
  const str = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(v));

  const rows: (Omit<Prisma.PrepQuestionCreateManyInput, "slug"> & { slugRoot: string })[] = [];
  items.forEach((raw, i) => {
    const title = String(raw?.title ?? "").trim();
    if (!title) {
      errors.push(`Row ${i + 1}: missing title`);
      return;
    }
    const statusRaw = raw.status === undefined || raw.status === "" ? "published" : String(raw.status).trim().toLowerCase();
    if (!isQuestionStatus(statusRaw)) {
      errors.push(`Row ${i + 1} (${title}): status must be draft, published or archived`);
      return;
    }
    const companyRef = String(raw.company ?? "").trim().toLowerCase();
    const companyId = companyRef ? byName.get(companyRef) ?? bySlug.get(companyRef) ?? null : null;
    if (companyRef && !companyId) {
      errors.push(`Row ${i + 1} (${title}): no company named "${companyRef}"`);
      return;
    }
    const difficulty = String(raw.difficulty ?? "medium").toLowerCase();
    rows.push({
      slugRoot: slugify(String(raw.slug ?? title)) || "item",
      title,
      description: str(raw.description),
      answer: str(raw.answer),
      companyId,
      technology: str(raw.technology),
      role: str(raw.role),
      difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
      round: str(raw.round),
      experienceLevel: str(raw.experienceLevel),
      tags: JSON.stringify(Array.isArray(raw.tags) ? raw.tags.map(String) : []),
      yearsAsked: JSON.stringify(Array.isArray(raw.yearsAsked) ? raw.yearsAsked.map(Number).filter((n) => !Number.isNaN(n)) : []),
      status: statusRaw,
      publishedAt: statusRaw === "published" ? new Date() : null,
      createdById: userId,
    });
  });
  if (errors.length > 0) return { created: 0, errors: [`Nothing was imported. Fix these rows and try again.`, ...errors] };

  const slugs = assignUniqueSlugs(
    rows.map((r) => r.slugRoot),
    await takenSlugs("prepQuestion", rows.map((r) => r.slugRoot)),
  );
  const data: Prisma.PrepQuestionCreateManyInput[] = rows.map(({ slugRoot: _root, ...r }, i) => ({ ...r, slug: slugs[i] }));

  try {
    const created = await prisma.$transaction(async (tx) => (await tx.prepQuestion.createMany({ data })).count);
    await logAdminAction({
      actor,
      action: "content.question.import",
      targetType: "question",
      targetLabel: `${created} questions`,
      after: { created, slugs: slugs.slice(0, 50) },
    });
    revalidateQuestions();
    return { created, errors: [] };
  } catch (e) {
    return { created: 0, errors: [`Nothing was imported: ${(e as Error).message}`] };
  }
}

// ── Experiences (moderation) ────────────────────────────────────────────────

/** "approved" used to mean reviewed-but-not-live; it is now the same as published. */
type ExperienceStatus = "pending" | "published" | "rejected";
const normalizeExperienceStatus = (s: string): ExperienceStatus | null =>
  s === "approved" || s === "published" ? "published" : s === "pending" || s === "rejected" ? s : null;

async function moderateExperiences(ids: string[], rawStatus: string, reason: string | undefined): Promise<ActionResult> {
  const { actor } = await assertCurate();
  const status = normalizeExperienceStatus(rawStatus);
  if (!status) return fail("Unknown status.");
  if (ids.length === 0) return fail("Nothing selected.");
  if (ids.length > 200) return fail("Select at most 200 at a time.");
  const note = reason?.trim() || null;
  if (status === "rejected" && !note) return fail("Add a reason for the author.");

  const rows = await prisma.prepExperience.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, authorId: true, companyName: true, role: true, company: { select: { name: true } } },
  });
  await prisma.prepExperience.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { status } });

  await Promise.all(
    rows.map(async (r) => {
      const label = [r.company?.name ?? r.companyName, r.role].filter(Boolean).join(" · ") || "Interview experience";
      await logAdminAction({
        actor,
        action: `content.experience.${status === "published" ? "publish" : status === "rejected" ? "reject" : "pending"}`,
        targetType: "experience",
        targetId: r.id,
        targetLabel: label,
        before: { status: r.status },
        after: { status },
        note,
      });
      if (r.authorId && r.status !== status && status !== "pending") {
        await createNotification({
          userId: r.authorId,
          type: NOTIFICATION_TYPES.CONTENT_STATUS,
          title: status === "published" ? "Your interview experience is live" : "Your interview experience was not published",
          body: status === "published" ? label : `${label}: ${note}`,
          href: "/interview-questions",
        }).catch(() => {});
      }
    }),
  );
  revalidatePath("/admin/interview-questions/experiences");
  revalidatePath("/interview-questions");
  return ok(`${rows.length} updated`);
}

export async function setExperienceStatus(id: string, status: string, reason?: string): Promise<ActionResult> {
  return moderateExperiences([id], status, reason);
}

export async function bulkSetExperienceStatus(ids: string[], status: string, reason?: string): Promise<ActionResult> {
  return moderateExperiences(ids, status, reason);
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  const { actor } = await assertCurate();
  const row = await prisma.prepExperience.findUnique({ where: { id }, select: { status: true, companyName: true, role: true } });
  if (!row) return fail("Experience not found.");
  await prisma.prepExperience.delete({ where: { id } });
  await logAdminAction({
    actor,
    action: "content.experience.delete",
    targetType: "experience",
    targetId: id,
    targetLabel: [row.companyName, row.role].filter(Boolean).join(" · ") || null,
    before: row,
  });
  revalidatePath("/admin/interview-questions/experiences");
  revalidatePath("/interview-questions");
  return ok();
}
