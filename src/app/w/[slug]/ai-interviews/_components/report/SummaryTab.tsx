"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReportData } from "@/lib/ai-interview/console-server";
import { suggestion } from "@/lib/ai-interview/console";
import { plural } from "@/lib/workspace/display";
import { ToneScore } from "../kit";

function Bullet({ text, kind }: { text: string; kind: "ok" | "gap" | "note" }) {
  const Icon = kind === "ok" ? CheckCircle2 : kind === "gap" ? AlertTriangle : Info;
  const color = kind === "ok" ? "text-success" : kind === "gap" ? "text-warning" : "text-subtle";
  return (
    <li className="flex gap-2.5 items-start text-sm leading-relaxed text-muted">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} aria-hidden />
      <span>{text}</span>
    </li>
  );
}

export default function SummaryTab({ r, hrefFor }: { r: ReportData; hrefFor: (p: { tab?: "code" | "run" | "transcript"; round?: number }) => string }) {
  const sections = r.summary;
  const multi = sections.length > 1;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <h3 className="text-[15px] font-semibold text-fg">What the AI saw</h3>
        {r.status !== "COMPLETED" ? (
          <p className="text-sm text-muted">The AI writes its summary when the candidate finishes.</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-muted">The AI did not leave a written summary for this screening.</p>
        ) : (
          sections.map((s, i) => (
            <div key={i} className={`flex flex-col gap-3 ${i ? "pt-4 border-t border-border" : ""}`}>
              {multi && (
                <p className="text-xs font-medium text-subtle">
                  Round {s.round ?? i + 1}
                  {r.rounds[(s.round ?? i + 1) - 1] ? `: ${r.rounds[(s.round ?? i + 1) - 1].title}` : ""}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs text-subtle">Strengths</span>
                  {s.strengths.length ? (
                    <ul className="flex flex-col gap-2">{s.strengths.map((t, k) => <Bullet key={k} text={t} kind="ok" />)}</ul>
                  ) : (
                    <p className="text-[13px] text-subtle">None noted</p>
                  )}
                </div>
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs text-subtle">Gaps</span>
                  {s.gaps.length ? (
                    <ul className="flex flex-col gap-2">{s.gaps.map((t, k) => <Bullet key={k} text={t} kind="gap" />)}</ul>
                  ) : (
                    <p className="text-[13px] text-subtle">None noted</p>
                  )}
                </div>
              </div>
              {s.notes.length > 0 && <ul className="flex flex-col gap-2">{s.notes.map((t, k) => <Bullet key={k} text={t} kind="note" />)}</ul>}
            </div>
          ))
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 flex flex-col">
        <h3 className="text-[15px] font-semibold text-fg mb-2">Rounds</h3>
        {r.rounds.map((x, i) => {
          const tone = suggestion(x.score, x.linesWritten)?.tone ?? "neutral";
          return (
            <div key={x.id} className={`flex flex-wrap items-center gap-4 py-3.5 ${i ? "border-t border-border" : ""}`}>
              <span className="w-7 h-7 rounded-lg bg-elevated text-[13px] font-semibold text-fg inline-flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-[180px] flex flex-col gap-0.5">
                <span className="text-sm font-medium text-fg">{x.title}</span>
                <span className="text-xs text-subtle">
                  {x.label}, {x.minutes} min
                  {x.linesWritten != null ? `, ${plural(x.linesWritten, "line")} written` : ""}
                </span>
              </div>
              {x.score != null ? <ToneScore value={x.score} tone={tone} width={100} /> : <span className="text-[13px] text-subtle">{r.status === "PENDING" || r.status === "EXPIRED" ? "Not started" : "Not scored"}</span>}
              {r.status !== "PENDING" && r.status !== "EXPIRED" && x.kind === "conversation" && (
                <Link href={hrefFor({ tab: "transcript" })} scroll={false} className="text-[13px] text-secondary-soft hover:underline">
                  Read transcript
                </Link>
              )}
              {r.status !== "PENDING" && r.status !== "EXPIRED" && x.kind !== "conversation" && <span className="flex gap-3 text-[13px]">
                <Link href={hrefFor({ tab: "code", round: i })} scroll={false} className="text-secondary-soft hover:underline">
                  View code
                </Link>
                <Link href={hrefFor({ tab: "run", round: i })} scroll={false} className="text-secondary-soft hover:underline">
                  Run it
                </Link>
              </span>}
            </div>
          );
        })}
      </section>
    </div>
  );
}
