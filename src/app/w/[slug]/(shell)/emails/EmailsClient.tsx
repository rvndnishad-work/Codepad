"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Search, X } from "lucide-react";
import {
  EMAIL_STATUS_GROUPS,
  problemExplanation,
  statusChip,
  type EmailQuery,
  type EmailStatusGroup,
  type StatusTone,
} from "@/lib/workspace/email-activity";
import { Btn, inputCls, useToasts } from "../candidates/_components/ui";
import { listHref, useUrlSearch } from "../take-homes/_components/ReviewQueue";
import { resendEmailAction } from "./actions";

export type EmailRow = {
  id: string;
  template: string;
  templateLabel: string;
  recipientEmail: string;
  candidateId: string | null;
  candidateName: string | null;
  status: string;
  errorReason: string | null;
  providerId: string | null;
  hasSession: boolean;
  createdAt: string;
  lastEventAt: string | null;
  canResend: boolean;
};

type Props = {
  slug: string;
  query: EmailQuery;
  rows: EmailRow[];
  counts: Record<EmailStatusGroup, number>;
  templates: { id: string; label: string }[];
  paging: { page: number; pages: number; total: number; first: number; last: number };
  now: string;
};

const TONE: Record<StatusTone, string> = {
  ok: "bg-success/15 text-success",
  bad: "bg-danger/10 text-danger",
  warn: "bg-warning/15 text-warning",
  neutral: "bg-panel text-muted",
};

const PROBLEM = new Set(["bounced", "complained", "failed", "suppressed"]);

function StatusChip({ status }: { status: string }) {
  const c = statusChip(status);
  return <span className={`inline-flex items-center h-6 px-2 rounded-full text-[13px] font-medium w-fit whitespace-nowrap ${TONE[c.tone]}`}>{c.label}</span>;
}

/** "09:14", "Yesterday", or "22 Sep", in the viewer's time zone. */
function sentLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}

export default function EmailsClient({ slug, query, rows, counts, templates, paging, now }: Props) {
  const router = useRouter();
  const [toasts, toast] = useToasts();
  const [open, setOpen] = useState<EmailRow | null>(null);
  const base = `/w/${slug}/emails`;
  const q0 = { status: query.status, template: query.template, q: query.q, page: query.page };
  const href = (patch: Partial<EmailQuery>) => listHref(base, q0, patch as Record<string, string | number>);
  const [q, setQ] = useUrlSearch(query.q, (v) => router.replace(href({ q: v })));
  const at = new Date(now);
  const filtered = query.status !== "all" || !!query.template || !!query.q;

  return (
    <div className="flex flex-col gap-4">
      {toasts}
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Email activity</h1>
        <p className="text-sm text-muted max-w-2xl">Every invite, reminder and result email this workspace sent, and whether it arrived.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search by recipient</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by recipient" className={`${inputCls} pl-8 bg-surface`} />
        </label>
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {EMAIL_STATUS_GROUPS.map((g) => {
            const on = g.id === query.status;
            const alarm = g.id === "bounced" && counts.bounced > 0 && !on;
            return (
              <Link
                key={g.id}
                href={href({ status: g.id })}
                aria-current={on ? "true" : undefined}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition ${
                  on ? "bg-ink text-ink-fg" : alarm ? "bg-danger/10 text-danger hover:bg-danger/20" : "bg-panel text-fg hover:bg-elevated"
                }`}
              >
                {g.label}
                <span className="tabular-nums opacity-80">{counts[g.id].toLocaleString()}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <label htmlFor="email-type" className="text-[13px] text-muted">
          Type
        </label>
        <select
          id="email-type"
          value={query.template}
          onChange={(e) => router.push(href({ template: e.target.value }))}
          className="h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-fg focus:outline-none focus:border-secondary/60"
        >
          <option value="">All types</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
          <Mail className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-[15px] font-medium text-fg">{filtered ? "No emails match" : "No emails sent yet"}</p>
          <p className="text-[13px] text-muted max-w-sm">
            {filtered ? "Try another search, status or type." : "Send a take-home or an AI screening and its emails show up here."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[13px] text-muted bg-panel">
                <th className="px-4 py-2.5 font-semibold w-[110px]">Sent</th>
                <th className="px-4 py-2.5 font-semibold">Recipient</th>
                <th className="px-4 py-2.5 font-semibold w-[210px]">Email</th>
                <th className="px-4 py-2.5 font-semibold w-[260px]">Status</th>
                <th className="px-4 py-2.5 w-[120px]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const problem = PROBLEM.has(r.status);
                return (
                  <tr
                    key={r.id}
                    onClick={() => setOpen(r)}
                    className={`border-t border-border cursor-pointer hover:bg-panel/60 ${problem ? "bg-danger/[0.04]" : ""}`}
                  >
                    <td className="px-4 py-3 text-muted whitespace-nowrap" suppressHydrationWarning>
                      {sentLabel(r.createdAt, at)}
                    </td>
                    <td className="px-4 py-3 min-w-0">
                      <div className="flex flex-col min-w-0">
                        {r.candidateName && r.candidateId ? (
                          <Link
                            href={`/w/${slug}/candidates/${r.candidateId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-secondary hover:underline underline-offset-2 truncate"
                          >
                            {r.candidateName}
                          </Link>
                        ) : null}
                        <span className={`truncate ${r.candidateName ? "text-[13px] text-muted" : "text-fg"}`}>{r.recipientEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fg">{r.templateLabel}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusChip status={r.status} />
                        {problem && (
                          <span className={`text-[13px] line-clamp-2 ${r.status === "bounced" || r.status === "complained" ? "text-danger" : "text-warning"}`}>
                            {problemExplanation(r.status, r.errorReason)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(r);
                        }}
                        className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel whitespace-nowrap"
                      >
                        {r.canResend ? "Resend" : "Details"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {open && (
        <EmailDrawer
          slug={slug}
          row={open}
          onClose={() => setOpen(null)}
          onResent={(msg) => {
            toast(msg);
            setOpen(null);
            router.refresh();
          }}
          onError={(msg) => toast(msg, "error")}
        />
      )}
    </div>
  );
}

function EmailDrawer({
  slug,
  row,
  onClose,
  onResent,
  onError,
}: {
  slug: string;
  row: EmailRow;
  onClose: () => void;
  onResent: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const explanation = problemExplanation(row.status, row.errorReason);
  const problem = PROBLEM.has(row.status);
  const full = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  const resend = () =>
    start(async () => {
      const res = await resendEmailAction(slug, row.id);
      if (res.ok) onResent(res.message);
      else onError(res.error);
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-bg/60 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-drawer-title"
        className="relative h-full w-full max-w-md bg-surface border-l border-border-strong shadow-2xl shadow-black/40 flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <h2 id="email-drawer-title" className="text-lg font-semibold text-fg truncate">
            {row.templateLabel}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <StatusChip status={row.status} />
            {explanation && <p className={`text-sm ${row.status === "bounced" || row.status === "complained" ? "text-danger" : "text-warning"}`}>{explanation}</p>}
          </div>
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-3 text-sm">
            <dt className="text-muted">To</dt>
            <dd className="min-w-0">
              {row.candidateName && row.candidateId && (
                <Link href={`/w/${slug}/candidates/${row.candidateId}`} className="block font-medium text-secondary hover:underline underline-offset-2">
                  {row.candidateName}
                </Link>
              )}
              <span className="break-all text-fg">{row.recipientEmail}</span>
            </dd>
            <dt className="text-muted">Sent</dt>
            <dd className="text-fg">{full(row.createdAt)}</dd>
            <dt className="text-muted">Last update</dt>
            <dd className="text-fg">{row.lastEventAt ? full(row.lastEventAt) : "No updates from the provider yet"}</dd>
            {row.providerId && (
              <>
                <dt className="text-muted">Provider id</dt>
                <dd className="font-mono text-[13px] text-muted break-all">{row.providerId}</dd>
              </>
            )}
          </dl>
          {problem && !row.canResend && (
            <p className="text-[13px] text-muted">
              {row.template === "ai-screening-invite" || row.template === "take-home-session-invite"
                ? "You do not have permission to resend this invite."
                : "This kind of email cannot be resent from here."}
            </p>
          )}
        </div>
        {row.canResend && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
            {row.candidateId && (
              <Btn href={`/w/${slug}/candidates/${row.candidateId}`}>Fix the address</Btn>
            )}
            <Btn variant="primary" onClick={resend} disabled={pending}>
              {pending ? "Sending…" : "Resend invite"}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
