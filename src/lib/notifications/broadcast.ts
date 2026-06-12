/**
 * Admin broadcast notifications (IP-45) — server actions.
 *
 * Source B for the bell — admin composes a message and dispatches to a
 * resolved audience. Source A (event-driven, IP-44) and Source B both write
 * to the same Notification table; broadcastId discriminates.
 *
 * Audience semantics:
 *   ALL              — every user with a userType set (excludes legacy nulls)
 *   ALL_CANDIDATES   — User.userType === "candidate"
 *   ALL_RECRUITERS   — User.userType === "recruiter"
 *   WORKSPACE        — every member of WorkspaceMember.workspaceId === target
 *   USER             — single user by id
 *
 * Banned users are always excluded.
 *
 * Fan-out strategy: chunked batches of CHUNK_SIZE so "to all" doesn't lock
 * the DB in one massive transaction. Per-recipient row is created via
 * createMany (no returning rows needed). On any chunk failure, the
 * broadcast's `sentAt` stays null so a retry can resume — but we don't
 * implement resume here (idempotent retry requires per-recipient state;
 * deferred to IP-58).
 */
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { rateLimit } from "@/lib/rate-limit";
import {
  AUDIENCE_TYPES,
  type AudienceType,
  type DispatchBroadcastInput,
  type DispatchBroadcastResult,
  type SentBroadcastRow,
} from "./broadcast-types";

const CHUNK_SIZE = 500;
const MAX_TITLE = 200;
const MAX_BODY = 1000;
const MAX_HREF = 2048;

async function assertAdmin() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }
  return { userId: session!.user!.id! };
}

/**
 * Resolve the audience to a set of userIds, deduplicated, banned-excluded.
 * Returns userIds in a stable order (id ASC) so chunking is deterministic.
 */
async function resolveAudience(
  audienceType: AudienceType,
  audienceTarget: string | null | undefined,
): Promise<string[]> {
  if (audienceType === "USER") {
    if (!audienceTarget) throw new Error("USER audience requires a userId target.");
    const u = await prisma.user.findUnique({
      where: { id: audienceTarget },
      select: { id: true, banned: true },
    });
    if (!u || u.banned) return [];
    return [u.id];
  }

  if (audienceType === "WORKSPACE") {
    if (!audienceTarget) throw new Error("WORKSPACE audience requires a workspaceId target.");
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: audienceTarget, user: { banned: false } },
      select: { userId: true },
      orderBy: { userId: "asc" },
    });
    return Array.from(new Set(members.map((m) => m.userId)));
  }

  const where: Record<string, unknown> = { banned: false };
  if (audienceType === "ALL_CANDIDATES") where.userType = "candidate";
  else if (audienceType === "ALL_RECRUITERS") where.userType = "recruiter";
  else if (audienceType === "ALL") where.userType = { not: null };

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return users.map((u) => u.id);
}

export async function previewAudienceCountAction(
  audienceType: AudienceType,
  audienceTarget?: string | null,
): Promise<number> {
  await assertAdmin();
  const ids = await resolveAudience(audienceType, audienceTarget);
  return ids.length;
}

export async function dispatchBroadcastAction(
  input: DispatchBroadcastInput,
): Promise<DispatchBroadcastResult> {
  const { userId } = await assertAdmin();

  // Rate limit on the admin user so a runaway script can't fan out repeatedly.
  // 1 broadcast / 10s per admin.
  const limit = rateLimit(`broadcast:${userId}`, 1, 10_000);
  if (!limit.ok) {
    throw new Error(
      `Too soon — wait ${Math.ceil(limit.resetMs / 1000)}s before another broadcast.`,
    );
  }

  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");
  if (title.length > MAX_TITLE) throw new Error(`Title must be ${MAX_TITLE} characters or fewer.`);
  const body = input.body?.trim() ? input.body.trim() : null;
  if (body && body.length > MAX_BODY) throw new Error(`Body must be ${MAX_BODY} characters or fewer.`);
  const href = input.href?.trim() ? input.href.trim() : null;
  if (href && href.length > MAX_HREF) throw new Error("href too long.");

  if (!AUDIENCE_TYPES.includes(input.audienceType)) {
    throw new Error("Unknown audience type.");
  }
  const audienceTarget =
    input.audienceType === "WORKSPACE" || input.audienceType === "USER"
      ? input.audienceTarget ?? null
      : null;

  // Resolve recipients BEFORE creating the broadcast row so we don't leave
  // an empty stub if the audience resolution fails.
  const recipients = await resolveAudience(input.audienceType, audienceTarget);
  if (recipients.length === 0) {
    throw new Error("Audience matched zero users. Nothing to send.");
  }

  const broadcast = await prisma.broadcastNotification.create({
    data: {
      composedById: userId,
      audienceType: input.audienceType,
      audienceTarget,
      title,
      body,
      href,
    },
  });

  // Fan-out in chunks. createMany is one bulk insert per chunk.
  let inserted = 0;
  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    await prisma.notification.createMany({
      data: chunk.map((rid) => ({
        userId: rid,
        broadcastId: broadcast.id,
        type: "ADMIN_BROADCAST",
        title,
        body,
        href,
      })),
    });
    inserted += chunk.length;
  }

  const finalised = await prisma.broadcastNotification.update({
    where: { id: broadcast.id },
    data: { recipientCount: inserted, sentAt: new Date() },
  });

  return {
    broadcastId: finalised.id,
    recipientCount: finalised.recipientCount,
    sentAt: finalised.sentAt!.toISOString(),
  };
}

export async function listBroadcastsAction(limit = 50): Promise<SentBroadcastRow[]> {
  await assertAdmin();
  const rows = await prisma.broadcastNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(200, limit)),
    select: {
      id: true,
      audienceType: true,
      audienceTarget: true,
      title: true,
      body: true,
      href: true,
      recipientCount: true,
      sentAt: true,
      createdAt: true,
      composedById: true,
    },
  });

  const composerIds = Array.from(new Set(rows.map((r) => r.composedById)));
  const workspaceIds = rows
    .filter((r) => r.audienceType === "WORKSPACE" && r.audienceTarget)
    .map((r) => r.audienceTarget!) as string[];
  const userIds = rows
    .filter((r) => r.audienceType === "USER" && r.audienceTarget)
    .map((r) => r.audienceTarget!) as string[];

  const [composers, workspaces, users] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: composerIds } },
      select: { id: true, email: true },
    }),
    workspaceIds.length > 0
      ? prisma.workspace.findMany({
          where: { id: { in: workspaceIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  const composerEmail = new Map(composers.map((c) => [c.id, c.email] as const));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name ?? w.slug] as const));
  const userEmail = new Map(users.map((u) => [u.id, u.email] as const));

  return rows.map((r) => ({
    id: r.id,
    audienceType: r.audienceType,
    audienceTarget: r.audienceTarget,
    audienceLabel:
      r.audienceType === "ALL"
        ? "All users"
        : r.audienceType === "ALL_CANDIDATES"
          ? "All candidates"
          : r.audienceType === "ALL_RECRUITERS"
            ? "All recruiters"
            : r.audienceType === "WORKSPACE"
              ? `Workspace · ${wsName.get(r.audienceTarget ?? "") ?? r.audienceTarget ?? "?"}`
              : `User · ${userEmail.get(r.audienceTarget ?? "") ?? r.audienceTarget ?? "?"}`,
    title: r.title,
    body: r.body,
    href: r.href,
    recipientCount: r.recipientCount,
    sentAt: r.sentAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    composedByEmail: composerEmail.get(r.composedById) ?? null,
  }));
}

/**
 * Resend a previous broadcast — re-resolves the audience (so members who
 * joined a workspace since the original send DO get it) and creates a new
 * BroadcastNotification row. The original stays untouched as historical
 * record.
 */
export async function resendBroadcastAction(
  broadcastId: string,
): Promise<DispatchBroadcastResult> {
  await assertAdmin();
  const original = await prisma.broadcastNotification.findUnique({
    where: { id: broadcastId },
    select: {
      audienceType: true,
      audienceTarget: true,
      title: true,
      body: true,
      href: true,
    },
  });
  if (!original) throw new Error("Broadcast not found.");
  return dispatchBroadcastAction({
    audienceType: original.audienceType as AudienceType,
    audienceTarget: original.audienceTarget,
    title: original.title,
    body: original.body ?? undefined,
    href: original.href ?? undefined,
  });
}
