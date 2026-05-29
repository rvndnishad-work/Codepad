/**
 * Plain types + constants for the broadcast feature (IP-45). Separated from
 * broadcast.ts so the actions file can carry "use server" without violating
 * the "only async function exports" rule.
 */

export const AUDIENCE_TYPES = [
  "ALL",
  "ALL_CANDIDATES",
  "ALL_RECRUITERS",
  "WORKSPACE",
  "USER",
] as const;
export type AudienceType = (typeof AUDIENCE_TYPES)[number];

export type DispatchBroadcastInput = {
  audienceType: AudienceType;
  /** Required when audienceType is "WORKSPACE" (workspace id) or "USER" (user id). */
  audienceTarget?: string | null;
  title: string;
  body?: string;
  href?: string;
};

export type DispatchBroadcastResult = {
  broadcastId: string;
  recipientCount: number;
  sentAt: string;
};

export type SentBroadcastRow = {
  id: string;
  audienceType: string;
  audienceTarget: string | null;
  audienceLabel: string;
  title: string;
  body: string | null;
  href: string | null;
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
  composedByEmail: string | null;
};
