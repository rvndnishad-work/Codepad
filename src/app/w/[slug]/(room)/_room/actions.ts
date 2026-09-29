"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadRoom } from "@/lib/interview/room-server";

/**
 * The candidate ticked the consent box in the interview lobby
 * (Settings > Candidate experience > Ask for consent). Only the candidate on
 * this interview can give it; the first time is kept.
 */
export async function giveInterviewConsentAction(slug: string, id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [session, hdrs] = await Promise.all([auth().catch(() => null), headers()]);
  const user = session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
  const res = await loadRoom(slug, id, { user, cookieHeader: hdrs.get("cookie") });
  if (!res.ok) return { ok: false, error: "Open the interview from the link in your invite, then try again." };
  if (res.data.viewer.role !== "candidate") return { ok: false, error: "Only the candidate gives consent here." };
  await prisma.interviewSession.updateMany({ where: { id, candidateConsentAt: null }, data: { candidateConsentAt: new Date() } });
  return { ok: true };
}
