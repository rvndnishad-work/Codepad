"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { decryptAtRest } from "@/lib/crypto/at-rest";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { busyForMembers, calendarProvidersConfigured, MAX_BUSY_RANGE_MS, type MemberBusy } from "@/lib/calendar/server";
import type { CalendarProvider } from "@/lib/calendar/providers";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function actor(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, members: { select: { userId: true, role: true, permissions: true } } },
  });
  const member = workspace?.members.find((m) => m.userId === session.user.id);
  if (!workspace || !member) return null;
  return { workspace, member, userId: session.user.id, email: session.user.email ?? null };
}

/**
 * Busy times for workspace members between two instants, for the interview
 * wizard. Members without a calendar come back with status "none".
 */
export async function calendarBusyAction(
  slug: string,
  userIds: string[],
  fromIso: string,
  toIso: string,
): Promise<Result<{ members: MemberBusy[]; configured: Record<CalendarProvider, boolean> }>> {
  const a = await actor(slug);
  if (!a) return { ok: false, error: "You are not a member of this workspace." };
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to.getTime() - from.getTime() > MAX_BUSY_RANGE_MS) {
    return { ok: false, error: "That date range is not valid." };
  }
  const memberIds = new Set(a.workspace.members.map((m) => m.userId));
  const ids = [...new Set(userIds)].filter((id) => memberIds.has(id)).slice(0, 12);
  const members = await busyForMembers(a.workspace.id, ids, from, to);
  return { ok: true, members, configured: calendarProvidersConfigured() };
}

/**
 * Disconnects a calendar. Members disconnect their own; people who manage
 * integrations can disconnect anyone's. Events already created stay on the
 * calendar but are no longer kept in step.
 */
export async function disconnectCalendarAction(slug: string, userId: string): Promise<Result> {
  const a = await actor(slug);
  if (!a) return { ok: false, error: "You are not a member of this workspace." };
  if (userId !== a.userId && !(await canMember(a.member, "integration:manage"))) {
    return { ok: false, error: "You can only disconnect your own calendar." };
  }
  const conn = await prisma.calendarConnection.findUnique({
    where: { workspaceId_userId: { workspaceId: a.workspace.id, userId: String(userId).slice(0, 40) } },
    select: { id: true, provider: true, refreshTokenEnc: true, accessTokenEnc: true },
  });
  if (!conn) return { ok: true };
  // Google lets us revoke the grant outright. Best effort.
  if (conn.provider === "google") {
    try {
      const token = decryptAtRest(conn.refreshTokenEnc ?? conn.accessTokenEnc);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } });
    } catch {
      // The grant also dies when the member removes the app in their Google account.
    }
  }
  await prisma.calendarConnection.delete({ where: { id: conn.id } });
  void writeWorkspaceAuditEntry({
    workspaceId: a.workspace.id,
    actorUserId: a.userId,
    actorEmail: a.email,
    action: WORKSPACE_AUDIT_ACTIONS.CALENDAR_DISCONNECTED,
    targetType: "calendarConnection",
    targetId: userId,
    meta: { provider: conn.provider, self: userId === a.userId },
  });
  revalidatePath(`/w/${slug}/calendar`);
  return { ok: true };
}
