import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { csvCell, parseListParams, parseSide, type RawParams, type UserSide } from "@/app/admin/users/_lib/filters";
import { loadUserRows, type UserRowData } from "@/app/admin/users/_lib/load";

/** Hard cap on one export. Narrow the filters for more. */
const MAX_ROWS = 10_000;
const CHUNK = 500;

/**
 * GET /api/admin/users/export?side=developers|recruiters&<list filters>
 *   or &ids=a,b,c to export a bulk selection.
 */
export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "user:manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const raw: RawParams = Object.fromEntries(url.searchParams.entries());
  const side: UserSide = parseSide(raw.side);
  const p = parseListParams(raw);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 1000);

  const rows: UserRowData[] = [];
  if (ids.length) {
    rows.push(...(await loadUserRows(side, p, { skip: 0, take: ids.length }, new Date(), ids)));
  } else {
    for (let skip = 0; skip < MAX_ROWS; skip += CHUNK) {
      const chunk = await loadUserRows(side, p, { skip, take: Math.min(CHUNK, MAX_ROWS - skip) });
      rows.push(...chunk);
      if (chunk.length < CHUNK) break;
    }
  }

  const header =
    side === "recruiters"
      ? ["id", "name", "email", "status", "joined", "last_sign_in", "workspaces", "interviews_hosted", "ai_screenings_sent", "two_factor", "email_verified"]
      : ["id", "name", "email", "user_type", "status", "joined", "last_sign_in", "attempts", "snippets", "blogs", "email_verified"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const cells =
      side === "recruiters"
        ? [
            r.id,
            r.name,
            r.email,
            r.state,
            r.createdAt,
            r.lastSignInAt,
            r.workspaces.map((w) => `${w.name} (${w.role}, ${w.plan})`).join("; "),
            r.interviewsHosted,
            r.screeningsSent,
            r.twoFactor ? "yes" : "no",
            r.emailVerified ? "yes" : "no",
          ]
        : [
            r.id,
            r.name,
            r.email,
            r.userType ?? "",
            r.state,
            r.createdAt,
            r.lastSignInAt,
            r.attempts,
            r.snippets,
            r.blogs,
            r.emailVerified ? "yes" : "no",
          ];
    lines.push(cells.map(csvCell).join(","));
  }

  await logAdminAction({
    actor: { id: session?.user?.id, email: session?.user?.email },
    action: "user.export",
    targetType: "user",
    targetLabel: side === "recruiters" ? "Recruiter accounts" : side === "candidates" ? "Candidate accounts" : "Developer accounts",
    after: { rows: rows.length, selection: ids.length || null, filters: { q: p.q, status: p.status, from: p.from, to: p.to } },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${side}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
