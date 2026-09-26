"use client";

import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import type { SharedReport, SharedRound } from "@/lib/ai-interview/report-share-view";
import type { Tone } from "@/lib/ai-interview/console";
import TranscriptTab from "@/app/w/[slug]/(shell)/ai-interviews/_components/report/TranscriptTab";
import { ToneChip } from "@/app/w/[slug]/(shell)/ai-interviews/_components/kit";

const DECISION: Record<string, string> = { PASSED: "Passed", REJECTED: "Not passed" };

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function SharedReportView({ r, sharedBy, expiresAt }: { r: SharedReport; sharedBy: string; expiresAt: string }) {
  const firstName = r.candidate.name.split(/\s+/)[0] || r.candidate.name;
  const decision = r.stage ? DECISION[r.stage] : undefined;
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <Eye className="w-4 h-4 text-secondary-soft" aria-hidden />
        Read-only report shared by {sharedBy}. The link works until {fmt(expiresAt)}.
      </p>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{r.candidate.name}</h1>
          <p className="text-sm text-muted">
            {r.role}
            {r.finishedAt ? `, finished ${fmt(r.finishedAt)}` : ""}
          </p>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-subtle">AI score, pass mark {r.passMark}</span>
            <span className="text-[40px] leading-none font-semibold tabular-nums text-fg">{r.score ?? "–"}</span>
          </div>
          <div className="flex flex-col items-end gap-1.5 pb-1">
            {r.suggestion && <ToneChip tone={r.suggestion.tone as Tone}>{r.suggestion.label}</ToneChip>}
            {decision && <span className="text-xs text-muted">Recruiter decision: {decision}</span>}
          </div>
        </div>
      </header>

      <Card title="What the AI saw">
        {r.summary.length === 0 ? (
          <p className="text-sm text-muted">The AI did not leave a written summary for this screening.</p>
        ) : (
          r.summary.map((s, i) => (
            <div key={i} className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${i ? "pt-4 border-t border-border" : ""}`}>
              {r.summary.length > 1 && <p className="md:col-span-2 text-xs font-medium text-subtle">Round {s.round ?? i + 1}</p>}
              <ul className="flex flex-col gap-2">
                {s.strengths.map((t, k) => (
                  <li key={k} className="flex gap-2.5 text-sm text-muted leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-success" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <ul className="flex flex-col gap-2">
                {s.gaps.map((t, k) => (
                  <li key={k} className="flex gap-2.5 text-sm text-muted leading-relaxed">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>

      {r.rounds.map((x, i) => (
        <RoundCard key={x.id} x={x} n={i + 1} multi={r.rounds.length > 1} />
      ))}

      {r.chat.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">Conversation with the AI interviewer</h2>
          <TranscriptTab
            r={{
              chat: r.chat,
              candidate: { name: r.candidate.name },
              status: r.status,
              rounds: r.rounds,
              startedAt: r.startedAt,
            }}
          />
        </section>
      )}

      <p className="text-xs text-subtle">
        {firstName}&apos;s screening was run by an AI interviewer and scored by AI. The AI never passes anyone; decisions are made by the
        hiring team.
      </p>
    </div>
  );
}

function RoundCard({ x, n, multi }: { x: SharedRound; n: number; multi: boolean }) {
  const files = Object.entries(x.files).filter(([p]) => !/(^|\/)package-lock\.json$/.test(p));
  return (
    <Card
      title={multi ? `Round ${n}: ${x.title}` : x.title}
      aside={<span className="text-[13px] text-muted">{x.label}{x.score != null ? `, score ${x.score}` : ""}</span>}
    >
      {x.tests && (
        <div className="flex flex-col">
          <p className="text-sm font-medium text-fg pb-1">
            Tests: {x.tests.compileError ? "the code did not compile" : `${x.tests.passed} of ${x.tests.total} passed`}
          </p>
          {x.tests.tests.map((t, k) => (
            <div key={k} className="flex flex-col gap-1.5 py-2 border-t border-border">
              <div className="flex gap-3 text-sm">
                <span className={`w-9 shrink-0 font-semibold ${t.status === "pass" ? "text-success" : "text-danger"}`}>{t.status === "pass" ? "Pass" : "Fail"}</span>
                <span className="font-mono text-[13px] text-fg break-words min-w-0">{t.name}</span>
              </div>
              {t.status === "fail" && t.error && <pre className="ml-12 rounded-lg bg-danger/10 px-3 py-2 font-mono text-xs text-danger whitespace-pre-wrap break-words">{t.error}</pre>}
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-fg">Final code</p>
          {files.map(([path, code], k) => (
            <details key={path} open={k === 0} className="rounded-lg border border-border bg-bg">
              <summary className="cursor-pointer px-3 py-2 font-mono text-[13px] text-fg">{path.replace(/^\//, "")}</summary>
              <pre className="px-3 pb-3 font-mono text-xs text-fg whitespace-pre overflow-x-auto max-h-[480px] overflow-y-auto">{code}</pre>
            </details>
          ))}
        </div>
      )}
      {x.theory && (
        <ol className="flex flex-col gap-3">
          {x.theory.map((q, k) => (
            <li key={k} className={`flex flex-col gap-1.5 ${k ? "pt-3 border-t border-border" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-fg">
                  {k + 1}. {q.q}
                </p>
                {q.score != null && <span className="text-[13px] text-muted whitespace-nowrap tabular-nums">{q.score} of 5</span>}
              </div>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{q.skipped ? "Skipped" : q.answer || "Not reached"}</p>
              {q.followUps.map((f, j) => (
                <div key={j} className="pl-4 border-l border-border flex flex-col gap-1">
                  <p className="text-[13px] text-fg">{f.q}</p>
                  <p className="text-[13px] text-muted whitespace-pre-wrap">{f.a || "No answer"}</p>
                </div>
              ))}
            </li>
          ))}
        </ol>
      )}
      {!x.tests && files.length === 0 && !x.theory && <p className="text-sm text-muted">This round was a conversation. Read it below.</p>}
    </Card>
  );
}
