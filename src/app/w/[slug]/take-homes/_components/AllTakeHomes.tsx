"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Inbox, Search, X } from "lucide-react";
import type { TakeHomeRow } from "@/lib/take-home/list-server";
import { FILTERS, type TakeHomeFilter } from "@/lib/take-home/status";
import { relativeTime } from "@/lib/workspace/display";
import { Avatar, Btn, fmtDate, inputCls } from "../../candidates/_components/ui";
import { RowActions, StateDot } from "./kit";
import { listHref, Pager, useUrlSearch } from "./ReviewQueue";

type Query = { filter: TakeHomeFilter; q: string; page: number; template: string };

export default function AllTakeHomes({
  slug,
  query,
  template,
  chips,
  rows,
  pages,
  total,
  now,
  canCreate,
}: {
  slug: string;
  query: Query;
  template: { id: string; name: string } | null;
  chips: Record<TakeHomeFilter, number>;
  rows: TakeHomeRow[];
  pages: number;
  total: number;
  now: string;
  canCreate: boolean;
}) {
  const router = useRouter();
  const base = `/w/${slug}/take-homes/all`;
  const href = (patch: Partial<Query>) => listHref(base, query, patch);
  const [q, setQ] = useUrlSearch(query.q, (v) => router.replace(href({ q: v })));
  const at = new Date(now);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter take-homes" className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5 max-w-full overflow-x-auto">
          {FILTERS.map((f) => {
            const on = f.id === query.filter;
            return (
              <Link
                key={f.id}
                role="tab"
                aria-selected={on}
                href={href({ filter: f.id })}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded-[7px] text-[13px] font-medium whitespace-nowrap transition ${
                  on ? "bg-elevated text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {f.label}
                <span className={`text-xs tabular-nums ${on ? "text-secondary-soft" : "text-subtle"}`}>{chips[f.id]}</span>
              </Link>
            );
          })}
        </div>
        <label className="relative w-full md:w-72">
          <span className="sr-only">Search name, email or take home</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or take home" className={`${inputCls} pl-8`} />
        </label>
      </div>

      {template && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          Showing take-homes sent from
          <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-full bg-secondary/15 text-secondary-soft ring-1 ring-inset ring-secondary/30 font-medium">
            {template.name}
            <Link href={href({ template: "" })} aria-label="Show all templates" className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-secondary/20">
              <X className="w-3 h-3" />
            </Link>
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
          <Inbox className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-[15px] font-medium text-fg">{query.q || query.filter !== "all" ? "No matches" : "No take-homes yet"}</p>
          <p className="text-[13px] text-muted max-w-sm">
            {query.q || query.filter !== "all" ? "Try another search or filter." : "Every take home you send shows up here, with its status and deadline."}
          </p>
          {canCreate && !query.q && query.filter === "all" && (
            <Btn variant="primary" href={`/w/${slug}/take-homes/new`} className="mt-3">
              New take home
            </Btn>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div role="row" className="hidden lg:flex items-center gap-4 h-10 px-4 border-b border-border text-xs text-subtle">
            <span className="w-[250px] shrink-0">Candidate</span>
            <span className="flex-1 min-w-0">Take home</span>
            <span className="w-[120px] shrink-0">Status</span>
            <span className="w-[120px] shrink-0">Progress</span>
            <span className="w-[110px] shrink-0">Deadline</span>
            <span className="w-[56px] shrink-0">Score</span>
            <span className="w-[150px] shrink-0" />
          </div>
          <ul>
            {rows.map((r) => (
              <Row key={r.id} r={r} slug={slug} now={at} canCreate={canCreate} />
            ))}
          </ul>
        </div>
      )}

      <Pager page={query.page} pages={pages} total={total} noun="take home" href={(p) => href({ page: p })} />
    </div>
  );
}

function deadlineLabel(r: TakeHomeRow, now: Date): { text: string; cls: string } {
  if (r.state === "submitted") return { text: "Done", cls: "text-subtle" };
  if (r.state === "cancelled") return { text: "Cancelled", cls: "text-subtle" };
  if (!r.deadlineAt) return { text: "No deadline", cls: "text-subtle" };
  if (r.state === "expired") return { text: `Closed ${fmtDate(r.deadlineAt)}`, cls: "text-subtle" };
  const left = new Date(r.deadlineAt).getTime() - now.getTime();
  return { text: relativeTime(r.deadlineAt, now), cls: left < 2 * 86_400_000 ? "text-warning" : "text-muted" };
}

function Progress({ r }: { r: TakeHomeRow }) {
  const segs = Math.min(r.questions, 6);
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: segs }, (_, i) => (
          <span key={i} className={`w-[18px] h-1 rounded-sm ${i < r.answered ? "bg-secondary" : "bg-panel"}`} />
        ))}
      </span>
      <span className="text-[13px] text-muted tabular-nums">
        {r.answered} of {r.questions}
      </span>
    </span>
  );
}

function Row({ r, slug, now, canCreate }: { r: TakeHomeRow; slug: string; now: Date; canCreate: boolean }) {
  const report = `/w/${slug}/take-homes/${r.id}`;
  const deadline = deadlineLabel(r, now);
  const sent = `Sent ${relativeTime(r.sentAt, now).toLowerCase()}${r.sentBy ? ` by ${r.sentBy.split(/\s+/)[0]}` : ""}`;
  return (
    <li className="group flex flex-wrap lg:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:h-16 lg:py-0 border-t border-border first:border-t-0 transition-colors hover:bg-panel/60">
      <Link href={report} className="flex items-center gap-3 w-full lg:w-[250px] shrink-0 min-w-0">
        <Avatar name={r.candidate.name} size={34} />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-fg truncate group-hover:underline decoration-border-strong underline-offset-4">{r.candidate.name}</span>
          {r.candidate.email && <span className="block text-[13px] text-subtle truncate">{r.candidate.email}</span>}
        </span>
      </Link>
      <span className="flex-1 min-w-[180px]">
        <span className="block text-sm text-fg truncate">{r.title}</span>
        <span className="block text-[13px] text-subtle truncate">{sent}</span>
      </span>
      <span className="w-[120px] shrink-0">
        <StateDot state={r.state} decision={r.decision} />
      </span>
      <span className="w-[120px] shrink-0">
        <Progress r={r} />
      </span>
      <span className={`w-[110px] shrink-0 text-[13px] ${deadline.cls}`}>{deadline.text}</span>
      <span className={`w-[56px] shrink-0 text-sm tabular-nums ${r.score == null ? "text-subtle text-[13px]" : r.score >= 60 ? "text-fg font-semibold" : "text-warning font-semibold"}`}>
        {r.score ?? "None"}
      </span>
      <span className="w-full lg:w-[150px] shrink-0 flex justify-end gap-1.5">
        {r.state === "submitted" && (
          <Btn href={report}>
            {r.needsReview ? "Review" : "Open"}
            <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden />
          </Btn>
        )}
        <RowActions slug={slug} row={r} canCreate={canCreate} compact={r.state === "submitted"} />
      </span>
    </li>
  );
}
