/**
 * GET /api/w/[slug]/billing/credits: the workspace's AI screening credit
 * history as a CSV download. Anyone who can see billing can export it.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { ledgerCsv } from "@/lib/billing/usage";
import { loadLedgerForExport } from "@/lib/billing/usage-server";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, slug: true, members: { where: { userId: session.user.id }, select: { role: true, permissions: true } } },
  });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const me = workspace.members[0];
  if (!me || !(await canMember(me, "billing:read"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const csv = ledgerCsv(await loadLedgerForExport(workspace.id));
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${workspace.slug}-credit-history-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
