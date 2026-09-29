/**
 * Candidate-side access to a theory round, shared by the theory routes
 * (server-only). Authorised by the invite token like the chat route.
 */
import { prisma } from "@/lib/prisma";
import { resolveSessionRounds } from "@/lib/ai-interview/rounds";
import { parseTheoryRound, type TheoryRoundData } from "@/lib/ai-interview/theory";

type SessionWithRounds = NonNullable<Awaited<ReturnType<typeof findSession>>>;
type Round = SessionWithRounds["rounds"][number];

function findSession(inviteToken: string) {
  return prisma.aIInterviewSession.findUnique({ where: { inviteToken }, include: { rounds: true } });
}

export type TheoryAccess =
  | { ok: true; session: SessionWithRounds; round: Round; data: TheoryRoundData }
  | { ok: false; status: number; body: { error: string; inviteExpired?: boolean; deadlineExpired?: boolean } };

export async function authorizeTheoryRound(inviteToken: string, roundId: string): Promise<TheoryAccess> {
  const session = await findSession(inviteToken);
  if (!session) return { ok: false, status: 404, body: { error: "Session not found" } };
  if (session.finishedAt) return { ok: false, status: 410, body: { error: "This interview has already been submitted." } };
  if (session.status === "EXPIRED" || (!session.startedAt && session.expiresAt && session.expiresAt.getTime() <= Date.now())) {
    return { ok: false, status: 410, body: { error: "This invite has expired. Ask the recruiter to send a new one.", inviteExpired: true } };
  }

  const round = session.rounds.find((r) => r.id === roundId);
  if (!round || round.paradigm !== "theory") return { ok: false, status: 404, body: { error: "Round not found" } };
  const data = parseTheoryRound(round.theoryJson);
  if (!data || !data.items.length) return { ok: false, status: 409, body: { error: "This round has no questions. Please contact your recruiter." } };

  // Same hard deadline as the chat: sum of round budgets, extensions and 30 s grace.
  const totalMinutes = resolveSessionRounds(session).reduce((s, r) => s + (r.estimatedMinutes || 0), 0) || 30;
  if (session.startedAt) {
    const deadline = session.startedAt.getTime() + (totalMinutes + (session.extraMinutes ?? 0)) * 60_000 + 30_000;
    if (Date.now() > deadline) return { ok: false, status: 410, body: { error: "Time is up. Please submit your assessment.", deadlineExpired: true } };
  }
  return { ok: true, session, round, data };
}
