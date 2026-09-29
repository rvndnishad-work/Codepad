"use server";

/**
 * Settings > Security actions that are not plain field saves (those go
 * through saveWorkspaceSettingsAction):
 *
 *   - sendTwoFactorReminderAction: email members who have not turned on
 *     two-factor sign-in, once the workspace requires it for everyone.
 *   - signOutEveryoneAction: every sign-in that started before now has to
 *     sign in again (checked by the workspace gate in (shell)/layout.tsx).
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/interview/links";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { formatWorkspaceDate, normalizeWorkspaceSettings } from "@/lib/workspace/settings";
import { SETTINGS_SELECT, settingsAccess } from "@/lib/workspace/settings-server";
import { TWO_FACTOR_REMINDER_COOLDOWN_MS, twoFactorPolicy, twoFactorReminderWait } from "@/lib/workspace/security";

export type SecurityActionResult = { ok: true; message: string } | { ok: false; error: string };

async function loadEditor(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return { error: "You are signed out. Sign in and try again." } as const;
  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      ...SETTINGS_SELECT,
      members: { where: { userId: session.user.id }, select: { role: true, permissions: true } },
    },
  });
  if (!ws) return { error: "Workspace not found." } as const;
  const me = ws.members[0];
  if (!me) return { error: "You are not a member of this workspace." } as const;
  const { canEdit } = await settingsAccess(me);
  if (!canEdit) return { error: "Only owners and admins can do this." } as const;
  return { session, ws, settings: normalizeWorkspaceSettings(ws) } as const;
}

export async function sendTwoFactorReminderAction(slug: string): Promise<SecurityActionResult> {
  const ctx = await loadEditor(slug);
  if ("error" in ctx) return { ok: false, error: ctx.error ?? "Something went wrong." };
  const { session, ws, settings } = ctx;

  const now = new Date();
  const policy = twoFactorPolicy(settings, now);
  if (policy.state === "off") {
    return { ok: false, error: "Turn on two-factor for everyone and save before emailing members." };
  }
  const wait = twoFactorReminderWait(settings.require2faRemindedAt, now);
  if (wait > 0) {
    return { ok: false, error: `Members were emailed less than an hour ago. Try again in ${wait} ${wait === 1 ? "minute" : "minutes"}.` };
  }

  const without = await prisma.workspaceMember.findMany({
    where: { workspaceId: ws.id, user: { totpEnabledAt: null } },
    select: { user: { select: { email: true } } },
  });
  const recipients = [...new Set(without.map((m) => m.user.email?.trim().toLowerCase()).filter((e): e is string => !!e))];
  if (!recipients.length) return { ok: false, error: "Everyone already has two-factor sign-in on." };

  // Stamp first so a double click cannot send twice.
  const stamped = await prisma.workspace.updateMany({
    where: {
      id: ws.id,
      OR: [{ require2faRemindedAt: null }, { require2faRemindedAt: { lte: new Date(now.getTime() - TWO_FACTOR_REMINDER_COOLDOWN_MS) } }],
    },
    data: { require2faRemindedAt: now },
  });
  if (!stamped.count) return { ok: false, error: "Members were emailed a moment ago." };

  const { sendEmail } = await import("@/lib/email");
  const origin = await appOrigin();
  const senderName = session.user.name || session.user.email?.split("@")[0] || "An admin";
  const requiredFrom = policy.state === "scheduled" ? formatWorkspaceDate(policy.from, settings) : null;
  const results = await Promise.all(
    recipients.map((to) =>
      sendEmail({
        template: "two-factor-reminder",
        to,
        props: { workspaceName: settings.name, senderName, requiredFrom, setupUrl: `${origin}/profile/security?enroll=required` },
        workspaceId: ws.id,
        idempotencyKey: `2fa-reminder:${ws.id}:${now.getTime()}:${to}`,
      }).catch(() => ({ sent: false as const, reason: "error" })),
    ),
  );
  const sent = results.filter((r) => r.sent).length;

  await writeWorkspaceAuditEntry({
    workspaceId: ws.id,
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: WORKSPACE_AUDIT_ACTIONS.SECURITY_2FA_REMINDER_SENT,
    targetType: "workspace",
    targetId: ws.id,
    meta: { count: sent },
  });
  revalidatePath(`/w/${slug}/settings/security`);

  if (!sent) return { ok: false, error: "The emails could not be sent. Try again later." };
  return { ok: true, message: sent === 1 ? "Emailed 1 member" : `Emailed ${sent} members` };
}

export async function signOutEveryoneAction(slug: string): Promise<SecurityActionResult> {
  const ctx = await loadEditor(slug);
  if ("error" in ctx) return { ok: false, error: ctx.error ?? "Something went wrong." };
  const { session, ws } = ctx;

  const count = await prisma.workspaceMember.count({ where: { workspaceId: ws.id } });
  await prisma.workspace.update({ where: { id: ws.id }, data: { sessionsRevokedAt: new Date() } });
  await writeWorkspaceAuditEntry({
    workspaceId: ws.id,
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: WORKSPACE_AUDIT_ACTIONS.MEMBERS_SIGNED_OUT,
    targetType: "workspace",
    targetId: ws.id,
    meta: { count },
  });
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: true, message: "Everyone is signed out" };
}
