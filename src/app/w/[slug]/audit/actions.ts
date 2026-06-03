"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * CSV export for the workspace audit log (IP-37).
 *
 * Honors the same filters as the page. Returns plain text; the client wraps
 * in a Blob + anchor download. Cap at 5,000 rows per export — beyond that
 * an enterprise customer should pull from the API directly. (Tracking that
 * API surface is IP-77's territory.)
 */

const MAX_EXPORT_ROWS = 5000;

async function assertOwnerOrAdmin(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not authenticated");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");
  if (member.role !== "OWNER" && member.role !== "ADMIN") {
    throw new Error("Only workspace owners/admins can export the audit log.");
  }
  return { workspaceId: workspace.id };
}

export type AuditCsvFilters = {
  actorUserId?: string;
  action?: string;
  start?: string;
  end?: string;
};

export async function exportWorkspaceAuditCsvAction(
  slug: string,
  filters: AuditCsvFilters = {},
): Promise<string> {
  const { workspaceId } = await assertOwnerOrAdmin(slug);

  const where: Record<string, unknown> = { workspaceId };
  if (filters.actorUserId) where.actorUserId = filters.actorUserId;
  if (filters.action) where.action = filters.action;
  if (filters.start || filters.end) {
    const range: Record<string, Date> = {};
    if (filters.start) {
      const d = new Date(filters.start);
      if (!isNaN(d.getTime())) range.gte = d;
    }
    if (filters.end) {
      const d = new Date(filters.end);
      if (!isNaN(d.getTime())) range.lte = d;
    }
    if (Object.keys(range).length) where.createdAt = range;
  }

  const rows = await prisma.workspaceAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_EXPORT_ROWS,
  });

  const header = [
    "created_at",
    "action",
    "actor_email",
    "actor_user_id",
    "target_type",
    "target_id",
    "ip",
    "user_agent",
    "meta",
  ];

  const esc = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        esc(r.createdAt.toISOString()),
        esc(r.action),
        esc(r.actorEmail),
        esc(r.actorUserId),
        esc(r.targetType),
        esc(r.targetId),
        esc(r.ip),
        esc(r.userAgent),
        esc(r.meta),
      ].join(","),
    );
  }

  return lines.join("\n") + "\n";
}
