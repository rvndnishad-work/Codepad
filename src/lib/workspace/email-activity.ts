/**
 * Email activity (/w/[slug]/emails): status groups, filters, paging and the
 * resend rules. Pure, so the page, the resend action and tests share it.
 *
 * EmailLog.status values: queued | sent | failed | delivered | bounced |
 * complained | opened | clicked | suppressed.
 */

/* ── Status groups ──────────────────────────────────────────────────────── */

export const EMAIL_STATUS_GROUPS = [
  { id: "all", label: "All", statuses: null },
  { id: "delivered", label: "Delivered", statuses: ["delivered", "opened", "clicked"] },
  { id: "opened", label: "Opened", statuses: ["opened", "clicked"] },
  { id: "pending", label: "Not yet delivered", statuses: ["queued", "sent"] },
  { id: "bounced", label: "Bounced", statuses: ["bounced", "complained"] },
  { id: "failed", label: "Not sent", statuses: ["failed", "suppressed"] },
] as const;

export type EmailStatusGroup = (typeof EMAIL_STATUS_GROUPS)[number]["id"];

export function isEmailStatusGroup(v: unknown): v is EmailStatusGroup {
  return typeof v === "string" && EMAIL_STATUS_GROUPS.some((g) => g.id === v);
}

/** Count each group from raw per-status counts (groups overlap on purpose). */
export function groupCounts(byStatus: Record<string, number>): Record<EmailStatusGroup, number> {
  const out = {} as Record<EmailStatusGroup, number>;
  for (const g of EMAIL_STATUS_GROUPS) {
    out[g.id] = g.statuses
      ? g.statuses.reduce((n, s) => n + (byStatus[s] ?? 0), 0)
      : Object.values(byStatus).reduce((n, c) => n + c, 0);
  }
  return out;
}

export type StatusTone = "ok" | "bad" | "warn" | "neutral";

/** The chip shown for one email: text plus tone. */
export function statusChip(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case "delivered":
      return { label: "Delivered", tone: "ok" };
    case "opened":
      return { label: "Opened", tone: "ok" };
    case "clicked":
      return { label: "Link clicked", tone: "ok" };
    case "queued":
      return { label: "Waiting to send", tone: "neutral" };
    case "sent":
      return { label: "Sent, not yet delivered", tone: "neutral" };
    case "bounced":
      return { label: "Bounced", tone: "bad" };
    case "complained":
      return { label: "Marked as spam", tone: "bad" };
    case "failed":
      return { label: "Not sent", tone: "warn" };
    case "suppressed":
      return { label: "Not sent, address blocked", tone: "warn" };
    default:
      return { label: status, tone: "neutral" };
  }
}

/** Plain explanation for a problem status, shown under the chip and in the drawer. */
export function problemExplanation(status: string, errorReason: string | null): string | null {
  const reason = errorReason?.trim();
  switch (status) {
    case "bounced":
      return reason
        ? `The receiving server refused it: ${reason}. Check the address for typos.`
        : "The receiving server refused it. Check the address for typos.";
    case "complained":
      return "The recipient marked this email as spam, so we will not send to this address again.";
    case "suppressed":
      return "This address bounced or complained before, so we did not send to it. Fix the address on the candidate before trying again.";
    case "failed":
      return reason ? `Our email provider did not accept it: ${reason}.` : "Our email provider did not accept it.";
    default:
      return null;
  }
}

/* ── Templates ──────────────────────────────────────────────────────────── */

export const TEMPLATE_LABELS: Record<string, string> = {
  "ai-screening-invite": "AI screening invite",
  "screening-completed": "AI screening finished",
  "take-home-invite": "Take-home invite (older)",
  "take-home-session-invite": "Take-home invite",
  "take-home-reminder": "Take-home reminder",
  "take-home-submitted-candidate": "Take-home receipt to candidate",
  "take-home-submitted-recruiter": "Take-home submitted, to you",
  "interview-invite": "Interview invite",
  "interviewer-invite": "Interview details, guest",
  "workspace-invite": "Workspace invite",
  "otp-verification": "Sign-in code",
};

export function templateLabel(t: string): string {
  if (TEMPLATE_LABELS[t]) return TEMPLATE_LABELS[t];
  const words = t.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ── Resend ─────────────────────────────────────────────────────────────── */

/** Statuses where resending makes sense: the email did not arrive. */
export const RESENDABLE_STATUSES = ["failed", "bounced", "suppressed"] as const;

/** Which existing resend path a template maps to, if any. */
export type ResendPath = "ai-screening" | "take-home";

export function resendPathFor(template: string): ResendPath | null {
  if (template === "ai-screening-invite") return "ai-screening";
  if (template === "take-home-session-invite") return "take-home";
  return null;
}

/** True when the drawer should offer Resend for this row. */
export function canOfferResend(row: { template: string; status: string }): boolean {
  return resendPathFor(row.template) !== null && (RESENDABLE_STATUSES as readonly string[]).includes(row.status);
}

/* ── Query ──────────────────────────────────────────────────────────────── */

export const EMAIL_PAGE_SIZE = 25;

export type EmailQuery = { status: EmailStatusGroup; template: string; q: string; page: number };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseEmailQuery(sp: Params): EmailQuery {
  const status = one(sp.status);
  const template = one(sp.template);
  const page = Number.parseInt(one(sp.page), 10);
  return {
    status: isEmailStatusGroup(status) ? status : "all",
    template: /^[a-z0-9-]{1,60}$/.test(template) ? template : "",
    q: one(sp.q).trim().slice(0, 120),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/**
 * Prisma `where` for EmailLog in one workspace. The search matches the
 * address itself, plus the addresses of candidates whose name matched
 * (looked up by the caller and passed as `nameMatches`).
 */
export function emailWhere(
  workspaceId: string,
  q: Pick<EmailQuery, "status" | "template" | "q">,
  nameMatches: string[] = [],
): Record<string, unknown> {
  const where: Record<string, unknown> = { workspaceId };
  const group = EMAIL_STATUS_GROUPS.find((g) => g.id === q.status);
  if (group?.statuses) where.status = { in: [...group.statuses] };
  if (q.template) where.template = q.template;
  if (q.q) {
    const byAddress = { recipientEmail: { contains: q.q.toLowerCase(), mode: "insensitive" } };
    const emails = [...new Set(nameMatches.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    where.OR = emails.length ? [byAddress, { recipientEmail: { in: emails } }] : [byAddress];
  }
  return where;
}
