"use client";

import { useState } from "react";
import { ChevronDown, Clock, EyeOff, Keyboard, Mic } from "lucide-react";
import type { ReportData, ReportTheory } from "@/lib/ai-interview/console-server";
import type { TheoryVerdict } from "@/lib/ai-interview/theory";
import type { Tone } from "@/lib/ai-interview/console";
import { plural } from "@/lib/workspace/display";
import { ToneChip } from "../kit";

/**
 * Theory rounds, one card per question: what was asked, what the candidate
 * said (follow-ups included), the AI grade against the reference answer and
 * the reference answer itself, folded. Reference answers are recruiters only;
 * this tab is the only place they appear.
 */

type Filter = "all" | "strong" | "partial" | "missed" | "skipped";

const VERDICT: Record<TheoryVerdict | "unanswered", { label: string; tone: Tone }> = {
  strong: { label: "Strong", tone: "success" },
  partial: { label: "Partial", tone: "warning" },
  missed: { label: "Missed", tone: "danger" },
  skipped: { label: "Skipped", tone: "neutral" },
  unscored: { label: "Not scored", tone: "neutral" },
  unanswered: { label: "Not reached", tone: "neutral" },
};

type Q = ReportTheory["questions"][number];

function verdictOf(q: Q): TheoryVerdict | "unanswered" {
  if (!q.answer) return "unanswered";
  if (q.answer.skipped) return "skipped";
  return q.answer.grade?.verdict ?? "unscored";
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m}m ${r.toString().padStart(2, "0")}s` : `${r}s`;
}

export default function TheoryTab({ r, slug }: { r: ReportData; slug: string }) {
  const audioBase = `/w/${slug}/ai-interviews/${r.id}/audio`;
  const rounds = r.rounds.map((x, i) => ({ x, i })).filter(({ x }) => x.kind === "theory" && x.theory);
  const firstName = r.candidate.name.split(/\s+/)[0] || r.candidate.name;
  if (!rounds.length) {
    return <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">This screening has no theory round.</div>;
  }
  return (
    <div className="flex flex-col gap-8">
      {rounds.map(({ x, i }) => (
        <TheoryRoundReport key={x.id} index={i} multi={r.rounds.length > 1} title={x.title} score={x.score} theory={x.theory!} firstName={firstName} audioBase={audioBase} notStarted={r.status === "PENDING" || r.status === "EXPIRED"} />
      ))}
    </div>
  );
}

function TheoryRoundReport({
  index,
  multi,
  title,
  score,
  theory,
  firstName,
  audioBase,
  notStarted,
}: {
  index: number;
  multi: boolean;
  title: string;
  score: number | null;
  theory: ReportTheory;
  firstName: string;
  audioBase: string;
  notStarted: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const qs = theory.questions;
  const counts = { strong: 0, partial: 0, missed: 0, skipped: 0 } as Record<Filter, number>;
  let unscored = 0;
  for (const q of qs) {
    const v = verdictOf(q);
    if (v === "strong" || v === "partial" || v === "missed") counts[v]++;
    else if (v === "skipped" || v === "unanswered") counts.skipped++;
    else unscored++;
  }
  const tiles: { label: string; n: number }[] = [
    { label: "Strong", n: counts.strong },
    { label: "Partial", n: counts.partial },
    { label: "Missed", n: counts.missed },
    ...(unscored ? [{ label: "Answered, not scored", n: unscored }] : []),
    { label: "Skipped or not reached", n: counts.skipped },
  ];
  const answered = qs.filter((q) => q.answer && !q.answer.skipped).length;
  const spoken = qs.filter((q) => q.answer && !q.answer.skipped && q.answer.mode === "voice").length;
  const secs = qs.reduce((s, q) => s + (q.answer?.seconds ?? 0), 0);
  const blurs = qs.reduce((s, q) => s + (q.answer?.blurs ?? 0), 0);
  const shown = qs
    .map((q, n) => ({ q, n }))
    .filter(({ q }) => {
      if (filter === "all") return true;
      const v = verdictOf(q);
      return filter === "skipped" ? v === "skipped" || v === "unanswered" : v === filter;
    });

  return (
    <section className="flex flex-col gap-4" aria-label={`Theory round ${index + 1}`}>
      <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            {multi && <span className="text-xs text-subtle">Round {index + 1}</span>}
            <h3 className="text-[15px] font-semibold text-fg truncate">{title}</h3>
            <span className="text-[13px] text-muted">
              {answered} of {plural(qs.length, "question")} answered
              {answered ? `, ${spoken === answered ? "all by voice" : spoken ? `${spoken} by voice` : "all typed"}` : ""}
              {secs ? `, ${fmtSec(secs)} in total` : ""}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-subtle">Round score</span>
            <span className="text-[28px] leading-none font-semibold tabular-nums text-fg">{score ?? "–"}</span>
          </div>
        </div>
        <div className={`grid grid-cols-2 gap-2 ${tiles.length > 4 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg bg-panel px-3 py-2.5 flex flex-col gap-0.5">
              <span className="text-lg font-semibold tabular-nums text-fg">{t.n}</span>
              <span className="text-xs text-muted">{t.label}</span>
            </div>
          ))}
        </div>
        {unscored > 0 && <p className="text-[13px] text-muted">The AI could not grade these answers, so read them against the reference answers.</p>}
        {blurs > 0 && (
          <p className="text-[13px] text-warning inline-flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" aria-hidden />
            {firstName} left the window {plural(blurs, "time")} while a question was on screen.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter questions">
        {(["all", "strong", "partial", "missed", "skipped"] as const).map((f) => {
          const on = f === filter;
          const n = f === "all" ? qs.length : counts[f];
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f)}
              className={`h-8 px-3 rounded-lg text-[13px] border transition-colors ${on ? "border-secondary/40 bg-secondary/15 text-fg" : "border-border text-muted hover:text-fg"}`}
            >
              {f === "all" ? "All" : f === "skipped" ? "Skipped" : VERDICT[f].label} <span className="tabular-nums text-subtle">{n}</span>
            </button>
          );
        })}
      </div>

      {notStarted ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">{firstName} has not started, so there are no answers yet.</p>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">No questions match that filter.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {shown.map(({ q, n }) => (
            <QuestionCard key={n} n={n} q={q} firstName={firstName} audioBase={audioBase} />
          ))}
        </ol>
      )}
    </section>
  );
}

function QuestionCard({ n, q, firstName, audioBase }: { n: number; q: Q; firstName: string; audioBase: string }) {
  const clipsFor = (followUp: number) => q.clips.filter((c) => c.followUp === followUp);
  const v = verdictOf(q);
  const a = q.answer;
  const g = a?.grade;
  return (
    <li className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3.5">
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-lg bg-elevated text-[13px] font-semibold text-fg inline-flex items-center justify-center shrink-0">{n + 1}</span>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="text-sm font-medium text-fg leading-relaxed">{q.q}</p>
          {(q.tech || q.difficulty) && <span className="text-xs text-subtle capitalize">{[q.tech, q.difficulty].filter(Boolean).join(", ")}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {g && v !== "skipped" && v !== "unscored" && <span className="text-[13px] tabular-nums text-muted">{g.score} of 5</span>}
          <ToneChip tone={VERDICT[v].tone}>{VERDICT[v].label}</ToneChip>
        </div>
      </div>

      {a && !a.skipped && (
        <div className="flex flex-col gap-2.5 pl-10">
          <Said who={firstName} text={a.a} mode={a.mode} clips={clipsFor(0)} audioBase={audioBase} />
          {a.followUps.map((f, i) => (
            <div key={i} className="flex flex-col gap-2 border-l-2 border-secondary/30 pl-3">
              <p className="text-[13px] text-secondary-soft">Follow-up: {f.q}</p>
              {f.a ? <Said who={firstName} text={f.a} mode={f.mode} clips={clipsFor(i + 1)} audioBase={audioBase} /> : <p className="text-[13px] text-subtle">No answer to the follow-up.</p>}
            </div>
          ))}
        </div>
      )}
      {a?.skipped && <p className="pl-10 text-[13px] text-subtle">{firstName} skipped this question.</p>}
      {!a && <p className="pl-10 text-[13px] text-subtle">{firstName} did not reach this question.</p>}

      {g && (g.covered || g.missed || (v === "unscored" && g.reason)) && (
        <div className="pl-10 grid sm:grid-cols-2 gap-2">
          {g.covered && (
            <div className="rounded-lg bg-success/5 ring-1 ring-inset ring-success/20 px-3 py-2 flex flex-col gap-0.5">
              <span className="text-xs font-medium text-success">Covered</span>
              <span className="text-[13px] text-fg leading-relaxed">{g.covered}</span>
            </div>
          )}
          {g.missed && (
            <div className="rounded-lg bg-danger/5 ring-1 ring-inset ring-danger/20 px-3 py-2 flex flex-col gap-0.5">
              <span className="text-xs font-medium text-danger">Missed</span>
              <span className="text-[13px] text-fg leading-relaxed">{g.missed}</span>
            </div>
          )}
          {v === "unscored" && g.reason && <p className="text-[13px] text-muted sm:col-span-2">{g.reason}</p>}
        </div>
      )}

      {q.ref && (
        <details className="group pl-10">
          <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 text-[13px]">
            <ChevronDown className="w-3.5 h-3.5 text-secondary-soft transition-transform group-open:rotate-180" aria-hidden />
            <span className="text-secondary-soft hover:underline">Reference answer</span>
            <span className="text-subtle">(recruiters only)</span>
          </summary>
          <p className="mt-2 rounded-lg bg-panel px-3 py-2.5 text-[13px] text-muted leading-relaxed whitespace-pre-wrap">{q.ref}</p>
        </details>
      )}

      {a && (
        <div className="pl-10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden />
            {fmtSec(a.seconds)}
          </span>
          {a.firstWordSec != null && !a.skipped && <span>First word after {fmtSec(a.firstWordSec)}</span>}
          {a.blurs > 0 && <span className="text-warning">Left the window {plural(a.blurs, "time")}</span>}
        </div>
      )}
    </li>
  );
}

function Said({ who, text, mode, clips, audioBase }: { who: string; text: string; mode: "voice" | "typed"; clips: Q["clips"]; audioBase: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-subtle inline-flex items-center gap-1.5">
        {mode === "voice" ? <Mic className="w-3 h-3" aria-hidden /> : <Keyboard className="w-3 h-3" aria-hidden />}
        {who} {mode === "voice" ? "said" : "typed"}
      </span>
      <p className="text-[13px] text-fg leading-relaxed whitespace-pre-wrap">{text}</p>
      {clips.map((c, i) => (
        <div key={c.id} className="flex items-center gap-2">
          {/* A caption track would only repeat the transcript above. */}
          <audio controls preload="none" src={`${audioBase}/${c.id}`} className="h-9 w-full max-w-sm" aria-label={`Recording${clips.length > 1 ? `, part ${i + 1}` : ""} of what ${who} said`} />
          <span className="text-xs text-subtle tabular-nums shrink-0">{clips.length > 1 ? `Part ${i + 1}, ` : ""}{fmtSec(c.seconds)}</span>
        </div>
      ))}
    </div>
  );
}
