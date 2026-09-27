/**
 * Server side of candidate email branding: loads what a workspace set in
 * Settings > Candidate experience so the email service can apply it to every
 * candidate email (see sendEmail and sendTemplatedBatch in src/lib/email.ts).
 *
 * The rules themselves are pure and live in
 * src/lib/workspace/candidate-experience.ts.
 */
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { replyToAddress, senderDisplayName } from "@/lib/workspace/settings";
import {
  candidateBrand,
  isCandidateEmailKey,
  type CandidateEmailContext,
  type CandidateEmailKey,
} from "@/lib/workspace/candidate-experience";

/** Branding, sender, reply-to and saved wording for one workspace. Null if it does not exist. */
export async function loadCandidateEmailContext(workspaceId: string): Promise<CandidateEmailContext | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      logoUrl: true,
      brandColor: true,
      senderName: true,
      replyToEmail: true,
      replyToConfirmedAt: true,
      helpEmail: true,
      privacyNoticeUrl: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      candidateEmailTemplates: { select: { key: true, subject: true, body: true } },
    },
  });
  if (!ws) return null;
  const growth = growthToolsEnabled(ws);
  const wording: CandidateEmailContext["wording"] = {};
  for (const t of ws.candidateEmailTemplates) {
    if (isCandidateEmailKey(t.key) && (t.subject || t.body)) wording[t.key as CandidateEmailKey] = { subject: t.subject, body: t.body };
  }
  return {
    brand: candidateBrand(ws),
    growth,
    fromName: growth ? senderDisplayName({ senderName: ws.senderName, name: ws.name }) : null,
    replyTo: growth ? replyToAddress(ws) : null,
    wording,
  };
}

/* ── Samples for the settings page preview and test email ──────────────── */

const DAY = 86_400_000;

/** A realistic email for a wording key, filled with sample values. */
export function sampleCandidateEmail(
  key: CandidateEmailKey,
  workspaceName: string,
  base: string,
  now: Date = new Date(),
): { template: string; props: Record<string, unknown> } {
  const candidateName = "Sam";
  const inDays = (n: number) => new Date(now.getTime() + n * DAY).toISOString();
  switch (key) {
    case "take-home-invite":
      return {
        template: "take-home-invite",
        props: { candidateName, challengeTitle: "Build a rate limiter", workspaceName, takeHomeUrl: `${base}/take-home/sample`, timeLimitMin: 90, expiresAt: inDays(7) },
      };
    case "take-home-reminder":
      return {
        template: "take-home-reminder",
        props: { candidateName, challengeTitle: "Build a rate limiter", workspaceName, takeHomeUrl: `${base}/take-home/sample`, expiresAt: inDays(1), hoursLeft: 24 },
      };
    case "take-home-received":
      return { template: "take-home-submitted-candidate", props: { candidateName, challengeTitle: "Build a rate limiter", workspaceName } };
    case "ai-screening-invite":
    case "ai-screening-reminder":
      return {
        template: "ai-screening-invite",
        props: {
          candidateName,
          positionTitle: "Frontend engineer",
          workspaceName,
          inviteUrl: `${base}/ai-interview/sample`,
          reminder: key === "ai-screening-reminder",
          expiresAt: inDays(7),
          minutes: 30,
        },
      };
    case "interview-invite":
      return {
        template: "interview-invite",
        props: { candidateName, workspaceName, title: "Frontend pairing interview", joinUrl: `${base}/join/sample`, shortCode: null, scheduledAt: inDays(3), durationMin: 60 },
      };
  }
}
