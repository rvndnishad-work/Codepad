/**
 * Per-type notification preference defaults + helpers (IP-47).
 *
 * Three layers govern whether a notification of type T reaches user U:
 *   1. FORCED_ON set        — security/system types ignore preferences entirely
 *   2. NotificationPreference(userId, type) row — explicit user choice
 *   3. DEFAULTS[type]       — fallback when no row exists
 *
 * The resolution lives in `isInAppEnabled` / `isEmailEnabled` so call sites
 * never reach into the table directly.
 */
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications";

/**
 * Types the user cannot opt out of, ever. Security events are alerts the
 * user explicitly asked us to send when they enrolled in 2FA; admin
 * broadcasts are platform-wide system messages (maintenance, policy).
 * Suppressing either would create real safety/UX risk.
 */
export const FORCED_ON = new Set<string>([
  NOTIFICATION_TYPES.SECURITY_2FA_ENABLED,
  NOTIFICATION_TYPES.SECURITY_2FA_DISABLED,
  "ADMIN_BROADCAST",
]);

/**
 * Default state per type when no NotificationPreference row exists.
 * Currently every event type defaults to in-app ON; email defaults to ON too
 * but IP-66 controls whether the email side actually fires until IP-24 ships.
 */
type DefaultFlags = { inApp: boolean; email: boolean };
export const DEFAULTS: Record<string, DefaultFlags> = {
  [NOTIFICATION_TYPES.INTERVIEW_SCHEDULED]: { inApp: true, email: true },
  [NOTIFICATION_TYPES.INTERVIEW_REPLAY_READY]: { inApp: true, email: true },
  [NOTIFICATION_TYPES.TAKE_HOME_EXPIRING]: { inApp: true, email: true },
  [NOTIFICATION_TYPES.TAKE_HOME_SUBMITTED]: { inApp: true, email: true },
  [NOTIFICATION_TYPES.SCORECARD_REQUESTED]: { inApp: true, email: true },
  [NOTIFICATION_TYPES.PROMPT_UPVOTED]: { inApp: true, email: false },
  [NOTIFICATION_TYPES.AI_CREDITS_LOW]: { inApp: true, email: true },
  [NOTIFICATION_TYPES.SECURITY_2FA_ENABLED]: { inApp: true, email: true },
  [NOTIFICATION_TYPES.SECURITY_2FA_DISABLED]: { inApp: true, email: true },
  ADMIN_BROADCAST: { inApp: true, email: false },
};

function fallback(type: string): DefaultFlags {
  return DEFAULTS[type] ?? { inApp: true, email: true };
}

/**
 * Returns true if the notification SHOULD be inserted as an in-app row.
 * Always true for FORCED_ON types regardless of preferences.
 *
 * Used inside createNotification — if this returns false, we skip the
 * insert entirely (not just hide the row). Honoring at write time means
 * preferences aren't decorative.
 */
export async function isInAppEnabled(
  userId: string,
  type: string,
): Promise<boolean> {
  if (FORCED_ON.has(type)) return true;
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
    select: { inAppEnabled: true },
  });
  if (pref) return pref.inAppEnabled;
  return fallback(type).inApp;
}

/**
 * Email channel — same resolution as in-app. Used by the future email
 * dispatcher (IP-24/IP-66). Surfaced here so the read path is consistent.
 */
export async function isEmailEnabled(
  userId: string,
  type: string,
): Promise<boolean> {
  if (FORCED_ON.has(type)) return true;
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
    select: { emailEnabled: true },
  });
  if (pref) return pref.emailEnabled;
  return fallback(type).email;
}

export type PreferenceView = {
  type: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  forcedOn: boolean;
  defaultInApp: boolean;
  defaultEmail: boolean;
};

/**
 * Surface every known type as a view row, applying the user's overrides on
 * top of the defaults. Used by the /profile/notifications UI.
 */
export async function getPreferencesView(userId: string): Promise<PreferenceView[]> {
  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
    select: { type: true, inAppEnabled: true, emailEnabled: true },
  });
  const byType = new Map(rows.map((r) => [r.type, r]));
  const allTypes = Array.from(new Set([
    ...Object.values(NOTIFICATION_TYPES),
    "ADMIN_BROADCAST",
  ]));
  return allTypes.map((type) => {
    const def = fallback(type);
    const override = byType.get(type);
    return {
      type,
      inAppEnabled: override?.inAppEnabled ?? def.inApp,
      emailEnabled: override?.emailEnabled ?? def.email,
      forcedOn: FORCED_ON.has(type),
      defaultInApp: def.inApp,
      defaultEmail: def.email,
    };
  });
}
