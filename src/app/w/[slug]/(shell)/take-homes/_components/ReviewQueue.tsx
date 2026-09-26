"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import type { TakeHomeRow } from "@/lib/take-home/list-server";
import type { ReviewView } from "@/lib/take-home/list";
import type { Tone } from "@/lib/take-home/status";
import { plural, relativeTime } from "@/lib/workspace/display";
import { Avatar, Btn, inputCls } from "../../candidates/_components/ui";
import { IntegrityDot, ScoreMark, ToneChip, TONE_DOT } from "./kit";

export type ReviewStat = { label: string; value: string; hint: string; tone: Tone };
type Query = { view: ReviewView; q: string; template: string; page: number };

const selectCls = inputCls.replace("w-full", "");

export function listHref(base: string, query: Record<string, string | number>, patch: Record<string, string | number>): string {
  const next = { ...query, ...patch };
  if (!("page" in patch)) next.page = 1;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v === "" || v === "all" || (k === "page" && Number(v) <= 1) || (k === "view" && (v === "review" || v === "all"))) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/** Search box that updates the URL a moment after typing stops. */
export function useUrlSearch(initial: string, go: (q: string) => void) {
  const [q, setQ] = useState(initial);
  useEffect(() => {
    if (q.trim() === initial) return;
    const t = window.setTimeout(() => go(q.trim()), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return [q, setQ] as const;
}

export function Pager({ page, pages, total, noun, href }: { page: number; pages: number; total: number; noun: string; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
      <span>
        Page {page} of {pages}, {plural(total, noun)}
      </span>
      <div className="flex gap-2">
        <Btn icon={ChevronLeft} href={page > 1 ? href(page - 1) : undefined} disabled={page <= 1}>
          Previous
        </Btn>
        <Btn href={page < pages ? href(page + 1) : undefined} disabled={page >= pages}>
          Next
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden />
        </Btn>
      </div>
    </div>
  );
}

export function answeredLabel(r: Pick<TakeHomeRow, "questions" | "answered">): string {
  if (r.questions === 1) return r.answered ? "1 question" : "1 question, not answered";
  if (r.answered === r.questions) return `${r.questions} questions, ${r.questions === 2 ? "both" : "all"} answered`;
  return `${r.answered} of ${r.questions} questions answered`;
}

export function timeLabel(r: Pick<TakeHomeRow, "timeUsedMin" | "timeBudgetMin">): string {
  return r.timeUsedMin == null ? "Not recorded" : `${r.timeUsedMin} of ${r.timeBudgetMin} min`;
}

export default function ReviewQueue({
  slug,
  query,
  stats,
  counts,
  rows,
  pages,
  total,
  templates,
  now,
  canCreate,
  empty,
}: {
  slug: string;
  query: Query;
  stats: ReviewStat[];
  counts: { review: number; decided: number };
  rows: TakeHomeRow[];
  pages: number;
  total: number;
  templates: { id: string; name: string }[];
  now: string;
  canCreate: boolean;
  empty: boolean;
}) {
  const router = useRouter();
  const base = `/w/${slug}/take-homes`;
  const href = (patch: Partial<Query>) => listHref(base, query, patch);
  const [q, setQ] = useUrlSearch(query.q, (v) => router.replace(href({ q: v })));
  const [cursor, setCursor] = useState(-1);
  const at = new Date(now);
  const decidedView = query.view === "decided";

  // J and K move through rows, Enter opens one.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j") setCursor((c) => Math.min(rows.length - 1, c + 1));
      else if (e.key === "k") setCursor((c) => Math.max(0, c - 1));
      else if (e.key === "Enter" && cursor >= 0 && rows[cursor]) router.push(`${base}/${rows[cursor].id}`);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rows, cursor, router, base]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface px-4 py-3.5 animate-slide-up motion-reduce:animate-none"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
          >
            <p className="flex items-center gap-2 text-[13px] text-muted">
              {s.tone !== "neutral" && <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[s.tone]}`} />}
              {s.label}
            </p>
            <p className="text-[28px] leading-9 font-semibold tracking-tight text-fg tabular-nums mt-1">{s.value}</p>
            <p className={`text-[13px] mt-0.5 truncate ${s.tone === "warning" ? "text-warning" : "text-subtle"}`}>{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Review views" className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5">
          {(
            [
              ["review", "To review", counts.review],
              ["decided", "Decided", counts.decided],
            ] as const
          ).map(([id, label, n]) => {
            const on = id === query.view;
            return (
              <Link
                key={id}
                role="tab"
                aria-selected={on}
                href={href({ view: id })}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded-[7px] text-[13px] font-medium whitespace-nowrap transition ${
                  on ? "bg-elevated text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {label}
                <span className={`text-xs tabular-nums ${on ? "text-secondary-soft" : "text-subtle"}`}>{n}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
          <label className="relative w-full md:w-60">
            <span className="sr-only">Search name, email or take home</span>
            <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className={`${inputCls} pl-8`} />
          </label>
          {templates.length > 0 && (
            <>
              <label className="sr-only" htmlFor="take-home-template-filter">
                Template
              </label>
              <select
                id="take-home-template-filter"
                value={query.template}
                onChange={(e) => router.push(href({ template: e.target.value }))}
                className={`${selectCls} w-full md:w-auto md:max-w-[220px]`}
              >
                <option value="all">All templates</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
          <Inbox className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-[15px] font-medium text-fg">
            {query.q || query.template !== "all" ? "No matches" : empty ? "No take-homes yet" : decidedView ? "Nothing decided yet" : "Nothing to review"}
          </p>
          <p className="text-[13px] text-muted max-w-sm">
            {query.q || query.template !== "all"
              ? "Try another search or template."
              : empty
                ? "Send coding questions to a candidate. Their answers land here once they submit."
                : decidedView
                  ? "Submissions you passed or did not pass show up here."
                  : "Submissions waiting on your decision show up here."}
          </p>
          {canCreate && empty && (
            <Btn variant="primary" href={`${base}/new`} className="mt-3">
              New take home
            </Btn>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div role="row" className="hidden min-[1400px]:flex items-center gap-3 h-10 px-4 border-b border-border text-xs text-subtle">
            <span className="min-[1400px]:w-[200px] shrink-0">Candidate</span>
            <span className="flex-1 min-w-0">Take home</span>
            <span className="min-[1400px]:w-[170px] shrink-0">Score</span>
            <span className="min-[1400px]:w-[100px] shrink-0">Time used</span>
            <span className="min-[1400px]:w-[120px] shrink-0">Integrity</span>
            <span className="min-[1400px]:w-[88px] shrink-0">Submitted</span>
            <span className="min-[1400px]:w-[88px] shrink-0" />
          </div>
          <ul>
            {rows.map((r, i) => (
              <QueueRow key={r.id} r={r} href={`${base}/${r.id}`} focused={i === cursor} now={at} decided={decidedView} />
            ))}
          </ul>
        </div>
      )}

      <Pager page={query.page} pages={pages} total={total} noun="take home" href={(p) => href({ page: p })} />

      {rows.length > 0 && (
        <p className="text-xs text-subtle">
          {decidedView
            ? "Change a decision from the report or the candidate profile."
            : "A take home leaves this list when you pass the candidate or mark them not passed. Scores never pass anyone on their own."}
          <span className="hidden md:inline"> Press J and K to move through the list and Enter to open a report.</span>
        </p>
      )}
    </div>
  );
}

function QueueRow({ r, href, focused, now, decided }: { r: TakeHomeRow; href: string; focused: boolean; now: Date; decided: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);
  return (
    <li
      ref={ref}
      className={`group relative flex flex-wrap min-[1400px]:flex-nowrap items-center gap-x-4 min-[1400px]:gap-x-3 gap-y-2 px-4 py-3 min-[1400px]:h-[68px] min-[1400px]:py-0 border-t border-border first:border-t-0 transition-colors hover:bg-panel/60 ${
        focused ? "bg-panel/80 shadow-[inset_2px_0_0_rgb(var(--c-accent-2))]" : ""
      }`}
    >
      <Link href={href} className="flex items-center gap-3 w-full min-[1400px]:w-[200px] shrink-0 min-w-0 after:absolute after:inset-0" aria-label={`Open ${r.candidate.name}`}>
        <Avatar name={r.candidate.name} size={34} />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-fg truncate">{r.candidate.name}</span>
          {r.candidate.email && <span className="block text-[13px] text-subtle truncate">{r.candidate.email}</span>}
        </span>
      </Link>
      <span className="w-full pl-[46px] min-[1400px]:pl-0 min-[1400px]:w-auto min-[1400px]:flex-1 min-w-0">
        <span className="block text-sm text-fg truncate">{r.title}</span>
        <span className="block text-[13px] text-subtle">{answeredLabel(r)}</span>
      </span>
      <span className="pl-[46px] min-[1400px]:pl-0 min-[1400px]:w-[170px] shrink-0">
        <ScoreMark score={r.score} width={44} chip />
      </span>
      <span className="min-[1400px]:w-[100px] shrink-0 text-[13px] text-muted tabular-nums">{timeLabel(r)}</span>
      <span className="min-[1400px]:w-[120px] shrink-0">
        <IntegrityDot level={r.integrity.level} label={r.integrity.label} />
      </span>
      <span className="min-[1400px]:w-[88px] shrink-0 text-[13px] text-muted">{r.submittedAt ? relativeTime(r.submittedAt, now) : ""}</span>
      <span className="relative ml-auto min-[1400px]:ml-0 min-[1400px]:w-[88px] shrink-0 flex justify-end">
        {decided ? (
          <ToneChip tone={r.decision === "passed" ? "success" : "danger"}>{r.decision === "passed" ? "Passed" : "Not passed"}</ToneChip>
        ) : (
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg group-hover:border-secondary/50 group-hover:bg-secondary/10 transition">
            Review
            <ArrowRight className="w-3.5 h-3.5 text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </span>
        )}
      </span>
    </li>
  );
}
