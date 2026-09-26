"use client";

/**
 * Every interviewer's submitted scorecard side by side on the report, who is
 * still missing (with a nudge), and the interview pass mark. The pass mark
 * only labels the panel average; the recruiter decides who passes.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, ClipboardCheck, EyeOff, Loader2, PencilLine } from "lucide-react";
import type { ReportScorecards } from "@/lib/interview/scorecard-server";
import type { DeliveryStatus } from "@/lib/interview/guests";
import {
  bandLabel,
  DEFAULT_PASS_MARK,
  fmtScore,
  PASS_MARK_MAX,
  PASS_MARK_MIN,
  PASS_MARK_PRESETS,
  PASS_MARK_STEP,
  passMarkOf,
  RECOMMENDATION_LABEL,
  SCORE_LABELS,
  SCORE_MAX,
  type Recommendation,
} from "@/lib/interview/scorecard";
import { Dialog } from "../../../candidates/_components/ui";
import { nudgeScorecardsAction, updateInterviewPassMarkAction } from "./actions";

const REC_TEXT: Record<Recommendation, string> = { no: "text-danger", unsure: "text-warning", yes: "text-success" };
const STATE = {
  not_started: { label: "Not started", cls: "text-subtle" },
  draft: { label: "Draft", cls: "text-warning" },
  submitted: { label: "Submitted", cls: "text-success" },
} as const;

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function deliveryLine(sent: DeliveryStatus[]): string {
  const ok = sent.filter((d) => d.status === "sent").length;
  const off = sent.filter((d) => d.status === "not-configured").length;
  const bad = sent.length - ok - off;
  if (off === sent.length) return "Email is not set up on this server, so nothing was sent.";
  const parts = [`Reminder sent to ${ok} ${ok === 1 ? "person" : "people"}`];
  if (bad) parts.push(`${bad} could not be sent`);
  return `${parts.join(", ")}.`;
}

export default function PanelScorecards({
  data: d,
  slug,
  sessionId,
  scorecardHref,
  canEditPassMark,
  canNudge,
}: {
  data: ReportScorecards;
  slug: string | null;
  sessionId: string;
  scorecardHref: string | null;
  canEditPassMark: boolean;
  canNudge: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nudging, startNudge] = useTransition();
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const submitted = d.panel.filter((p) => p.state === "submitted").length;
  const missing = d.panel.filter((p) => p.state !== "submitted");
  const youMissing = d.viewer.key != null && d.viewer.state !== "submitted";

  const nudge = () =>
    startNudge(async () => {
      if (!slug) return;
      const res = await nudgeScorecardsAction(slug, sessionId);
      setMsg(res.ok ? { text: deliveryLine(res.sent), tone: "ok" } : { text: res.error, tone: "error" });
      router.refresh();
    });

  return (
    <section className="rounded-2xl border border-border bg-surface break-inside-avoid print:border-border-strong">
      <header className="flex flex-wrap items-center gap-2.5 px-5 min-h-14 py-3 border-b border-border">
        <ClipboardCheck className="w-4 h-4 text-secondary-soft" aria-hidden />
        <h2 className="text-[15px] font-semibold text-fg">Scorecards</h2>
        <span className="ml-auto text-[13px] text-muted tabular-nums">
          {submitted} of {d.panel.length} submitted
        </span>
        {scorecardHref && (
          <Link
            href={scorecardHref}
            className="h-8 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg inline-flex items-center gap-1.5 hover:bg-panel print:hidden"
          >
            <PencilLine className="w-3.5 h-3.5 text-muted" aria-hidden />
            {youMissing ? "Fill in yours" : "Your scorecard"}
          </Link>
        )}
      </header>

      <div className="p-5 flex flex-col gap-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-bg/40 px-4 py-3">
            <p className="text-[13px] text-muted">Panel average</p>
            <p className={`mt-1 text-[22px] leading-tight font-semibold tabular-nums ${d.summary?.band === "at_or_above" ? "text-success" : d.summary?.band === "below" ? "text-warning" : "text-fg"}`}>
              {d.blind ? "Hidden" : d.summary?.average != null ? `${fmtScore(d.summary.average)} of ${SCORE_MAX}` : "No scores yet"}
            </p>
            <p className="mt-0.5 text-xs text-subtle">{d.blind ? "Until you submit yours" : bandLabel(d.summary ?? { band: null, passMark: d.passMark })}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg/40 px-4 py-3">
            <p className="text-[13px] text-muted">Recommendations</p>
            <p className="mt-1 text-[15px] leading-snug font-medium text-fg">
              {d.blind || !d.summary || !d.summary.submitted
                ? "None yet"
                : (["yes", "unsure", "no"] as Recommendation[])
                    .filter((r) => d.summary!.recommendations[r])
                    .map((r) => `${d.summary!.recommendations[r]} ${RECOMMENDATION_LABEL[r].toLowerCase()}`)
                    .join(", ")}
            </p>
            <p className="mt-0.5 text-xs text-subtle">The recruiter decides</p>
          </div>
          <div className="rounded-xl border border-border bg-bg/40 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] text-muted">Pass mark</p>
              {canEditPassMark && slug && (
                <button type="button" onClick={() => setEditing(true)} className="text-[13px] text-secondary-soft hover:underline underline-offset-4 print:hidden">
                  Change
                </button>
              )}
            </div>
            <p className="mt-1 text-[22px] leading-tight font-semibold tabular-nums text-fg">
              {fmtScore(d.passMark)} of {SCORE_MAX}
            </p>
            <p className="mt-0.5 text-xs text-subtle">{d.passMarkIsDefault ? "The default" : "Set for this interview"}</p>
          </div>
        </div>

        {d.blind ? (
          <div className="rounded-xl border border-border bg-panel px-4 py-4 flex flex-wrap items-center gap-3">
            <EyeOff className="w-4 h-4 text-muted" aria-hidden />
            <p className="text-[13.5px] text-fg flex-1 min-w-[220px]">You are on this panel. Submit your scorecard to see the others, so nobody anchors on a colleague&rsquo;s scores.</p>
            {scorecardHref && (
              <Link href={scorecardHref} className="h-8 px-3 rounded-lg bg-secondary text-bg text-[13px] font-semibold inline-flex items-center hover:brightness-110 print:hidden">
                Open your scorecard
              </Link>
            )}
          </div>
        ) : d.cards.length ? (
          <SideBySide d={d} />
        ) : (
          <p className="text-[13px] text-muted">No scorecards are in yet. Each interviewer rates the criteria from 1 to 4, adds evidence and a recommendation, then submits.</p>
        )}

        {missing.length > 0 && (
          <div className="rounded-xl border border-border px-4 py-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13.5px] font-medium text-fg flex-1">Still to submit</p>
              {canNudge && slug && (
                <button
                  type="button"
                  onClick={nudge}
                  disabled={nudging || d.nudgeWaitMin > 0}
                  title={d.nudgeWaitMin > 0 ? `You can nudge again in ${d.nudgeWaitMin} min` : undefined}
                  className="h-8 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg inline-flex items-center gap-1.5 hover:bg-panel disabled:opacity-50 print:hidden"
                >
                  {nudging ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <BellRing className="w-3.5 h-3.5 text-muted" aria-hidden />}
                  Nudge by email
                </button>
              )}
            </div>
            <ul className="grid gap-1">
              {missing.map((p) => (
                <li key={p.key} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate text-fg">
                    {p.name}
                    {p.guest ? <span className="text-subtle"> (guest)</span> : null}
                    {p.key === d.viewer.key ? <span className="text-subtle"> (you)</span> : null}
                  </span>
                  <span className={STATE[p.state].cls}>{STATE[p.state].label}</span>
                </li>
              ))}
            </ul>
            {d.nudgedAt && <p className="text-xs text-subtle">Last reminder {fmtWhen(d.nudgedAt)}</p>}
            {msg && (
              <p role="status" className={`text-[13px] ${msg.tone === "error" ? "text-danger" : "text-muted"}`}>
                {msg.text}
              </p>
            )}
          </div>
        )}
      </div>

      {editing && slug && <PassMarkDialog slug={slug} sessionId={sessionId} value={d.passMark} onClose={() => setEditing(false)} onSaved={() => router.refresh()} />}
    </section>
  );
}

function SideBySide({ d }: { d: ReportScorecards }) {
  const bar = d.passMark;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-[13px] border-separate border-spacing-0 min-w-[480px]">
        <thead>
          <tr>
            <th scope="col" className="text-left font-medium text-subtle pb-2 pr-3 w-[34%]">
              Criterion
            </th>
            {d.cards.map((c) => (
              <th key={c.key} scope="col" className="text-left font-semibold text-fg pb-2 px-3 align-bottom">
                <span className="block truncate max-w-[180px]">{c.name}</span>
                {c.guest && <span className="block text-xs font-normal text-subtle">Guest</span>}
              </th>
            ))}
            <th scope="col" className="text-left font-medium text-subtle pb-2 pl-3">
              Average
            </th>
          </tr>
        </thead>
        <tbody>
          {d.criteria.map((cr) => {
            const avg = d.summary?.byCriterion[cr.id];
            return (
              <tr key={cr.id}>
                <th scope="row" className="text-left font-normal text-fg py-2.5 pr-3 border-t border-border align-top">
                  <span className="block break-words">{cr.label}</span>
                  {cr.kind === "question" && <span className="block text-xs text-subtle">{cr.hint ?? "Question"}</span>}
                </th>
                {d.cards.map((c) => {
                  const v = c.ratings[cr.id];
                  return (
                    <td key={c.key} className="py-2.5 px-3 border-t border-border align-top">
                      {v?.r ? (
                        <span className="tabular-nums text-fg" title={SCORE_LABELS[v.r]}>
                          <span className="font-semibold">{v.r}</span>
                          <span className="text-subtle"> {SCORE_LABELS[v.r].toLowerCase()}</span>
                        </span>
                      ) : (
                        <span className="text-subtle">Not rated</span>
                      )}
                      {v?.n && <span className="block mt-0.5 text-xs text-muted break-words">{v.n}</span>}
                    </td>
                  );
                })}
                <td className={`py-2.5 pl-3 border-t border-border align-top tabular-nums font-medium ${avg ? (avg.average >= bar ? "text-success" : "text-warning") : "text-subtle"}`}>
                  {avg ? fmtScore(avg.average) : "None"}
                </td>
              </tr>
            );
          })}
          <tr>
            <th scope="row" className="text-left font-semibold text-fg py-2.5 pr-3 border-t border-border-strong">
              Card average
            </th>
            {d.cards.map((c) => (
              <td key={c.key} className={`py-2.5 px-3 border-t border-border-strong tabular-nums font-semibold ${c.average == null ? "text-subtle" : c.average >= bar ? "text-success" : "text-warning"}`}>
                {c.average != null ? fmtScore(c.average) : "None"}
              </td>
            ))}
            <td className="py-2.5 pl-3 border-t border-border-strong tabular-nums font-semibold text-fg">{d.summary?.average != null ? fmtScore(d.summary.average) : "None"}</td>
          </tr>
          <tr>
            <th scope="row" className="text-left font-semibold text-fg py-2.5 pr-3 border-t border-border">
              Recommendation
            </th>
            {d.cards.map((c) => (
              <td key={c.key} className={`py-2.5 px-3 border-t border-border font-medium ${c.recommendation ? REC_TEXT[c.recommendation] : "text-subtle"}`}>
                {c.recommendation ? RECOMMENDATION_LABEL[c.recommendation] : "None"}
              </td>
            ))}
            <td className="border-t border-border" />
          </tr>
          <tr>
            <th scope="row" className="text-left font-semibold text-fg py-2.5 pr-3 border-t border-border align-top">
              Evidence
            </th>
            {d.cards.map((c) => (
              <td key={c.key} className="py-2.5 px-3 border-t border-border align-top text-muted">
                <span className="block whitespace-pre-wrap break-words leading-relaxed">{c.notes ?? "None written"}</span>
                {c.submittedAt && <span className="block mt-1.5 text-xs text-subtle">Submitted {fmtWhen(c.submittedAt)}</span>}
                {c.edits.length > 0 && (
                  <details className="mt-1.5 text-xs">
                    <summary className="cursor-pointer text-warning w-fit">
                      Amended {c.edits.length} time{c.edits.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-1 grid gap-1 text-muted">
                      {c.edits.map((e, i) => (
                        <li key={i}>
                          {fmtWhen(e.at)}: {e.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </td>
            ))}
            <td className="border-t border-border" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PassMarkDialog({ slug, sessionId, value, onClose, onSaved }: { slug: string; sessionId: string; value: number; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(value);
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const save = () =>
    start(async () => {
      const res = await updateInterviewPassMarkAction(slug, sessionId, draft);
      if (!res.ok) return setErr(res.error);
      onSaved();
      onClose();
    });
  return (
    <Dialog
      title="Pass mark for this interview"
      onClose={onClose}
      width={460}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium hover:bg-panel">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="h-9 px-4 rounded-lg bg-secondary text-bg text-[13px] font-semibold inline-flex items-center gap-2 hover:brightness-110 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            Save pass mark
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[13.5px] text-muted leading-relaxed">
          The panel average is labelled against this mark. Nobody is passed or failed by it; you still decide on the candidate profile. The change is kept in the audit log.
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pass mark presets">
          {PASS_MARK_PRESETS.map((p) => {
            const on = p.value === draft;
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={on}
                onClick={() => setDraft(p.value)}
                className={`h-8 px-2.5 rounded-lg border text-xs font-medium ${on ? "border-secondary bg-secondary/10 text-fg" : "border-border text-muted hover:text-fg"}`}
              >
                {p.label} <span className="text-subtle tabular-nums">{fmtScore(p.value)}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-3 text-[13px] text-muted">
          <span>Pass mark</span>
          <input
            type="number"
            min={PASS_MARK_MIN}
            max={PASS_MARK_MAX}
            step={PASS_MARK_STEP}
            value={draft}
            onChange={(e) => setDraft(passMarkOf(Number(e.target.value)))}
            className="w-24 h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg tabular-nums focus:outline-none focus:ring-2 focus:ring-secondary/50"
          />
          <span>of {SCORE_MAX}. Default {fmtScore(DEFAULT_PASS_MARK)}.</span>
        </label>
        {err && (
          <p role="alert" className="text-[13px] text-danger">
            {err}
          </p>
        )}
      </div>
    </Dialog>
  );
}
