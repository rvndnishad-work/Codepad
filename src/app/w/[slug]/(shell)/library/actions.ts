"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { parseQuestionnaire, serializeQuestionnaire, validateQuestionnaire, type QuestionItem } from "@/lib/ai-interview/questionnaire";
import {
  LibraryError,
  loadPublicAnswer,
  publicItems,
  resolveLibraryActor,
  searchChallenges,
  searchPublicQuestions,
  type ChallengeQuery,
  type ChallengeRow,
  type LibraryActor,
  type PublicQuery,
  type PublicRow,
} from "@/lib/library/library-server";
import { techLabel } from "@/lib/interview-questions/shared";
import { copyTitle, MINUTES_PER_QUESTION } from "@/lib/library/questionnaire-view";
import { rateLimitDistributed } from "@/lib/rate-limit";
import { cleanClientDraft, VariantShapeError, type VariantCheck, type VariantDraft } from "@/lib/library/variants";
import {
  challengeMode,
  checkDraft,
  generateDraft,
  loadOrigin,
  saveVariant,
  VariantError,
  variantsConfigured,
  type VariantOrigin,
} from "@/lib/library/variants-server";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof LibraryError) return { ok: false, error: err.message };
  if (err instanceof Error && err.message && !/prisma|invalid `/i.test(err.message)) return { ok: false, error: err.message };
  console.error("[library action]", err);
  return { ok: false, error: "Something went wrong. Try again." };
}

async function writer(slug: string): Promise<LibraryActor> {
  const a = await resolveLibraryActor(slug);
  if (!a.canManage) throw new LibraryError("You do not have permission to edit the question library.", 403);
  return a;
}

function audit(a: LibraryActor, action: string, id: string, meta: Record<string, unknown>) {
  void writeWorkspaceAuditEntry({
    workspaceId: a.workspaceId,
    actorUserId: a.userId,
    actorEmail: a.email,
    action,
    targetType: "aiInterviewTemplate",
    targetId: id,
    meta,
  });
}

function refresh(slug: string) {
  revalidatePath(`/w/${slug}/library`);
  revalidatePath(`/w/${slug}/ai-interviews`, "layout");
}

export async function searchPublicAction(slug: string, query: PublicQuery): Promise<Result<{ rows: PublicRow[]; total: number; page: number }>> {
  try {
    await resolveLibraryActor(slug);
    return { ok: true, ...(await searchPublicQuestions(query)) };
  } catch (err) {
    return fail(err);
  }
}

export async function searchChallengesAction(slug: string, query: ChallengeQuery): Promise<Result<{ rows: ChallengeRow[]; total: number; page: number }>> {
  try {
    const a = await resolveLibraryActor(slug);
    return { ok: true, ...(await searchChallenges(a.workspaceId, query)) };
  } catch (err) {
    return fail(err);
  }
}

export async function publicAnswerAction(slug: string, id: string): Promise<Result<{ answer: string | null; slug: string }>> {
  try {
    await resolveLibraryActor(slug);
    const row = await loadPublicAnswer(id);
    if (!row) throw new LibraryError("That question is no longer public.");
    return { ok: true, ...row };
  } catch (err) {
    return fail(err);
  }
}

/** Bank questions as questionnaire items, reference answers included. */
export async function publicItemsAction(slug: string, ids: string[]): Promise<Result<{ items: QuestionItem[] }>> {
  try {
    await resolveLibraryActor(slug);
    return { ok: true, items: await publicItems(ids) };
  } catch (err) {
    return fail(err);
  }
}

export type QuestionnaireInput = { id?: string; title: string; brief: string; roleArea?: string; minutes: number; items: QuestionItem[] };

function sanitize(input: QuestionnaireInput) {
  const title = input.title?.trim() ?? "";
  if (!title) throw new LibraryError("Give the questionnaire a name.");
  if (title.length > 80) throw new LibraryError("Names are limited to 80 characters.");
  const description = input.brief?.trim() ?? "";
  if (!description) throw new LibraryError("Write a short brief for the candidate.");
  if (description.length > 2000) throw new LibraryError("Keep the brief under 2,000 characters.");
  const estimatedMinutes = Number(input.minutes);
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > 180) throw new LibraryError("Time must be between 5 and 180 minutes.");
  const items = validateQuestionnaire(input.items ?? []);
  return {
    title,
    description,
    estimatedMinutes,
    kind: "conversation",
    starterFiles: "{}",
    testsCode: serializeQuestionnaire(items),
    language: null,
    frameworkLabel: input.roleArea?.trim().slice(0, 60) || null,
  };
}

export async function saveQuestionnaireAction(slug: string, input: QuestionnaireInput): Promise<Result<{ id: string }>> {
  try {
    const a = await writer(slug);
    const data = sanitize(input);
    let id: string;
    if (input.id) {
      const res = await prisma.aIInterviewTemplate.updateMany({ where: { id: input.id, workspaceId: a.workspaceId, kind: "conversation" }, data });
      if (!res.count) throw new LibraryError("That questionnaire was not found.");
      id = input.id;
    } else {
      id = (await prisma.aIInterviewTemplate.create({ data: { ...data, workspaceId: a.workspaceId } })).id;
    }
    audit(a, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_SAVED, id, { title: data.title, created: !input.id, questionnaire: true });
    refresh(slug);
    return { ok: true, id };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteQuestionnaireAction(slug: string, id: string): Promise<Result> {
  try {
    const a = await writer(slug);
    const row = await prisma.aIInterviewTemplate.findFirst({ where: { id, workspaceId: a.workspaceId, kind: "conversation" }, select: { title: true } });
    if (!row) throw new LibraryError("That questionnaire was not found.");
    await prisma.aIInterviewTemplate.delete({ where: { id } });
    audit(a, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_DELETED, id, { title: row.title, questionnaire: true });
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Copy a questionnaire, answers included, under a free "(copy)" name. */
export async function duplicateQuestionnaireAction(slug: string, id: string): Promise<Result<{ id: string; title: string }>> {
  try {
    const a = await writer(slug);
    const row = await prisma.aIInterviewTemplate.findFirst({
      where: { id, workspaceId: a.workspaceId, kind: "conversation" },
      select: { title: true, description: true, estimatedMinutes: true, testsCode: true, frameworkLabel: true },
    });
    if (!row) throw new LibraryError("That questionnaire was not found.");
    const taken = await prisma.aIInterviewTemplate.findMany({ where: { workspaceId: a.workspaceId, kind: "conversation" }, select: { title: true } });
    const title = copyTitle(row.title, taken.map((t) => t.title));
    const copy = await prisma.aIInterviewTemplate.create({
      data: {
        workspaceId: a.workspaceId,
        kind: "conversation",
        title,
        description: row.description,
        estimatedMinutes: row.estimatedMinutes,
        starterFiles: "{}",
        testsCode: row.testsCode,
        language: null,
        frameworkLabel: row.frameworkLabel,
      },
    });
    audit(a, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_SAVED, copy.id, { title, created: true, copiedFrom: id, questionnaire: true });
    refresh(slug);
    return { ok: true, id: copy.id, title };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Copy public bank questions into a questionnaire: an existing one (skipping
 * questions it already has) or a new one named `newTitle`.
 */
export async function addPublicQuestionsAction(
  slug: string,
  input: { ids: string[]; questionnaireId?: string; newTitle?: string },
): Promise<Result<{ id: string; added: number }>> {
  try {
    const a = await writer(slug);
    const picked = await publicItems([...new Set(input.ids)]);
    if (!picked.length) throw new LibraryError("Pick at least one question.");

    if (input.questionnaireId) {
      const row = await prisma.aIInterviewTemplate.findFirst({
        where: { id: input.questionnaireId, workspaceId: a.workspaceId, kind: "conversation" },
        select: { id: true, title: true, testsCode: true },
      });
      if (!row) throw new LibraryError("That questionnaire was not found.");
      const current = parseQuestionnaire(row.testsCode);
      const have = new Set(current.map((i) => i.src ?? i.q));
      const fresh = picked.filter((p) => !have.has(p.src ?? p.q) && !have.has(p.q));
      const items = validateQuestionnaire([...current, ...fresh]);
      await prisma.aIInterviewTemplate.update({ where: { id: row.id }, data: { testsCode: serializeQuestionnaire(items) } });
      audit(a, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_SAVED, row.id, { title: row.title, addedFromBank: fresh.length });
      refresh(slug);
      return { ok: true, id: row.id, added: fresh.length };
    }

    const techs = [...new Set(picked.map((p) => p.tech).filter(Boolean) as string[])].map(techLabel);
    const title = (input.newTitle?.trim() || `${techs.slice(0, 2).join(" and ") || "Interview"} questions`).slice(0, 80);
    const data = sanitize({
      title,
      brief: `A short conversation about ${techs.length ? techs.join(", ") : "your experience"}. Answer in your own words; there is no code to write.`,
      roleArea: techs.length === 1 ? techs[0] : undefined,
      // About four minutes a question, rounded to a time the editor offers.
      minutes: [10, 15, 20, 30, 45, 60].find((m) => m >= picked.length * MINUTES_PER_QUESTION) ?? 60,
      items: picked,
    });
    const id = (await prisma.aIInterviewTemplate.create({ data: { ...data, workspaceId: a.workspaceId } })).id;
    audit(a, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_SAVED, id, { title: data.title, created: true, addedFromBank: picked.length });
    refresh(slug);
    return { ok: true, id, added: picked.length };
  } catch (err) {
    return fail(err);
  }
}

/* ── Private variants ──────────────────────────────────────────────────── */

async function variantOrigin(kind: string, id: string): Promise<VariantOrigin> {
  if (kind !== "bank" && kind !== "challenge") throw new LibraryError("That question was not found.");
  const origin = await loadOrigin(kind, id);
  if (!origin) throw new LibraryError("Only public questions can have private variants.");
  return origin;
}

function variantFail(err: unknown): { ok: false; error: string } {
  if (err instanceof VariantError) return { ok: false, error: err.message };
  return fail(err);
}

/** Ask the AI for a private variant and run its tests. Nothing is saved. */
export async function generateVariantAction(slug: string, kind: string, id: string): Promise<Result<{ draft: VariantDraft; check: VariantCheck }>> {
  try {
    const a = await writer(slug);
    if (!variantsConfigured()) throw new LibraryError("AI is not set up on this server, so variants cannot be made.");
    const rl = await rateLimitDistributed(`variant:${a.workspaceId}`, 30, 60 * 60_000);
    if (!rl.ok) throw new LibraryError("That is a lot of variants in an hour. Try again later.");
    const origin = await variantOrigin(kind, id);
    const draft = await generateDraft(origin);
    const { check } = await checkDraft(origin, draft);
    return { ok: true, draft, check };
  } catch (err) {
    return variantFail(err);
  }
}

/**
 * Save a variant for this workspace. The draft comes back from the browser
 * (the recruiter may have edited the wording), so its shape is checked and
 * its tests run again here before anything is written.
 */
export async function saveVariantAction(slug: string, kind: string, id: string, raw: unknown): Promise<Result<{ id: string; challengeId: string | null }>> {
  try {
    const a = await writer(slug);
    const origin = await variantOrigin(kind, id);
    let draft: VariantDraft;
    try {
      if (origin.kind === "bank") draft = cleanClientDraft(raw, { kind: "bank" });
      else {
        const { mode, language } = challengeMode(origin);
        draft = cleanClientDraft(raw, { kind: "challenge", mode, language, contract: origin.step?.contract, original: origin.step ?? undefined });
      }
    } catch (err) {
      if (err instanceof VariantShapeError) throw new LibraryError(err.message);
      throw err;
    }
    const outcome = await checkDraft(origin, draft);
    const saved = await saveVariant({ workspaceId: a.workspaceId, userId: a.userId, origin, draft, outcome });
    void writeWorkspaceAuditEntry({
      workspaceId: a.workspaceId,
      actorUserId: a.userId,
      actorEmail: a.email,
      action: WORKSPACE_AUDIT_ACTIONS.QUESTION_VARIANT_CREATED,
      targetType: "questionVariant",
      targetId: saved.id,
      meta: { title: draft.title, from: origin.title, kind: origin.kind, tests: outcome.check.status === "passed" ? `${outcome.check.passed}/${outcome.check.total}` : null },
    });
    revalidatePath(`/w/${slug}/library`, "layout");
    return { ok: true, ...saved };
  } catch (err) {
    return variantFail(err);
  }
}

/** Put a saved bank variant into a questionnaire: an existing one, or a new one. */
export async function addVariantToQuestionnaireAction(slug: string, variantId: string, questionnaireId?: string): Promise<Result<{ id: string; added: boolean }>> {
  try {
    const a = await writer(slug);
    const v = await prisma.questionVariant.findFirst({
      where: { id: variantId, workspaceId: a.workspaceId, originKind: "bank" },
      select: { id: true, title: true, prompt: true, answer: true, originQuestionId: true },
    });
    if (!v) throw new LibraryError("That variant was not found.");
    const origin = await prisma.prepQuestion.findUnique({ where: { id: v.originQuestionId }, select: { technology: true, difficulty: true } });
    const item: QuestionItem = { q: v.prompt, src: `variant:${v.id}` };
    if (v.answer) item.a = v.answer;
    if (origin?.technology) item.tech = origin.technology;
    if (origin?.difficulty) item.difficulty = origin.difficulty;

    if (questionnaireId) {
      const row = await prisma.aIInterviewTemplate.findFirst({
        where: { id: questionnaireId, workspaceId: a.workspaceId, kind: "conversation" },
        select: { id: true, title: true, testsCode: true },
      });
      if (!row) throw new LibraryError("That questionnaire was not found.");
      const current = parseQuestionnaire(row.testsCode);
      if (current.some((i) => i.src === item.src)) return { ok: true, id: row.id, added: false };
      const items = validateQuestionnaire([...current, item]);
      await prisma.aIInterviewTemplate.update({ where: { id: row.id }, data: { testsCode: serializeQuestionnaire(items) } });
      audit(a, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_SAVED, row.id, { title: row.title, addedVariant: v.id });
      refresh(slug);
      return { ok: true, id: row.id, added: true };
    }
    const data = sanitize({
      title: v.title.slice(0, 80),
      brief: "A short conversation about your experience. Answer in your own words; there is no code to write.",
      roleArea: item.tech ? techLabel(item.tech) : undefined,
      minutes: 10,
      items: [item],
    });
    const id = (await prisma.aIInterviewTemplate.create({ data: { ...data, workspaceId: a.workspaceId } })).id;
    audit(a, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_SAVED, id, { title: data.title, created: true, addedVariant: v.id });
    refresh(slug);
    return { ok: true, id, added: true };
  } catch (err) {
    return fail(err);
  }
}
