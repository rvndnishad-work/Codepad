import { NextResponse, type NextRequest } from "next/server";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { getHiringStats, parseRange } from "@/lib/admin/stats/hiring";
import { kpiCsv } from "../kpis";

/** CSV of the dashboard numbers for ?range=7d|30d|90d|12m. */
export async function GET(req: NextRequest) {
  await requireAdminAccess("platform:admin");
  const range = parseRange(req.nextUrl.searchParams.get("range"));
  const stats = await getHiringStats(range);
  const day = new Date().toISOString().slice(0, 10);
  const label = range === 365 ? "12m" : `${range}d`;
  return new NextResponse(kpiCsv(stats), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recruiters-${label}-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
