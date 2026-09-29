/**
 * Interviewer presence levels and what each costs. Pure (no Prisma) so client
 * components can show the same numbers the server charges.
 */

/**
 * Live presence of the AI interviewer during a screening. Higher presence means
 * more background model calls, so it costs more credits per screening.
 */
export type EngagementLevel = "REACTIVE" | "OBSERVER" | "COACH";

/** Cost (in credits) for a single REACTIVE screening, the legacy flat price. */
export const AI_INTERVIEW_COST_PER_SESSION = 1;

/**
 * Credits charged once, when the candidate sends their first message, scaled
 * by the recruiter's chosen interviewer presence.
 */
export const AI_ENGAGEMENT_CREDIT_COST: Record<EngagementLevel, number> = {
  REACTIVE: AI_INTERVIEW_COST_PER_SESSION, // 1
  OBSERVER: 2,
  COACH: 3,
};

/** Coerce an arbitrary stored value to a valid level (defaults to REACTIVE). */
export function normalizeEngagementLevel(v: string | null | undefined): EngagementLevel {
  return v === "OBSERVER" || v === "COACH" ? v : "REACTIVE";
}

/** Credit cost for a level (defaults to the REACTIVE cost for unknown input). */
export function creditCostForLevel(level: string | null | undefined): number {
  return AI_ENGAGEMENT_CREDIT_COST[normalizeEngagementLevel(level)];
}

/** Plain names recruiters see for each level. */
export const ENGAGEMENT_LABELS: Record<EngagementLevel, { label: string; hint: string }> = {
  REACTIVE: { label: "Answers questions", hint: "Replies only when the candidate asks." },
  OBSERVER: { label: "Checks in", hint: "Watches quietly and speaks up when something stands out." },
  COACH: { label: "Coaches", hint: "Reacts to progress as the candidate works." },
};
