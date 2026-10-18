import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { csvCell, getDeveloperStats, parseRange } from "@/lib/admin/stats/developer";

export const dynamic = "force-dynamic";

/** CSV of the Developers dashboard for one range: summary rows, then the series. */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const range = parseRange(req.nextUrl.searchParams.get("range"));
  const s = await getDeveloperStats(range);
  const rows: unknown[][] = [["section", "metric", "value", "detail"]];
  const add = (section: string, metric: string, value: unknown, detail: unknown = "") =>
    rows.push([section, metric, value, detail]);

  add("range", "start", s.window.start, `${range} days`);
  add("range", "end", s.window.end);

  add("signups", "total", s.signups.total);
  add("signups", "previous period", s.signups.comparison.previous);
  add("signups", "change pct", s.signups.comparison.pct ?? "");
  for (const p of s.signups.providers) add("signups by provider", p.label, p.count, `${p.pct}%`);

  add("active", "average a day", s.active.daily == null ? "" : s.active.daily.toFixed(1), s.active.source);
  add("active", "last 7 days", s.active.weekly ?? "");

  add("playground", "runs", s.playground.runs, s.playground.source);
  add("playground", "runs a day", s.playground.runsPerDay.toFixed(1));
  add("playground", "errors", s.playground.errors);
  add("playground", "error rate", s.playground.errorRate ?? "");
  add("playground", "p95 ms", s.playground.p95Ms == null ? "" : Math.round(s.playground.p95Ms));
  add("playground", "judge runs", s.playground.judgeRuns);
  add("playground", "judge errors", s.playground.judgeErrors);
  for (const l of s.playground.languages) add("playground languages", l.label, l.count, `${l.pct}%`);

  add("challenges", "attempts", s.challenges.attempts);
  add("challenges", "previous period", s.challenges.comparison.previous);
  add("challenges", "passed", s.challenges.passed);
  add("challenges", "finished", s.challenges.finished);
  add("challenges", "median seconds", s.challenges.medianSec ?? "");

  add("question views", "total", s.questionViews.total ?? "", s.questionViews.source);
  add("question views", "all-time counter", s.questionViews.allTimeCounter);
  for (const q of s.questionViews.top) add("top questions", q.title, q.views, q.id);

  add("content", "questions published", s.content.questions.published, `of ${s.content.questions.total}`);
  add("content", "challenges published", s.content.challenges.published, `of ${s.content.challenges.total}`);
  add("content", "blogs published", s.content.blogs.published, `of ${s.content.blogs.total}`);
  add("content", "new public snippets", s.content.publicSnippets);
  add("content", "journeys started", s.content.journeys.started);
  add("content", "journeys finished", s.content.journeys.finished);

  add("moderation", "blogs pending", s.moderation.blogsPending);
  add("moderation", "experiences pending", s.moderation.experiencesPending);
  add("moderation", "reports open", s.moderation.reportsOpen);
  add("moderation", "creator applications", s.moderation.creatorApplications);
  add("moderation", "flagged attempts", s.moderation.flaggedAttempts);

  for (const e of [
    { currency: s.creators.currency, grossCents: s.creators.grossCents, feeCents: s.creators.feeCents, netCents: s.creators.netCents, sales: s.creators.sales },
    ...s.creators.otherCurrencies,
  ]) {
    add("creators", "sales", e.sales, e.currency);
    add("creators", "gross cents", e.grossCents, e.currency);
    add("creators", "platform fee cents", e.feeCents, e.currency);
    add("creators", "net cents", e.netCents, e.currency);
  }
  add("creators", "payouts due", s.creators.payoutsDue);
  add("creators", "payouts due cents", s.creators.payoutsDueCents);

  rows.push([]);
  rows.push(["series", "bucket start", "sign-ups", "playground runs", "question views"]);
  s.signups.series.forEach((p, i) => {
    rows.push([
      s.window.bucket,
      p.at,
      p.value,
      s.playground.series[i]?.value ?? "",
      s.questionViews.series[i]?.value ?? "",
    ]);
  });

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="developers-${range}d-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
