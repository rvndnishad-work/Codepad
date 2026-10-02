import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { csvLine } from "@/app/admin/interviews/_components/params";
import { LEDGER_EXPORT_MAX, ledgerWhere, parseLedgerFilters } from "@/app/admin/ai-interviews/ledger-query";

/**
 * CSV of the credit ledger with the same filters as /admin/ai-interviews
 * (tab Ledger). Newest first, at most LEDGER_EXPORT_MAX rows.
 */
export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await staffCan(session, "platform:admin"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const f = parseLedgerFilters(Object.fromEntries(url.searchParams.entries()));
  const rows = await prisma.aIInterviewCreditLedger.findMany({
    where: ledgerWhere(f),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: LEDGER_EXPORT_MAX,
    select: {
      id: true,
      createdAt: true,
      kind: true,
      amount: true,
      note: true,
      sessionId: true,
      stripeChargeId: true,
      adminUserId: true,
      workspace: { select: { id: true, name: true, slug: true } },
      session: { select: { candidateName: true } },
    },
  });
  const adminIds = [...new Set(rows.map((r) => r.adminUserId).filter((x): x is string => Boolean(x)))];
  const admins = adminIds.length ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, email: true } }) : [];
  const email = new Map(admins.map((a) => [a.id, a.email]));

  const lines = [
    csvLine(["id", "created_at_utc", "workspace_id", "workspace", "workspace_slug", "kind", "amount", "session_id", "candidate", "note", "stripe_charge_id", "admin_user_id", "admin_email"]),
    ...rows.map((r) =>
      csvLine([
        r.id,
        r.createdAt,
        r.workspace.id,
        r.workspace.name,
        r.workspace.slug,
        r.kind,
        r.amount,
        r.sessionId,
        r.session?.candidateName,
        r.note,
        r.stripeChargeId,
        r.adminUserId,
        r.adminUserId ? email.get(r.adminUserId) : null,
      ]),
    ),
  ];
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="credit-ledger-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
