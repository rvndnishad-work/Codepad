/**
 * Inviting several people at once: turn a pasted list into rows, then flag
 * the rows that cannot be invited (already a member, outside the allowed
 * email domains, no seat left). Pure, so the dialog shows exactly what the
 * server will decide.
 */
import { INVITABLE_ROLES } from "./members";
import { isEmailDomainAllowed } from "./settings";

export const INVITE_TTL_DAYS = 14;
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;
/** Most rows one bulk invite accepts. */
export const MAX_BULK_INVITES = 50;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export function isInvitableRole(v: unknown): v is InvitableRole {
  return typeof v === "string" && (INVITABLE_ROLES as readonly string[]).includes(v);
}

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

export function isValidEmail(v: string): boolean {
  return v.length <= 254 && EMAIL_RE.test(v);
}

export type ParsedInvite = { email: string; valid: boolean };

/**
 * Split pasted text into addresses. Accepts commas, semicolons, spaces and
 * new lines, and "Name <name@acme.com>" as copied from a mail client.
 * Lowercased and de-duplicated, in the order pasted.
 */
export function parseInviteList(text: string): ParsedInvite[] {
  const out: ParsedInvite[] = [];
  const seen = new Set<string>();
  const angle = /<([^<>]+)>/g;
  // Pull addresses out of angle brackets first, so the display names around them are dropped.
  const bracketed = [...text.matchAll(angle)].map((m) => m[1]);
  const rest = text.replace(angle, " ");
  const tokens = [...bracketed, ...rest.split(/[\s,;]+/)]
    .map((t) => t.trim().replace(/^mailto:/i, "").replace(/^["'(]+|["').]+$/g, "").toLowerCase())
    .filter(Boolean);
  for (const t of tokens) {
    // Words that are clearly part of a display name ("Ana", "Lopez") are not addresses.
    if (!t.includes("@")) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push({ email: t, valid: isValidEmail(t) });
  }
  return out;
}

export type InviteIssue = "invalid" | "member" | "domain" | "seats" | "duplicate";

export const INVITE_ISSUE_LABELS: Record<InviteIssue, string> = {
  invalid: "Not a valid email",
  member: "Already a member",
  domain: "Outside allowed domains",
  seats: "No seat left",
  duplicate: "Listed twice",
};

export type InviteRowInput = { email: string; role: string };

export type ClassifiedInvite = {
  email: string;
  role: string;
  issue: InviteIssue | null;
  /** An invite to this address is already open; sending replaces it and keeps its seat. */
  reinvite: boolean;
};

export type InviteContext = {
  /** Emails of current members, any case. */
  memberEmails: Iterable<string>;
  /** Emails with an open, unexpired invite. Re-inviting them does not take a new seat. */
  pendingEmails: Iterable<string>;
  /** Allowed domains; empty allows any. Subdomains of an allowed domain count. */
  allowedDomains: string[];
  /** Seats left before the cap, or null when seats are not capped. */
  seatsRemaining: number | null;
};

/** Same rule as the single invite API (Settings > Security). */
function domainAllowed(email: string, allowed: string[]): boolean {
  return isEmailDomainAllowed({ allowedEmailDomains: allowed }, email);
}

/**
 * Flag each row. The first problem wins, in this order: invalid, listed
 * twice, already a member, outside the allowed domains, no seat left. Seats
 * are handed out top to bottom, so the rows past the cap are the ones flagged.
 */
export function classifyInvites(rows: InviteRowInput[], ctx: InviteContext): ClassifiedInvite[] {
  const members = new Set([...ctx.memberEmails].map((e) => e.trim().toLowerCase()));
  const pending = new Set([...ctx.pendingEmails].map((e) => e.trim().toLowerCase()));
  const seen = new Set<string>();
  let seats = ctx.seatsRemaining;
  return rows.map((r) => {
    const email = r.email.trim().toLowerCase();
    const base = { email, role: r.role, reinvite: pending.has(email) };
    let issue: InviteIssue | null = null;
    if (!isValidEmail(email)) issue = "invalid";
    else if (seen.has(email)) issue = "duplicate";
    else if (members.has(email)) issue = "member";
    else if (!domainAllowed(email, ctx.allowedDomains)) issue = "domain";
    else if (!base.reinvite && seats !== null) {
      if (seats <= 0) issue = "seats";
      else seats -= 1;
    }
    seen.add(email);
    return { ...base, issue };
  });
}

/** Rows that will be sent. */
export function sendableInvites(rows: ClassifiedInvite[]): ClassifiedInvite[] {
  return rows.filter((r) => r.issue === null);
}

/** Role counts for the audit entry, like { RECRUITER: 2, INTERVIEWER: 1 }. */
export function roleCounts(rows: { role: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.role] = (out[r.role] ?? 0) + 1;
  return out;
}
