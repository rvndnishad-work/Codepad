import type { Prisma } from "@prisma/client";

/** Integrity scores at or above this are "flagged" (same bar as the telemetry scan and copilot). */
export const FLAG_THRESHOLD = 60;

export type AttemptFilters = {
  q: string;
  status: string;
  challenge: string;
  from: string;
  to: string;
  /** Minimum suspicion score, 0..100; "" for any. */
  minSuspicion: string;
  /** "workspace" (take-home or interview) | "public" | "". */
  scope: string;
  /** "1" shows only flagged attempts. */
  flagged: string;
};

export const FILTER_KEYS = ["q", "status", "challenge", "from", "to", "minSuspicion", "scope", "flagged"] as const;

export function readFilters(sp: Record<string, string | string[] | undefined>): AttemptFilters {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  };
  return {
    q: one("q"),
    status: ["passed", "failed", "in_progress", "abandoned"].includes(one("status")) ? one("status") : "",
    challenge: one("challenge").slice(0, 64),
    from: /^\d{4}-\d{2}-\d{2}$/.test(one("from")) ? one("from") : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(one("to")) ? one("to") : "",
    minSuspicion: /^\d{1,3}$/.test(one("minSuspicion")) ? String(Math.min(100, Number(one("minSuspicion")))) : "",
    scope: one("scope") === "workspace" || one("scope") === "public" ? one("scope") : "",
    flagged: one("flagged") === "1" ? "1" : "",
  };
}

/** Rows that came from a recruiter: a take-home, a live interview, or a workspace-owned challenge. */
const WORKSPACE: Prisma.ChallengeAttemptWhereInput = {
  OR: [{ takeHomeAssignment: { isNot: null } }, { sessionId: { not: null } }, { challenge: { workspaceId: { not: null } } }],
};

const suspicionAtLeast = (n: number): Prisma.ChallengeAttemptWhereInput => ({
  OR: [{ aiSuspicionScore: { gte: n } }, { integrityReport: { is: { suspicionScore: { gte: n } } } }],
});

export function attemptWhere(f: AttemptFilters): Prisma.ChallengeAttemptWhereInput {
  const and: Prisma.ChallengeAttemptWhereInput[] = [];
  if (f.q) {
    const c = { contains: f.q, mode: "insensitive" as const };
    and.push({ OR: [{ user: { name: c } }, { user: { email: c } }, { challenge: { title: c } }, { challenge: { slug: c } }] });
  }
  if (f.status) and.push({ status: f.status });
  if (f.challenge) and.push({ challengeId: f.challenge });
  if (f.from) and.push({ startedAt: { gte: new Date(`${f.from}T00:00:00.000Z`) } });
  if (f.to) and.push({ startedAt: { lt: new Date(new Date(`${f.to}T00:00:00.000Z`).getTime() + 86_400_000) } });
  if (f.flagged) and.push(suspicionAtLeast(FLAG_THRESHOLD));
  else if (f.minSuspicion) and.push(suspicionAtLeast(Number(f.minSuspicion)));
  if (f.scope === "workspace") and.push(WORKSPACE);
  if (f.scope === "public") and.push({ NOT: WORKSPACE });
  return and.length ? { AND: and } : {};
}

/** Query string for links that keep every current filter, with overrides. */
export function filterHref(base: string, f: AttemptFilters, patch: Partial<AttemptFilters> = {}): string {
  const next = { ...f, ...patch };
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) if (next[k]) p.set(k, next[k]);
  const qs = p.toString();
  return `${base}${qs ? `?${qs}` : ""}`;
}
