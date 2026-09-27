/**
 * Workspace audit log writer (IP-37).
 *
 * Single fan-in for any workspace-mutating action. Mirrors the defense-in-
 * depth pattern from src/lib/mcp/audit.ts: failures log with a `[wsAudit]`
 * prefix but never throw — the underlying user action must not be blocked by
 * an audit-store hiccup.
 *
 * Call sites pass a logical event + minimal context. Best-effort IP/UA is
 * pulled from the request headers in callers that have access; pass null
 * otherwise. We snapshot the actor's email so the row stays readable even
 * if the actor account is later deleted.
 */
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export const WORKSPACE_AUDIT_ACTIONS = {
  // API and MCP keys, and data changed through them.
  API_KEY_CREATED: "API_KEY_CREATED",
  API_KEY_RENAMED: "API_KEY_RENAMED",
  API_KEY_ROTATED: "API_KEY_ROTATED",
  API_KEY_REVOKED: "API_KEY_REVOKED",
  MCP_TOOL_CALLED: "MCP_TOOL_CALLED",
  PIPELINE_STAGE_CHANGED: "PIPELINE_STAGE_CHANGED",
  BULK_TAKE_HOME_DISPATCHED: "BULK_TAKE_HOME_DISPATCHED",
  ATS_INTEGRATION_CONNECTED: "ATS_INTEGRATION_CONNECTED",
  ATS_INTEGRATION_DISCONNECTED: "ATS_INTEGRATION_DISCONNECTED",
  ATS_INTEGRATION_TEST_SENT: "ATS_INTEGRATION_TEST_SENT",
  CANDIDATE_CSV_IMPORTED: "CANDIDATE_CSV_IMPORTED",
  CANDIDATE_CREATED: "CANDIDATE_CREATED",
  CANDIDATE_UPDATED: "CANDIDATE_UPDATED",
  CANDIDATE_ARCHIVED: "CANDIDATE_ARCHIVED",
  CANDIDATE_RESTORED: "CANDIDATE_RESTORED",
  CANDIDATE_ERASED: "CANDIDATE_ERASED",
  CANDIDATE_BATCH_CHANGED: "CANDIDATE_BATCH_CHANGED",
  CANDIDATE_OWNER_CHANGED: "CANDIDATE_OWNER_CHANGED",
  CANDIDATE_TAGS_CHANGED: "CANDIDATE_TAGS_CHANGED",
  CANDIDATE_NOTE_ADDED: "CANDIDATE_NOTE_ADDED",
  CANDIDATE_NOTE_DELETED: "CANDIDATE_NOTE_DELETED",
  CANDIDATES_IMPORTED: "CANDIDATES_IMPORTED",
  BATCH_CREATED: "BATCH_CREATED",
  BATCH_UPDATED: "BATCH_UPDATED",
  BATCH_DELETED: "BATCH_DELETED",
  AI_SCREENING_CREATED: "AI_SCREENING_CREATED",
  AI_SCREENING_CANDIDATES_ADDED: "AI_SCREENING_CANDIDATES_ADDED",
  AI_SCREENING_INVITE_RESENT: "AI_SCREENING_INVITE_RESENT",
  AI_SCREENING_REMINDED: "AI_SCREENING_REMINDED",
  AI_SCREENING_CANCELLED: "AI_SCREENING_CANCELLED",
  AI_SCREENING_DELETED: "AI_SCREENING_DELETED",
  AI_SCREENING_PASS_MARK_CHANGED: "AI_SCREENING_PASS_MARK_CHANGED",
  AI_QUESTION_SET_SAVED: "AI_QUESTION_SET_SAVED",
  AI_QUESTION_SET_DELETED: "AI_QUESTION_SET_DELETED",
  AI_REPORT_SHARE_CREATED: "AI_REPORT_SHARE_CREATED",
  AI_REPORT_SHARE_REVOKED: "AI_REPORT_SHARE_REVOKED",
  QUESTION_VARIANT_CREATED: "QUESTION_VARIANT_CREATED",
  TAKE_HOME_REMINDED: "TAKE_HOME_REMINDED",
  TAKE_HOME_EXTENDED: "TAKE_HOME_EXTENDED",
  TAKE_HOME_CANCELLED: "TAKE_HOME_CANCELLED",
  TAKE_HOME_INVITE_RESENT: "TAKE_HOME_INVITE_RESENT",
  TAKE_HOME_TEMPLATE_SAVED: "TAKE_HOME_TEMPLATE_SAVED",
  TAKE_HOME_TEMPLATE_DELETED: "TAKE_HOME_TEMPLATE_DELETED",
  TAKE_HOME_PASS_MARK_CHANGED: "TAKE_HOME_PASS_MARK_CHANGED",
  TAKE_HOME_REMINDERS_CHANGED: "TAKE_HOME_REMINDERS_CHANGED",
  INTERVIEWS_SCHEDULED: "INTERVIEWS_SCHEDULED",
  INTERVIEW_QUESTIONS_SET: "INTERVIEW_QUESTIONS_SET",
  INTERVIEW_DELETED: "INTERVIEW_DELETED",
  MEMBER_INVITED: "MEMBER_INVITED",
  MEMBER_INVITE_RESENT: "MEMBER_INVITE_RESENT",
  MEMBER_INVITE_REVOKED: "MEMBER_INVITE_REVOKED",
  MEMBER_ROLE_CHANGED: "MEMBER_ROLE_CHANGED",
  MEMBER_PERMISSIONS_CHANGED: "MEMBER_PERMISSIONS_CHANGED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  WEBHOOK_ENDPOINT_CREATED: "WEBHOOK_ENDPOINT_CREATED",
  WEBHOOK_ENDPOINT_UPDATED: "WEBHOOK_ENDPOINT_UPDATED",
  WEBHOOK_ENDPOINT_DELETED: "WEBHOOK_ENDPOINT_DELETED",
  WEBHOOK_ENDPOINT_PAUSED: "WEBHOOK_ENDPOINT_PAUSED",
  WEBHOOK_ENDPOINT_RESUMED: "WEBHOOK_ENDPOINT_RESUMED",
  WEBHOOK_ENDPOINT_AUTO_PAUSED: "WEBHOOK_ENDPOINT_AUTO_PAUSED",
  WEBHOOK_SECRET_REVEALED: "WEBHOOK_SECRET_REVEALED",
  WEBHOOK_SECRET_ROTATED: "WEBHOOK_SECRET_ROTATED",
  WEBHOOK_TEST_SENT: "WEBHOOK_TEST_SENT",
  WEBHOOK_REDELIVERED: "WEBHOOK_REDELIVERED",
  CALENDAR_CONNECTED: "CALENDAR_CONNECTED",
  CALENDAR_DISCONNECTED: "CALENDAR_DISCONNECTED",
  INTERVIEW_SCORECARD_SUBMITTED: "INTERVIEW_SCORECARD_SUBMITTED",
  INTERVIEW_SCORECARD_AMENDED: "INTERVIEW_SCORECARD_AMENDED",
  INTERVIEW_SCORECARDS_NUDGED: "INTERVIEW_SCORECARDS_NUDGED",
  INTERVIEW_PASS_MARK_CHANGED: "INTERVIEW_PASS_MARK_CHANGED",
  ATS_SETTINGS_SAVED: "ATS_SETTINGS_SAVED",
  ATS_JOB_MAPPING_SAVED: "ATS_JOB_MAPPING_SAVED",
  ATS_PARTNER_KEY_REVEALED: "ATS_PARTNER_KEY_REVEALED",
  ATS_PARTNER_KEY_ROTATED: "ATS_PARTNER_KEY_ROTATED",
  ATS_SYNC_RUN: "ATS_SYNC_RUN",
  ATS_WRITEBACK_RETRIED: "ATS_WRITEBACK_RETRIED",
  ATS_IMPORT_SENT: "ATS_IMPORT_SENT",
  ALERT_CHANNEL_CONNECTED: "ALERT_CHANNEL_CONNECTED",
  ALERT_CHANNEL_UPDATED: "ALERT_CHANNEL_UPDATED",
  ALERT_CHANNEL_REMOVED: "ALERT_CHANNEL_REMOVED",
  ALERT_TEST_SENT: "ALERT_TEST_SENT",

  // Workspace administration (Settings, Members, Billing and usage).
  // Settings: one entry per changed field, meta { tab, field, label, from, to }.
  WORKSPACE_SETTINGS_CHANGED: "WORKSPACE_SETTINGS_CHANGED",
  // Security tab fields, same meta as WORKSPACE_SETTINGS_CHANGED.
  SECURITY_POLICY_CHANGED: "SECURITY_POLICY_CHANGED",
  // meta { count } members without two-factor who were emailed.
  SECURITY_2FA_REMINDER_SENT: "SECURITY_2FA_REMINDER_SENT",
  // meta { count? } everyone signed out of the workspace.
  MEMBERS_SIGNED_OUT: "MEMBERS_SIGNED_OUT",
  // meta { email, name?, role, via: "invite" | "domain" }.
  MEMBER_JOINED: "MEMBER_JOINED",
  // meta { name|email, candidates, interviewsReassigned, interviewsCancelled, reviews, apiKeysRevoked, calendarDisconnected, toName? }.
  MEMBER_WORK_HANDED_OVER: "MEMBER_WORK_HANDED_OVER",
  // meta { name|email, fromName? } the member became the only owner.
  MEMBER_OWNERSHIP_TRANSFERRED: "MEMBER_OWNERSHIP_TRANSFERRED",
  // meta { name|email } the member was made an owner alongside others.
  MEMBER_OWNER_ADDED: "MEMBER_OWNER_ADDED",
  // meta { count, emails: string[] (first few), roles: Record<role, n> }.
  MEMBERS_BULK_INVITED: "MEMBERS_BULK_INVITED",
  // meta { from, to } plan names.
  PLAN_CHANGED: "PLAN_CHANGED",
  // meta { plan }.
  SUBSCRIPTION_STARTED: "SUBSCRIPTION_STARTED",
  // meta { plan, atPeriodEnd? }.
  SUBSCRIPTION_CANCELLED: "SUBSCRIPTION_CANCELLED",
  // meta { amountDue?, currency? }.
  SUBSCRIPTION_PAYMENT_FAILED: "SUBSCRIPTION_PAYMENT_FAILED",
  // meta { credits, amount?, currency? }.
  CREDITS_PURCHASED: "CREDITS_PURCHASED",
  // meta { balance, threshold, recipients }.
  CREDITS_LOW_ALERT_SENT: "CREDITS_LOW_ALERT_SENT",
  // meta { plan } the plan the workspace fell back to.
  TRIAL_ENDED: "TRIAL_ENDED",
  // meta { candidateName|email } live interview invite resent from Email activity.
  INTERVIEW_INVITE_RESENT: "INTERVIEW_INVITE_RESENT",
  // meta { candidateName?, reason? } upcoming interview cancelled (for example, on member removal).
  INTERVIEW_CANCELLED: "INTERVIEW_CANCELLED",
  // meta { key, label, reset?: boolean } candidate email wording saved or reset.
  EMAIL_TEMPLATE_CHANGED: "EMAIL_TEMPLATE_CHANGED",
  // meta { email } confirmation link sent / address confirmed.
  REPLY_TO_CONFIRMATION_SENT: "REPLY_TO_CONFIRMATION_SENT",
  REPLY_TO_CONFIRMED: "REPLY_TO_CONFIRMED",
  // meta { kind, label, count, source: "auto:retention" } one entry per rule run that erased something.
  RETENTION_ITEMS_ERASED: "RETENTION_ITEMS_ERASED",
  // meta { kind, label, dueAt, count } 7-day advance email sent to admins.
  RETENTION_NOTICE_SENT: "RETENTION_NOTICE_SENT",
  // meta { kind, label, from, to } rule turned on or off, or its period changed.
  RETENTION_RULE_CHANGED: "RETENTION_RULE_CHANGED",
  // meta { email, kind: "COPY" | "ERASE", dueAt }.
  DATA_REQUEST_CREATED: "DATA_REQUEST_CREATED",
  // meta { email, kind, itemCount }.
  DATA_REQUEST_COMPLETED: "DATA_REQUEST_COMPLETED",
  WORKSPACE_EXPORT_REQUESTED: "WORKSPACE_EXPORT_REQUESTED",
  // meta { finalAt }.
  WORKSPACE_DELETION_SCHEDULED: "WORKSPACE_DELETION_SCHEDULED",
  WORKSPACE_DELETION_CANCELLED: "WORKSPACE_DELETION_CANCELLED",
} as const;

export type WorkspaceAuditAction =
  (typeof WORKSPACE_AUDIT_ACTIONS)[keyof typeof WORKSPACE_AUDIT_ACTIONS];

export type WorkspaceAuditEntry = {
  workspaceId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: WorkspaceAuditAction | string;
  /** Polymorphic reference — e.g. "candidate" / "takeHomeAssignment". */
  targetType?: string | null;
  targetId?: string | null;
  /** Small JSON-serializable payload. No secrets. */
  meta?: Record<string, unknown> | null;
};

const MAX_META_CHARS = 4096;

export async function writeWorkspaceAuditEntry(
  entry: WorkspaceAuditEntry,
): Promise<void> {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const hdrs = await headers();
      ip =
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        hdrs.get("x-real-ip") ??
        null;
      userAgent = hdrs.get("user-agent") ?? null;
    } catch {
      // headers() throws when called outside a request context; skip silently.
    }

    let metaJson: string | null = null;
    if (entry.meta) {
      try {
        const raw = JSON.stringify(entry.meta);
        metaJson =
          raw.length > MAX_META_CHARS
            ? raw.slice(0, MAX_META_CHARS) + "…(truncated)"
            : raw;
      } catch {
        metaJson = "(unserializable meta)";
      }
    }

    await prisma.workspaceAuditLog.create({
      data: {
        workspaceId: entry.workspaceId,
        actorUserId: entry.actorUserId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        meta: metaJson,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[wsAudit] write failed:", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Reader helpers — used by the /w/[slug]/audit page
 * ────────────────────────────────────────────────────────────────────────── */

export type AuditFilter = {
  workspaceId: string;
  actorUserId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  cursor?: string; // id-based pagination
  limit?: number;
};

export type AuditRowView = {
  id: string;
  action: string;
  actorEmail: string | null;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

const DEFAULT_PAGE = 50;
const MAX_PAGE = 200;

export async function listWorkspaceAudit(
  filter: AuditFilter,
): Promise<{ rows: AuditRowView[]; nextCursor: string | null }> {
  const where: Record<string, unknown> = { workspaceId: filter.workspaceId };
  if (filter.actorUserId) where.actorUserId = filter.actorUserId;
  if (filter.action) where.action = filter.action;
  if (filter.startDate || filter.endDate) {
    const range: Record<string, Date> = {};
    if (filter.startDate) range.gte = filter.startDate;
    if (filter.endDate) range.lte = filter.endDate;
    where.createdAt = range;
  }

  const take = Math.min(MAX_PAGE, Math.max(1, filter.limit ?? DEFAULT_PAGE));
  // Cursor pagination: fetch one extra to detect "has next".
  const rows = await prisma.workspaceAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(filter.cursor ? { skip: 1, cursor: { id: filter.cursor } } : {}),
  });

  const hasMore = rows.length > take;
  const sliced = hasMore ? rows.slice(0, take) : rows;
  return {
    rows: sliced.map((r) => {
      let meta: Record<string, unknown> | null = null;
      if (r.meta) {
        try {
          const parsed = JSON.parse(r.meta);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            meta = parsed;
          }
        } catch {
          meta = null;
        }
      }
      return {
        id: r.id,
        action: r.action,
        actorEmail: r.actorEmail,
        actorUserId: r.actorUserId,
        targetType: r.targetType,
        targetId: r.targetId,
        meta,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      };
    }),
    nextCursor: hasMore ? sliced[sliced.length - 1].id : null,
  };
}
