/**
 * Interview plans: making them, editing them, giving one to a batch or
 * making it the workspace default, and keeping every candidate's copy of
 * the rounds (CandidateRound) in step after each change.
 *
 * Which plan a candidate follows, and what a sync may change, is described
 * in plans-sync-server.ts.
 *
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { CandidateError, type CandidateActor } from "@/lib/crm/candidates-server";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { candidatesOnDefault, syncCandidateRounds } from "@/lib/interview/plans-sync-server";
import {
  defaultDuration,
  formatsFor,
  hasResult,
  normalizeHiringType,
  normalizeRoleType,
  roleTypesFor,
  roundAfter,
  roundAllowed,
  ROUND_NAME_MAX,
  templateByKey,
  validatePlan,
  type HiringType,
  type NextStep,
  parseRoundSettings,
  type CleanPlan,
  type PlanInput,
  type PlanRoundKind,
  type PlanRoundRow,
  type RoleType,
} from "@/lib/interview/rounds";

type Tx = Prisma.TransactionClient;

function audit(actor: CandidateActor, action: string, targetType: string, targetId: string | null, meta: Record<string, unknown>) {
  return writeWorkspaceAuditEntry({
    workspaceId: actor.workspaceId,
    actorUserId: actor.actorUserId,
    actorEmail: actor.actorEmail,
    action,
    targetType,
    targetId,
    meta,
  });
}

/* ── Reading ─────────────────────────────────────────────────────────── */

const ROUND_SELECT = {
  id: true,
  order: true,
  kind: true,
  name: true,
  format: true,
  durationMin: true,
  passMark: true,
  required: true,
  settingsJson: true,
} as const;

export type PlanView = {
  id: string;
  name: string;
  roleType: RoleType;
  isDefault: boolean;
  continuesInAts: boolean;
  autoSendFirst: boolean;
  templateKey: string | null;
  rounds: (PlanRoundRow & { id: string })[];
  batches: { id: string; name: string }[];
  candidateCount: number;
  updatedAt: string;
};

const PLAN_SELECT = {
  id: true,
  name: true,
  roleType: true,
  isDefault: true,
  continuesInAts: true,
  autoSendFirst: true,
  templateKey: true,
  updatedAt: true,
  rounds: { select: ROUND_SELECT, orderBy: { order: "asc" as const } },
  batches: { select: { id: true, name: true }, orderBy: { name: "asc" as const } },
  _count: { select: { candidates: true } },
} satisfies Prisma.InterviewPlanSelect;

type PlanRow = Prisma.InterviewPlanGetPayload<{ select: typeof PLAN_SELECT }>;

function toView(p: PlanRow): PlanView {
  return {
    id: p.id,
    name: p.name,
    roleType: normalizeRoleType(p.roleType),
    isDefault: p.isDefault,
    continuesInAts: p.continuesInAts,
    autoSendFirst: p.autoSendFirst,
    templateKey: p.templateKey,
    rounds: p.rounds.map((r) => ({ ...r, kind: r.kind as PlanRoundKind })),
    batches: p.batches,
    candidateCount: p._count.candidates,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function listPlans(workspaceId: string): Promise<PlanView[]> {
  const rows = await prisma.interviewPlan.findMany({ where: { workspaceId }, select: PLAN_SELECT, orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
  return rows.map(toView);
}

export async function getPlan(workspaceId: string, planId: string): Promise<PlanView | null> {
  const row = await prisma.interviewPlan.findFirst({ where: { id: planId, workspaceId }, select: PLAN_SELECT });
  return row ? toView(row) : null;
}

export async function workspaceHiringType(workspaceId: string): Promise<HiringType> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { hiringType: true } });
  return normalizeHiringType(ws?.hiringType);
}

async function loadPlan(actor: CandidateActor, planId: string) {
  const plan = await prisma.interviewPlan.findFirst({ where: { id: planId, workspaceId: actor.workspaceId }, select: PLAN_SELECT });
  if (!plan) throw new CandidateError(404, "That interview plan was not found.");
  return plan;
}

async function assertRoleType(actor: CandidateActor, roleType: RoleType) {
  const hiring = await workspaceHiringType(actor.workspaceId);
  if (!roleTypesFor(hiring).includes(roleType)) {
    throw new CandidateError(
      400,
      roleType === "technical"
        ? "This workspace hires for non-technical roles. Change it in Settings, General to make technical plans."
        : "This workspace hires for technical roles. Change it in Settings, General to make non-technical plans.",
    );
  }
  return hiring;
}

const OPEN_STAGES = ["NEW", "SCREENING"];

/** Every open candidate who follows `planId`, or would through a batch or the default. */
async function candidatesOnPlan(workspaceId: string, planId: string, alsoDefault: boolean): Promise<string[]> {
  const rows = await prisma.candidate.findMany({
    where: {
      workspaceId,
      stage: { in: OPEN_STAGES },
      NOT: { status: "archived" },
      OR: [{ planId }, { pickedPlanId: planId }, { batch: { planId } }, ...(alsoDefault ? [{ batchId: null }, { batch: { planId: null } }] : [])],
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Removes candidates' unheld copies of plan rounds about to be deleted, so
 * they are not left behind looking like rounds added by hand. Held copies
 * stay, as history.
 */
async function dropUnheldCopies(tx: Tx, planRoundIds: string[]) {
  if (!planRoundIds.length) return;
  await tx.candidateRound.deleteMany({
    where: {
      planRoundId: { in: planRoundIds },
      nextStep: null,
      sessions: { none: {} },
      aiSessions: { none: {} },
      // Decided candidates keep their rounds as a record.
      candidate: { stage: { in: OPEN_STAGES }, NOT: { status: "archived" } },
    },
  });
}

/** The AI screenings and take-home templates a plan's rounds send must be this workspace's own. */
async function assertSources(workspaceId: string, rounds: CleanPlan["rounds"]) {
  const ai = new Set<string>();
  const th = new Set<string>();
  for (const r of rounds) {
    const s = parseRoundSettings(r.settingsJson);
    if (s.aiScreeningId) ai.add(s.aiScreeningId);
    if (s.takeHomeTemplateId) th.add(s.takeHomeTemplateId);
  }
  const [aiFound, thFound] = await Promise.all([
    ai.size ? prisma.aIScreeningBatch.count({ where: { id: { in: [...ai] }, workspaceId } }) : 0,
    th.size ? prisma.takeHomeTemplate.count({ where: { id: { in: [...th] }, workspaceId } }) : 0,
  ]);
  if (aiFound !== ai.size) throw new CandidateError(400, "One of the AI screenings picked for a round no longer exists. Pick another.");
  if (thFound !== th.size) throw new CandidateError(400, "One of the take-home templates picked for a round no longer exists. Pick another.");
}

/** What a plan's AI interview and take-home rounds can send: this workspace's AI screenings and take-home templates. */
export async function loadPlanSources(workspaceId: string) {
  const [ai, th] = await Promise.all([
    prisma.aIScreeningBatch.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, positionTitle: true, status: true } }),
    prisma.takeHomeTemplate.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, name: true } }),
  ]);
  return {
    ai: ai.map((a) => ({ id: a.id, name: a.positionTitle, closed: a.status !== "ACTIVE" })),
    takeHome: th.map((t) => ({ id: t.id, name: t.name })),
  };
}
export type PlanSources = Awaited<ReturnType<typeof loadPlanSources>>;

/* ── Plans ───────────────────────────────────────────────────────────── */

export type NewPlanInput = {
  /** The rounds as the recruiter built them (often from a template first). */
  plan: PlanInput;
  /** Which built-in template it started from, if any. */
  templateKey?: string | null;
  /** Give the new plan to this batch. */
  batchId?: string | null;
  /** Make it the workspace default for its role type. */
  makeDefault?: boolean;
};

export async function createPlan(actor: CandidateActor, input: NewPlanInput): Promise<PlanView> {
  const checked = validatePlan({ ...input.plan, rounds: (input.plan?.rounds ?? []).map((r) => ({ ...r, id: null })) });
  if (!checked.ok) throw new CandidateError(400, checked.error);
  const clean = checked.plan;
  await assertRoleType(actor, clean.roleType);
  await assertSources(actor.workspaceId, clean.rounds);
  const templateKey = input.templateKey && templateByKey(input.templateKey) ? input.templateKey : null;
  const batch = input.batchId
    ? await prisma.candidateBatch.findFirst({ where: { id: input.batchId, workspaceId: actor.workspaceId }, select: { id: true, name: true, planId: true } })
    : null;
  if (input.batchId && !batch) throw new CandidateError(404, "Batch not found.");

  const plan = await prisma.$transaction(async (tx) => {
    if (input.makeDefault) await tx.interviewPlan.updateMany({ where: { workspaceId: actor.workspaceId, roleType: clean.roleType, isDefault: true }, data: { isDefault: false } });
    const created = await tx.interviewPlan.create({
      data: {
        workspaceId: actor.workspaceId,
        name: clean.name,
        roleType: clean.roleType,
        continuesInAts: clean.continuesInAts,
        autoSendFirst: clean.autoSendFirst,
        isDefault: !!input.makeDefault,
        templateKey,
        createdById: actor.actorUserId,
        rounds: { create: clean.rounds.map((r) => ({ order: r.order, kind: r.kind, name: r.name, format: r.format, durationMin: r.durationMin, passMark: r.passMark, required: r.required, settingsJson: r.settingsJson })) },
      },
      select: { id: true },
    });
    if (batch) await tx.candidateBatch.update({ where: { id: batch.id }, data: { planId: created.id } });
    return created;
  });

  void audit(actor, WORKSPACE_AUDIT_ACTIONS.INTERVIEW_PLAN_CREATED, "interviewPlan", plan.id, { name: clean.name, template: templateKey, rounds: clean.rounds.length, batchName: batch?.name ?? null });
  if (batch) {
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.BATCH_PLAN_SET, "candidateBatch", batch.id, { name: batch.name, planName: clean.name });
    await syncCandidateRounds(actor.workspaceId, await batchCandidates(actor.workspaceId, batch.id));
  }
  if (input.makeDefault) await syncCandidateRounds(actor.workspaceId, await candidatesOnDefault(actor.workspaceId));
  return (await getPlan(actor.workspaceId, plan.id))!;
}

async function batchCandidates(workspaceId: string, batchId: string): Promise<string[]> {
  const rows = await prisma.candidate.findMany({ where: { workspaceId, batchId }, select: { id: true } });
  return rows.map((r) => r.id);
}

/**
 * Saves a plan's name, ATS switch and rounds. Round ids that are kept stay
 * matched to candidates' copies; rounds left out are deleted. Then every
 * candidate on the plan is brought in step (rounds already held are never
 * rewritten).
 */
export async function savePlan(actor: CandidateActor, planId: string, input: Omit<PlanInput, "roleType"> & { roleType?: RoleType }): Promise<{ plan: PlanView; candidatesUpdated: number }> {
  const current = await loadPlan(actor, planId);
  const roleType = normalizeRoleType(input.roleType ?? current.roleType);
  if (roleType !== current.roleType) await assertRoleType(actor, roleType);
  const checked = validatePlan({ ...input, roleType });
  if (!checked.ok) throw new CandidateError(400, checked.error);
  const clean = checked.plan;
  await assertSources(actor.workspaceId, clean.rounds);

  const existing = new Set(current.rounds.map((r) => r.id));
  for (const r of clean.rounds) if (r.id && !existing.has(r.id)) throw new CandidateError(409, "This plan changed while you were editing. Reload and try again.");
  const kept = new Set(clean.rounds.map((r) => r.id).filter(Boolean));
  const removed = current.rounds.filter((r) => !kept.has(r.id)).map((r) => r.id);

  await prisma.$transaction(async (tx) => {
    await dropUnheldCopies(tx, removed);
    if (removed.length) await tx.interviewPlanRound.deleteMany({ where: { id: { in: removed }, planId } });
    if (roleType !== current.roleType && current.isDefault) {
      // A default belongs to one role type; moving it keeps one default per type.
      await tx.interviewPlan.updateMany({ where: { workspaceId: actor.workspaceId, roleType, isDefault: true, NOT: { id: planId } }, data: { isDefault: false } });
    }
    await tx.interviewPlan.update({ where: { id: planId }, data: { name: clean.name, roleType, continuesInAts: clean.continuesInAts, autoSendFirst: clean.autoSendFirst } });
    for (const r of clean.rounds) {
      const { id, ...data } = r;
      if (id) await tx.interviewPlanRound.update({ where: { id }, data });
      else await tx.interviewPlanRound.create({ data: { ...data, planId } });
    }
  });

  const changes: string[] = [];
  if (clean.name !== current.name) changes.push("name");
  if (clean.continuesInAts !== current.continuesInAts) changes.push("ATS hand-off");
  if (clean.autoSendFirst !== current.autoSendFirst) changes.push("send first round by itself");
  if (roleType !== current.roleType) changes.push("role type");
  changes.push("rounds");
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.INTERVIEW_PLAN_UPDATED, "interviewPlan", planId, { name: clean.name, fields: changes, rounds: clean.rounds.length, removedRounds: removed.length });

  const candidatesUpdated = await syncCandidateRounds(actor.workspaceId, await candidatesOnPlan(actor.workspaceId, planId, current.isDefault));
  return { plan: (await getPlan(actor.workspaceId, planId))!, candidatesUpdated };
}

export async function deletePlan(actor: CandidateActor, planId: string) {
  const current = await loadPlan(actor, planId);
  const affected = await candidatesOnPlan(actor.workspaceId, planId, current.isDefault);
  await prisma.$transaction(async (tx) => {
    await dropUnheldCopies(tx, current.rounds.map((r) => r.id));
    await tx.interviewPlan.delete({ where: { id: planId } });
  });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.INTERVIEW_PLAN_DELETED, "interviewPlan", planId, { name: current.name, batches: current.batches.length });
  await syncCandidateRounds(actor.workspaceId, affected);
  return { ok: true as const, batches: current.batches.length };
}

/** Gives a batch a plan (or none). Its open candidates follow at once. */
export async function setBatchPlan(actor: CandidateActor, batchId: string, planId: string | null) {
  const batch = await prisma.candidateBatch.findFirst({ where: { id: batchId, workspaceId: actor.workspaceId }, select: { id: true, name: true, planId: true } });
  if (!batch) throw new CandidateError(404, "Batch not found.");
  const plan = planId ? await loadPlan(actor, planId) : null;
  if (plan) await assertRoleType(actor, normalizeRoleType(plan.roleType));
  if ((batch.planId ?? null) === (planId ?? null)) return { changed: 0 };
  await prisma.candidateBatch.update({ where: { id: batchId }, data: { planId: planId ?? null } });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.BATCH_PLAN_SET, "candidateBatch", batchId, { name: batch.name, planName: plan?.name ?? null });
  const changed = await syncCandidateRounds(actor.workspaceId, await batchCandidates(actor.workspaceId, batchId));
  return { changed };
}

/**
 * Picks a plan for one person whose batch has none (from the interview
 * wizard). Their rounds are copied from it at once. A batch plan, when the
 * batch gets one later, still wins.
 */
export async function setCandidatePlan(actor: CandidateActor, candidateId: string, planId: string) {
  const c = await prisma.candidate.findFirst({
    where: { id: candidateId, workspaceId: actor.workspaceId },
    select: { id: true, name: true, stage: true, status: true, pickedPlanId: true, batch: { select: { name: true, planId: true } } },
  });
  if (!c) throw new CandidateError(404, "Candidate not found.");
  if (c.batch?.planId) throw new CandidateError(400, `${c.name} follows the plan of ${c.batch.name}. Change it on that batch.`);
  if (!OPEN_STAGES.includes(c.stage) || c.status === "archived") throw new CandidateError(400, `${c.name} already has a decision, so their rounds are kept as they are.`);
  const plan = await loadPlan(actor, planId);
  await assertRoleType(actor, normalizeRoleType(plan.roleType));
  if (c.pickedPlanId !== plan.id) {
    await prisma.candidate.update({ where: { id: c.id }, data: { pickedPlanId: plan.id } });
    void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_PLAN_SET, "candidate", c.id, { candidateName: c.name, planName: plan.name });
  }
  await syncCandidateRounds(actor.workspaceId, [c.id]);
  return { ok: true as const };
}

/** Makes a plan the default for its role type, or clears the default for `roleType`. */
export async function setDefaultPlan(actor: CandidateActor, roleType: RoleType, planId: string | null) {
  const hiring = await assertRoleType(actor, roleType);
  const plan = planId ? await loadPlan(actor, planId) : null;
  if (plan && normalizeRoleType(plan.roleType) !== roleType) throw new CandidateError(400, "That plan is for another kind of role.");
  await prisma.$transaction(async (tx) => {
    await tx.interviewPlan.updateMany({ where: { workspaceId: actor.workspaceId, roleType, isDefault: true }, data: { isDefault: false } });
    if (plan) await tx.interviewPlan.update({ where: { id: plan.id }, data: { isDefault: true } });
  });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.INTERVIEW_PLAN_DEFAULT_SET, "interviewPlan", plan?.id ?? null, { name: plan?.name ?? "no plan", roleType });
  // Only a single-type workspace uses a default for candidates with no batch plan.
  if (hiring !== "both") await syncCandidateRounds(actor.workspaceId, await candidatesOnDefault(actor.workspaceId));
  return { ok: true as const };
}

/** After the hiring type changes: people with no batch plan move to the matching default (or none). */
/* ── One candidate's rounds ──────────────────────────────────────────── */

async function loadCandidateRound(actor: CandidateActor, roundId: string) {
  const round = await prisma.candidateRound.findFirst({
    where: { id: roundId, candidate: { workspaceId: actor.workspaceId } },
    select: {
      id: true,
      name: true,
      order: true,
      skipped: true,
      nextStep: true,
      planRoundId: true,
      candidate: { select: { id: true, name: true } },
      _count: { select: { sessions: true, aiSessions: true } },
    },
  });
  if (!round) throw new CandidateError(404, "That round was not found.");
  return { ...round, held: round._count.sessions + round._count.aiSessions > 0 || !!round.nextStep };
}

/**
 * Skips a round for one person (or brings it back). A skipped round no
 * longer counts toward their progress. Rounds already held cannot be
 * skipped: their result stays part of the record.
 */
export async function setCandidateRoundSkipped(actor: CandidateActor, roundId: string, skipped: boolean) {
  const round = await loadCandidateRound(actor, roundId);
  if (skipped && round.held) throw new CandidateError(400, `${round.name} has already happened, so it cannot be skipped.`);
  if (round.skipped === skipped) return { ok: true as const };
  await prisma.candidateRound.update({ where: { id: roundId }, data: { skipped } });
  void audit(actor, skipped ? WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ROUND_SKIPPED : WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ROUND_RESTORED, "candidate", round.candidate.id, {
    candidateName: round.candidate.name,
    round: round.name,
  });
  return { ok: true as const };
}

/**
 * The recruiter's call after a round with a result: move on to the next
 * round, stop here, or (null) undecided again. Never passes or rejects the
 * candidate: stopping leads to the Not passed dialog, which the recruiter
 * confirms separately.
 */
export async function setCandidateRoundNextStep(actor: CandidateActor, roundId: string, step: NextStep | null) {
  if (step !== null && step !== "advance" && step !== "stop") throw new CandidateError(400, "Pick move on or stop.");
  const round = await loadCandidateRound(actor, roundId);
  const cand = await prisma.candidate.findFirst({ where: { id: round.candidate.id, workspaceId: actor.workspaceId }, select: { stage: true } });
  const stage = (cand?.stage ?? "").toUpperCase();
  if (stage === "PASSED" || stage === "REJECTED") throw new CandidateError(400, `${round.candidate.name} is already decided. Reopen them on their profile first.`);
  if (round.nextStep === step) return { ok: true as const };
  if (step) {
    const { loadCandidateRounds } = await import("@/lib/interview/rounds-server");
    const cr = (await loadCandidateRounds(actor.workspaceId, actor.workspaceSlug, [round.candidate.id])).get(round.candidate.id);
    const pr = cr?.progress.rounds.find((r) => r.id === roundId);
    if (!cr || !pr) throw new CandidateError(404, "That round was not found.");
    if (!hasResult(pr.state)) throw new CandidateError(400, `${round.name} has no result yet.`);
    if (step === "advance" && !roundAfter(cr.progress, roundId)) {
      throw new CandidateError(400, `${round.name} is their last round. Pass them or not on their profile.`);
    }
  }
  await prisma.candidateRound.update({
    where: { id: roundId },
    data: { nextStep: step, decidedById: step ? actor.actorUserId : null, decidedAt: step ? new Date() : null },
  });
  const action = step === "advance" ? WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ROUND_MOVED_ON : step === "stop" ? WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ROUND_STOPPED : WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ROUND_NEXT_STEP_CLEARED;
  void audit(actor, action, "candidate", round.candidate.id, { candidateName: round.candidate.name, round: round.name });
  return { ok: true as const };
}

export type ExtraRoundInput = { kind: PlanRoundKind; name: string; format?: string | null; durationMin?: number | null; required?: boolean };

/** Adds a round for one person only, at the end of their rounds. */
export async function addCandidateRound(actor: CandidateActor, candidateId: string, input: ExtraRoundInput) {
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, workspaceId: actor.workspaceId },
    select: { id: true, name: true, plan: { select: { roleType: true } }, _count: { select: { rounds: true } } },
  });
  if (!candidate) throw new CandidateError(404, "Candidate not found.");
  const hiring = await workspaceHiringType(actor.workspaceId);
  const roleType = candidate.plan ? normalizeRoleType(candidate.plan.roleType) : hiring === "non_technical" ? "non_technical" : "technical";
  const kind = input.kind;
  if (kind !== "ai_interview" && kind !== "take_home" && kind !== "interview") throw new CandidateError(400, "Pick a kind of round.");
  const name = (input.name ?? "").trim();
  if (!name) throw new CandidateError(400, "Give the round a name.");
  if (name.length > ROUND_NAME_MAX) throw new CandidateError(400, `Keep the round name under ${ROUND_NAME_MAX} characters.`);
  const format = kind === "interview" ? (input.format ?? null) : null;
  if (!roundAllowed(roleType, { kind, format })) {
    throw new CandidateError(400, kind === "interview" && format && !formatsFor(roleType).includes(format as never) ? "Non-technical plans have no coding rounds." : "Pick a format for the interview.");
  }
  const count = candidate._count.rounds;
  if (count >= 20) throw new CandidateError(400, "This candidate already has 20 rounds.");
  const round = await prisma.candidateRound.create({
    data: {
      candidateId,
      order: count + 1,
      kind,
      name,
      format,
      durationMin: input.durationMin ?? defaultDuration(kind, format),
      required: input.required !== false,
    },
    select: { id: true },
  });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ROUND_ADDED, "candidate", candidateId, { candidateName: candidate.name, round: name });
  return round;
}

/**
 * Removes a round added by hand that has not happened. Rounds from the plan
 * are skipped instead, so the plan still knows about them.
 */
export async function removeCandidateRound(actor: CandidateActor, roundId: string) {
  const round = await loadCandidateRound(actor, roundId);
  if (round.planRoundId) throw new CandidateError(400, "Rounds from the plan can be skipped, not removed.");
  if (round.held) throw new CandidateError(400, `${round.name} has already happened, so it stays on the record.`);
  await prisma.$transaction(async (tx) => {
    await tx.candidateRound.delete({ where: { id: roundId } });
    const rest = await tx.candidateRound.findMany({ where: { candidateId: round.candidate.id }, select: { id: true, order: true }, orderBy: { order: "asc" } });
    for (const [i, r] of rest.entries()) if (r.order !== i + 1) await tx.candidateRound.update({ where: { id: r.id }, data: { order: i + 1 } });
  });
  void audit(actor, WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ROUND_REMOVED, "candidate", round.candidate.id, { candidateName: round.candidate.name, round: round.name });
  return { ok: true as const };
}
