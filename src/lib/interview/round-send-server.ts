/**
 * AI interview and take-home rounds: sending them, and tying what was sent
 * to the round it belongs to.
 *
 * - `linkSessionsToRounds`: after any AI screening or take-home send (the
 *   composers, an ATS import), each new session joins the candidate's first
 *   open round of that kind, so the round shows Invited, In progress,
 *   Submitted and then its result. A send with no open round stays outside
 *   the plan.
 * - `sendCandidateRound`: one click from the candidate's timeline. Sends the
 *   AI screening or take-home template the plan round was set up with.
 * - `autoSendFirstRounds`: when someone joins a batch whose plan has "send
 *   the first round by itself" on, sends that first round. Never anything
 *   later: every later round waits for a recruiter.
 *
 * Linking and auto-send never fail the action that triggered them; problems
 * are logged (and, for auto-send, audited) instead.
 *
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { parseRoundSettings, pickOpenRound, roundSource, type PlanRoundKind } from "@/lib/interview/rounds";

const OPEN_STAGES = ["NEW", "SCREENING"];

type Sendable = Exclude<PlanRoundKind, "interview">;
type Actor = { userId: string; email: string | null };

/**
 * Links each new session to its candidate's open round of `kind`. `wanted`
 * names a round per candidate id when the sender picked one. Returns how
 * many sessions were linked.
 */
export async function linkSessionsToRounds(
  workspaceId: string,
  kind: Sendable,
  pairs: { candidateId: string | null | undefined; sessionId: string }[],
  wanted: Record<string, string> = {},
): Promise<number> {
  try {
    const ids = [...new Set(pairs.flatMap((p) => (p.candidateId ? [p.candidateId] : [])))];
    if (!ids.length) return 0;
    const candidates = await prisma.candidate.findMany({
      where: { workspaceId, id: { in: ids }, stage: { in: OPEN_STAGES }, NOT: { status: "archived" }, rounds: { some: { kind } } },
      select: {
        id: true,
        rounds: { select: { id: true, order: true, kind: true, skipped: true, nextStep: true, _count: { select: { sessions: true, aiSessions: true } } } },
      },
    });
    const byId = new Map(
      candidates.map((c) => [c.id, c.rounds.map((r) => ({ id: r.id, order: r.order, kind: r.kind, skipped: r.skipped, nextStep: r.nextStep, linked: r._count.sessions + r._count.aiSessions }))]),
    );
    let linked = 0;
    for (const p of pairs) {
      const rounds = p.candidateId ? byId.get(p.candidateId) : undefined;
      if (!rounds) continue;
      const roundId = pickOpenRound(rounds, kind, wanted[p.candidateId!]);
      if (!roundId) continue;
      const res =
        kind === "ai_interview"
          ? await prisma.aIInterviewSession.updateMany({ where: { id: p.sessionId, workspaceId, candidateRoundId: null }, data: { candidateRoundId: roundId } })
          : await prisma.interviewSession.updateMany({ where: { id: p.sessionId, workspaceId, candidateRoundId: null }, data: { candidateRoundId: roundId } });
      if (res.count) {
        linked++;
        // A second send in the same batch goes to the next open round, not this one.
        const r = rounds.find((x) => x.id === roundId);
        if (r) r.linked++;
      }
    }
    return linked;
  } catch (err) {
    console.error("[rounds] linking sent sessions to rounds failed:", err);
    return 0;
  }
}

export type RoundSendResult = { ok: true; sessionId: string; emailed: boolean; reused: boolean } | { ok: false; error: string };

/**
 * Sends one AI interview or take-home round with what its plan round is set
 * up to send. `actor` is null for auto-send, which sends as the plan's
 * workspace (take-homes then come from whoever connected the ATS, else the
 * owner, as ATS sends do).
 */
export async function sendCandidateRound(workspaceId: string, roundId: string, actor: Actor | null, via: "manual" | "auto" = "manual"): Promise<RoundSendResult> {
  const round = await prisma.candidateRound.findFirst({
    where: { id: roundId, candidate: { workspaceId } },
    select: {
      id: true,
      kind: true,
      name: true,
      skipped: true,
      nextStep: true,
      planRound: { select: { settingsJson: true } },
      candidate: { select: { id: true, name: true, email: true, stage: true, status: true } },
      _count: { select: { sessions: true, aiSessions: true } },
    },
  });
  if (!round) return { ok: false, error: "That round was not found." };
  const c = round.candidate;
  if (round.kind !== "ai_interview" && round.kind !== "take_home") return { ok: false, error: "Live interviews are scheduled, not sent." };
  if (!OPEN_STAGES.includes(c.stage) || c.status === "archived") return { ok: false, error: `${c.name} already has a decision, so their rounds are closed.` };
  if (round.skipped) return { ok: false, error: `${round.name} is skipped for ${c.name}.` };
  if (round._count.sessions + round._count.aiSessions > 0) return { ok: false, error: `${round.name} was already sent to ${c.name}.` };
  const email = c.email?.trim().toLowerCase();
  if (!email) return { ok: false, error: `${c.name} has no email address.` };
  const source = roundSource(round.kind, parseRoundSettings(round.planRound?.settingsJson));
  if (!source) return { ok: false, error: `Pick what ${round.name} sends on the plan first.` };

  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true } });
  if (!ws) return { ok: false, error: "Workspace not found." };
  const { sendAiScreening, sendTakeHome } = await import("@/lib/ats/dispatch");
  const person = { id: c.id, name: c.name, email };
  const res =
    round.kind === "ai_interview"
      ? await sendAiScreening(ws, source, person, { roundId: round.id })
      : await sendTakeHome(ws, source, person, { actor, roundId: round.id });
  if (!res.ok) return res;

  const { advanceCandidateStage } = await import("@/lib/crm/advance");
  await advanceCandidateStage({
    workspaceId,
    candidateId: c.id,
    toStage: "SCREENING",
    source: via === "auto" ? "auto:plan-first-round" : "round-send",
    actorUserId: actor?.userId ?? null,
    actorEmail: actor?.email ?? null,
  });
  void writeWorkspaceAuditEntry({
    workspaceId,
    actorUserId: actor?.userId ?? null,
    actorEmail: actor?.email ?? null,
    action: WORKSPACE_AUDIT_ACTIONS.CANDIDATE_ROUND_SENT,
    targetType: "candidate",
    targetId: c.id,
    meta: { candidateName: c.name, round: round.name, kind: round.kind, auto: via === "auto", emailed: res.emailed, reused: !!res.reused },
  });
  return { ok: true, sessionId: res.sessionId, emailed: res.emailed, reused: !!res.reused };
}

/**
 * For people who just joined a batch: sends the first round of their plan
 * when the plan says to, the round is an AI interview or take-home set up
 * with what to send, and nothing has been sent for it yet.
 */
export async function autoSendFirstRounds(workspaceId: string, candidateIds: string[], actor: Actor | null): Promise<{ sent: number; failed: { name: string; error: string }[] }> {
  const out = { sent: 0, failed: [] as { name: string; error: string }[] };
  if (!candidateIds.length) return out;
  try {
    const candidates = await prisma.candidate.findMany({
      where: { workspaceId, id: { in: [...new Set(candidateIds)] }, stage: { in: OPEN_STAGES }, NOT: { status: "archived" }, plan: { autoSendFirst: true } },
      select: {
        id: true,
        name: true,
        rounds: {
          where: { skipped: false },
          orderBy: { order: "asc" },
          take: 1,
          select: { id: true, kind: true, nextStep: true, _count: { select: { sessions: true, aiSessions: true } } },
        },
      },
    });
    for (const c of candidates) {
      const first = c.rounds[0];
      if (!first || first.kind === "interview" || first.nextStep || first._count.sessions + first._count.aiSessions > 0) continue;
      const res = await sendCandidateRound(workspaceId, first.id, actor, "auto");
      if (res.ok) out.sent++;
      else {
        out.failed.push({ name: c.name, error: res.error });
        console.error(`[rounds] auto-send of the first round for ${c.id} failed: ${res.error}`);
      }
    }
  } catch (err) {
    console.error("[rounds] auto-send of first rounds failed:", err);
  }
  return out;
}
