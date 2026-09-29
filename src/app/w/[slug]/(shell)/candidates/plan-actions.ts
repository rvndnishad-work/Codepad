"use server";

/**
 * Server actions for interview plans: the batch Rounds tab, the default
 * plans in Settings, and skipping or adding a round for one candidate.
 * Like manage-actions, each returns a result object instead of throwing.
 */
import { revalidatePath } from "next/cache";
import { CandidateError, resolveCandidateActor } from "@/lib/crm/candidates-server";
import { settingsAccess } from "@/lib/workspace/settings-server";
import {
  addCandidateRound,
  createPlan,
  deletePlan,
  savePlan,
  setBatchPlan,
  setCandidateRoundNextStep,
  setCandidateRoundSkipped,
  setDefaultPlan,
  removeCandidateRound,
  loadPlanSources,
  type ExtraRoundInput,
  type NewPlanInput,
  type PlanSources,
  type PlanView,
} from "@/lib/interview/plans-server";
import { sendCandidateRound } from "@/lib/interview/round-send-server";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import type { NextStep, PlanInput, RoleType } from "@/lib/interview/rounds";

type ActionError = { ok: false; error: string };
export type PlanActionResult<T = object> = ({ ok: true } & T) | ActionError;

function fail(err: unknown): ActionError {
  if (err instanceof CandidateError) return { ok: false, error: err.message };
  console.error("[plan action]", err);
  return { ok: false, error: "Something went wrong. Try again." };
}

function refresh(slug: string) {
  revalidatePath(`/w/${slug}/batches`, "layout");
  revalidatePath(`/w/${slug}/candidates`, "layout");
  revalidatePath(`/w/${slug}/settings/screening-defaults`);
}

export async function createPlanAction(slug: string, input: NewPlanInput): Promise<PlanActionResult<{ plan: PlanView }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    if (input.makeDefault && !(await settingsAccess(actor.member)).canEdit) {
      throw new CandidateError(403, "Only owners and admins can set the default plan.");
    }
    const plan = await createPlan(actor, input);
    refresh(slug);
    return { ok: true, plan };
  } catch (err) {
    return fail(err);
  }
}

export async function savePlanAction(slug: string, planId: string, input: PlanInput): Promise<PlanActionResult<{ plan: PlanView }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const { plan } = await savePlan(actor, planId, input);
    refresh(slug);
    return { ok: true, plan };
  } catch (err) {
    return fail(err);
  }
}

export async function deletePlanAction(slug: string, planId: string): Promise<PlanActionResult> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    await deletePlan(actor, planId);
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setBatchPlanAction(slug: string, batchId: string, planId: string | null): Promise<PlanActionResult<{ changed: number }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const r = await setBatchPlan(actor, batchId, planId);
    refresh(slug);
    return { ok: true, changed: r.changed };
  } catch (err) {
    return fail(err);
  }
}

export async function setDefaultPlanAction(slug: string, roleType: RoleType, planId: string | null): Promise<PlanActionResult> {
  try {
    const actor = await resolveCandidateActor(slug);
    if (!(await settingsAccess(actor.member)).canEdit) throw new CandidateError(403, "Only owners and admins can set the default plan.");
    await setDefaultPlan(actor, roleType, planId);
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setRoundSkippedAction(slug: string, roundId: string, skipped: boolean): Promise<PlanActionResult> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    await setCandidateRoundSkipped(actor, roundId, skipped);
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function addRoundAction(slug: string, candidateId: string, input: ExtraRoundInput): Promise<PlanActionResult<{ id: string }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const r = await addCandidateRound(actor, candidateId, input);
    refresh(slug);
    return { ok: true, id: r.id };
  } catch (err) {
    return fail(err);
  }
}

export async function removeRoundAction(slug: string, roundId: string): Promise<PlanActionResult> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    await removeCandidateRound(actor, roundId);
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Move on, stop here, or undecided again, after a round with a result. */
export async function setRoundNextStepAction(slug: string, roundId: string, step: NextStep | null): Promise<PlanActionResult> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:manage_pipeline");
    await setCandidateRoundNextStep(actor, roundId, step);
    refresh(slug);
    revalidatePath(`/w/${slug}/interviews`, "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** The AI screenings and take-home templates a plan's rounds can send, for the plan editor. */
export async function planSourcesAction(slug: string): Promise<PlanActionResult<{ sources: PlanSources }>> {
  try {
    const actor = await resolveCandidateActor(slug);
    return { ok: true, sources: await loadPlanSources(actor.workspaceId) };
  } catch (err) {
    return fail(err);
  }
}

/** Sends an AI interview or take-home round with what its plan round is set up to send. */
export async function sendRoundAction(slug: string, roundId: string): Promise<PlanActionResult<{ emailed: boolean; reused: boolean }>> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const round = await prisma.candidateRound.findFirst({ where: { id: roundId, candidate: { workspaceId: actor.workspaceId } }, select: { kind: true } });
    if (!round) throw new CandidateError(404, "That round was not found.");
    const needs = round.kind === "take_home" ? "takehome:create" : "interview:conduct";
    if (!(await canMember(actor.member, needs))) throw new CandidateError(403, `You do not have permission to send ${round.kind === "take_home" ? "take-homes" : "AI interviews"}.`);
    const res = await sendCandidateRound(actor.workspaceId, roundId, { userId: actor.actorUserId, email: actor.actorEmail });
    if (!res.ok) throw new CandidateError(400, res.error);
    refresh(slug);
    revalidatePath(`/w/${slug}/ai-interviews`, "layout");
    revalidatePath(`/w/${slug}/take-homes`, "layout");
    return { ok: true, emailed: res.emailed, reused: res.reused };
  } catch (err) {
    return fail(err);
  }
}
