/**
 * Keeps candidates' rounds (CandidateRound) in step with the interview plan
 * they follow. Split from plans-server so the candidate roster code and the
 * ATS importer can call it without pulling in plan editing.
 *
 * Which plan a candidate follows:
 *   - their batch's plan, when the batch has one;
 *   - otherwise the workspace default for its hiring type, when the
 *     workspace hires for one kind of role (technical or non-technical);
 *   - otherwise none. A "both" workspace has no single default, so people
 *     with no batch plan follow nothing until they join one.
 *
 * Candidates who already have a decision (Passed, Not passed) or are
 * archived are left as they are: their rounds are a record by then.
 *
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalizeHiringType, normalizeRoleType, syncRounds, type CandidateRoundRow, type PlanRoundKind } from "@/lib/interview/rounds";

type Tx = Prisma.TransactionClient;

const ROUND_SELECT = { id: true, order: true, kind: true, name: true, format: true, durationMin: true, passMark: true, required: true } as const;

const OPEN_STAGES = ["NEW", "SCREENING"];

/**
 * Brings each candidate's rounds in line with the plan they now follow.
 * Candidates with a decision or archived are skipped. Returns how many
 * candidates had anything change.
 */
export async function syncCandidateRounds(workspaceId: string, candidateIds: string[]): Promise<number> {
  if (!candidateIds.length) return 0;
  const [ws, defaults, candidates] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { hiringType: true } }),
    prisma.interviewPlan.findMany({ where: { workspaceId, isDefault: true }, select: { id: true, roleType: true } }),
    prisma.candidate.findMany({
      where: { workspaceId, id: { in: candidateIds }, stage: { in: OPEN_STAGES }, NOT: { status: "archived" } },
      select: {
        id: true,
        planId: true,
        batch: { select: { planId: true } },
        rounds: {
          select: { id: true, planRoundId: true, order: true, kind: true, name: true, format: true, durationMin: true, passMark: true, required: true, skipped: true, nextStep: true, _count: { select: { sessions: true, aiSessions: true } } },
        },
      },
    }),
  ]);
  const hiring = normalizeHiringType(ws?.hiringType);
  const fallback = hiring === "both" ? null : (defaults.find((d) => normalizeRoleType(d.roleType) === hiring)?.id ?? null);

  const planIds = new Set<string>();
  for (const c of candidates) {
    const id = c.batch?.planId ?? fallback;
    if (id) planIds.add(id);
  }
  const plans = new Map(
    (
      await prisma.interviewPlan.findMany({
        where: { workspaceId, id: { in: [...planIds] } },
        select: { id: true, rounds: { select: ROUND_SELECT, orderBy: { order: "asc" } } },
      })
    ).map((p) => [p.id, p.rounds.map((r) => ({ ...r, kind: r.kind as PlanRoundKind }))]),
  );

  let changed = 0;
  for (const c of candidates) {
    const planId = c.batch?.planId ?? fallback;
    const planRounds = (planId && plans.get(planId)) || [];
    const current: CandidateRoundRow[] = c.rounds.map((r) => ({
      id: r.id,
      planRoundId: r.planRoundId,
      order: r.order,
      kind: r.kind as PlanRoundKind,
      format: r.format,
      skipped: r.skipped,
      held: r._count.sessions + r._count.aiSessions > 0 || !!r.nextStep,
    }));
    const diff = syncRounds(planRounds, current);
    // Leave out updates that would write what is already there.
    const byId = new Map(c.rounds.map((r) => [r.id, r]));
    diff.update = diff.update.filter((u) => {
      const r = byId.get(u.id)!;
      if (u.order !== r.order || (u.planRoundId && u.planRoundId !== r.planRoundId)) return true;
      const f = u.fields;
      return !!f && (f.name !== r.name || f.kind !== r.kind || f.format !== r.format || f.durationMin !== r.durationMin || f.passMark !== r.passMark || f.required !== r.required);
    });
    const planChanged = (planId ?? null) !== c.planId;
    if (!planChanged && !diff.create.length && !diff.remove.length && !diff.update.length) continue;
    await prisma.$transaction(async (tx) => {
      await applySync(tx, c.id, diff);
      if (planChanged) await tx.candidate.update({ where: { id: c.id }, data: { planId: planId ?? null } });
    });
    changed++;
  }
  return changed;
}

async function applySync(tx: Tx, candidateId: string, diff: ReturnType<typeof syncRounds>) {
  if (diff.remove.length) await tx.candidateRound.deleteMany({ where: { id: { in: diff.remove }, candidateId } });
  for (const u of diff.update) {
    await tx.candidateRound.update({
      where: { id: u.id },
      data: { order: u.order, ...(u.planRoundId ? { planRoundId: u.planRoundId } : {}), ...(u.fields ?? {}) },
    });
  }
  if (diff.create.length) {
    await tx.candidateRound.createMany({ data: diff.create.map((r) => ({ ...r, candidateId })) });
  }
}


/** Open candidates who follow the workspace default (no batch plan). */
export async function candidatesOnDefault(workspaceId: string): Promise<string[]> {
  const rows = await prisma.candidate.findMany({
    where: { workspaceId, stage: { in: OPEN_STAGES }, NOT: { status: "archived" }, OR: [{ batchId: null }, { batch: { planId: null } }] },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** After the hiring type changes: people with no batch plan move to the matching default (or none). */
export async function resyncAfterHiringTypeChange(workspaceId: string) {
  return syncCandidateRounds(workspaceId, await candidatesOnDefault(workspaceId));
}
