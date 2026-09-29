"use server";

import { prisma } from "@/lib/prisma";
import { rateLimitDistributed } from "@/lib/rate-limit";

/**
 * The candidate ticked the consent box before an AI screening
 * (Settings > Candidate experience > Ask for consent). Stamps the time once;
 * ticking again keeps the first time.
 */
export async function giveScreeningConsentAction(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof token !== "string" || !token || token.length > 200) return { ok: false, error: "This screening link does not work." };
  const limit = await rateLimitDistributed(`ai-consent:${token}`, 20, 10 * 60_000);
  if (!limit.ok) return { ok: false, error: "Too many tries. Wait a minute and try again." };
  const session = await prisma.aIInterviewSession.findUnique({ where: { inviteToken: token }, select: { id: true, consentAt: true } });
  if (!session) return { ok: false, error: "This screening link does not work." };
  if (!session.consentAt) {
    await prisma.aIInterviewSession.updateMany({ where: { id: session.id, consentAt: null }, data: { consentAt: new Date() } });
  }
  return { ok: true };
}
