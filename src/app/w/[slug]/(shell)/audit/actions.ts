"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import {
  AUDIT_EXPORT_MAX,
  auditCsv,
  auditWhere,
  parseAuditQuery,
  parseMeta,
} from "@/lib/workspace/audit-timeline";

/**
 * CSV export for the workspace audit log.
 *
 * Takes the same URL params as the page and builds the same `where`, so the
 * file holds exactly what the timeline shows (every page of it, up to
 * AUDIT_EXPORT_MAX rows). Returns plain text; the client wraps it in a Blob.
 */
export async function exportWorkspaceAuditCsvAction(
  slug: string,
  params: Record<string, string> = {},
): Promise<{ csv: string; rows: number; capped: boolean }> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not signed in.");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      members: {
        select: { userId: true, role: true, permissions: true, user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  if (!workspace) throw new Error("Workspace not found.");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new Error("You are not a member of this workspace.");
  if (!(await canMember(member, "audit:read"))) {
    throw new Error("You do not have access to the audit log.");
  }

  const query = parseAuditQuery(params);
  const rows = await prisma.workspaceAuditLog.findMany({
    where: auditWhere(workspace.id, query),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: AUDIT_EXPORT_MAX + 1,
  });
  const capped = rows.length > AUDIT_EXPORT_MAX;
  const kept = capped ? rows.slice(0, AUDIT_EXPORT_MAX) : rows;

  const names: Record<string, string> = {};
  for (const m of workspace.members) {
    const n = m.user.name?.trim() || m.user.email;
    if (n) names[m.user.id] = n;
  }

  const csv = auditCsv(
    kept.map((r) => ({ ...r, meta: parseMeta(r.meta), rawMeta: r.meta })),
    names,
  );
  return { csv, rows: kept.length, capped };
}
