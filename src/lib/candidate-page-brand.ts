/**
 * What candidate pages (take-home lobby, AI screening, interview lobby) need
 * from Settings > Candidate experience: the brand and whether to ask for
 * consent. Brand is on every plan.
 */
import { prisma } from "@/lib/prisma";
import { candidateBrand, type CandidateBrand } from "@/lib/workspace/candidate-experience";

export type CandidatePageSettings = { brand: CandidateBrand; consentRequired: boolean };

export const CANDIDATE_PAGE_SELECT = {
  name: true,
  logoUrl: true,
  brandColor: true,
  helpEmail: true,
  privacyNoticeUrl: true,
  consentRequired: true,
} as const;

export function candidatePageSettings(ws: {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  helpEmail: string | null;
  privacyNoticeUrl: string | null;
  consentRequired: boolean;
}): CandidatePageSettings {
  return { brand: candidateBrand(ws), consentRequired: ws.consentRequired };
}

/** Null when there is no workspace (a legacy or personal link). */
export async function loadCandidatePageSettings(workspaceId: string | null | undefined): Promise<CandidatePageSettings | null> {
  if (!workspaceId) return null;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: CANDIDATE_PAGE_SELECT }).catch(() => null);
  return ws ? candidatePageSettings(ws) : null;
}
