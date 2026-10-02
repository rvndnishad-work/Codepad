import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import {
  jobsSummary,
  loadEmail24h,
  loadJobStatuses,
  loadMaintenance,
  loadRunHistory,
  loadServices,
  runResult,
  type JobRun,
  type JobStatus,
  type Tone,
} from "./health";
import RunNowButton from "./RunNowButton";
import { Dot, Pill, cardCls, duration, timeAgo } from "./ui";

export const metadata = {
  title: "Jobs and health — Interviewpad Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const RESULT: Record<JobStatus["result"], { label: string; tone: Tone }> = {
  ok: { label: "Ok", tone: "ok" },
  failed: { label: "Failed", tone: "bad" },
  running: { label: "Running", tone: "warn" },
  unfinished: { label: "Did not finish", tone: "bad" },
  never: { label: "Never ran", tone: "off" },
};

function fmtTime(d: Date): string {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

function shortSummary(r: JobRun | null): string {
  if (!r) return "";
  if (r.error && !r.ok) return r.error;
  if (!r.summary) return "";
  try {
    const obj = JSON.parse(r.summary) as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([k, v]) => k !== "ok" && (typeof v === "number" || typeof v === "string" || typeof v === "boolean"))
      .slice(0, 4)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");
  } catch {
    return r.summary;
  }
}

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  await requireAdminAccess("platform:admin");
  const { open } = await searchParams;
  const now = new Date();
  const [statuses, history, services, email, maintenance] = await Promise.all([
    loadJobStatuses(now),
    open ? loadRunHistory(open, 20) : Promise.resolve([] as JobRun[]),
    loadServices(),
    loadEmail24h(),
    loadMaintenance(now),
  ]);
  const sum = jobsSummary(statuses);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Jobs and health</h1>
        <p className="text-sm text-muted">
          Scheduled jobs from vercel.json, their latest runs, and the services the product depends on.
        </p>
      </header>

      <section aria-label="Health" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {services.map((s) => (
          <div key={s.name} className={`${cardCls} px-4 py-3 flex items-center gap-3`}>
            <Dot tone={s.tone} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-subtle">{s.name}</div>
              <div className="text-sm text-fg truncate">{s.detail}</div>
            </div>
          </div>
        ))}
        <div className={`${cardCls} px-4 py-3 flex items-center gap-3`}>
          <Dot tone={email.tone} />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-subtle">Email, 24 h</div>
            <div className="text-sm text-fg">
              {email.total.toLocaleString()} sent, {email.failed.toLocaleString()} failed or bounced
            </div>
          </div>
        </div>
        <div className={`${cardCls} px-4 py-3 flex items-center gap-3`}>
          <Dot tone={maintenance.tone} />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-subtle">Maintenance</div>
            <div className="text-sm text-fg truncate">
              <Link href="/admin/maintenance" className="hover:underline underline-offset-2">
                {maintenance.label}
              </Link>
              {maintenance.legacyEnabled && <span className="text-muted"> (legacy switch)</span>}
            </div>
          </div>
        </div>
        <div className={`${cardCls} px-4 py-3 flex items-center gap-3 sm:col-span-2`}>
          <Dot tone={sum.tone} />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-subtle">Scheduled jobs</div>
            <div className="text-sm text-fg">
              {sum.ran} of {sum.total} ok
              {sum.failing > 0 && `, ${sum.failing} failing`}
              {sum.late > 0 && `, ${sum.late} late or never ran`}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Jobs" className={`${cardCls} overflow-hidden`}>
        <div className="hidden md:grid grid-cols-[20px_minmax(0,1.4fr)_120px_110px_80px_minmax(0,1.4fr)_minmax(0,1fr)_170px] gap-3 px-4 py-2.5 text-xs font-semibold text-subtle bg-panel border-b border-border">
          <span />
          <span>Job</span>
          <span>Last run</span>
          <span>Result</span>
          <span>Took</span>
          <span>Summary</span>
          <span>Last failure</span>
          <span />
        </div>
        <ul>
          {statuses.map((s, i) => (
            <JobRow key={s.job} s={s} open={open === s.job} runs={open === s.job ? history : []} first={i === 0} now={now} />
          ))}
        </ul>
      </section>
      <p className="text-[13px] text-subtle">
        A job is late when its last run started more than twice its interval ago. Run now calls the job route from the
        server with the cron secret and records the run like a scheduled one.
      </p>
    </div>
  );
}

const ROW_GRID =
  "grid grid-cols-[20px_1fr] md:grid-cols-[20px_minmax(0,1.4fr)_120px_110px_80px_minmax(0,1.4fr)_minmax(0,1fr)_170px] gap-x-3 gap-y-1 items-center";

function JobRow({ s, open, runs, first, now }: { s: JobStatus; open: boolean; runs: JobRun[]; first: boolean; now: Date }) {
  const r = RESULT[s.result];
  const toggle = open ? "/admin/jobs" : `/admin/jobs?open=${encodeURIComponent(s.job)}`;
  return (
    <li id={`job-${s.job}`} className={first ? "" : "border-t border-border"}>
      <div className={`${ROW_GRID} px-4 py-3 text-sm ${open ? "bg-panel/60" : ""}`}>
        <Link href={`${toggle}#job-${s.job}`} scroll={false} aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} run history of ${s.job}`} className="text-subtle hover:text-fg">
          <ChevronRight className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
        </Link>
        <Link href={`${toggle}#job-${s.job}`} scroll={false} className="min-w-0 group">
          <div className="font-medium text-fg truncate group-hover:underline underline-offset-2">{s.job}</div>
          <div className="text-xs text-subtle">{s.every}</div>
        </Link>
        <div className="col-start-2 md:col-start-auto text-[13px] text-muted" title={s.last ? fmtTime(s.last.startedAt) : undefined}>
          {timeAgo(s.last?.startedAt, now.getTime())}
        </div>
        <div className="col-start-2 md:col-start-auto flex flex-wrap gap-1">
          <Pill tone={r.tone}>{r.label}</Pill>
          {s.late && s.result !== "never" && <Pill tone="warn">Late</Pill>}
        </div>
        <div className="hidden md:block text-[13px] text-muted tabular-nums">
          {s.last ? duration(s.last.startedAt, s.last.finishedAt) : "—"}
        </div>
        <div className="col-start-2 md:col-start-auto text-[13px] text-muted truncate font-mono" title={shortSummary(s.last)}>
          {shortSummary(s.last) || "—"}
        </div>
        <div className="col-start-2 md:col-start-auto text-[13px] text-muted truncate" title={s.lastFailure?.error ?? undefined}>
          {s.lastFailure ? (
            <>
              <span className="text-danger">{timeAgo(s.lastFailure.startedAt, now.getTime())}</span>
              {s.lastFailure.error ? `: ${s.lastFailure.error}` : ""}
            </>
          ) : (
            "None"
          )}
        </div>
        <div className="col-start-2 md:col-start-auto">
          <RunNowButton job={s.job} />
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 md:pl-[52px] bg-panel/60">
          <div className="text-xs font-semibold text-subtle mb-2">
            Last {runs.length} run{runs.length === 1 ? "" : "s"} of {s.path}
          </div>
          {runs.length === 0 ? (
            <p className="text-[13px] text-muted">No runs recorded yet.</p>
          ) : (
            <div className="rounded-lg border border-border bg-surface overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-panel text-xs text-subtle">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">Started</th>
                    <th className="text-left font-semibold px-3 py-2">Result</th>
                    <th className="text-left font-semibold px-3 py-2">Took</th>
                    <th className="text-left font-semibold px-3 py-2">Summary or error</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const rr = RESULT[runResult(run, now.getTime())];
                    return (
                      <tr key={run.id} className="border-t border-border">
                        <td className="px-3 py-2 whitespace-nowrap text-muted">{fmtTime(run.startedAt)}</td>
                        <td className="px-3 py-2">
                          <Pill tone={rr.tone}>{rr.label}</Pill>
                        </td>
                        <td className="px-3 py-2 text-muted tabular-nums whitespace-nowrap">{duration(run.startedAt, run.finishedAt)}</td>
                        <td className="px-3 py-2 text-muted font-mono break-all">{run.error ?? run.summary ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
