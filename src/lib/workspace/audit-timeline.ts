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
  { id: "settings", label: "Settings" },
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
    prefixes: ["AI_SCREENING_", "AI_QUESTION_", "AI_REPORT_", "QUESTION_VARIANT_", "TAKE_HOME_", "INTERVIEW", "RECORDING_"],
  },
  { id: "people", exact: ["MEMBERS_BULK_INVITED"], prefixes: ["MEMBER_", "ROLE_"] },
  {
    id: "connections",
    exact: [],
    prefixes: ["ATS_", "WEBHOOK_", "API_KEY_", "MCP_", "EXTERNAL_MCP_", "CALENDAR_", "ALERT_", "SLACK_", "TEAMS_", "INTEGRATION_"],
  },
  { id: "billing", exact: [], prefixes: ["BILLING_", "PLAN_", "SUBSCRIPTION_", "CREDIT", "TRIAL_", "VIDEO_ADDON_"] },
  {
    id: "settings",
    exact: ["MEMBERS_SIGNED_OUT", "EMAIL_TEMPLATE_CHANGED"],
    prefixes: ["WORKSPACE_", "SECURITY_", "RETENTION_", "DATA_REQUEST_", "REPLY_TO_"],
  },
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
  ATS_SETTINGS_SAVED: "Changed the ATS settings",
  ATS_JOB_MAPPING_SAVED: "Saved the ATS job mapping",
  ATS_PARTNER_KEY_REVEALED: "Viewed the Greenhouse key",
  ATS_PARTNER_KEY_ROTATED: "Replaced the Greenhouse key",
  ATS_SYNC_RUN: "Ran an ATS sync",
  ATS_WRITEBACK_RETRIED: "Resent a result to the ATS",
  ATS_IMPORT_SENT: "Invited a candidate imported from the ATS",
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
  BATCH_PLAN_SET: "Changed the interview plan of batch",
  CANDIDATE_PLAN_SET: "Picked an interview plan for",
  INTERVIEW_PLAN_CREATED: "Created interview plan",
  INTERVIEW_PLAN_UPDATED: "Edited interview plan",
  INTERVIEW_PLAN_DELETED: "Deleted interview plan",
  INTERVIEW_PLAN_DEFAULT_SET: "Changed the default interview plan to",
  CANDIDATE_ROUND_SKIPPED: "Skipped a round for",
  CANDIDATE_ROUND_RESTORED: "Brought back a round for",
  CANDIDATE_ROUND_ADDED: "Added a round for",
  CANDIDATE_ROUND_REMOVED: "Removed a round for",
  CANDIDATE_ROUND_MOVED_ON: "Moved to the next round",
  CANDIDATE_ROUND_SENT: "Sent a round to",
  CANDIDATE_ROUND_STOPPED: "Stopped the rounds for",
  CANDIDATE_ROUND_NEXT_STEP_CLEARED: "Reopened the next step for",
  AI_SCREENING_CREATED: "Sent AI screening",
  AI_SCREENING_CANDIDATES_ADDED: "Added people to AI screening",
  AI_SCREENING_INVITE_RESENT: "Resent the AI screening invite to",
  AI_SCREENING_REMINDED: "Sent an AI screening reminder to",
  AI_SCREENING_CANCELLED: "Cancelled the AI screening invite for",
  AI_SCREENING_DELETED: "Deleted the AI screening for",
  AI_SCREENING_PASS_MARK_CHANGED: "Changed the pass mark of",
  AI_QUESTION_SET_SAVED: "Saved AI question",
  AI_QUESTION_SET_DELETED: "Deleted AI question",
  AI_REPORT_SHARE_CREATED: "Shared a read-only AI report for",
  AI_REPORT_SHARE_REVOKED: "Revoked an AI report share link for",
  QUESTION_VARIANT_CREATED: "Made private question variant",
  TAKE_HOME_REMINDED: "Sent a take-home reminder to",
  TAKE_HOME_EXTENDED: "Extended the take-home deadline for",
  TAKE_HOME_CANCELLED: "Cancelled the take-home for",
  TAKE_HOME_INVITE_RESENT: "Resent the take-home invite to",
  TAKE_HOME_TEMPLATE_SAVED: "Saved take-home template",
  TAKE_HOME_TEMPLATE_DELETED: "Deleted take-home template",
  TAKE_HOME_PASS_MARK_CHANGED: "Changed the take-home pass mark of",
  TAKE_HOME_REMINDERS_CHANGED: "Changed the take-home reminders of",
  INTERVIEWS_SCHEDULED: "Scheduled interviews",
  INTERVIEW_QUESTIONS_SET: "Set interview questions",
  INTERVIEW_DELETED: "Deleted interview",
  INTERVIEW_SCORECARD_SUBMITTED: "Submitted an interview scorecard for",
  INTERVIEW_SCORECARD_AMENDED: "Amended a submitted interview scorecard for",
  INTERVIEW_SCORECARDS_NUDGED: "Reminded interviewers about scorecards for",
  INTERVIEW_PASS_MARK_CHANGED: "Changed the interview pass mark for",
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
  CALENDAR_CONNECTED: "Connected a calendar",
  CALENDAR_DISCONNECTED: "Disconnected a calendar",
  ALERT_CHANNEL_CONNECTED: "Connected an alert channel",
  ALERT_CHANNEL_UPDATED: "Edited an alert channel",
  ALERT_CHANNEL_REMOVED: "Removed an alert channel",
  ALERT_TEST_SENT: "Sent a test alert",
  WORKSPACE_SETTINGS_CHANGED: "Changed a setting",
  SECURITY_POLICY_CHANGED: "Changed a security setting",
  SECURITY_2FA_REMINDER_SENT: "Emailed members about two-factor sign-in",
  MEMBERS_SIGNED_OUT: "Signed out every member",
  MEMBER_JOINED: "A member joined",
  MEMBER_WORK_HANDED_OVER: "Handed over the work of",
  MEMBER_OWNERSHIP_TRANSFERRED: "Transferred ownership to",
  MEMBER_OWNER_ADDED: "Made a member an owner",
  MEMBERS_BULK_INVITED: "Invited people",
  PLAN_CHANGED: "Changed the plan",
  SUBSCRIPTION_STARTED: "Started the subscription",
  SUBSCRIPTION_CANCELLED: "Cancelled the subscription",
  SUBSCRIPTION_PAYMENT_FAILED: "A subscription payment failed",
  CREDITS_PURCHASED: "Bought AI screening credits",
  VIDEO_ADDON_ENABLED: "Switched on built-in video",
  VIDEO_ADDON_DISABLED: "Switched off built-in video",
  CREDITS_LOW_ALERT_SENT: "Emailed admins about low credits",
  TRIAL_ENDED: "The free trial ended",
  INTERVIEW_INVITE_RESENT: "Resent the interview invite to",
  INTERVIEW_CANCELLED: "Cancelled the interview with",
  INTERVIEW_RESCHEDULED: "Moved the interview with",
  RECORDING_STARTED: "Started recording the interview with",
  RECORDING_STOPPED: "Stopped recording the interview with",
  RECORDING_CONSENT_REQUESTED: "Asked to record the interview with",
  RECORDING_CONSENT_GIVEN: "Recording agreed to by",
  RECORDING_CONSENT_DECLINED: "Recording turned down by",
  EMAIL_TEMPLATE_CHANGED: "Changed candidate email wording",
  REPLY_TO_CONFIRMATION_SENT: "Sent a reply-to confirmation to",
  REPLY_TO_CONFIRMED: "Confirmed the reply-to address",
  RETENTION_ITEMS_ERASED: "A retention rule erased data",
  RETENTION_NOTICE_SENT: "Emailed admins about an upcoming erase",
  RETENTION_RULE_CHANGED: "Changed a retention rule",
  DATA_REQUEST_CREATED: "Logged a data request for",
  DATA_REQUEST_COMPLETED: "Completed a data request for",
  WORKSPACE_EXPORT_REQUESTED: "Asked for an export of everything",
  WORKSPACE_DELETION_SCHEDULED: "Scheduled the workspace for deletion",
  WORKSPACE_DELETION_CANCELLED: "Cancelled the workspace deletion",
};

const DANGER = /(_DELETED|_ERASED|_REMOVED|_REVOKED|_DISCONNECTED|_AUTO_PAUSED)$/;
const DANGER_EXACT = new Set([
  "MEMBERS_SIGNED_OUT",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_PAYMENT_FAILED",
  "WORKSPACE_DELETION_SCHEDULED",
  "INTERVIEW_CANCELLED",
]);
const isDanger = (action: string) => DANGER.test(action) || DANGER_EXACT.has(action);

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
      if (row.action.startsWith("TAKE_HOME_")) return { path: `take-homes/${row.targetId}`, label: "Open take-home" };
      if (row.action.startsWith("INTERVIEW_SCORECARD") || row.action === "INTERVIEW_PASS_MARK_CHANGED" || row.action.startsWith("RECORDING_")) {
        return { path: `interviews/${row.targetId}/report`, label: "Open report" };
      }
      return { path: null, label: null };
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
  if (/\s(to|for|of|on|with)$/.test(label)) {
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

  if (row.action === "CALENDAR_CONNECTED" || row.action === "CALENDAR_DISCONNECTED") {
    const provider = str(meta.provider);
    const cal = provider === "google" ? "Google Calendar" : provider === "microsoft" ? "Outlook calendar" : "a calendar";
    const connected = row.action === "CALENDAR_CONNECTED";
    return {
      ...base,
      title: `${connected ? "Connected" : "Disconnected"} ${cal}`,
      detail: !connected && meta.self === false ? "Removed for another member." : null,
      tone: connected ? "accent" : "danger",
      tag: null,
    };
  }

  if (row.action.startsWith("ALERT_")) {
    const provider = str(meta.provider);
    const app = provider === "slack" ? "Slack" : provider === "teams" ? "Teams" : null;
    const target = str(meta.target);
    const where = [app, target].filter(Boolean).join(" ");
    const failed = row.action === "ALERT_TEST_SENT" && meta.ok === false;
    return {
      ...base,
      title: `${actionLabel(row.action)}${where ? `: ${where}` : ""}`,
      detail: failed ? "The test did not go through." : null,
      tone: isDanger(row.action) || failed ? "danger" : "accent",
      tag: null,
    };
  }

  const admin = adminSentence(row.action, meta);
  if (admin) {
    const tab = str(meta.tab);
    const settingsPath = tab && tab !== "billing" ? { path: `settings/${tab}`, pathLabel: "Open settings" } : {};
    return { ...base, ...settingsPath, tag: null, ...admin, tone: admin.tone ?? (isDanger(row.action) ? "danger" : "accent") };
  }

  // Generic: label plus the most useful name in the meta.
  const subject =
    str(meta.candidateName) ??
    str(meta.candidate) ??
    str(meta.name) ??
    str(meta.email) ??
    str(meta.title) ??
    str(meta.positionTitle) ??
    str(meta.label);
  const label = actionLabel(row.action);
  const known = row.action in LABELS;
  return {
    ...base,
    title: subject ? `${label} ${subject}` : withoutSubject(row.action, label),
    detail: str(meta.reason) ? `Reason: ${str(meta.reason)}` : null,
    tone: isDanger(row.action) ? "danger" : known ? "accent" : "neutral",
    tag: null,
  };
}

/** Settings, security, billing and data sentences. Null lets the generic sentence handle the action. */
function adminSentence(
  action: string,
  meta: Record<string, unknown>,
): { title: string; detail: string | null; tone?: AuditTone } | null {
  const who = str(meta.name) ?? str(meta.email) ?? "a member";
  const count = num(meta.count);
  const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const fromTo = () => {
    const from = str(meta.from);
    const to = str(meta.to);
    return from && to ? `From ${from} to ${to}.` : to ? `Now ${to}.` : null;
  };
  switch (action) {
    case "WORKSPACE_SETTINGS_CHANGED":
    case "SECURITY_POLICY_CHANGED": {
      const label = str(meta.label);
      return { title: label ? `Changed ${lower(label)}` : actionLabel(action), detail: fromTo() };
    }
    case "SECURITY_2FA_REMINDER_SENT":
      return { title: count ? `Emailed ${plural(count, "member")} about two-factor sign-in` : actionLabel(action), detail: null };
    case "MEMBERS_SIGNED_OUT":
      return { title: actionLabel(action), detail: "Everyone has to sign in again." };
    case "MEMBER_JOINED": {
      const role = str(meta.role);
      const how = meta.via === "domain" ? "Joined without an invite" : "Accepted the invite";
      return { title: `${who} joined the workspace`, detail: role ? `${how} as ${lower(role)}.` : `${how}.` };
    }
    case "MEMBER_WORK_HANDED_OVER": {
      const parts: string[] = [];
      const to = str(meta.toName);
      const c = num(meta.candidates);
      if (c) parts.push(`${plural(c, "candidate")}${to ? ` to ${to}` : ""}`);
      const moved = num(meta.interviewsReassigned);
      if (moved) parts.push(`${plural(moved, "interview")} reassigned`);
      const cancelled = num(meta.interviewsCancelled);
      if (cancelled) parts.push(`${plural(cancelled, "interview")} cancelled`);
      const reviews = num(meta.reviews);
      if (reviews) parts.push(`${plural(reviews, "take-home review")} moved`);
      const keys = num(meta.apiKeysRevoked);
      if (keys) parts.push(`${plural(keys, "API key")} revoked`);
      if (meta.calendarDisconnected === true) parts.push("calendar disconnected");
      const detail = parts.length ? `${parts.join(", ")}.` : null;
      return { title: `Handed over the work of ${who}`, detail: detail && detail.charAt(0).toUpperCase() + detail.slice(1) };
    }
    case "MEMBER_OWNERSHIP_TRANSFERRED":
      return { title: `Transferred ownership to ${who}`, detail: str(meta.fromName) ? `Was ${str(meta.fromName)}.` : null };
    case "MEMBER_OWNER_ADDED":
      return { title: `Made ${who} an owner`, detail: null };
    case "MEMBERS_BULK_INVITED": {
      const emails = Array.isArray(meta.emails) ? (meta.emails as unknown[]).filter((e): e is string => typeof e === "string") : [];
      const n = count ?? emails.length;
      const extra = n > emails.length && emails.length ? ` and ${n - emails.length} more` : "";
      return { title: n ? `Invited ${plural(n, "person", "people")}` : actionLabel(action), detail: emails.length ? `${emails.join(", ")}${extra}.` : null };
    }
    case "PLAN_CHANGED": {
      const to = str(meta.to);
      return { title: to ? `Changed the plan to ${to}` : actionLabel(action), detail: str(meta.from) ? `Was ${str(meta.from)}.` : null };
    }
    case "SUBSCRIPTION_STARTED":
      return { title: str(meta.plan) ? `Started the ${str(meta.plan)} subscription` : actionLabel(action), detail: null };
    case "SUBSCRIPTION_CANCELLED":
      return { title: actionLabel(action), detail: meta.atPeriodEnd === true ? "It ends at the end of the billing period." : null };
    case "SUBSCRIPTION_PAYMENT_FAILED":
      return { title: actionLabel(action), detail: "Stripe will try again. Check the card on file." };
    case "CREDITS_PURCHASED": {
      const credits = num(meta.credits);
      return { title: credits ? `Bought ${plural(credits, "AI screening credit")}` : actionLabel(action), detail: null };
    }
    case "VIDEO_ADDON_ENABLED":
      return {
        title: actionLabel(action),
        detail: meta.billed === true
          ? `Added to the subscription at ${meta.interval === "year" ? "$180 a year" : "$15 a month"}.`
          : "No charge for now.",
      };
    case "VIDEO_ADDON_DISABLED":
      return { title: actionLabel(action), detail: meta.billed === true ? "Removed from the subscription. Stripe credits the unused days." : null };
    case "CREDITS_LOW_ALERT_SENT": {
      const balance = num(meta.balance);
      const threshold = num(meta.threshold);
      return {
        title: actionLabel(action),
        detail: balance !== null && threshold !== null ? `${plural(balance, "credit")} left, below ${threshold}.` : null,
        tone: "neutral",
      };
    }
    case "TRIAL_ENDED":
      return { title: actionLabel(action), detail: str(meta.plan) ? `Now on ${str(meta.plan)}.` : null, tone: "neutral" };
    case "EMAIL_TEMPLATE_CHANGED": {
      const label = str(meta.label) ?? str(meta.key);
      const verb = meta.reset === true ? "Reset" : "Changed";
      return { title: label ? `${verb} the wording of the ${lower(label)} email` : actionLabel(action), detail: null };
    }
    case "REPLY_TO_CONFIRMED":
      return { title: str(meta.email) ? `Confirmed the reply-to address ${str(meta.email)}` : actionLabel(action), detail: null };
    case "RETENTION_ITEMS_ERASED":
      return {
        title: count !== null ? `A retention rule erased ${plural(count, "item")}` : actionLabel(action),
        detail: str(meta.label) ? `${str(meta.label)}.` : null,
        tone: "danger",
      };
    case "RETENTION_NOTICE_SENT": {
      const label = str(meta.label);
      const due = str(meta.dueAt);
      const bits = [label, count !== null ? plural(count, "item") : null, due ? `on ${due.slice(0, 10)}` : null].filter(Boolean);
      return { title: actionLabel(action), detail: bits.length ? `${bits.join(", ")}.` : null, tone: "neutral" };
    }
    case "RETENTION_RULE_CHANGED": {
      const label = str(meta.label);
      return { title: label ? `Changed the retention rule: ${lower(label)}` : actionLabel(action), detail: fromTo() };
    }
    case "DATA_REQUEST_CREATED": {
      const email = str(meta.email) ?? "a candidate";
      const due = str(meta.dueAt);
      return {
        title: meta.kind === "ERASE" ? `Logged a request to erase the data of ${email}` : `Logged a request for a copy of the data of ${email}`,
        detail: due ? `Due ${due.slice(0, 10)}.` : null,
      };
    }
    case "DATA_REQUEST_COMPLETED": {
      const email = str(meta.email) ?? "a candidate";
      const items = num(meta.itemCount);
      return {
        title: meta.kind === "ERASE" ? `Erased the data of ${email}` : `Sent ${email} a copy of their data`,
        detail: items !== null ? `${plural(items, "record")}.` : null,
        tone: meta.kind === "ERASE" ? "danger" : "accent",
      };
    }
    case "WORKSPACE_DELETION_SCHEDULED": {
      const final = str(meta.finalAt);
      return { title: actionLabel(action), detail: final ? `It can be undone until ${final.slice(0, 10)}.` : null };
    }
    default:
      return null;
  }
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
