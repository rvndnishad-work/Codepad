/**
 * Pure rules behind Settings > Security, shared by the tab, the invite API,
 * the join flow, the API key actions and the workspace gate. No database
 * access, so client components and unit tests can use it too.
 *
 * The stored fields and their save rules live in settings.ts; this file adds
 * the small decisions built on top of them.
 */
import { EXPIRY_CHOICES, DEFAULT_EXPIRY_DAYS } from "@/lib/mcp/keys";
import { isEmailDomainAllowed, type WorkspaceSettings } from "./settings";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** How often the "Email them now" two-factor reminder can be sent. */
export const TWO_FACTOR_REMINDER_COOLDOWN_MS = HOUR_MS;

/** How many days ahead the start date is set when two-factor is first turned on. */
export const TWO_FACTOR_DEFAULT_LEAD_DAYS = 7;

/* ── Allowed email domains ─────────────────────────────────────────────── */

/**
 * The domain of an email and every parent domain with at least two labels:
 * "a@eu.mail.acme.com" -> ["eu.mail.acme.com", "mail.acme.com", "acme.com"].
 * Used to find workspaces whose allowed list covers this address, since an
 * allowed domain also covers its subdomains.
 */
export function domainSuffixes(email: string): string[] {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 1) return [];
  const labels = email.trim().toLowerCase().slice(at + 1).split(".").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i <= labels.length - 2; i++) out.push(labels.slice(i).join("."));
  return out;
}

/** "acme.com", "acme.com or beta.io", "acme.com, beta.io or gamma.dev". */
export function listDomains(domains: string[]): string {
  if (domains.length <= 1) return domains[0] ?? "";
  return `${domains.slice(0, -1).join(", ")} or ${domains[domains.length - 1]}`;
}

/**
 * Why an invite to this address is refused by the workspace's allowed
 * domains, or null when it may go out. Used by the invite API and bulk invite.
 */
export function inviteDomainError(s: Pick<WorkspaceSettings, "allowedEmailDomains">, email: string): string | null {
  if (isEmailDomainAllowed(s, email)) return null;
  return `This workspace only invites people with an email at ${listDomains(s.allowedEmailDomains)}. An owner or admin can change this in Settings, Security.`;
}

/** Members whose email is outside the allowed domains. They keep access; the list is only shown. */
export function membersOutsideDomains<M extends { email: string | null }>(
  s: Pick<WorkspaceSettings, "allowedEmailDomains">,
  members: M[],
): M[] {
  if (!s.allowedEmailDomains.length) return [];
  return members.filter((m) => !m.email || !isEmailDomainAllowed(s, m.email));
}

/* ── Two-factor ────────────────────────────────────────────────────────── */

export type TwoFactorPolicy =
  | { state: "off" }
  | { state: "scheduled"; from: Date }
  | { state: "on"; since: Date | null };

/** Where "two-factor for everyone" stands right now. */
export function twoFactorPolicy(
  s: Pick<WorkspaceSettings, "require2faForAll" | "require2faFrom">,
  now: Date = new Date(),
): TwoFactorPolicy {
  if (!s.require2faForAll) return { state: "off" };
  if (s.require2faFrom && s.require2faFrom.getTime() > now.getTime()) return { state: "scheduled", from: s.require2faFrom };
  return { state: "on", since: s.require2faFrom };
}

/** Whether the reminder email can go out again, and if not, how many minutes to wait. */
export function twoFactorReminderWait(remindedAt: Date | null, now: Date = new Date()): number {
  if (!remindedAt) return 0;
  const left = remindedAt.getTime() + TWO_FACTOR_REMINDER_COOLDOWN_MS - now.getTime();
  return left > 0 ? Math.ceil(left / 60_000) : 0;
}

/** "YYYY-MM-DD" for a date input, in UTC (the start date is stored at UTC midnight). */
export function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** Default start date offered when two-factor for everyone is first turned on. */
export function defaultTwoFactorStart(now: Date = new Date()): string {
  return toDateInput(new Date(now.getTime() + TWO_FACTOR_DEFAULT_LEAD_DAYS * DAY_MS));
}

/* ── Sign-in length ────────────────────────────────────────────────────── */

/** Where the workspace gate sends a sign-in that is no longer good here. */
export function signedOutPath(slug: string): string {
  return `/api/w/${encodeURIComponent(slug)}/session-expired`;
}

/** Where someone lands after being signed out for this workspace. */
export function signInAgainPath(slug: string): string {
  return `/login?next=${encodeURIComponent(`/w/${slug}`)}&reason=signed-out`;
}

/* ── API key lifetime ──────────────────────────────────────────────────── */

export type KeyExpiryChoice = { days: number; label: string };

/** Expiry choices the create-key dialog may offer under the workspace limit ("Never" drops out). */
export function allowedKeyExpiryChoices(maxDays: number | null): KeyExpiryChoice[] {
  const all = EXPIRY_CHOICES.map((c) => ({ days: c.days, label: c.label }));
  if (!maxDays) return all;
  const within = all.filter((c) => c.days > 0 && c.days <= maxDays);
  // A limit shorter than every choice still offers that limit itself.
  return within.length ? within : [{ days: maxDays, label: `${maxDays} days` }];
}

/** The choice the create-key dialog starts on. */
export function defaultKeyExpiryDays(maxDays: number | null): number {
  const choices = allowedKeyExpiryChoices(maxDays);
  if (choices.some((c) => c.days === DEFAULT_EXPIRY_DAYS)) return DEFAULT_EXPIRY_DAYS;
  return choices.filter((c) => c.days > 0).reduce((a, c) => Math.max(a, c.days), 0) || choices[0].days;
}

/**
 * Expiry for a rotated key. It keeps the old key's expiry, but never past the
 * workspace limit: rotating a key made before the limit brings it in line.
 */
export function rotatedKeyExpiry(
  s: Pick<WorkspaceSettings, "apiKeyMaxLifetimeDays">,
  oldExpiresAt: Date | null,
  now: Date = new Date(),
): Date | null {
  if (!s.apiKeyMaxLifetimeDays) return oldExpiresAt;
  const latest = new Date(now.getTime() + s.apiKeyMaxLifetimeDays * DAY_MS);
  if (!oldExpiresAt || oldExpiresAt.getTime() > latest.getTime()) return latest;
  return oldExpiresAt;
}

/** Active keys that break the current limit: no expiry, or an expiry past it. */
export function keysOverLimit<K extends { expiresAt: Date | null; revokedAt: Date | null }>(
  s: Pick<WorkspaceSettings, "apiKeyMaxLifetimeDays">,
  keys: K[],
  now: Date = new Date(),
): K[] {
  const live = keys.filter((k) => !k.revokedAt && (!k.expiresAt || k.expiresAt.getTime() > now.getTime()));
  if (!s.apiKeyMaxLifetimeDays) return live.filter((k) => !k.expiresAt);
  const latest = now.getTime() + s.apiKeyMaxLifetimeDays * DAY_MS + 60_000;
  return live.filter((k) => !k.expiresAt || k.expiresAt.getTime() > latest);
}
