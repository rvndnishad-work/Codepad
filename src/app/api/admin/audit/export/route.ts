import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { staffCan } from "@/lib/permissions/staff";
import { actionLabel, logAdminAction } from "@/lib/admin/audit";
import { auditWhere, parseAuditFilters } from "@/app/admin/audit/query";

/**
 * CSV of the platform audit log with the same filters as /admin/audit.
 * Newest first, capped at MAX_ROWS (read in pages of BATCH).
 */
export const dynamic = "force-dynamic";

const MAX_ROWS = 10_000;
const BATCH = 1_000;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : v instanceof Date ? v.toISOString() : JSON.stringify(v);
  // Neutralise spreadsheet formulas, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filters = parseAuditFilters(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const where = auditWhere(filters);

  const header = ["time_utc", "actor_email", "via", "action", "action_label", "target_type", "target_id", "target_label", "note", "before", "after", "ip"];
  const lines: string[] = [header.join(",")];
  let cursor: string | undefined;
  let count = 0;
  while (count < MAX_ROWS) {
    const batch = await prisma.adminAuditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(BATCH, MAX_ROWS - count),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const r of batch) {
      lines.push(
        [r.createdAt, r.actorEmail, r.via, r.action, actionLabel(r.action), r.targetType, r.targetId, r.targetLabel, r.note, r.before, r.after, r.ip]
          .map(cell)
          .join(","),
      );
    }
    count += batch.length;
    if (batch.length === 0 || batch.length < BATCH) break;
    cursor = batch[batch.length - 1].id;
  }

  await logAdminAction({
    actor: { id: session?.user?.id, email: session?.user?.email },
    action: "audit.export",
    targetType: "audit",
    after: { rows: count, filters },
  });

  const name = `admin-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      ...(count >= MAX_ROWS ? { "X-Export-Capped": "true" } : {}),
    },
  });
}
