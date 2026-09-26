"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Inbox, ListChecks, Plus, Search, Video } from "lucide-react";
import { humanize } from "@/lib/workspace/display";
import type { QuestionState } from "@/lib/interview/wizard";
import { Avatar, Btn, fmtDate, inputCls, useToasts } from "../candidates/_components/ui";

export type InterviewRow = {
  id: string;
  title: string;
  candidateName: string | null;
  candidateId: string | null;
  type: string;
  state: "scheduled" | "live" | "completed";
  verdict: string | null;
  shortCode: string | null;
  /** Interviewer side (host and panel) or the report; null when neither applies. */
  href: string | null;
  candidateLink: string;
  minutes: number;
  /** Null while a scheduled interview has no time yet. */
  when: string | null;
  interviewer: string | null;
  panel: string[];
  format: string | null;
  questions: QuestionState;
  questionsOwner: string | null;
  mineToPick: boolean;
};

type View = "all" | InterviewRow["state"] | "questions";

const VIEWS: { id: View; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "live", label: "Live now" },
  { id: "completed", label: "Completed" },
  { id: "questions", label: "Needs questions" },
];

const STATE: Record<InterviewRow["state"], { label: string; dot: string }> = {
  scheduled: { label: "Scheduled", dot: "bg-warning" },
  live: { label: "Live", dot: "bg-secondary animate-pulse motion-reduce:animate-none" },
  completed: { label: "Completed", dot: "bg-success" },
};

export default function InterviewsList({ slug, rows, view: initialView, q: initialQ }: { slug: string; rows: InterviewRow[]; view: string; q: string }) {
  const [view, setView] = useState<View>(VIEWS.some((v) => v.id === initialView) ? (initialView as View) : "all");
  const [q, setQ] = useState(initialQ);
  const [toasts, toast] = useToasts();
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  // Built after mount so the server and client render the same markup.
  useEffect(() => setOrigin(window.location.origin), []);
  const counts = useMemo(() => {
    const c: Record<View, number> = { all: rows.length, scheduled: 0, live: 0, completed: 0, questions: 0 };
    for (const r of rows) {
      c[r.state]++;
      if (r.questions === "needed") c.questions++;
    }
    return c;
  }, [rows]);
  const mine = rows.filter((r) => r.mineToPick && r.questions === "needed").length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (view === "all" || (view === "questions" ? r.questions === "needed" : r.state === view)) &&
      (!needle || [r.title, r.candidateName ?? "", r.interviewer ?? "", r.shortCode ?? ""].some((v) => v.toLowerCase().includes(needle))),
  );

  return (
    <div className="flex flex-col gap-5">
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 md:px-7 animate-slide-up motion-reduce:animate-none"
        style={{ backgroundImage: "radial-gradient(520px 220px at 0% 0%, rgb(var(--c-accent-2) / 0.18), transparent 70%)" }}
      >
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span aria-hidden className="hidden sm:flex w-11 h-11 shrink-0 rounded-xl items-center justify-center bg-secondary/15 text-secondary-soft ring-1 ring-inset ring-secondary/25">
              <Video className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-tight text-fg">Interviews</h1>
              <p className="text-[15px] text-muted mt-1 max-w-[620px]">Live interviews your team runs with candidates: coding rounds, technical discussions and conversations, with the notes from each one.</p>
            </div>
          </div>
          <Btn variant="primary" size="md" icon={Plus} href={`/w/${slug}/interviews/new`}>
            New interview
          </Btn>
        </div>
      </section>

      {mine > 0 && (
        <button
          type="button"
          onClick={() => setView("questions")}
          className="flex items-center gap-3 rounded-xl border border-warning/35 bg-warning/[0.06] px-4 py-3 text-left hover:bg-warning/[0.1] transition-colors"
        >
          <ListChecks className="w-4 h-4 text-warning shrink-0" aria-hidden />
          <span className="flex-1 text-[14px] text-fg">
            You were asked to pick the questions for {mine === 1 ? "1 interview" : `${mine} interviews`}.
          </span>
          <ArrowRight className="w-4 h-4 text-muted" aria-hidden />
        </button>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter interviews" className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5 max-w-full overflow-x-auto">
          {VIEWS.map((v) => {
            const on = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setView(v.id)}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded-[7px] text-[13px] font-medium whitespace-nowrap transition ${on ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
              >
                {v.label}
                <span className={`text-xs tabular-nums ${on ? "text-secondary-soft" : "text-subtle"}`}>{counts[v.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="relative w-full md:w-72">
          <span className="sr-only">Search interviews</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, candidate or interviewer" className={`${inputCls} pl-8`} />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
          <Inbox className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-[15px] font-medium text-fg">{rows.length ? "No matches" : "No interviews yet"}</p>
          <p className="text-[13px] text-muted max-w-sm">{rows.length ? "Try another search or filter." : "Set up a coding round, a technical discussion or a conversation with a candidate."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {/* Columns only from xl up: with the sidebar open, narrower screens (tablets) get stacked rows. */}
          <div role="row" className="hidden xl:flex items-center gap-3 h-10 px-4 border-b border-border text-xs text-subtle">
            <span className="w-[190px] shrink-0">Candidate</span>
            <span className="flex-1 min-w-0">Interview</span>
            <span className="w-[130px] shrink-0">Interviewer</span>
            <span className="w-[110px] shrink-0">Status</span>
            <span className="w-[72px] shrink-0">Date</span>
            <span className="w-[172px] shrink-0" />
          </div>
          <ul>
            {shown.map((r) => (
              <li
                key={r.id}
                // The whole row opens the room or the report; links and buttons inside keep their own target.
                onClick={(e) => {
                  if (!r.href || (e.target as HTMLElement).closest("a,button")) return;
                  router.push(r.href);
                }}
                className={`group flex flex-wrap xl:flex-nowrap items-center gap-x-3 gap-y-1.5 px-4 py-3.5 xl:h-16 xl:py-0 border-t border-border first:border-t-0 hover:bg-panel/60 transition-colors ${r.href ? "cursor-pointer" : ""}`}
              >
                <span className="flex items-center gap-3 w-full xl:w-[190px] shrink-0 min-w-0">
                  <Avatar name={r.candidateName ?? "?"} size={34} />
                  {r.candidateId ? (
                    <Link href={`/w/${slug}/candidates/${r.candidateId}`} className="text-sm font-medium text-fg truncate hover:underline underline-offset-4">
                      {r.candidateName ?? "Unnamed candidate"}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-fg truncate">{r.candidateName ?? "No candidate yet"}</span>
                  )}
                </span>
                <span className="w-full pl-[46px] xl:pl-0 xl:w-auto xl:flex-1 min-w-0">
                  <span className="block text-sm text-fg truncate">{r.title}</span>
                  <span className="block text-[13px] text-subtle truncate">
                    {r.format ?? humanize(r.type)}, {fmtLength(r.minutes)}
                    {r.questions === "needed" && r.questionsOwner ? `, ${r.questionsOwner} picks questions` : ""}
                  </span>
                </span>
                <span className="pl-[46px] xl:pl-0 max-w-[220px] xl:max-w-none xl:w-[130px] shrink-0 text-[13px] text-muted truncate" title={r.panel.length ? `Panel: ${r.panel.join(", ")}` : undefined}>
                  {r.interviewer ?? "Unknown"}
                  {r.panel.length > 0 && <span className="text-subtle"> +{r.panel.length}</span>}
                </span>
                <span className="xl:w-[110px] shrink-0 flex flex-wrap xl:flex-col gap-x-3">
                  <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                    <span aria-hidden className={`w-2 h-2 rounded-full ${STATE[r.state].dot}`} />
                    {STATE[r.state].label}
                  </span>
                  {r.questions === "needed" ? (
                    <span className="text-xs text-warning">Questions needed</span>
                  ) : (
                    r.verdict && <span className="text-xs text-subtle">{humanize(r.verdict)}</span>
                  )}
                </span>
                <span className="xl:w-[72px] shrink-0 text-[13px] text-muted">{r.when ? fmtDate(r.when) : <span className="text-subtle">No time</span>}</span>
                <span className="ml-auto xl:ml-0 xl:w-[172px] shrink-0 flex justify-end gap-1.5">
                  {r.state === "scheduled" && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(`${origin}${r.candidateLink}`);
                        toast(`Candidate link for ${r.candidateName ?? r.title} copied`);
                      }}
                      aria-label={`Copy candidate link for ${r.candidateName ?? r.title}`}
                      title="Copy candidate link"
                      className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:text-fg hover:bg-panel"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {r.questions === "needed" ? (
                    <Btn variant={r.mineToPick ? "primary" : "ghost"} icon={ListChecks} href={`/w/${slug}/interviews/${r.id}/questions`}>
                      Pick questions
                    </Btn>
                  ) : r.href ? (
                    <Btn href={r.href}>
                      {r.state === "completed" ? "Review" : "Open"}
                      <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden />
                    </Btn>
                  ) : (
                    <Btn href={`/w/${slug}/interviews/${r.id}/questions`}>Questions</Btn>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {toasts}
    </div>
  );
}

function fmtLength(min: number): string {
  if (min < 60) return `${min} min`;
  return min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`;
}
