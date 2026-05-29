/**
 * In-app notification helpers (IP-40). One row per user per delivered
 * notification — see `Notification` model in schema.prisma.
 *
 * Read path:
 *   - `getUnreadCount(userId)` — for the bell badge.
 *   - `listForUser(userId, limit)` — for the dropdown list.
 * Write path:
 *   - `createNotification(...)` — the single fan-in for any trigger.
 *   - `markRead(userId, id)`, `markAllRead(userId)`, `dismiss(userId, id)` —
 *     user-driven state changes.
 *
 * Every mutation is scoped by `userId` so the API surface is impossible to
 * misuse cross-user even if the caller forgets to check session.
 */
import { prisma } from "./prisma";

export const NOTIFICATION_TYPES = {
  INTERVIEW_SCHEDULED: "INTERVIEW_SCHEDULED",
  INTERVIEW_REPLAY_READY: "INTERVIEW_REPLAY_READY",
  TAKE_HOME_EXPIRING: "TAKE_HOME_EXPIRING",
  TAKE_HOME_SUBMITTED: "TAKE_HOME_SUBMITTED",
  SCORECARD_REQUESTED: "SCORECARD_REQUESTED",
  PROMPT_UPVOTED: "PROMPT_UPVOTED",
  AI_CREDITS_LOW: "AI_CREDITS_LOW",
  SECURITY_2FA_ENABLED: "SECURITY_2FA_ENABLED",
  SECURITY_2FA_DISABLED: "SECURITY_2FA_DISABLED",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  /** Event-specific JSON. Kept small — no secrets, no full DB rows. */
  payload?: Record<string, unknown>;
};

export async function createNotification(input: CreateNotificationInput) {
  // IP-47: honor per-user preference at write time. If the user has opted
  // out of this type, we skip the insert entirely (preferences would be
  // decorative if we still wrote the row). Security types + ADMIN_BROADCAST
  // are forced-on inside isInAppEnabled — those can't be suppressed.
  const { isInAppEnabled } = await import("./notifications/preferences");
  const allowed = await isInAppEnabled(input.userId, input.type);
  if (!allowed) {
    return { id: null, createdAt: null, skipped: true as const };
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body ? input.body.slice(0, 500) : null,
      href: input.href ?? null,
      payload: input.payload ? JSON.stringify(input.payload) : null,
    },
    select: { id: true, createdAt: true },
  });
}

export type NotificationRowView = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

const LIST_LIMIT_DEFAULT = 12;

export async function listForUser(
  userId: string,
  limit = LIST_LIMIT_DEFAULT,
): Promise<NotificationRowView[]> {
  const rows = await prisma.notification.findMany({
    where: { userId, dismissedAt: null },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    href: r.href,
    payload: r.payload ? safeJson(r.payload) : null,
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null, dismissedAt: null },
  });
}

export async function markRead(userId: string, id: string) {
  // `updateMany` with the userId predicate so a guessed id from another user
  // simply matches zero rows — defense in depth on top of the API auth check.
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null, dismissedAt: null },
    data: { readAt: new Date() },
  });
}

export async function dismiss(userId: string, id: string) {
  await prisma.notification.updateMany({
    where: { id, userId, dismissedAt: null },
    data: { dismissedAt: new Date() },
  });
}

function safeJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
