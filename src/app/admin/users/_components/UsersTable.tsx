"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Loader2, LogOut, MoreHorizontal, ShieldCheck, UserX, X } from "lucide-react";
import type { UserRowData } from "../_lib/load";
import type { UserSide } from "../_lib/filters";
import { fmtAgo, fmtDay } from "../_lib/format";
import StatusPill, { SmallPill } from "./StatusPill";
import UserActionPanel, { availableActions, type ActionTarget, type UserActionKey } from "./UserActionPanel";
import { bulkSignOutAction, bulkSuspendAction, type BulkResult } from "../actions";

function toTarget(r: UserRowData): ActionTarget {
  return {
    id: r.id,
    label: r.name || r.email || r.id,
    email: r.email,
    state: r.state,
    banned: r.state === "suspended",
    emailVerified: r.emailVerified,
    twoFactor: r.twoFactor,
  };
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  INTERVIEWER: "Interviewer",
  VIEWER: "Viewer",
};

export default function UsersTable({
  side,
  rows,
  now,
  canHardDelete,
  exportBase,
  footer,
}: {
  side: UserSide;
  rows: UserRowData[];
  now: number;
  canHardDelete: boolean;
  /** Export URL for the current filters, e.g. /api/admin/users/export?side=developers&q=… */
  exportBase: string;
  /** Rendered inside the card under the table (pagination). */
  footer?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ id: string; action: UserActionKey } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  // Selection resets when the page of rows changes.
  const rowKey = rows.map((r) => r.id).join(",");
  useEffect(() => setSelected(new Set()), [rowKey]);

  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const cols = 9;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {selected.size > 0 && (
        <BulkBar ids={[...selected]} exportBase={exportBase} onClear={() => setSelected(new Set())} />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-panel text-xs text-muted">
            <tr className="text-left">
              <th className="w-10 pl-4 py-2.5">
                <input type="checkbox" aria-label="Select all on this page" checked={allOn} onChange={toggleAll} className="accent-[rgb(var(--c-accent-2))]" />
              </th>
              <th className="px-3 py-2.5 font-medium">Name</th>
              {side !== "recruiters" ? (
                <>
                  <th className="px-3 py-2.5 font-medium">Joined</th>
                  <th className="px-3 py-2.5 font-medium">Last sign-in</th>
                  <th className="px-3 py-2.5 font-medium text-right">Attempts</th>
                  <th className="px-3 py-2.5 font-medium text-right">Snippets</th>
                  <th className="px-3 py-2.5 font-medium text-right">Blogs</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2.5 font-medium">Workspaces</th>
                  <th className="px-3 py-2.5 font-medium text-right">Interviews</th>
                  <th className="px-3 py-2.5 font-medium text-right">AI screenings</th>
                  <th className="px-3 py-2.5 font-medium">Last sign-in</th>
                  <th className="px-3 py-2.5 font-medium">2FA</th>
                </>
              )}
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="w-12 pr-4 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className={`align-middle hover:bg-panel/60 ${selected.has(r.id) ? "bg-panel/60" : ""}`}>
                  <td className="pl-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name || r.email || r.id}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="accent-[rgb(var(--c-accent-2))]"
                    />
                  </td>
                  <td className="px-3 py-2.5 min-w-[220px]">
                    <Link href={`/admin/users/${r.id}`} className="group block">
                      <span className="text-fg font-medium group-hover:underline">{r.name || "No name"}</span>
                      <span className="block text-xs text-muted truncate max-w-[280px]">{r.email ?? "No email"}</span>
                    </Link>
                  </td>
                  {side !== "recruiters" ? (
                    <>
                      <td className="px-3 py-2.5 text-muted whitespace-nowrap">{fmtDay(r.createdAt)}</td>
                      <td className="px-3 py-2.5 text-muted whitespace-nowrap">{fmtAgo(r.lastSignInAt, now) || <span className="text-subtle">Never</span>}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.attempts}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.snippets}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.blogs}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 min-w-[200px]">
                        {r.workspaces.length === 0 ? (
                          <span className="text-subtle">None</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {r.workspaces.slice(0, 3).map((w) => (
                              <li key={w.id} className="text-xs">
                                <Link href={`/admin/workspaces/${w.id}`} className="text-fg hover:underline">{w.name}</Link>
                                <span className="text-muted"> · {ROLE_LABEL[w.role] ?? w.role} · {w.plan}</span>
                              </li>
                            ))}
                            {r.workspaces.length > 3 && <li className="text-xs text-subtle">+{r.workspaces.length - 3} more</li>}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.interviewsHosted}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.screeningsSent}</td>
                      <td className="px-3 py-2.5 text-muted whitespace-nowrap">{fmtAgo(r.lastSignInAt, now) || <span className="text-subtle">Never</span>}</td>
                      <td className="px-3 py-2.5">{r.twoFactor ? <SmallPill tone="ok">On</SmallPill> : <SmallPill tone="off">Off</SmallPill>}</td>
                    </>
                  )}
                  <td className="px-3 py-2.5">
                    <StatusPill state={r.state} until={r.bannedUntil} />
                  </td>
                  <td className="pr-4 py-2.5 text-right">
                    <RowMenu
                      open={menu === r.id}
                      onToggle={() => setMenu((m) => (m === r.id ? null : r.id))}
                      onClose={() => setMenu(null)}
                      actions={availableActions(toTarget(r), canHardDelete)}
                      onPick={(action) => {
                        setMenu(null);
                        setOpen({ id: r.id, action });
                      }}
                      label={r.name || r.email || r.id}
                    />
                  </td>
                </tr>
                {open?.id === r.id && (
                  <tr>
                    <td colSpan={cols} className="px-4 py-3 bg-bg">
                      <UserActionPanel target={toTarget(r)} action={open.action} onClose={() => setOpen(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

function RowMenu({
  open,
  onToggle,
  onClose,
  actions,
  onPick,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  actions: { key: UserActionKey; label: string; danger?: boolean }[];
  onPick: (k: UserActionKey) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${label}`}
        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-border bg-surface shadow-lg py-1 text-left">
          {actions.map((a) => (
            <button
              key={a.key}
              role="menuitem"
              type="button"
              onClick={() => onPick(a.key)}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-panel ${a.danger ? "text-danger" : "text-fg"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkBar({ ids, exportBase, onClear }: { ids: string[]; exportBase: string; onClear: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "suspend" | "signout">(null);
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function report(r: BulkResult, verb: string) {
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    const failed = r.failed.length ? ` ${r.failed.length} skipped: ${r.failed[0].error}` : "";
    setMsg({ ok: r.failed.length === 0, text: `${verb} ${r.done}.${failed}` });
    setMode(null);
    router.refresh();
  }

  const exportHref = `${exportBase}${exportBase.includes("?") ? "&" : "?"}ids=${ids.join(",")}`;

  return (
    <div className="border-b border-border bg-panel px-4 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-fg font-medium">{ids.length} selected</span>
        <button type="button" onClick={() => setMode(mode === "suspend" ? null : "suspend")} className="h-8 px-3 rounded-lg border border-border bg-surface text-sm text-fg hover:bg-bg inline-flex items-center gap-1.5">
          <UserX className="w-4 h-4" /> Suspend
        </button>
        <button type="button" onClick={() => setMode(mode === "signout" ? null : "signout")} className="h-8 px-3 rounded-lg border border-border bg-surface text-sm text-fg hover:bg-bg inline-flex items-center gap-1.5">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
        <a href={exportHref} className="h-8 px-3 rounded-lg border border-border bg-surface text-sm text-fg hover:bg-bg inline-flex items-center gap-1.5">
          <Download className="w-4 h-4" /> Export CSV
        </a>
        <button type="button" onClick={onClear} className="ml-auto h-8 px-2 rounded-lg text-sm text-muted hover:text-fg inline-flex items-center gap-1">
          <X className="w-4 h-4" /> Clear
        </button>
      </div>
      {mode && (
        <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
          <p className="text-sm text-fg">
            {mode === "suspend"
              ? `Suspend ${ids.length} account${ids.length === 1 ? "" : "s"}. Each is signed out and logged separately. Your own account and platform admins are skipped.`
              : `Sign ${ids.length} account${ids.length === 1 ? "" : "s"} out everywhere. They can sign in again.`}
          </p>
          {mode === "suspend" && (
            <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
              <input
                className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/30"
                placeholder="Reason (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                aria-label="Reason"
              />
              <input
                type="date"
                className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg"
                value={until}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setUntil(e.target.value)}
                aria-label="Until (optional)"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode(null)} className="h-8 px-3 rounded-lg border border-border text-sm text-muted hover:text-fg">
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || (mode === "suspend" && !reason.trim())}
              onClick={() =>
                start(async () => {
                  if (mode === "suspend") report(await bulkSuspendAction(ids, { reason, until: until || undefined }), "Suspended");
                  else report(await bulkSignOutAction(ids), "Signed out");
                })
              }
              className={`h-8 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 ${
                mode === "suspend" ? "bg-danger-solid text-white" : "bg-secondary text-bg"
              }`}
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {mode === "suspend" ? "Suspend" : "Sign out"}
            </button>
          </div>
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`} role="status">{msg.text}</p>}
    </div>
  );
}
