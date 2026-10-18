import Link from "next/link";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { Tone } from "@/lib/admin/workspace-actions";

/** Small building blocks for the workspace detail tabs. Server-safe (no hooks). */

const TONES: Record<Tone, string> = {
  ok: "bg-success/15 text-success",
  warn: "bg-warning/15 text-warning",
  bad: "bg-danger/10 text-danger",
  info: "bg-secondary/15 text-secondary-soft",
  off: "bg-panel text-muted",
};

export function Pill({ tone = "off", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center h-[22px] px-2 rounded-full text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ title, right, children, className = "" }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-surface ${className}`}>
      {(title || right) && (
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          {title && <h2 className="flex-1 text-[15px] font-semibold text-fg">{title}</h2>}
          {right}
        </div>
      )}
      <div className="px-5 pb-4">{children}</div>
    </section>
  );
}

export function Kv({ k, children }: { k: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-fg text-right min-w-0">{children}</span>
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
      <div className="text-xs font-medium text-subtle">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tabular-nums text-fg">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-muted">{children}</div>;
}

/** Table shell with a header row; children are <tr>s. */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-panel/60">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-xs font-semibold text-subtle whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-2.5 align-middle";

/**
 * Search box and an optional status select, as a GET form so the server
 * pages and filters. Keeps the other params it is given.
 */
export function ListFilters({
  q,
  status,
  statuses,
  placeholder = "Search by name or email",
  keep = {},
}: {
  q?: string;
  status?: string;
  statuses?: { id: string; label: string }[];
  placeholder?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form className="flex flex-wrap items-center gap-2" role="search">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="relative flex-1 min-w-[220px] max-w-sm">
        <span className="sr-only">Search</span>
        <Search className="w-4 h-4 text-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-[13px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60"
        />
      </label>
      {statuses && (
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Status"
          className="h-9 rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg focus:outline-none focus:border-secondary/60"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="h-9 px-3.5 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel">
        Apply
      </button>
    </form>
  );
}

/** Previous / next pager for server-paged lists. */
export function Pager({ page, pages, total, href }: { page: number; pages: number; total: number; href: (page: number) => string }) {
  if (pages <= 1) return <div className="px-4 py-3 text-xs text-muted border-t border-border">{total === 1 ? "1 row" : `${total} rows`}</div>;
  const btn = "h-8 px-3 rounded-lg border border-border text-[13px] inline-flex items-center hover:bg-panel";
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border text-xs text-muted">
      <span>
        Page {page} of {pages}, {total} rows
      </span>
      <span className="flex gap-2">
        {page > 1 ? <Link className={`${btn} text-fg`} href={href(page - 1)}>Previous</Link> : <span className={`${btn} opacity-40`}>Previous</span>}
        {page < pages ? <Link className={`${btn} text-fg`} href={href(page + 1)}>Next</Link> : <span className={`${btn} opacity-40`}>Next</span>}
      </span>
    </div>
  );
}

/** Builds a URL for this path with the given params (empty ones dropped). */
export function urlWith(path: string, params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && !(k === "page" && v === 1)) q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export function fmtDate(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "UTC",
  });
}

export function fmtUsd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const v = cents / 100;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function fmtBytes(n: number | bigint | null | undefined): string {
  const b = Number(n ?? 0);
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}

export function fmtDuration(sec: number | null | undefined): string {
  const s = Math.max(0, Math.round(sec ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function one(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

/** Status tone for the many status strings the hiring side uses. */
export function statusTone(s: string | null | undefined): Tone {
  const v = (s ?? "").toLowerCase();
  if (["completed", "submitted", "passed", "ready", "finished", "active_passed"].includes(v)) return "ok";
  if (["active", "in_progress", "live", "recording", "started", "processing"].includes(v)) return "info";
  if (["expired", "failed", "error", "rejected", "cancelled", "canceled", "abandoned"].includes(v)) return "bad";
  if (["pending", "scheduled", "invited", "sent"].includes(v)) return "warn";
  return "off";
}

export function statusLabel(s: string | null | undefined): string {
  const v = (s ?? "").replace(/[_-]/g, " ").toLowerCase();
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
}
