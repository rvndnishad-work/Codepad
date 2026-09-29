/**
 * Loads candidates' interview rounds with where each one stands, for the
 * pages that show them (candidate profile, Interviews list, wizard). The
 * state of a round comes from the results of the interviews, take-homes and
 * AI interviews linked to it (candidateRoundId), read through the same
 * normalised results the Candidates tab uses.
 *
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { loadCandidateResults } from "@/lib/crm/results-server";
import type { CandidateResult } from "@/lib/crm/results";
import {
  attemptFromResult,
  normalizeHiringType,
  normalizeRoleType,
  planProgress,
  type Attempt,
  type NextStep,
  type PlanProgress,
  type PlanRoundKind,
  type RoleType,
} from "@/lib/interview/rounds";

export type CandidateRounds = {
  candidateId: string;
  planName: string | null;
  roleType: RoleType;
  progress: PlanProgress;
  /** Per round id: format, whether it came from the plan, and whether it has happened. */
  meta: Map<string, { format: string | null; manual: boolean; held: boolean }>;
  /** Interview or AI interview id to the round it belongs to. */
  roundOfSession: Map<string, string>;
};

export async function loadCandidateRounds(workspaceId: string, workspaceSlug: string, candidateIds: string[], stages?: Map<string, string>): Promise<Map<string, CandidateRounds>> {
  const out = new Map<string, CandidateRounds>();
  const ids = [...new Set(candidateIds)];
  if (!ids.length) return out;
  const [ws, candidates] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { hiringType: true } }),
    prisma.candidate.findMany({
      where: { workspaceId, id: { in: ids } },
      select: {
        id: true,
        stage: true,
        plan: { select: { name: true, roleType: true } },
        rounds: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            kind: true,
            name: true,
            format: true,
            required: true,
            skipped: true,
            nextStep: true,
            planRoundId: true,
            sessions: { select: { id: true, status: true, verdict: true } },
            aiSessions: { select: { id: true } },
          },
        },
      },
    }),
  ]);
  const withRounds = candidates.filter((c) => c.rounds.length > 0);
  const results: Map<string, CandidateResult[]> = withRounds.length ? await loadCandidateResults(workspaceId, workspaceSlug, withRounds.map((c) => c.id)) : new Map();
  const hiring = normalizeHiringType(ws?.hiringType);

  for (const c of candidates) {
    const byId = new Map((results.get(c.id) ?? []).map((r) => [r.id, r]));
    const roundOfSession = new Map<string, string>();
    const meta: CandidateRounds["meta"] = new Map();
    const inputs = c.rounds.map((r) => {
      const attempts: Attempt[] = [];
      for (const s of r.sessions) {
        roundOfSession.set(s.id, r.id);
        const res = byId.get(s.id);
        if (res) attempts.push(attemptFromResult(res, { status: s.status, verdict: s.verdict }));
      }
      for (const s of r.aiSessions) {
        roundOfSession.set(s.id, r.id);
        const res = byId.get(s.id);
        if (res) attempts.push(attemptFromResult(res));
      }
      meta.set(r.id, { format: r.format, manual: !r.planRoundId, held: r.sessions.length + r.aiSessions.length > 0 || !!r.nextStep });
      return {
        id: r.id,
        order: r.order,
        kind: r.kind as PlanRoundKind,
        name: r.name,
        format: r.format,
        required: r.required,
        skipped: r.skipped,
        nextStep: (r.nextStep as NextStep | null) ?? null,
        attempts,
      };
    });
    out.set(c.id, {
      candidateId: c.id,
      planName: c.plan?.name ?? null,
      roleType: c.plan ? normalizeRoleType(c.plan.roleType) : hiring === "non_technical" ? "non_technical" : "technical",
      progress: planProgress(inputs, stages?.get(c.id) ?? c.stage),
      meta,
      roundOfSession,
    });
  }
  return out;
}
