import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { parseLedgerFilter, toCsv } from "@/lib/admin/workspace-actions";

/** Most rows one export holds. A bigger ledger is exported a date range at a time. */
const MAX_ROWS = 20_000;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id }, select: { slug: true } });
  if (!ws) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const filter = parseLedgerFilter({ kind: url.searchParams.get("kind") ?? undefined, range: url.searchParams.get("range") ?? undefined });
  const rows = await prisma.aIInterviewCreditLedger.findMany({
    where: { workspaceId: id, ...(filter.kind ? { kind: filter.kind } : {}), ...(filter.since ? { createdAt: { gte: filter.since } } : {}) },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    select: { createdAt: true, kind: true, amount: true, note: true, sessionId: true, stripeChargeId: true, adminUserId: true, session: { select: { candidateName: true } } },
  });
  const csv = toCsv(
    ["createdAt", "kind", "amount", "note", "sessionId", "candidate", "stripeChargeId", "adminUserId"],
    rows.map((r) => [r.createdAt, r.kind, r.amount, r.note, r.sessionId, r.session?.candidateName, r.stripeChargeId, r.adminUserId]),
  );
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${ws.slug}-credit-ledger-${filter.range}.csv"`,
      "cache-control": "no-store",
    },
  });
}
