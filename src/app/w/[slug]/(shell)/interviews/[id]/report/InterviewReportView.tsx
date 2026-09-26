"use client";

/**
 * Live interview report: the scorecard, the interviewer's take and notes,
 * each round with the code saved from the room, and integrity signals.
 * Rendered inside the workspace shell for members, and on its own for
 * interviewers who were emailed a room pass. Prints cleanly.
 */
import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  Loader2,
  MessageSquareText,
  NotebookPen,
  Printer,
  ScanEye,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { InterviewReport, ReportRound, ReportTone } from "@/lib/interview/report-server";
import { Avatar, Btn } from "../../../candidates/_components/ui";
import { deleteInterviewAction } from "../../actions";

const GLOW = {
  backgroundImage:
    "radial-gradient(560px 240px at 0% 0%, rgb(var(--c-accent-2) / 0.20), transparent 70%), radial-gradient(420px 220px at 100% 120%, rgb(var(--c-accent-2) / 0.10), transparent 70%)",
};

const TONE_TEXT: Record<ReportTone, string> = { success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-muted" };
const TONE_CHIP: Record<ReportTone, string> = {
  success: "bg-success/15 text-success ring-success/25",
  warning: "bg-warning/15 text-warning ring-warning/25",
  danger: "bg-danger/15 text-danger ring-danger/25",
  neutral: "bg-panel text-muted ring-border",
};

function fmtDay(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtMin(sec: number | null): string | null {
  if (sec == null) return null;
  const m = Math.round(sec / 60);
  return m < 1 ? "under a minute" : `${m} min`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function statusOf(r: InterviewReport): { label: string; tone: ReportTone } {
  if (r.finishedAt || r.status === "completed" || r.status === "finished") return { label: "Completed", tone: "success" };
  if (r.startedAt) return { label: "In progress", tone: "warning" };
  return { label: "Not started", tone: "neutral" };
}

function Chip({ tone, children }: { tone: ReportTone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-medium ring-1 ring-inset ${TONE_CHIP[tone]}`}>{children}</span>;
}

function Card({ title, icon: Icon, aside, children, className = "" }: { title: string; icon: typeof Star; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-surface break-inside-avoid print:border-border-strong ${className}`}>
      <header className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
        <Icon className="w-4 h-4 text-secondary-soft" aria-hidden />
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {aside && <div className="ml-auto flex items-center gap-2">{aside}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, tone = "neutral" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: ReportTone }) {
  return (
    <div className="rounded-xl border border-border bg-bg/40 px-4 py-3.5 min-w-0">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={`mt-1 text-[22px] leading-tight font-semibold tracking-tight truncate ${tone === "neutral" ? "text-fg" : TONE_TEXT[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-subtle truncate">{sub}</p>}
    </div>
  );
}

export default function InterviewReportView({
  report: r,
  slug,
  canDelete,
  standalone = false,
}: {
  report: InterviewReport;
  slug: string | null;
  canDelete: boolean;
  standalone?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const status = statusOf(r);
  const withCode = r.rounds.filter((x) => x.attempt?.files.length).length;
  const flags = r.integrity.pasteCount + r.integrity.blurCount;
  const interviewers = [r.host, ...r.panel, ...r.guests];

  return (
    <div className={`flex flex-col gap-5 print:gap-4 ${standalone ? "max-w-[1120px] mx-auto w-full px-4 py-6 md:px-8 md:py-8" : ""}`}>
      {!standalone && slug && (
        <Link href={`/w/${slug}/interviews`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg w-fit print:hidden">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> All interviews
        </Link>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 md:px-7 animate-slide-up motion-reduce:animate-none print:animate-none" style={GLOW}>
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-[min(100%,300px)] flex-1">
            <span className="hidden sm:block shrink-0">
              <Avatar name={r.candidate.name} size={52} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-muted">Interview report</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-fg">{r.candidate.name}</h1>
                <Chip tone={status.tone}>
                  <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${status.tone === "success" ? "bg-success" : status.tone === "warning" ? "bg-warning" : "bg-subtle"}`} />
                  {status.label}
                </Chip>
              </div>
              <p className="mt-1.5 text-[14px] text-muted">
                {r.title}
                <span className="text-subtle">, {r.formatLabel.toLowerCase()}</span>
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-subtle">
                <span>{fmtDay(r.startedAt ?? r.scheduledAt)}</span>
                <span>{r.tookMin == null ? `${r.plannedMin} min planned` : r.tookMin < 1 ? "Ended within a minute" : `${r.tookMin} of ${r.plannedMin} min`}</span>
                {!standalone && slug && r.candidate.id && (
                  <Link href={`/w/${slug}/candidates/${r.candidate.id}`} className="text-secondary-soft hover:underline underline-offset-4 print:hidden">
                    Open candidate profile
                  </Link>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Btn icon={Printer} onClick={() => window.print()}>
              Print or save PDF
            </Btn>
            {canDelete && (
              <button
                type="button"
                onClick={() => setDeleting(true)}
                className="h-8 px-3 rounded-lg border border-danger/30 text-danger text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-danger/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            label="Scorecard"
            value={r.scorecard.average != null ? `${r.scorecard.average.toFixed(1)} / 5` : "Not scored"}
            sub={r.scorecard.average != null ? (r.scorecard.average >= r.scorecard.bar ? `At or above the bar of ${r.scorecard.bar}` : `Below the bar of ${r.scorecard.bar}`) : "No ratings saved"}
            tone={r.scorecard.average == null ? "neutral" : r.scorecard.average >= r.scorecard.bar ? "success" : "warning"}
          />
          <Stat label="Interviewer's take" value={r.take?.label ?? "None given"} sub="The team decides who passes" tone={r.take?.tone ?? "neutral"} />
          <Stat label="Rounds" value={r.rounds.length ? plural(r.rounds.length, "round") : "No rounds"} sub={r.rounds.length ? `${withCode} with saved code` : "Conversation only"} />
          <Stat
            label="Integrity"
            value={!r.integrity.measured && !r.proctor ? "Not measured" : flags || (r.proctor?.signals.length ?? 0) ? "Worth a look" : "Clean"}
            sub={r.integrity.measured ? `${plural(r.integrity.pasteCount, "paste")}, ${r.integrity.blurCount} tab switch${r.integrity.blurCount === 1 ? "" : "es"}` : "No browser signals saved"}
            tone={!r.integrity.measured && !r.proctor ? "neutral" : flags || (r.proctor?.signals.length ?? 0) ? "warning" : "success"}
          />
        </div>
      </section>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start print:block">
        <div className="flex flex-col gap-5 min-w-0 print:gap-4">
          <Scorecard r={r} />
          <Rounds rounds={r.rounds} />
          {r.guide.items.length > 0 && <Guide r={r} />}
        </div>

        <div className="flex flex-col gap-5 min-w-0 print:mt-4 print:gap-4">
          <Card title="Details" icon={CalendarDays}>
            <dl className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-[13px]">
              <dt className="text-subtle">Scheduled</dt>
              <dd className="text-fg">{fmtDay(r.scheduledAt)}</dd>
              <dt className="text-subtle">Started</dt>
              <dd className="text-fg">{r.startedAt ? fmtDay(r.startedAt) : "Not started"}</dd>
              <dt className="text-subtle">Length</dt>
              <dd className="text-fg">{r.tookMin != null ? `${r.tookMin < 1 ? "Under a minute" : `${r.tookMin} min`}, ${r.plannedMin} planned` : `${r.plannedMin} min planned`}</dd>
              <dt className="text-subtle">Format</dt>
              <dd className="text-fg">{r.formatLabel}</dd>
              <dt className="text-subtle">{interviewers.length === 1 ? "Interviewer" : "Interviewers"}</dt>
              <dd className="text-fg flex flex-col gap-0.5 min-w-0">
                {interviewers.map((n) => (
                  <span key={n} className="truncate">
                    {n}
                  </span>
                ))}
              </dd>
              {r.meeting && (
                <>
                  <dt className="text-subtle">Video call</dt>
                  <dd className="min-w-0">
                    <a href={r.meeting.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-secondary-soft hover:underline underline-offset-4 max-w-full">
                      <span className="truncate">{r.meeting.provider ?? "Meeting link"}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden />
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </Card>

          <Card title="Private notes" icon={NotebookPen}>
            {r.notes ? (
              <p className="text-[13.5px] leading-relaxed text-fg whitespace-pre-wrap">{r.notes}</p>
            ) : (
              <p className="text-[13px] text-muted">No notes were taken. Interviewers write them in the room, in the Notes tab.</p>
            )}
            {r.brief && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-subtle">Brief for the interviewers</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted whitespace-pre-wrap">{r.brief}</p>
              </div>
            )}
          </Card>

          <Integrity r={r} />
        </div>
      </div>

      <p className="text-xs text-subtle print:text-muted">
        Reports never pass a candidate on their own. The team decides on the candidate profile.
      </p>

      {deleting && slug && <DeleteDialog r={r} slug={slug} onClose={() => setDeleting(false)} />}
    </div>
  );
}

function Scorecard({ r }: { r: InterviewReport }) {
  const any = r.scorecard.criteria.some((c) => c.value != null);
  return (
    <Card
      title="Scorecard"
      icon={Star}
      aside={r.scorecard.average != null && <span className="text-[13px] text-muted tabular-nums">Average {r.scorecard.average.toFixed(1)} of 5</span>}
    >
      {any ? (
        <ul className="grid gap-4">
          {r.scorecard.criteria.map((c) => (
            <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
              <span className="text-[13.5px] font-medium text-fg">{c.label}</span>
              <span className="text-[13px] tabular-nums text-muted">{c.value != null ? `${c.value} of 5` : "Not rated"}</span>
              <span className="col-span-2 grid grid-cols-5 gap-1.5" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`h-2 rounded-full ${c.value != null && n <= c.value ? (c.value >= r.scorecard.bar ? "bg-success" : "bg-warning") : "bg-panel"}`} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">Nobody filled in the scorecard. Interviewers rate each area from 1 to 5 in the room, in the Scorecard tab.</p>
      )}
      {r.scorecard.summary && (
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-xs text-subtle">Summary</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-fg whitespace-pre-wrap">{r.scorecard.summary}</p>
        </div>
      )}
    </Card>
  );
}

const KIND_LABEL: Record<ReportRound["kind"], string> = { challenge: "Coding round", playground: "Playground", prompt: "Prompt task" };

function Rounds({ rounds }: { rounds: ReportRound[] }) {
  if (!rounds.length) {
    return (
      <Card title="Rounds" icon={Code2}>
        <p className="text-[13px] text-muted">This interview had no coding rounds. The scorecard and notes carry the result.</p>
      </Card>
    );
  }
  return (
    <Card title="Rounds" icon={Code2} aside={<span className="text-[13px] text-muted">{plural(rounds.length, "round")}</span>}>
      <ol className="grid gap-3">
        {rounds.map((x, i) => (
          <RoundItem key={x.key} round={x} index={i} />
        ))}
      </ol>
    </Card>
  );
}

function RoundItem({ round: x, index }: { round: ReportRound; index: number }) {
  const a = x.attempt;
  const hasCode = !!a?.files.length;
  const [open, setOpen] = useState(index === 0 && hasCode);
  const [file, setFile] = useState(0);
  const f = a?.files[Math.min(file, (a?.files.length ?? 1) - 1)];
  return (
    <li className="rounded-xl border border-border bg-bg/40 overflow-hidden break-inside-avoid">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="w-7 h-7 shrink-0 rounded-lg bg-secondary/15 text-secondary-soft text-[13px] font-semibold tabular-nums flex items-center justify-center">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-fg truncate">{x.title}</p>
          <p className="text-xs text-subtle">
            {KIND_LABEL[x.kind]}
            {x.meta ? `, ${x.meta.toLowerCase()}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {a?.tests && (
            <Chip tone={a.tests.passed === a.tests.total ? "success" : a.tests.passed ? "warning" : "danger"}>
              {a.tests.passed} of {a.tests.total} tests
            </Chip>
          )}
          {a?.score != null && !a.tests && <Chip tone="neutral">Score {a.score}</Chip>}
          {a && !a.tests && a.score == null && <span className="text-subtle">Not graded</span>}
          {fmtMin(a?.durationSec ?? null) && <span className="text-subtle">Took {fmtMin(a!.durationSec)}</span>}
          {!a && <span className="text-subtle">{x.kind === "challenge" ? "No code saved" : "Worked on live, code not saved"}</span>}
        </div>
        {hasCode && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="h-8 px-2.5 rounded-lg border border-border text-[13px] font-medium text-fg inline-flex items-center gap-1.5 hover:bg-panel print:hidden"
          >
            <FileCode2 className="w-3.5 h-3.5 text-muted" aria-hidden />
            {open ? "Hide code" : "Show code"}
            <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        )}
      </div>
      {hasCode && f && (
        <div className={`${open ? "" : "hidden"} print:block border-t border-border`}>
          {a!.files.length > 1 && (
            <div role="tablist" aria-label="Files" className="flex gap-1 px-3 pt-2 overflow-x-auto print:hidden">
              {a!.files.map((ff, i) => (
                <button
                  key={ff.path}
                  role="tab"
                  type="button"
                  aria-selected={i === file}
                  onClick={() => setFile(i)}
                  className={`h-8 px-2.5 rounded-md text-[12.5px] font-mono whitespace-nowrap ${i === file ? "bg-panel text-fg ring-1 ring-inset ring-border-strong" : "text-muted hover:text-fg"}`}
                >
                  {ff.path}
                </button>
              ))}
            </div>
          )}
          <CodeBlock path={f.path} code={f.code} />
        </div>
      )}
    </li>
  );
}

function CodeBlock({ path, code }: { path: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 h-9 text-xs text-subtle">
        <span className="font-mono truncate">{path}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-md hover:bg-panel hover:text-fg print:hidden"
        >
          {copied ? <Check className="w-3 h-3 text-success" aria-hidden /> : <Copy className="w-3 h-3" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[460px] overflow-auto px-0 pb-3 text-[12.5px] leading-[1.6] font-mono text-fg print:max-h-none print:overflow-visible print:whitespace-pre-wrap">
        <code className="grid grid-cols-[auto_minmax(0,1fr)]">
          {lines.map((l, i) => (
            <span key={i} className="contents">
              <span className="select-none text-right pl-4 pr-4 text-subtle tabular-nums">{i + 1}</span>
              <span className="pr-4 whitespace-pre">{l || " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function Guide({ r }: { r: InterviewReport }) {
  return (
    <Card title={r.guide.title ?? "Question guide"} icon={MessageSquareText} aside={<span className="text-[13px] text-muted">{plural(r.guide.items.length, "question")}</span>}>
      <ol className="grid gap-2">
        {r.guide.items.map((g, i) => (
          <li key={i} className="rounded-xl border border-border bg-bg/40 px-4 py-3">
            <p className="text-[13.5px] font-medium text-fg leading-snug">
              <span className="text-subtle tabular-nums mr-1.5">{i + 1}.</span>
              {g.q}
            </p>
            {g.a && (
              <details className="mt-1.5 text-[13px] text-muted group">
                <summary className="cursor-pointer w-fit hover:text-fg">Reference answer</summary>
                <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{g.a}</p>
              </details>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Integrity({ r }: { r: InterviewReport }) {
  const i = r.integrity;
  const rows: { label: string; value: string; warn: boolean }[] = [
    { label: "Pastes", value: String(i.pasteCount), warn: i.pasteCount > 0 },
    { label: "Tab switches", value: String(i.blurCount), warn: i.blurCount > 2 },
    { label: "Time away", value: i.blurSec ? `${Math.round(i.blurSec / 60)} min ${i.blurSec % 60} s` : "None", warn: i.blurSec > 60 },
    { label: "Peak suspicion", value: `${i.peak} of 100`, warn: i.peak > 30 },
  ];
  return (
    <Card title="Integrity" icon={ShieldCheck}>
      {i.measured ? (
        <dl className="grid grid-cols-2 gap-2.5">
          {rows.map((x) => (
            <div key={x.label} className="rounded-lg bg-bg/40 border border-border px-3 py-2.5">
              <dt className="text-xs text-subtle">{x.label}</dt>
              <dd className={`mt-0.5 text-[15px] font-semibold tabular-nums ${x.warn ? "text-warning" : "text-fg"}`}>{x.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[13px] text-muted">No browser signals were saved for this interview. They are recorded when a round is submitted for grading.</p>
      )}
      {i.peak > 30 && (
        <p className="mt-3 flex gap-2 text-[13px] text-warning">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          Signals are high. Check the code and your notes before deciding.
        </p>
      )}

      {r.proctor && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="flex items-center gap-2 text-[13.5px] font-medium text-fg">
            <ScanEye className="w-4 h-4 text-secondary-soft" aria-hidden />
            Desktop proctor
          </p>
          <p className="mt-1 text-xs text-subtle">
            Peak {r.proctor.peak} of 100, {plural(r.proctor.scans, "window")} scanned in {plural(r.proctor.reports, "report")}
          </p>
          {r.proctor.signals.length ? (
            <ul className="mt-3 grid gap-2">
              {r.proctor.signals.map((s, k) => (
                <li key={k} className="rounded-lg border border-border bg-bg/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Chip tone={s.severity === "critical" || s.severity === "high" ? "danger" : s.severity === "medium" ? "warning" : "neutral"}>{s.severity}</Chip>
                    <span className="text-[13px] text-fg truncate">{s.processName || s.kind.replace(/_/g, " ")}</span>
                  </div>
                  {(s.detail || s.windowTitle) && <p className="mt-1 text-xs text-muted break-words">{s.detail || s.windowTitle}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-success">No overlays or hidden windows found.</p>
          )}
        </div>
      )}
    </Card>
  );
}

function DeleteDialog({ r, slug, onClose }: { r: InterviewReport; slug: string; onClose: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  const go = () =>
    start(async () => {
      setErr(null);
      const res = await deleteInterviewAction(slug, r.id);
      if (!res.ok) return setErr(res.error);
      router.push(`/w/${slug}/interviews`);
      router.refresh();
    });
  return (
    <div className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-[2px] flex items-center justify-center p-4 print:hidden" onClick={() => !busy && onClose()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-title"
        aria-describedby="del-body"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl shadow-black/50 animate-slide-up motion-reduce:animate-none"
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-danger/15 text-danger flex items-center justify-center">
            <Trash2 className="w-4 h-4" aria-hidden />
          </span>
          <h2 id="del-title" className="text-[17px] font-semibold flex-1 pt-1.5">
            Delete this interview?
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 -mt-1 -mr-1 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p id="del-body" className="mt-3 text-[13.5px] leading-relaxed text-muted">
          This removes “{r.title}” with its scorecard, notes, saved code and integrity data. {r.candidate.name} stays in Candidates with their other results. You cannot undo this.
        </p>
        {err && (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            {err}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium hover:bg-panel">
            Keep it
          </button>
          <button
            type="button"
            onClick={go}
            disabled={busy}
            className="h-9 px-4 rounded-lg bg-danger text-bg text-[13px] font-semibold inline-flex items-center gap-2 hover:brightness-110 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            Delete interview
          </button>
        </div>
      </div>
    </div>
  );
}
