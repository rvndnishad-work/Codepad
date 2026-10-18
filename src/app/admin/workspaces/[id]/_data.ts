import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * The workspace row every tab of /admin/workspaces/[id] needs, loaded once
 * per request: the layout and the page both call this and React's cache()
 * hands them the same promise.
 */
export const getAdminWorkspace = cache(async (id: string) => {
  const [ws, owner, attempts] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        planName: true,
        createdAt: true,
        logoUrl: true,
        trialEndsAt: true,
        trialEndedAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeStatus: true,
        stripeSeatQuantity: true,
        stripeMrrCents: true,
        stripeInterval: true,
        stripeCurrentPeriodEnd: true,
        stripePastDueSince: true,
        stripeSyncedAt: true,
        lockedAt: true,
        lockedReason: true,
        lockedById: true,
        deletionScheduledAt: true,
        deletionRequestedById: true,
        includedCreditsLeft: true,
        includedCreditsLastGrant: true,
        includedCreditsGrantedAt: true,
        videoEnabled: true,
        videoEnabledAt: true,
        videoAddonItemId: true,
        require2faForAll: true,
        require2faFrom: true,
        allowedEmailDomains: true,
        joinWithoutInvite: true,
        joinRole: true,
        sessionMaxAgeDays: true,
        apiKeyMaxLifetimeDays: true,
        lowCreditThreshold: true,
        lowCreditAlertedAt: true,
        allowExternalMcp: true,
        timezone: true,
        dateFormat: true,
        hiringType: true,
        consentRequired: true,
        _count: {
          select: {
            members: true,
            candidates: true,
            aiInterviewSessions: true,
            takeHomes: true,
            interviewRecordings: true,
            challenges: true,
            invites: { where: { acceptedAt: null } },
          },
        },
      },
    }),
    prisma.workspaceMember.findFirst({
      where: { workspaceId: id, role: "OWNER" },
      select: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.challengeAttempt.count({ where: { challenge: { workspaceId: id } } }),
  ]);
  if (!ws) return null;
  // Live interviews and session take-homes share InterviewSession; count them apart.
  const [interviews, takeHomeSessions] = await Promise.all([
    prisma.interviewSession.count({ where: { workspaceId: id, type: { not: "take-home" } } }),
    prisma.interviewSession.count({ where: { workspaceId: id, type: "take-home" } }),
  ]);
  return {
    ...ws,
    owner: owner?.user ?? null,
    counts: {
      members: ws._count.members,
      candidates: ws._count.candidates,
      aiScreenings: ws._count.aiInterviewSessions,
      takeHomes: ws._count.takeHomes + takeHomeSessions,
      interviews,
      recordings: ws._count.interviewRecordings,
      challenges: ws._count.challenges,
      attempts,
      pendingInvites: ws._count.invites,
    },
  };
});

export type AdminWorkspace = NonNullable<Awaited<ReturnType<typeof getAdminWorkspace>>>;
