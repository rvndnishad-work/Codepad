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
  PIPELINE_STAGE_CHANGED: "PIPELINE_STAGE_CHANGED",
  BULK_TAKE_HOME_DISPATCHED: "BULK_TAKE_HOME_DISPATCHED",
  ATS_INTEGRATION_CONNECTED: "ATS_INTEGRATION_CONNECTED",
  ATS_INTEGRATION_DISCONNECTED: "ATS_INTEGRATION_DISCONNECTED",
  ATS_INTEGRATION_TEST_SENT: "ATS_INTEGRATION_TEST_SENT",
  CANDIDATE_CSV_IMPORTED: "CANDIDATE_CSV_IMPORTED",
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
