"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Inbox, Plus, Search, Video } from "lucide-react";
import { humanize } from "@/lib/workspace/display";
import { Avatar, Btn, fmtDate, inputCls } from "../candidates/_components/ui";

export type InterviewRow = {
  id: string;
  title: string;
  candidateName: string | null;
  candidateId: string | null;
  type: string;
  state: "scheduled" | "live" | "completed";
  verdict: string | null;
  shortCode: string | null;
  href: string;
  minutes: number;
  when: string;
  interviewer: string | null;
};

type View = "all" | InterviewRow["state"];

const VIEWS: { id: View; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "live", label: "Live now" },
  { id: "completed", label: "Completed" },
];

const STATE: Record<InterviewRow["state"], { label: string; dot: string }> = {
  scheduled: { label: "Scheduled", dot: "bg-warning" },
  live: { label: "Live", dot: "bg-secondary animate-pulse motion-reduce:animate-none" },
  completed: { label: "Completed", dot: "bg-success" },
};

export default function InterviewsList({ slug, rows, view: initialView, q: initialQ }: { slug: string; rows: InterviewRow[]; view: string; q: string }) {
  const [view, setView] = useState<View>(VIEWS.some((v) => v.id === initialView) ? (initialView as View) : "all");
  const [q, setQ] = useState(initialQ);
  const counts = useMemo(() => {
    const c: Record<View, number> = { all: rows.length, scheduled: 0, live: 0, completed: 0 };
    for (const r of rows) c[r.state]++;
    return c;
  }, [rows]);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (view === "all" || r.state === view) &&
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
              <p className="text-[15px] text-muted mt-1 max-w-[620px]">Live pair-programming rounds your team runs with candidates, with the code and notes from each one.</p>
            </div>
          </div>
          <Btn variant="primary" size="md" icon={Plus} href={`/interview/new?workspaceSlug=${slug}`}>
            New interview
          </Btn>
        </div>
      </section>

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
          <p className="text-[13px] text-muted max-w-sm">{rows.length ? "Try another search or filter." : "Schedule a live pair-programming round with a candidate."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div role="row" className="hidden lg:flex items-center gap-4 h-10 px-4 border-b border-border text-xs text-subtle">
            <span className="w-[240px] shrink-0">Candidate</span>
            <span className="flex-1 min-w-0">Interview</span>
            <span className="w-[160px] shrink-0">Interviewer</span>
            <span className="w-[120px] shrink-0">Status</span>
            <span className="w-[90px] shrink-0">Date</span>
            <span className="w-[96px] shrink-0" />
          </div>
          <ul>
            {shown.map((r) => (
              <li key={r.id} className="group flex flex-wrap lg:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:h-16 lg:py-0 border-t border-border first:border-t-0 hover:bg-panel/60 transition-colors">
                <span className="flex items-center gap-3 w-full lg:w-[240px] shrink-0 min-w-0">
                  <Avatar name={r.candidateName ?? "?"} size={34} />
                  {r.candidateId ? (
                    <Link href={`/w/${slug}/candidates/${r.candidateId}`} className="text-sm font-medium text-fg truncate hover:underline underline-offset-4">
                      {r.candidateName ?? "Unnamed candidate"}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-fg truncate">{r.candidateName ?? "No candidate yet"}</span>
                  )}
                </span>
                <span className="flex-1 min-w-[180px]">
                  <span className="block text-sm text-fg truncate">{r.title}</span>
                  <span className="block text-[13px] text-subtle">
                    {r.minutes} min, {humanize(r.type).toLowerCase()}
                    {r.shortCode ? `, code ${r.shortCode}` : ""}
                  </span>
                </span>
                <span className="w-[160px] shrink-0 text-[13px] text-muted truncate">{r.interviewer ?? "Unknown"}</span>
                <span className="w-[120px] shrink-0 flex flex-col">
                  <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                    <span aria-hidden className={`w-2 h-2 rounded-full ${STATE[r.state].dot}`} />
                    {STATE[r.state].label}
                  </span>
                  {r.verdict && <span className="text-xs text-subtle">{humanize(r.verdict)}</span>}
                </span>
                <span className="w-[90px] shrink-0 text-[13px] text-muted">{fmtDate(r.when)}</span>
                <span className="w-[96px] shrink-0 flex justify-end">
                  <Btn href={r.href}>
                    {r.state === "completed" ? "Review" : "Open"}
                    <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden />
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
