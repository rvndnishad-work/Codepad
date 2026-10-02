import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import {
  DEV_RANGES,
  compact,
  comparisonText,
  getDeveloperStats,
  money,
  msText,
  parseRange,
  pctText,
  rangeLabel,
  ratio,
  secText,
  sharesText,
  type DevRange,
} from "@/lib/admin/stats/developer";
import BarSeries from "./_components/BarSeries";
import ControlsRail from "./_controls/ControlsRail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Developers dashboard — Admin" };

const RANGE_SHORT: Record<DevRange, string> = { 7: "7 d", 30: "30 d", 90: "90 d", 365: "12 m" };

function periodBefore(range: DevRange): string {
  if (range === 7) return "the week before";
  if (range === 30) return "the month before";
  if (range === 365) return "the year before";
  return "the 90 days before";
}

function NewTrackingPill() {
  return (
    <span
      title="Tracking for this started recently; under 7 days of data"
      className="ml-1.5 inline-flex items-center h-5 px-2 rounded-full bg-warning/15 text-warning text-xs font-medium whitespace-nowrap align-middle"
    >
      new tracking
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  pill,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  pill?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5 min-w-0">
      <div className="text-xs font-semibold text-subtle">
        {label}
        {pill && <NewTrackingPill />}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-fg">{value}</div>
      <div className="mt-0.5 text-[13px] text-muted truncate">{sub}</div>
    </div>
  );
}

function CardHead({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center gap-3">
      <h2 className="flex-1 text-[15px] font-semibold text-fg">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-secondary hover:underline">
          {link}
        </Link>
      )}
    </div>
  );
}

function Row({ label, value, href, extra }: { label: React.ReactNode; value: React.ReactNode; href?: string; extra?: React.ReactNode }) {
  return (
    <tr className="border-t border-border first:border-t-0">
      <td className="px-4 sm:px-5 py-2.5 text-sm text-fg">
        {href ? (
          <Link href={href} className="hover:underline">
            {label}
          </Link>
        ) : (
          label
        )}
      </td>
      <td className="px-4 sm:px-5 py-2.5 text-sm text-right tabular-nums text-fg whitespace-nowrap">
        {value}
        {extra && <span className="ml-1 text-muted">{extra}</span>}
      </td>
    </tr>
  );
}

function languageLabel(l: string): string {
  const map: Record<string, string> = {
    javascript: "JavaScript", typescript: "TypeScript", python: "Python", go: "Go", java: "Java",
    cpp: "C++", "c++": "C++", c: "C", csharp: "C#", rust: "Rust", ruby: "Ruby", php: "PHP", kotlin: "Kotlin",
    swift: "Swift", unknown: "Unknown",
  };
  return map[l.toLowerCase()] ?? l;
}

export default async function DevelopersDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminAccess("platform:admin");
  const range = parseRange((await searchParams).range);
  const s = await getDeveloperStats(range);
  const before = periodBefore(range);

  const pg = s.playground;
  const qv = s.questionViews;
  const cr = s.creators;
  const m = s.moderation;
  const c = s.content;

  const kpis = [
    {
      label: "Sign-ups",
      value: compact(s.signups.total),
      sub: comparisonText(s.signups.comparison, before),
    },
    {
      label: "Active a day",
      value: s.active.daily == null ? "—" : compact(s.active.daily),
      sub: s.active.weekly == null ? "no activity recorded yet" : `${compact(s.active.weekly)} in the last 7 days`,
      pill: s.active.newTracking,
    },
    {
      label: "Playground runs",
      value: compact(pg.runs),
      sub: pg.runs ? `${pctText(pg.errorRate, 1)} errors, p95 ${msText(pg.p95Ms)}` : "no runs recorded yet",
      pill: pg.newTracking,
    },
    {
      label: "Challenge attempts",
      value: compact(s.challenges.attempts),
      sub: s.challenges.attempts ? `${pctText(s.challenges.passRate)} passed` : comparisonText(s.challenges.comparison, before),
    },
    {
      label: "Question views",
      value: qv.total == null ? compact(qv.allTimeCounter) : compact(qv.total),
      sub:
        qv.total == null
          ? "all time, from the page counter"
          : qv.topSource === "events" && qv.top[0]
            ? `top: ${qv.top[0].title}`
            : "in this range",
      pill: qv.newTracking,
    },
    {
      label: "Creator sales",
      value: money(cr.grossCents, cr.currency),
      sub: `${money(cr.feeCents, cr.currency)} platform fee, ${cr.payoutsDue} payout${cr.payoutsDue === 1 ? "" : "s"} due`,
    },
  ];

  const journeysFinished = ratio(c.journeys.finished, c.journeys.started);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold text-accent">Developers</div>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Prep side: sign-ups, practice, content, creators, and every function you can switch.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Range" className="inline-flex h-9 rounded-lg border border-border overflow-hidden">
            {DEV_RANGES.map((r, i) => (
              <Link
                key={r}
                href={`/admin/developers?range=${r}`}
                aria-current={r === range ? "page" : undefined}
                title={`Last ${rangeLabel(r)}`}
                className={`inline-flex items-center px-3 text-xs font-medium ${i ? "border-l border-border" : ""} ${
                  r === range ? "bg-panel text-fg" : "bg-surface text-muted hover:text-fg hover:bg-panel"
                }`}
              >
                {RANGE_SHORT[r]}
              </Link>
            ))}
          </nav>
          <a
            href={`/admin/developers/export?range=${range}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-fg hover:bg-panel"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-accent-ink text-xs font-medium hover:bg-accent-soft"
          >
            <Search className="w-3.5 h-3.5" /> Find user
          </Link>
        </div>
      </div>

      {/* Key numbers */}
      <section aria-label="Key numbers" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {/* Sign-ups chart */}
          <section className="rounded-xl border border-border bg-surface px-4 sm:px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="flex-1 text-[15px] font-semibold text-fg">
                Sign-ups a {s.window.bucket === "week" ? "week" : "day"}
              </h2>
              <span className="text-[13px] text-muted">
                {s.signups.providers.length ? sharesText(s.signups.providers) : "No sign-ups in this range"}
              </span>
            </div>
            <div className="mt-3">
              <BarSeries series={s.signups.series} bucket={s.window.bucket} unit="sign-ups" />
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Moderation queue */}
            <div className="rounded-xl border border-border bg-surface min-w-0">
              <CardHead title="Moderation queue" href="/admin/inbox" link="Open inbox" />
              <table className="w-full">
                <tbody>
                  <Row label="Blogs awaiting review" value={m.blogsPending} href="/admin/blogs?status=PENDING" />
                  <Row label="Experiences to moderate" value={m.experiencesPending} href="/admin/interview-questions/experiences" />
                  <Row label="Open reports" value={m.reportsOpen} href="/admin/community" />
                  <Row label="Creator applications" value={m.creatorApplications} href="/admin/creators" />
                  <Row
                    label="Attempts flagged for integrity"
                    value={m.flaggedAttempts}
                    href="/admin/attempts"
                    extra={`in ${rangeLabel(range)}`}
                  />
                </tbody>
              </table>
            </div>

            {/* Content */}
            <div className="rounded-xl border border-border bg-surface min-w-0">
              <CardHead title={`Content, last ${rangeLabel(range)}`} href="/admin/interview-questions" link="Content" />
              <table className="w-full">
                <tbody>
                  <Row label="Questions published" value={c.questions.published.toLocaleString("en-US")} extra={`of ${c.questions.total.toLocaleString("en-US")}`} />
                  <Row label="Challenges published" value={c.challenges.published.toLocaleString("en-US")} extra={`of ${c.challenges.total.toLocaleString("en-US")}`} />
                  <Row label="Blogs published" value={c.blogs.published.toLocaleString("en-US")} extra={`of ${c.blogs.total.toLocaleString("en-US")}`} />
                  <Row label="New public snippets" value={c.publicSnippets.toLocaleString("en-US")} />
                  <Row
                    label="Journeys started"
                    value={c.journeys.started.toLocaleString("en-US")}
                    extra={c.journeys.started ? `${pctText(journeysFinished)} finished` : undefined}
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* Piston and judge */}
          <section className="rounded-xl border border-border bg-surface min-w-0">
            <CardHead title="Piston and judge" href="/admin/jobs" link="Jobs and health" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-5 py-4">
              <div>
                <div className="text-xs font-semibold text-subtle">Runs a day{pg.newTracking && <NewTrackingPill />}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-fg">{compact(pg.runsPerDay)}</div>
                <div className="text-[13px] text-muted">{compact(pg.judgeRuns)} judge runs</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-subtle">Errors</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-fg">{pctText(pg.errorRate, 1)}</div>
                <div className="text-[13px] text-muted">
                  {pg.judgeRuns ? `judge ${pctText(ratio(pg.judgeErrors, pg.judgeRuns), 1)}` : "playground runs"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-subtle">p95 latency</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-fg">{msText(pg.p95Ms)}</div>
                <div className="text-[13px] text-muted">median attempt {secText(s.challenges.medianSec)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-subtle">Top languages</div>
                <div className="mt-1.5 text-sm text-fg">
                  {pg.languages.length
                    ? pg.languages.slice(0, 3).map((l) => `${languageLabel(l.label)} ${l.pct}%`).join(", ")
                    : "—"}
                </div>
              </div>
            </div>
          </section>

          {/* Question views */}
          <section className="rounded-xl border border-border bg-surface min-w-0">
            <CardHead title={qv.topSource === "counter" ? "Most viewed questions, all time" : `Most viewed questions, last ${rangeLabel(range)}`} href="/admin/interview-questions" link="Questions" />
            {qv.top.length ? (
              <table className="w-full">
                <tbody>
                  {qv.top.map((q) => (
                    <Row key={q.id} label={<span className="line-clamp-1">{q.title}</span>} value={q.views.toLocaleString("en-US")} extra="views" />
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 sm:px-5 py-4 text-sm text-muted">No question views recorded yet.</p>
            )}
          </section>
        </div>

        <ControlsRail />
      </div>

      <p className="text-xs text-subtle">
        Numbers refresh every minute. Ranges are UTC days.
        {s.active.source === "rollup" || pg.source === "rollup" ? " Long-range activity reads the nightly roll-up." : ""}
      </p>
    </div>
  );
}
