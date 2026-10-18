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
  /** Set by resendBroadcastAction so the audit row says which send it repeats. */
  resendOf?: string;
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

/**
 * Validate a broadcast link. Allowed: a same-site path starting with a single
 * "/" (not "//", which browsers treat as another host), or an absolute
 * https:// URL. Everything else (javascript:, data:, http:, bare hosts) is
 * refused. Returns null when valid, else the reason. Shared by the composer
 * (inline hint) and the server action (the real check).
 */
export function broadcastHrefError(href: string): string | null {
  const h = href.trim();
  if (!h) return null;
  if (h.length > 2048) return "Link is too long.";
  // eslint-disable-next-line no-control-regex
  if (/[\s\\\u0000-\u001f\u007f]/.test(h)) {
    return "Link cannot contain spaces, backslashes or control characters.";
  }
  if (h.startsWith("/")) {
    if (h.startsWith("//")) return "Use a path like /pricing or a full https:// link.";
    return null;
  }
  let url: URL;
  try {
    url = new URL(h);
  } catch {
    return "Use a path starting with / or a full https:// link.";
  }
  if (url.protocol !== "https:") return "Only https:// links are allowed.";
  if (!url.hostname) return "That link has no host.";
  return null;
}
