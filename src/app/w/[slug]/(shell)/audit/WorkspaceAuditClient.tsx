"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, ScrollText } from "lucide-react";
import {
  ACTOR_AUTOMATION,
  AUDIT_CATEGORIES,
  AUDIT_RANGES,
  auditQueryParams,
  groupByDay,
  type AuditQuery,
  type AuditSentence,
  type AuditTone,
} from "@/lib/workspace/audit-timeline";
import { plural } from "@/lib/workspace/display";
import { Btn, inputCls, useToasts } from "../candidates/_components/ui";
import { exportWorkspaceAuditCsvAction } from "./actions";

export type TimelineRow = AuditSentence & {
  id: string;
  createdAt: string;
  action: string;
  ip: string | null;
  meta: Record<string, unknown> | null;
};

type Props = {
  slug: string;
  query: AuditQuery;
  members: { id: string; label: string }[];
  rows: TimelineRow[];
  paging: { page: number; pages: number; total: number; first: number; last: number };
  now: string;
};

const DOT: Record<AuditTone, string> = {
  override: "bg-warning",
  danger: "bg-danger",
  accent: "bg-secondary",
  neutral: "bg-subtle",
};

const selectCls =
  "h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-fg focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20";

export default function WorkspaceAuditClient({ slug, query, members, rows, paging, now }: Props) {
  const router = useRouter();
  const [toasts, toast] = useToasts();
  const [exporting, startExport] = useTransition();
  const [from, setFrom] = useState(query.from);
  const [to, setTo] = useState(query.to);
  const base = `/w/${slug}/audit`;

  const href = (patch: Partial<AuditQuery>) => {
    const next = { ...query, page: 1, ...patch };
    const s = auditQueryParams(next).toString();
    return s ? `${base}?${s}` : base;
  };

  const filtered = query.category !== "all" || !!query.actor || query.range === "custom";
  // Server render groups by UTC day; after mount, by the viewer's own day.
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(true), []);
  const groups = groupByDay(rows, new Date(now), !local);

  function onExport() {
    startExport(async () => {
      try {
        const params = Object.fromEntries(auditQueryParams({ ...query, page: 1 }));
        const res = await exportWorkspaceAuditCsvAction(slug, params);
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug}-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast(res.capped ? `Exported the newest ${plural(res.rows, "entry", "entries")}. Narrow the dates to get the rest.` : `Exported ${plural(res.rows, "entry", "entries")}.`);
      } catch (err) {
        toast(err instanceof Error ? err.message : "The export failed.", "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {toasts}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Audit log</h1>
          <p className="text-sm text-muted max-w-2xl">
            Everything people, keys and connections changed in this workspace, newest first.
          </p>
        </div>
        <Btn size="md" icon={Download} onClick={onExport} disabled={exporting || paging.total === 0}>
          {exporting ? "Exporting…" : "Export CSV"}
        </Btn>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
          {AUDIT_CATEGORIES.map((c) => {
            const on = c.id === query.category;
            return (
              <Link
                key={c.id}
                href={href({ category: c.id })}
                aria-current={on ? "true" : undefined}
                className={`inline-flex items-center h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition ${
                  on ? "bg-ink text-ink-fg" : "bg-panel text-fg hover:bg-elevated"
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <label htmlFor="audit-actor" className="text-[13px] text-muted">
          By
        </label>
        <select
          id="audit-actor"
          value={query.actor}
          onChange={(e) => router.push(href({ actor: e.target.value }))}
          className={selectCls}
        >
          <option value="">Anyone</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value={ACTOR_AUTOMATION}>API keys and automation</option>
        </select>
        <label htmlFor="audit-range" className="text-[13px] text-muted">
          When
        </label>
        <select
          id="audit-range"
          value={query.range}
          onChange={(e) => {
            const range = e.target.value as AuditQuery["range"];
            if (range === "custom") router.push(href({ range, from, to }));
            else router.push(href({ range, from: "", to: "" }));
          }}
          className={selectCls}
        >
          {AUDIT_RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {query.range === "custom" && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(href({ from, to }));
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-subtle">From</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-44`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-subtle">To</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-44`} />
          </label>
          <Btn type="submit">Show</Btn>
          <span className="text-xs text-subtle">Dates are in UTC and include the whole of the last day.</span>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
          <ScrollText className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-[15px] font-medium text-fg">{filtered ? "Nothing matches these filters" : "Nothing in this period"}</p>
          <p className="text-[13px] text-muted max-w-sm">
            {filtered
              ? "Try another category, person or date range."
              : "Changes to candidates, screenings, people, keys and connections show up here as they happen."}
          </p>
          {query.range !== "all" && (
            <Btn href={href({ range: "all", from: "", to: "" })} className="mt-2">
              Show all time
            </Btn>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {groups.map((g, gi) => (
            <section key={`${g.day}-${gi}`} aria-label={g.day}>
              <h2 className={`px-4 py-2.5 text-[13px] font-semibold text-muted bg-panel ${gi > 0 ? "border-t border-border" : ""}`}>{g.day}</h2>
              <ul>
                {g.rows.map((r, i) => (
                  <Event key={r.id} r={r} slug={slug} first={i === 0} local={local} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {paging.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <span>
            Showing {paging.first} to {paging.last} of {paging.total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Btn href={paging.page > 1 ? href({ page: paging.page - 1 }) : undefined} disabled={paging.page <= 1}>
              Previous
            </Btn>
            <Btn href={paging.page < paging.pages ? href({ page: paging.page + 1 }) : undefined} disabled={paging.page >= paging.pages}>
              Next
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function Event({ r, slug, first, local }: { r: TimelineRow; slug: string; first: boolean; local: boolean }) {
  const time = new Date(r.createdAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(local ? {} : { timeZone: "UTC" }),
  });
  return (
    <li
      className={`grid grid-cols-[52px_14px_1fr] sm:grid-cols-[64px_14px_1fr_200px] gap-x-3 gap-y-1 items-start px-4 py-3 ${first ? "" : "border-t border-border"}`}
    >
      <time dateTime={r.createdAt} title={local ? new Date(r.createdAt).toLocaleString() : undefined} className="font-mono text-[13px] text-subtle pt-0.5 tabular-nums">
        {time}
      </time>
      <span aria-hidden className={`w-2.5 h-2.5 rounded-full mt-1.5 ${DOT[r.tone]}`} />
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm text-fg">
          <span className="font-semibold">{r.title}</span>
          {r.tag && (
            <span className="ml-2 inline-flex items-center h-5 px-1.5 rounded-md text-xs font-semibold bg-warning/15 text-warning align-middle">
              {r.tag}
            </span>
          )}
        </p>
        {(r.detail || r.path) && (
          <p className="text-[13px] text-muted">
            {r.detail}
            {r.detail && r.path ? " " : ""}
            {r.path && (
              <Link href={`/w/${slug}/${r.path}`} className="text-secondary hover:underline underline-offset-2">
                {r.pathLabel ?? "Open"}
              </Link>
            )}
          </p>
        )}
        <p className="sm:hidden text-xs text-subtle">{r.actor}</p>
      </div>
      <span className="hidden sm:block text-[13px] text-muted text-right truncate" title={r.ip ? `${r.actor} from ${r.ip}` : r.actor}>
        {r.actor}
      </span>
    </li>
  );
}
