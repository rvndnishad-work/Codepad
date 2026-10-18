/**
 * Admin broadcast notifications (IP-45) — server actions.
 *
 * Source B for the bell — admin composes a message and dispatches to a
 * resolved audience. Source A (event-driven, IP-44) and Source B both write
 * to the same Notification table; broadcastId discriminates.
 *
 * Audience semantics:
 *   ALL              — every user, including legacy rows with userType null
 *   ALL_CANDIDATES   — User.userType === "candidate"
 *   ALL_RECRUITERS   — User.userType === "recruiter"
 *   WORKSPACE        — every member of WorkspaceMember.workspaceId === target
 *   USER             — single user by id
 *
 * Banned and soft-deleted users are always excluded.
 *
 * Fan-out strategy: recipients are paged by id cursor in batches of
 * CHUNK_SIZE (never loaded all at once) and each page is inserted with one
 * createMany, so "to all" doesn't lock the DB in one massive transaction. Per-recipient row is created via
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
import { logAdminAction } from "@/lib/admin/audit";
import type { Prisma } from "@prisma/client";
import {
  AUDIENCE_TYPES,
  broadcastHrefError,
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
  return { userId: session!.user!.id!, email: session?.user?.email ?? null };
}

/**
 * Resolve the audience to a Prisma `where` over User. USER targets accept a
 * user id or an email (case-insensitive). Banned and soft-deleted users are
 * always excluded.
 */
async function audienceWhere(
  audienceType: AudienceType,
  audienceTarget: string | null | undefined,
): Promise<Prisma.UserWhereInput> {
  const base: Prisma.UserWhereInput = { banned: false, deletedAt: null };
  if (audienceType === "USER") {
    const t = audienceTarget?.trim();
    if (!t) throw new Error("USER audience requires a user id or email.");
    return t.includes("@")
      ? { ...base, email: { equals: t, mode: "insensitive" } }
      : { ...base, id: t };
  }
  if (audienceType === "WORKSPACE") {
    if (!audienceTarget) throw new Error("WORKSPACE audience requires a workspaceId target.");
    return { ...base, workspaces: { some: { workspaceId: audienceTarget } } };
  }
  if (audienceType === "ALL_CANDIDATES") return { ...base, userType: "candidate" };
  if (audienceType === "ALL_RECRUITERS") return { ...base, userType: "recruiter" };
  // ALL: every user, including legacy rows whose userType was never set.
  return base;
}

/** Page through matching user ids in stable id order, CHUNK_SIZE at a time. */
async function* audienceIdPages(where: Prisma.UserWhereInput): AsyncGenerator<string[]> {
  let cursor: string | undefined;
  while (true) {
    const page = await prisma.user.findMany({
      where,
      select: { id: true },
      orderBy: { id: "asc" },
      take: CHUNK_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (page.length === 0) return;
    yield page.map((u) => u.id);
    if (page.length < CHUNK_SIZE) return;
    cursor = page[page.length - 1].id;
  }
}

export async function previewAudienceCountAction(
  audienceType: AudienceType,
  audienceTarget?: string | null,
): Promise<number> {
  await assertAdmin();
  return prisma.user.count({ where: await audienceWhere(audienceType, audienceTarget) });
}

export async function dispatchBroadcastAction(
  input: DispatchBroadcastInput,
): Promise<DispatchBroadcastResult> {
  const { userId, email: actorEmail } = await assertAdmin();

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
  const hrefError = href ? broadcastHrefError(href) : null;
  if (hrefError) throw new Error(hrefError);

  if (!AUDIENCE_TYPES.includes(input.audienceType)) {
    throw new Error("Unknown audience type.");
  }
  const audienceTarget =
    input.audienceType === "WORKSPACE" || input.audienceType === "USER"
      ? input.audienceTarget ?? null
      : null;

  // Count recipients BEFORE creating the broadcast row so we don't leave
  // an empty stub if the audience is empty.
  const where = await audienceWhere(input.audienceType, audienceTarget);
  const expected = await prisma.user.count({ where });
  if (expected === 0) {
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
  for await (const chunk of audienceIdPages(where)) {
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

  await logAdminAction({
    actor: { id: userId, email: actorEmail },
    action: "broadcast.send",
    targetType: "broadcast",
    targetId: finalised.id,
    targetLabel: title,
    after: {
      audienceType: input.audienceType,
      audienceTarget,
      title,
      body,
      href,
      recipientCount: finalised.recipientCount,
    },
    note: input.resendOf ? `Resend of ${input.resendOf}` : null,
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
    resendOf: broadcastId,
  });
}
