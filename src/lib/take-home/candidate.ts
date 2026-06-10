import { prisma } from "@/lib/prisma";

/**
 * Shared resolver for the candidate User behind a take-home token.
 *
 * Two token kinds are accepted (same contract the attempt/grade routes used
 * inline before this was factored out):
 *   - TakeHomeAssignment.token            (legacy single-challenge take-home)
 *   - InterviewSession.candidateAccessToken (IP-88 session-backed take-home)
 *
 * Email handling fixes two long-standing defects:
 *   - lookups are case-INsensitive (rows created before normalization may
 *     carry mixed-case emails; `equals` alone silently missed them, which
 *     either 401'd the candidate or created a duplicate user), and
 *   - find-or-create is race-safe: concurrent first requests on the same
 *     token both try to create, the loser of the unique-constraint race
 *     re-reads instead of 500ing.
 */
export type TokenCandidate =
  | { kind: "assignment"; userId: string }
  | { kind: "session"; userId: string; sessionId: string };

/**
 * Find a user by email (case-insensitive) or create one with the canonical
 * lowercased address. Survives concurrent-create races on the email unique.
 */
export async function findOrCreateUserByEmail(
  email: string,
  name: string | null
): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const canonical = email.toLowerCase().trim();
  try {
    const created = await prisma.user.create({
      data: {
        email: canonical,
        name: name?.trim() || canonical.split("@")[0],
        portfolioPublic: false,
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    // Unique-constraint race: another request created the user between our
    // lookup and create. Re-read instead of failing the submission.
    const raced = await prisma.user.findFirst({
      where: { email: { equals: canonical, mode: "insensitive" } },
      select: { id: true },
    });
    if (raced) return raced.id;
    throw new Error(`Could not resolve candidate user for ${canonical}`);
  }
}

/** Resolve the candidate behind a take-home token, or null if the token is unknown. */
export async function resolveCandidateFromToken(
  token: string
): Promise<TokenCandidate | null> {
  const assignment = await prisma.takeHomeAssignment.findUnique({
    where: { token },
    select: { candidateEmail: true, candidateName: true },
  });
  if (assignment) {
    const userId = await findOrCreateUserByEmail(
      assignment.candidateEmail,
      assignment.candidateName
    );
    return { kind: "assignment", userId };
  }

  const thSession = await prisma.interviewSession.findUnique({
    where: { candidateAccessToken: token },
    select: {
      id: true,
      candidateName: true,
      candidate: { select: { email: true, name: true } },
    },
  });
  const email = thSession?.candidate?.email ?? null;
  if (thSession && email) {
    const userId = await findOrCreateUserByEmail(
      email,
      thSession.candidate?.name ?? thSession.candidateName
    );
    return { kind: "session", userId, sessionId: thSession.id };
  }

  return null;
}
