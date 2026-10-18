/**
 * Small building blocks shared by the admin list pages (Interviews, AI
 * credits, Emails): page header, stat tiles, status pills, the filter bar
 * shell, the table frame and the pager. Server-safe (no hooks).
 */
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageWindow } from "./params";

export type Tone = "ok" | "warn" | "bad" | "off" | "info";

const TONE: Record<Tone, string> = {
  ok: "bg-success/15 text-success",
  warn: "bg-warning/15 text-warning",
  bad: "bg-danger/10 text-danger",
  off: "bg-panel text-muted",
  info: "bg-secondary/10 text-secondary-soft",
};

export function Pill({ tone = "off", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex h-6 w-fit items-center whitespace-nowrap rounded-full px-2 text-xs font-medium ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-fg">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-subtle">{sub}</div>}
    </div>
  );
}

export function Section({ title, description, actions, children }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Segmented links, e.g. status filters, each with an optional count. */
export function Segments({ items, label }: { items: { label: string; href: string; on: boolean; count?: number }[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {items.map((i) => (
        <Link
          key={i.href + i.label}
          href={i.href}
          aria-current={i.on ? "true" : undefined}
          className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm transition ${
            i.on ? "border-border-strong bg-panel font-medium text-fg" : "border-border text-muted hover:bg-panel hover:text-fg"
          }`}
        >
          {i.label}
          {i.count !== undefined && <span className="tabular-nums text-xs text-subtle">{i.count.toLocaleString("en-US")}</span>}
        </Link>
      ))}
    </nav>
  );
}

export const inputCls =
  "h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:border-secondary/60 focus:outline-none focus:ring-2 focus:ring-secondary/20";
export const buttonCls =
  "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg transition hover:border-border-strong hover:bg-panel disabled:opacity-50";
export const thCls = "px-4 py-2.5 text-left text-xs font-semibold text-muted";
export const tdCls = "px-4 py-2.5 align-top";

export function Table({ head, children, minWidth = 760 }: { head: React.ReactNode; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <thead className="bg-panel">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

/** "1 to 25 of 312" with previous and next links that keep every filter. */
export function Pager({ win, href, noun = "rows" }: { win: PageWindow; href: (page: number) => string; noun?: string }) {
  if (win.total === 0) return null;
  const link = "inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-sm text-fg hover:bg-panel";
  const off = "inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-sm text-subtle opacity-50";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span className="tabular-nums">
        {win.first.toLocaleString("en-US")} to {win.last.toLocaleString("en-US")} of {win.total.toLocaleString("en-US")} {noun}
      </span>
      {win.pages > 1 && (
        <div className="flex items-center gap-2">
          {win.page > 1 ? (
            <Link href={href(win.page - 1)} className={link}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Link>
          ) : (
            <span className={off}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </span>
          )}
          <span className="tabular-nums text-xs">
            Page {win.page} of {win.pages}
          </span>
          {win.page < win.pages ? (
            <Link href={href(win.page + 1)} className={link}>
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className={off}>
              Next <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** A label above a filter input, for the GET filter forms. */
export function FilterField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-muted ${className}`}>
      {label}
      {children}
    </label>
  );
}

export function DefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-fg">{children}</dd>
    </>
  );
}
