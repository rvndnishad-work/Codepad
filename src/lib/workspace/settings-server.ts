/**
 * Server side of workspace settings: the Prisma select, the loader, and the
 * shared context every Settings tab page starts from. Pure rules live in
 * settings.ts.
 */
import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { normalizeWorkspaceSettings, type WorkspaceSettings } from "./settings";

/** Every Workspace column WorkspaceSettings is built from. */
export const SETTINGS_SELECT = {
  name: true,
  slug: true,
  logoUrl: true,
  timezone: true,
  dateFormat: true,
  hiringType: true,
  brandColor: true,
  senderName: true,
  replyToEmail: true,
  replyToConfirmedAt: true,
  privacyNoticeUrl: true,
  consentRequired: true,
  helpEmail: true,
  defaultTakeHomePassMark: true,
  defaultAiPassMark: true,
  defaultInterviewPassMark: true,
  inviteExpiryDays: true,
  remindNotStarted: true,
  remindBeforeDeadline: true,
  aiDefaultMinutes: true,
  keepVoiceAnswers: true,
  interviewerLanguage: true,
  interviewDefaultMinutes: true,
  scorecardFirst: true,
  scorecardReminderHours: true,
  require2faForAll: true,
  require2faFrom: true,
  require2faRemindedAt: true,
  sessionMaxAgeDays: true,
  sessionsRevokedAt: true,
  allowedEmailDomains: true,
  joinWithoutInvite: true,
  joinRole: true,
  apiKeyMaxLifetimeDays: true,
  lowCreditThreshold: true,
  lowCreditAlertedAt: true,
  deletionScheduledAt: true,
  deletionRequestedById: true,
} as const;

/** Settings for one workspace by id, with defaults filled in. Null if it does not exist. */
export async function loadWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings | null> {
  const row = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: SETTINGS_SELECT });
  return row ? normalizeWorkspaceSettings(row) : null;
}

/**
 * Who may change settings. Owners always (workspace:manage); admins too,
 * as the page promises "Owners and admins can change these". Owner-only
 * fields (web address, two-factor for everyone, delete workspace) check
 * `owner` separately.
 */
export async function settingsAccess(member: { role: string; permissions?: unknown }): Promise<{ canEdit: boolean; owner: boolean }> {
  const owner = await canMember(member, "workspace:manage");
  return { owner, canEdit: owner || member.role === "ADMIN" };
}

export type SettingsPageContext = {
  slug: string;
  workspace: { id: string; name: string; planName: string; trialEndsAt: Date | null; stripeSubscriptionId: string | null };
  settings: WorkspaceSettings;
  me: { memberId: string; userId: string; role: string; email: string | null };
  canEdit: boolean;
  owner: boolean;
  /** Growth-level tools are on (paid Growth or Enterprise, or a live trial). */
  growth: boolean;
};

/**
 * Everything a Settings tab page needs. Redirects to sign-in or away when
 * the viewer is not a member; members who cannot edit get a read-only view.
 * Memoized per request, so the layout and the tab page share one query.
 */
export const getSettingsPageContext = cache(async (slug: string): Promise<SettingsPageContext> => {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/settings`)}`);
  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      ...SETTINGS_SELECT,
      members: {
        where: { userId: session.user.id },
        select: { id: true, userId: true, role: true, permissions: true, user: { select: { email: true } } },
      },
    },
  });
  if (!ws) notFound();
  const me = ws.members[0];
  if (!me) redirect("/dashboard");
  const { canEdit, owner } = await settingsAccess(me);
  return {
    slug,
    workspace: { id: ws.id, name: ws.name, planName: ws.planName, trialEndsAt: ws.trialEndsAt, stripeSubscriptionId: ws.stripeSubscriptionId },
    settings: normalizeWorkspaceSettings(ws),
    me: { memberId: me.id, userId: me.userId, role: me.role, email: me.user.email },
    canEdit,
    owner,
    growth: growthToolsEnabled(ws),
  };
});
