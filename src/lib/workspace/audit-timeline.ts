/**
 * Audit log timeline: categories, filters, paging, readable sentences and
 * CSV rows for the workspace audit log (/w/[slug]/audit).
 *
 * Pure and synchronous. The page and the CSV export build the same Prisma
 * `where` from `auditWhere`, so what you see is what you export.
 */
import { REJECT_REASON_LABELS, STAGE_LABELS, normalizeStage, type RejectReason } from "@/lib/crm/stages";

const DAY_MS = 86_400_000;

/* ── Categories ─────────────────────────────────────────────────────────── */

export const AUDIT_CATEGORIES = [
  { id: "all", label: "Everything" },
  { id: "decisions", label: "Decisions" },
  { id: "candidates", label: "Candidates" },
  { id: "screenings", label: "Screenings" },
  { id: "people", label: "People" },
  { id: "connections", label: "Connections and keys" },
  { id: "billing", label: "Billing" },
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]["id"];
type RealCategory = Exclude<AuditCategory, "all">;

/**
 * Which actions belong to which category. Prefix rules mean a new action such
 * as `WEBHOOK_SOMETHING` lands in the right chip without touching this file.
 * Order matters: the first matching category wins.
 */
const CATEGORY_RULES: { id: RealCategory; exact: string[]; prefixes: string[] }[] = [
  { id: "decisions", exact: ["PIPELINE_STAGE_CHANGED"], prefixes: [] },
  { id: "candidates", exact: ["CANDIDATES_IMPORTED"], prefixes: ["CANDIDATE_", "BATCH_"] },
  {
    id: "screenings",
    exact: ["BULK_TAKE_HOME_DISPATCHED"],
    prefixes: ["AI_SCREENING_", "AI_QUESTION_", "TAKE_HOME_", "INTERVIEW"],
  },
  { id: "people", exact: [], prefixes: ["MEMBER_", "ROLE_"] },
  {
    id: "connections",
    exact: [],
    prefixes: ["ATS_", "WEBHOOK_", "API_KEY_", "MCP_", "EXTERNAL_MCP_", "CALENDAR_", "SLACK_", "TEAMS_", "INTEGRATION_"],
  },
  { id: "billing", exact: [], prefixes: ["BILLING_", "PLAN_", "SUBSCRIPTION_", "CREDIT", "TRIAL_"] },
];

export function isAuditCategory(v: unknown): v is AuditCategory {
  return typeof v === "string" && AUDIT_CATEGORIES.some((c) => c.id === v);
}

export function categoryOf(action: string): RealCategory | "other" {
  for (const rule of CATEGORY_RULES) {
    if (rule.exact.includes(action) || rule.prefixes.some((p) => action.startsWith(p))) return rule.id;
  }
  return "other";
}

export function categoryLabel(id: RealCategory | "other"): string {
  return AUDIT_CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}

/**
 * Prisma `where` fragment for one category. A prefix rule can also match an
 * action an earlier category claims exactly (none do today), so the result
 * is the union of the category's own rules.
 */
function categoryWhere(id: RealCategory): Record<string, unknown> {
  const rule = CATEGORY_RULES.find((r) => r.id === id)!;
  const or: Record<string, unknown>[] = [];
  if (rule.exact.length) or.push({ action: { in: rule.exact } });
  for (const p of rule.prefixes) or.push({ action: { startsWith: p } });
  return or.length === 1 ? or[0] : { OR: or };
}

/* ── Date ranges ────────────────────────────────────────────────────────── */

export const AUDIT_RANGES = [
  { id: "24h", label: "Last 24 hours", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
  { id: "custom", label: "Pick dates", days: null },
] as const;

export type AuditRange = (typeof AUDIT_RANGES)[number]["id"];
export const DEFAULT_AUDIT_RANGE: AuditRange = "30d";

/** Actor filter value for rows with no person behind them: API keys, syncs, automation. */
export const ACTOR_AUTOMATION = "automation";

/* ── Query parsing ──────────────────────────────────────────────────────── */

export const AUDIT_PAGE_SIZE = 50;
/** Hard cap for one CSV export. */
export const AUDIT_EXPORT_MAX = 5000;

export type AuditQuery = {
  category: AuditCategory;
  /** "" = anyone, a user id, or ACTOR_AUTOMATION. */
  actor: string;
  range: AuditRange;
  /** yyyy-mm-dd, only used when range is "custom". */
  from: string;
  to: string;
  page: number;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseAuditQuery(sp: Params): AuditQuery {
  const category = one(sp.category);
  const range = one(sp.range);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Number.parseInt(one(sp.page), 10);
  return {
    category: isAuditCategory(category) ? category : "all",
    actor: one(sp.actor).slice(0, 64),
    range: AUDIT_RANGES.some((r) => r.id === range) ? (range as AuditRange) : DEFAULT_AUDIT_RANGE,
    from: ISO_DAY.test(from) ? from : "",
    to: ISO_DAY.test(to) ? to : "",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** Turn the query back into URL params, dropping defaults so links stay short. */
export function auditQueryParams(q: AuditQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.category !== "all") sp.set("category", q.category);
  if (q.actor) sp.set("actor", q.actor);
  if (q.range !== DEFAULT_AUDIT_RANGE) sp.set("range", q.range);
  if (q.range === "custom") {
    if (q.from) sp.set("from", q.from);
    if (q.to) sp.set("to", q.to);
  }
  if (q.page > 1) sp.set("page", String(q.page));
  return sp;
}

/** The time window a query covers. `to` is exclusive. */
export function auditWindow(q: Pick<AuditQuery, "range" | "from" | "to">, now: Date = new Date()): { gte?: Date; lt?: Date } {
  if (q.range === "all") return {};
  if (q.range === "custom") {
    const w: { gte?: Date; lt?: Date } = {};
    if (q.from) w.gte = new Date(`${q.from}T00:00:00.000Z`);
    // The "to" day is included in full.
    if (q.to) w.lt = new Date(new Date(`${q.to}T00:00:00.000Z`).getTime() + DAY_MS);
    return w;
  }
  const days = AUDIT_RANGES.find((r) => r.id === q.range)?.days ?? 30;
  return { gte: new Date(now.getTime() - days * DAY_MS) };
}

/** Prisma `where` for WorkspaceAuditLog, shared by the page and the CSV export. */
export function auditWhere(workspaceId: string, q: AuditQuery, now: Date = new Date()): Record<string, unknown> {
  const and: Record<string, unknown>[] = [{ workspaceId }];
  if (q.category !== "all") and.push(categoryWhere(q.category));
  if (q.actor === ACTOR_AUTOMATION) and.push({ actorUserId: null });
  else if (q.actor) and.push({ actorUserId: q.actor });
  const w = auditWindow(q, now);
  if (w.gte || w.lt) and.push({ createdAt: { ...(w.gte ? { gte: w.gte } : {}), ...(w.lt ? { lt: w.lt } : {}) } });
  return and.length === 1 ? and[0] : { AND: and };
}

/** Clamp a page number to what exists and return the rows to skip. */
export function pageWindow(page: number, total: number, size: number = AUDIT_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pages);
  const skip = (current - 1) * size;
  return {
    page: current,
    pages,
    skip,
    take: size,
    first: total === 0 ? 0 : skip + 1,
    last: Math.min(skip + size, total),
  };
}

/* ── Readable rows ──────────────────────────────────────────────────────── */

export type AuditRowInput = {
  action: string;
  actorEmail: string | null;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
};

export type AuditTone = "override" | "danger" | "accent" | "neutral";

export type AuditSentence = {
  title: string;
  detail: string | null;
  tone: AuditTone;
  /** Small tag shown after the title, such as "Manual override". */
  tag: string | null;
  /** Who did it, as shown on the right of the row. */
  actor: string;
  /** Workspace-relative path to the thing it changed, when there is one. */
  path: string | null;
  pathLabel: string | null;
};

const LABELS: Record<string, string> = {
  API_KEY_CREATED: "Created API key",
  API_KEY_RENAMED: "Renamed API key",
  API_KEY_ROTATED: "Rotated API key",
  API_KEY_REVOKED: "Revoked API key",
  BULK_TAKE_HOME_DISPATCHED: "Sent take-homes in bulk",
  ATS_INTEGRATION_CONNECTED: "Connected the ATS",
  ATS_INTEGRATION_DISCONNECTED: "Disconnected the ATS",
  ATS_INTEGRATION_TEST_SENT: "Sent an ATS test event",
  CANDIDATE_CSV_IMPORTED: "Imported candidates from CSV",
  CANDIDATE_CREATED: "Added",
  CANDIDATE_UPDATED: "Edited",
  CANDIDATE_ARCHIVED: "Archived",
  CANDIDATE_RESTORED: "Restored",
  CANDIDATE_ERASED: "Erased",
  CANDIDATE_BATCH_CHANGED: "Changed the batch of",
  CANDIDATE_OWNER_CHANGED: "Changed the owner of",
  CANDIDATE_TAGS_CHANGED: "Changed the tags of",
  CANDIDATE_NOTE_ADDED: "Added a note to",
  CANDIDATE_NOTE_DELETED: "Deleted a note on",
  CANDIDATES_IMPORTED: "Imported candidates",
  BATCH_CREATED: "Created batch",
  BATCH_UPDATED: "Edited batch",
  BATCH_DELETED: "Deleted batch",
  AI_SCREENING_CREATED: "Sent AI screening",
  AI_SCREENING_CANDIDATES_ADDED: "Added people to AI screening",
  AI_SCREENING_INVITE_RESENT: "Resent the AI screening invite to",
  AI_SCREENING_REMINDED: "Sent an AI screening reminder to",
  AI_SCREENING_CANCELLED: "Cancelled the AI screening invite for",
  AI_SCREENING_DELETED: "Deleted the AI screening for",
  AI_SCREENING_PASS_MARK_CHANGED: "Changed the pass mark of",
  AI_QUESTION_SET_SAVED: "Saved AI question",
  AI_QUESTION_SET_DELETED: "Deleted AI question",
  TAKE_HOME_REMINDED: "Sent a take-home reminder to",
  TAKE_HOME_EXTENDED: "Extended the take-home deadline for",
  TAKE_HOME_CANCELLED: "Cancelled the take-home for",
  TAKE_HOME_INVITE_RESENT: "Resent the take-home invite to",
  TAKE_HOME_TEMPLATE_SAVED: "Saved take-home template",
  TAKE_HOME_TEMPLATE_DELETED: "Deleted take-home template",
  INTERVIEWS_SCHEDULED: "Scheduled interviews",
  INTERVIEW_QUESTIONS_SET: "Set interview questions",
  INTERVIEW_DELETED: "Deleted interview",
  MEMBER_INVITED: "Invited",
  MEMBER_INVITE_RESENT: "Resent the invite to",
  MEMBER_INVITE_REVOKED: "Withdrew the invite for",
  MEMBER_ROLE_CHANGED: "Changed the role of",
  MEMBER_PERMISSIONS_CHANGED: "Changed the permissions of",
  MEMBER_REMOVED: "Removed",
  WEBHOOK_ENDPOINT_CREATED: "Added webhook",
  WEBHOOK_ENDPOINT_UPDATED: "Edited webhook",
  WEBHOOK_ENDPOINT_DELETED: "Removed webhook",
  WEBHOOK_ENDPOINT_PAUSED: "Paused webhook",
  WEBHOOK_ENDPOINT_RESUMED: "Resumed webhook",
  WEBHOOK_ENDPOINT_AUTO_PAUSED: "Paused webhook after repeated failures",
  WEBHOOK_SECRET_REVEALED: "Viewed a webhook secret",
  WEBHOOK_SECRET_ROTATED: "Rotated a webhook secret",
  WEBHOOK_TEST_SENT: "Sent a webhook test",
  WEBHOOK_REDELIVERED: "Resent a webhook delivery",
};

const DANGER = /(_DELETED|_ERASED|_REMOVED|_REVOKED|_DISCONNECTED|_AUTO_PAUSED)$/;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** "BULK_TAKE_HOME_DISPATCHED" -> "Bulk take home dispatched". */
export function fallbackLabel(action: string): string {
  const words = action.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function actionLabel(action: string): string {
  return LABELS[action] ?? fallbackLabel(action);
}

/** Who did it: a person, an API key, or the system. */
export function actorLabel(row: Pick<AuditRowInput, "actorEmail" | "actorUserId" | "meta">, names: Record<string, string> = {}): string {
  if (row.actorUserId && names[row.actorUserId]) return names[row.actorUserId];
  if (row.actorEmail) return row.actorEmail;
  const key = str(row.meta?.apiKeyLabel);
  if (key) return `Key: ${key}`;
  const source = str(row.meta?.source);
  if (source?.startsWith("auto:")) return "Automatic";
  if (source) return fallbackLabel(source);
  return "System";
}

function targetPath(row: AuditRowInput): { path: string | null; label: string | null } {
  if (!row.targetId) return { path: null, label: null };
  switch (row.targetType) {
    case "candidate":
      return row.action === "CANDIDATE_ERASED" ? { path: null, label: null } : { path: `candidates/${row.targetId}`, label: "Open candidate" };
    case "aiInterviewSession":
      return row.action === "AI_SCREENING_DELETED" ? { path: null, label: null } : { path: `ai-interviews/${row.targetId}`, label: "Open screening" };
    case "aiScreeningBatch":
      return { path: `ai-interviews/screenings/${row.targetId}`, label: "Open screening" };
    case "interviewSession":
      return row.action.startsWith("TAKE_HOME_") ? { path: `take-homes/${row.targetId}`, label: "Open take-home" } : { path: null, label: null };
    default:
      return { path: null, label: null };
  }
}

function stageSentence(meta: Record<string, unknown>): Pick<AuditSentence, "title" | "detail" | "tone" | "tag"> {
  const name = str(meta.candidateName) ?? "a candidate";
  const to = normalizeStage(meta.toStage);
  const from = meta.fromStage ? normalizeStage(meta.fromStage) : null;
  const details: string[] = [];
  let tag: string | null = null;
  let tone: AuditTone = "accent";
  let title: string;
  if (to === "PASSED") {
    title = `Passed ${name}`;
    const override = str(meta.manualOverride);
    if (override) {
      tag = "Manual override";
      tone = "override";
      details.push(`Results below the bar: ${override}.`);
    }
  } else if (to === "REJECTED") {
    title = `Marked ${name} as not passed`;
    tone = "danger";
    const reason = str(meta.rejectReason);
    if (reason && reason in REJECT_REASON_LABELS) details.push(`Reason: ${REJECT_REASON_LABELS[reason as RejectReason]}.`);
  } else {
    title = `Moved ${name} to ${STAGE_LABELS[to]}`;
  }
  if (from && from !== to) details.unshift(`Was ${STAGE_LABELS[from]}.`);
  const bulk = num(meta.bulk);
  if (bulk && bulk > 1) details.push(`One of ${bulk} moved together.`);
  const tool = str(meta.tool);
  if (tool) details.push(`Through the ${tool} tool.`);
  return { title, detail: details.join(" ") || null, tone, tag };
}

/** Finish a sentence whose meta carries no name: "Added" -> "Added a candidate". */
function withoutSubject(action: string, label: string): string {
  if (/\s(to|for|of|on)$/.test(label)) {
    const who = action.startsWith("MEMBER_") ? "a member" : "a candidate";
    return `${label} ${who}`;
  }
  if (!label.includes(" ")) {
    if (action.startsWith("CANDIDATE_")) return `${label} a candidate`;
    if (action.startsWith("MEMBER_")) return `${label} a member`;
  }
  return label;
}

/**
 * One readable sentence per audit row, like "Passed Tomasz Nowak" with a
 * "Manual override" tag, or "Created API key Priya, Claude desktop".
 */
export function describeAuditRow(row: AuditRowInput, names: Record<string, string> = {}): AuditSentence {
  const meta = row.meta ?? {};
  const actor = actorLabel(row, names);
  const target = targetPath(row);
  const base = { actor, path: target.path, pathLabel: target.label };

  if (row.action === "PIPELINE_STAGE_CHANGED") return { ...base, ...stageSentence(meta) };

  if (row.action === "MCP_TOOL_CALLED") {
    const tool = str(meta.tool) ?? "a tool";
    const on = str(meta.candidateName);
    return {
      ...base,
      title: `Called ${tool}${on ? ` on ${on}` : ""}`,
      detail: str(meta.summary),
      tone: "neutral",
      tag: null,
    };
  }

  if (row.action.startsWith("API_KEY_")) {
    const name = str(meta.label) ?? "";
    const details: string[] = [];
    if (row.action === "API_KEY_RENAMED" && str(meta.previousLabel)) details.push(`Was ${str(meta.previousLabel)}.`);
    if (row.action === "API_KEY_CREATED" || row.action === "API_KEY_ROTATED") {
      const scopes = Array.isArray(meta.scopes) ? (meta.scopes as unknown[]).filter((s) => typeof s === "string") : [];
      if (scopes.length) details.push(scopes.includes("write") ? "Read and write." : "Read only.");
      const days = num(meta.expiresInDays);
      details.push(days ? `Expires in ${days} days.` : "Never expires.");
    }
    return {
      ...base,
      title: `${actionLabel(row.action)}${name ? ` ${name}` : ""}`,
      detail: details.join(" ") || null,
      tone: row.action === "API_KEY_REVOKED" ? "danger" : "accent",
      tag: null,
    };
  }

  // Generic: label plus the most useful name in the meta.
  const subject =
    str(meta.candidateName) ?? str(meta.name) ?? str(meta.email) ?? str(meta.title) ?? str(meta.positionTitle) ?? str(meta.label);
  const label = actionLabel(row.action);
  const known = row.action in LABELS;
  return {
    ...base,
    title: subject ? `${label} ${subject}` : withoutSubject(row.action, label),
    detail: str(meta.reason) ? `Reason: ${str(meta.reason)}` : null,
    tone: DANGER.test(row.action) ? "danger" : known ? "accent" : "neutral",
    tag: null,
  };
}

/* ── Day grouping ───────────────────────────────────────────────────────── */

/**
 * Calendar day key, "2026-09-26". Local time in the browser; UTC while the
 * page is rendered on the server, so the first client render matches it.
 */
export function dayKey(d: Date, utc = false): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return utc
    ? `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
    : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "Today", "Yesterday", or "Mon 22 Sep" (with year when not this year). */
export function dayHeading(iso: string, now: Date = new Date(), utc = false): string {
  const d = new Date(iso);
  const key = dayKey(d, utc);
  if (key === dayKey(now, utc)) return "Today";
  if (key === dayKey(new Date(now.getTime() - DAY_MS), utc)) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(utc ? { timeZone: "UTC" } : {}),
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Group rows (already newest first) into consecutive days. */
export function groupByDay<T extends { createdAt: string }>(
  rows: T[],
  now: Date = new Date(),
  utc = false,
): { day: string; rows: T[] }[] {
  const out: { key: string; day: string; rows: T[] }[] = [];
  for (const r of rows) {
    const key = dayKey(new Date(r.createdAt), utc);
    const last = out[out.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else out.push({ key, day: dayHeading(r.createdAt, now, utc), rows: [r] });
  }
  return out.map(({ day, rows }) => ({ day, rows }));
}

/* ── CSV ────────────────────────────────────────────────────────────────── */

export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Stop spreadsheet apps from running a cell as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const AUDIT_CSV_HEADER = [
  "created_at",
  "category",
  "summary",
  "detail",
  "actor",
  "action",
  "target_type",
  "target_id",
  "ip",
  "meta",
] as const;

export function auditCsv(
  rows: (AuditRowInput & { createdAt: Date | string; ip: string | null; rawMeta?: string | null })[],
  names: Record<string, string> = {},
): string {
  const lines = [AUDIT_CSV_HEADER.join(",")];
  for (const r of rows) {
    const s = describeAuditRow(r, names);
    lines.push(
      [
        new Date(r.createdAt).toISOString(),
        categoryLabel(categoryOf(r.action)),
        s.tag ? `${s.title} (${s.tag})` : s.title,
        s.detail,
        s.actor,
        r.action,
        r.targetType,
        r.targetId,
        r.ip,
        r.rawMeta ?? (r.meta ? JSON.stringify(r.meta) : null),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

/** Parse the stored meta column; anything that is not a JSON object reads as null. */
export function parseMeta(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
