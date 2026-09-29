"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Inbox, Mail, MoreHorizontal, Search, Send, XCircle } from "lucide-react";
import type { QueueCounts, QueueQuery, QueueRow, ScreeningOption } from "@/lib/ai-interview/console-server";
import { daysLeft, queueHref, type QueueView } from "@/lib/ai-interview/console";
import { plural } from "@/lib/workspace/display";
import { Avatar, Btn, Menu, MenuItem, fmtDate, inputCls, useToasts } from "../../candidates/_components/ui";
import { ConfirmDialog } from "../../candidates/_components/dialogs";
import { StatusChip, ToneChip, ToneDot, ToneScore, selectCls } from "./kit";
import { cancelInvitesAction, remindAction, resendInviteAction } from "../actions";

const VIEWS: { id: QueueView; label: string }[] = [
  { id: "review", label: "To review" },
  { id: "progress", label: "In progress" },
  { id: "invited", label: "Invited" },
  { id: "all", label: "All" },
];

const EMPTY: Record<QueueView, { title: string; hint: string }> = {
  review: { title: "Nothing to review", hint: "Finished screenings that still need your decision show up here." },
  progress: { title: "Nobody is mid-interview", hint: "Candidates who have started but not finished show up here." },
  invited: { title: "No open invites", hint: "People you invited who have not started yet show up here." },
  all: { title: "No screenings yet", hint: "Send your first screening to see results here." },
};

export default function ReviewQueue({
  slug,
  query,
  counts,
  rows,
  total,
  pages,
  screenings,
  expiring,
  canCreate,
}: {
  slug: string;
  query: QueueQuery;
  counts: QueueCounts;
  rows: QueueRow[];
  total: number;
  pages: number;
  screenings: ScreeningOption[];
  expiring: { id: string; name: string; role: string }[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const base = `/w/${slug}/ai-interviews`;
  const [pending, start] = useTransition();
  const [toasts, toast] = useToasts();
  const [q, setQ] = useState(query.q);
  const [selected, setSelected] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [confirmCancel, setConfirmCancel] = useState<string[] | null>(null);
  const [fresh, setFresh] = useState(0);
  const lastReview = useRef(counts.review);
  const href = (patch: Parameters<typeof queueHref>[2]) => queueHref(base, query, patch);
  const invitedView = query.view === "invited";

  // Keep the list current without a toggle: refresh while the tab is visible,
  // and say when new results arrived.
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);
  useEffect(() => {
    if (counts.review > lastReview.current) setFresh((n) => n + counts.review - lastReview.current);
    lastReview.current = counts.review;
  }, [counts.review]);

  // Search as you type, a moment after typing stops.
  useEffect(() => {
    if (q.trim() === query.q) return;
    const t = window.setTimeout(() => router.replace(href({ q: q.trim() })), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Selection belongs to one page of one view.
  useEffect(() => setSelected([]), [query.view, query.page, query.q, query.screening]);

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

  const selectable = useMemo(() => rows.filter((r) => r.status === "PENDING").map((r) => r.id), [rows]);
  const allOn = selectable.length > 0 && selectable.every((id) => selected.includes(id));

  function run<T extends { ok: boolean; error?: string }>(p: Promise<T>, done: (r: T) => string) {
    start(async () => {
      const r = await p;
      if (!r.ok) return toast(r.error ?? "Something went wrong.", "error");
      toast(done(r));
      setSelected([]);
      router.refresh();
    });
  }

  const remind = (ids: string[]) =>
    run(remindAction(slug, ids), (r) =>
      r.ok ? (r.failed ? `${plural(r.sent, "reminder")} sent, ${r.failed} failed` : `${plural(r.sent, "reminder")} sent`) : "",
    );
  const resend = (id: string) =>
    run(resendInviteAction(slug, id), (r) => (r.ok && r.sent ? "Invite sent again" : `The email could not be sent${r.ok && r.reason ? `: ${r.reason}` : ""}`));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter screenings" className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5 max-w-full overflow-x-auto">
          {VIEWS.map((v) => {
            const on = v.id === query.view;
            return (
              <Link
                key={v.id}
                role="tab"
                aria-selected={on}
                href={href({ view: v.id, sort: "" })}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded-[7px] text-[13px] font-medium whitespace-nowrap transition ${
                  on ? "bg-elevated text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {v.label}
                <span className={`text-xs tabular-nums ${on ? "text-secondary-soft" : "text-subtle"}`}>{counts[v.id]}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
          <label className="relative flex-1 md:flex-none md:w-60">
            <span className="sr-only">Search name, email or role</span>
            <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className={`${inputCls} pl-8`} />
          </label>
          <label className="sr-only" htmlFor="ai-screening-filter">Screening</label>
          <select
            id="ai-screening-filter"
            value={query.screening}
            onChange={(e) => router.push(href({ screening: e.target.value }))}
            className={`${selectCls} w-auto max-w-[200px]`}
          >
            <option value="all">All screenings</option>
            {screenings.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}, {fmtDate(s.createdAt)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="ai-screening-sort">Sort</label>
          <select id="ai-screening-sort" value={query.sort} onChange={(e) => router.push(href({ sort: e.target.value }))} className={`${selectCls} w-auto`}>
            <option value="score">Sort: AI score</option>
            <option value="recent">Sort: Most recent</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {fresh > 0 && query.view === "review" && (
        <button
          type="button"
          onClick={() => setFresh(0)}
          className="self-center inline-flex items-center gap-2 h-8 px-3 rounded-full bg-secondary/15 text-secondary-soft text-[13px] font-medium ring-1 ring-inset ring-secondary/30 animate-fade-in"
        >
          {plural(fresh, "new result")} added to the queue
        </button>
      )}

      {invitedView && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary/30 bg-secondary/[0.06] px-4 py-2.5 animate-fade-in">
          <span className="text-[13px] text-fg font-medium mr-auto">{plural(selected.length, "invite")} selected</span>
          <Btn icon={Mail} disabled={pending} onClick={() => remind(selected)}>
            Send reminder
          </Btn>
          <Btn variant="danger" icon={XCircle} disabled={pending} onClick={() => setConfirmCancel(selected)}>
            Cancel invites
          </Btn>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center flex flex-col items-center gap-2">
          <Inbox className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-[15px] font-medium text-fg">{query.q || query.screening !== "all" ? "No matches" : EMPTY[query.view].title}</p>
          <p className="text-[13px] text-muted max-w-sm">
            {query.q || query.screening !== "all" ? "Try another search or screening." : EMPTY[query.view].hint}
          </p>
          {canCreate && query.view === "all" && !query.q && (
            <Btn variant="primary" href={`${base}/new`} className="mt-3">
              New screening
            </Btn>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div role="row" className="hidden min-[1400px]:flex items-center gap-3 h-10 px-4 border-b border-border text-xs text-subtle">
            {invitedView ? (
              <input
                type="checkbox"
                aria-label="Select all open invites"
                checked={allOn}
                disabled={!selectable.length}
                onChange={() => setSelected(allOn ? [] : selectable)}
                className="w-4 h-4 accent-secondary"
              />
            ) : (
              <span className="w-4" />
            )}
            <span className="w-[210px] shrink-0">Candidate</span>
            <span className="flex-1 min-w-0">Screening</span>
            {invitedView || query.view === "progress" ? (
              <>
                <span className="w-[130px] shrink-0">Status</span>
                <span className="w-[140px] shrink-0">{invitedView ? "Invite" : "Started"}</span>
              </>
            ) : (
              <>
                <span className="w-[140px] shrink-0">AI suggestion</span>
                <span className="w-[120px] shrink-0">AI score</span>
                <span className="w-[110px] shrink-0">Integrity</span>
                <span className="w-[80px] shrink-0">Finished</span>
              </>
            )}
            <span className="w-[92px] shrink-0" />
          </div>
          <ul>
            {rows.map((r, i) => (
              <Row
                key={r.id}
                r={r}
                view={query.view}
                href={`${base}/${r.id}`}
                focused={i === cursor}
                selectable={invitedView && r.status === "PENDING"}
                selected={selected.includes(r.id)}
                onSelect={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                onRemind={() => remind([r.id])}
                onResend={() => resend(r.id)}
                onCancel={() => setConfirmCancel([r.id])}
                busy={pending}
              />
            ))}
          </ul>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
          <span>
            Page {query.page} of {pages}, {plural(total, "screening")}
          </span>
          <div className="flex gap-2">
            <Btn icon={ChevronLeft} href={query.page > 1 ? href({ page: query.page - 1 }) : undefined} disabled={query.page <= 1}>
              Previous
            </Btn>
            <Btn href={query.page < pages ? href({ page: query.page + 1 }) : undefined} disabled={query.page >= pages}>
              Next
              <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden />
            </Btn>
          </div>
        </div>
      )}

      {expiring.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-3.5 rounded-xl border border-border bg-surface">
          <Clock className="w-[18px] h-[18px] text-warning shrink-0" aria-hidden />
          <div className="flex-1 min-w-[220px]">
            <p className="text-sm font-medium text-fg">{plural(expiring.length, "invite")} close in the next 2 days</p>
            <p className="text-[13px] text-muted">
              {names(expiring.map((e) => e.name))} {expiring.length === 1 ? "has" : "have"} not started yet.
            </p>
          </div>
          <Btn icon={Mail} disabled={pending} onClick={() => remind(expiring.map((e) => e.id))}>
            Send reminder
          </Btn>
        </div>
      )}

      {rows.length > 0 && (
        <p className="hidden md:block text-xs text-subtle">
          Tip: press J and K to move through the list and Enter to open a report.
        </p>
      )}

      {confirmCancel && (
        <ConfirmDialog
          title={confirmCancel.length === 1 ? "Cancel this invite?" : `Cancel ${plural(confirmCancel.length, "invite")}?`}
          body="The link stops working straight away and the credits it held are freed. You can resend it later."
          confirmLabel="Cancel invites"
          danger
          busy={pending}
          onCancel={() => setConfirmCancel(null)}
          onConfirm={() => {
            const ids = confirmCancel;
            setConfirmCancel(null);
            run(cancelInvitesAction(slug, ids), (r) => (r.ok ? `${plural(r.cancelled, "invite")} cancelled` : ""));
          }}
        />
      )}
      {toasts}
    </div>
  );
}

function names(list: string[]): string {
  if (list.length <= 2) return list.join(" and ");
  return `${list.slice(0, 2).join(", ")} and ${list.length - 2} more`;
}

function Row({
  r,
  view,
  href,
  focused,
  selectable,
  selected,
  onSelect,
  onRemind,
  onResend,
  onCancel,
  busy,
}: {
  r: QueueRow;
  view: QueueView;
  href: string;
  focused: boolean;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
  onRemind: () => void;
  onResend: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);
  const invited = view === "invited" || (view === "all" && (r.status === "PENDING" || r.status === "EXPIRED"));
  const done = r.status === "COMPLETED";
  const left = daysLeft(r.expiresAt ? new Date(r.expiresAt) : null, new Date());
  const emailFailed = r.inviteEmailStatus === "FAILED";

  const inviteCell =
    r.status === "EXPIRED" ? (
      <span className="text-[13px] text-subtle">Closed {fmtDate(r.expiresAt)}</span>
    ) : emailFailed ? (
      <span className="text-[13px] text-danger">Email not delivered</span>
    ) : left != null ? (
      <span className={`text-[13px] ${left <= 2 ? "text-warning" : "text-muted"}`}>{left === 0 ? "Closes today" : `Closes in ${plural(left, "day")}`}</span>
    ) : (
      <span className="text-[13px] text-muted">Sent {fmtDate(r.createdAt)}</span>
    );

  const menu = (r.status === "PENDING" || r.status === "EXPIRED") && (
    <Menu
      align="right"
      width={200}
      label={`Invite actions for ${r.name}`}
      trigger={(p) => (
        <button {...p} type="button" aria-label={`More actions for ${r.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem disabled={busy} onClick={() => (close(), onResend())}>
            <Send className="w-3.5 h-3.5 text-muted" /> {r.status === "EXPIRED" ? "Reopen and resend" : "Resend invite"}
          </MenuItem>
          {r.status === "PENDING" && (
            <MenuItem disabled={busy} onClick={() => (close(), onRemind())}>
              <Mail className="w-3.5 h-3.5 text-muted" /> Send reminder
            </MenuItem>
          )}
          {r.status === "PENDING" && (
            <MenuItem danger disabled={busy} onClick={() => (close(), onCancel())}>
              <XCircle className="w-3.5 h-3.5" /> Cancel invite
            </MenuItem>
          )}
        </>
      )}
    </Menu>
  );

  return (
    <li
      ref={ref}
      className={`group relative border-b border-border last:border-b-0 transition-colors ${focused ? "bg-panel" : "hover:bg-panel/60"} ${
        focused ? "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-secondary" : ""
      }`}
    >
      {/* Desktop row */}
      <div className="hidden min-[1400px]:flex items-center gap-3 min-h-16 px-4 py-2">
        {selectable ? (
          <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected} onChange={onSelect} className="w-4 h-4 accent-secondary relative z-10" />
        ) : (
          <span className="w-4" />
        )}
        <Link href={href} className="w-[210px] shrink-0 flex items-center gap-3 min-w-0 after:absolute after:inset-0">
          <Avatar name={r.name} />
          <span className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-fg truncate">{r.name}</span>
            <span className="text-xs text-subtle truncate">{r.email}</span>
          </span>
        </Link>
        <span className="flex-1 min-w-0 text-sm text-muted truncate">{r.role}</span>
        {invited || view === "progress" ? (
          <>
            <span className="w-[130px] shrink-0">
              <StatusChip status={r.status} />
            </span>
            <span className="w-[140px] shrink-0">{view === "progress" ? <span className="text-[13px] text-muted">{fmtDate(r.startedAt)}</span> : inviteCell}</span>
          </>
        ) : (
          <>
            <span className="w-[140px] shrink-0">
              {r.suggestion ? <ToneChip tone={r.suggestion.tone}>{r.suggestion.label}</ToneChip> : <StatusChip status={r.status} />}
            </span>
            <span className="w-[120px] shrink-0">{done ? <ToneScore value={r.score} tone={r.suggestion?.tone ?? "neutral"} /> : <span className="text-[13px] text-subtle">Not finished</span>}</span>
            <span className="w-[110px] shrink-0">{r.integrity ? <ToneDot tone={r.integrity.tone} label={r.integrity.label} /> : <span className="text-[13px] text-subtle">No data</span>}</span>
            <span className="w-[80px] shrink-0 text-[13px] text-muted">{fmtDate(r.finishedAt) || "Not yet"}</span>
          </>
        )}
        <span className="w-[92px] shrink-0 flex items-center justify-end gap-1 relative z-10">
          {menu}
          {done && !menu && (
            <Link href={href} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border-strong text-[13px] text-fg hover:bg-elevated">
              {r.awaitsDecision ? "Review" : "Open"}
              <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden />
            </Link>
          )}
        </span>
      </div>

      {/* Phone card */}
      <div className="min-[1400px]:hidden flex items-start gap-3 px-4 py-3.5">
        {selectable && (
          <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected} onChange={onSelect} className="mt-2 w-4 h-4 accent-secondary relative z-10" />
        )}
        <Avatar name={r.name} size={36} />
        <Link href={href} className="flex-1 min-w-0 flex flex-col gap-1.5 after:absolute after:inset-0">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-fg truncate">{r.name}</span>
            {done && r.score != null && <span className="text-sm font-semibold tabular-nums text-fg">{r.score}</span>}
          </span>
          <span className="text-xs text-subtle truncate">{r.role}</span>
          <span className="flex flex-wrap items-center gap-2">
            {r.suggestion ? <ToneChip tone={r.suggestion.tone}>{r.suggestion.label}</ToneChip> : <StatusChip status={r.status} />}
            {done && r.integrity && <ToneDot tone={r.integrity.tone} label={r.integrity.label} />}
            {invited && inviteCell}
          </span>
        </Link>
        {menu && <span className="relative z-10">{menu}</span>}
      </div>
    </li>
  );
}
