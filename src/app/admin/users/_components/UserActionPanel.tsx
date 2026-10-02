"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AccountState } from "@/lib/auth-gate";
import {
  forceSignOutAction,
  hardDeleteUserAction,
  resetTwoFactorAction,
  restoreUserAction,
  softDeleteUserAction,
  suspendUserAction,
  unsuspendUserAction,
  verifyEmailAction,
} from "../actions";

export type UserActionKey = "suspend" | "unsuspend" | "signout" | "reset2fa" | "verify" | "delete" | "restore" | "purge";

export type ActionTarget = {
  id: string;
  label: string; // name or email, for copy
  email: string | null;
  state: AccountState;
  banned: boolean; // any ban flag, active or expired
  emailVerified: boolean;
  twoFactor: boolean;
};

export type ActionDef = { key: UserActionKey; label: string; danger?: boolean };

/** Which actions make sense for this account right now. */
export function availableActions(t: ActionTarget, canHardDelete: boolean): ActionDef[] {
  const out: ActionDef[] = [];
  if (t.state === "deleted") {
    out.push({ key: "restore", label: "Restore account" });
  } else {
    if (t.state === "suspended") out.push({ key: "unsuspend", label: "Lift suspension" });
    else out.push({ key: "suspend", label: "Suspend", danger: true });
    out.push({ key: "signout", label: "Sign out everywhere" });
    if (t.twoFactor) out.push({ key: "reset2fa", label: "Reset two-factor sign-in" });
    if (!t.emailVerified) out.push({ key: "verify", label: "Mark email verified" });
    out.push({ key: "delete", label: "Delete account", danger: true });
  }
  if (canHardDelete) out.push({ key: "purge", label: "Delete permanently", danger: true });
  return out;
}

const COPY: Record<UserActionKey, { title: string; body: string; cta: string; danger?: boolean }> = {
  suspend: {
    title: "Suspend this account",
    body: "They are signed out everywhere and cannot sign in until the end date, or until you lift it.",
    cta: "Suspend",
    danger: true,
  },
  unsuspend: { title: "Lift the suspension", body: "They can sign in again straight away.", cta: "Lift suspension" },
  signout: {
    title: "Sign out everywhere",
    body: "Every current session ends within about 30 seconds. They can sign in again.",
    cta: "Sign out",
  },
  reset2fa: {
    title: "Reset two-factor sign-in",
    body: "Removes their authenticator and backup codes. They sign in with just a password until they set it up again.",
    cta: "Reset",
  },
  verify: { title: "Mark email as verified", body: "Use this only after confirming they own the address.", cta: "Mark verified" },
  delete: {
    title: "Delete this account",
    body: "Sign-in is refused and sessions end. Nothing they made is removed, and you can restore the account later.",
    cta: "Delete account",
    danger: true,
  },
  restore: { title: "Restore this account", body: "They can sign in again. A separate suspension, if any, stays.", cta: "Restore" },
  purge: {
    title: "Delete permanently",
    body: "Removes the account and everything that cascades with it: attempts, snippets, blogs, hosted interviews and their recordings. This cannot be undone. Refused for platform admins, yourself, and sole workspace owners.",
    cta: "Delete permanently",
    danger: true,
  },
};

const inputCls =
  "w-full h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary";

export default function UserActionPanel({
  target,
  action,
  onClose,
  blocker,
}: {
  target: ActionTarget;
  action: UserActionKey;
  onClose: () => void;
  /** Known reason the action will be refused (shown up front). */
  blocker?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState("");
  const copy = COPY[action];
  const confirmText = target.email ?? target.id;

  const disabled =
    pending ||
    !!blocker ||
    (action === "suspend" && !reason.trim()) ||
    (action === "purge" && confirm.trim().toLowerCase() !== confirmText.toLowerCase());

  function run() {
    setError(null);
    start(async () => {
      const id = target.id;
      const r =
        action === "suspend"
          ? await suspendUserAction(id, { reason, until: until || undefined })
          : action === "unsuspend"
            ? await unsuspendUserAction(id)
            : action === "signout"
              ? await forceSignOutAction(id)
              : action === "reset2fa"
                ? await resetTwoFactorAction(id)
                : action === "verify"
                  ? await verifyEmailAction(id)
                  : action === "delete"
                    ? await softDeleteUserAction(id, note)
                    : action === "restore"
                      ? await restoreUserAction(id)
                      : await hardDeleteUserAction(id, confirm, note);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDone(r.message ?? "Done.");
      if (action === "purge") router.push("/admin/users");
      else router.refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      role="region"
      aria-label={copy.title}
      className={`rounded-xl border bg-surface p-4 space-y-3 ${copy.danger ? "border-danger/40" : "border-border"}`}
    >
      <div>
        <p className="text-sm font-medium text-fg">
          {copy.title} <span className="text-muted font-normal">· {target.label}</span>
        </p>
        <p className="text-sm text-muted mt-0.5">{copy.body}</p>
      </div>

      {blocker && <p className="text-sm text-danger">{blocker}</p>}

      {action === "suspend" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="text-xs text-muted">Reason (required, kept in the audit log)</span>
            <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Spam, chargeback, abuse report…" autoFocus />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Until (optional)</span>
            <input type="date" className={inputCls} value={until} min={today} onChange={(e) => setUntil(e.target.value)} />
          </label>
        </div>
      )}

      {(action === "delete" || action === "purge") && (
        <label className="block">
          <span className="text-xs text-muted">Note (optional)</span>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Why, ticket number…" />
        </label>
      )}

      {action === "purge" && !blocker && (
        <label className="block">
          <span className="text-xs text-muted">
            Type <code className="font-mono text-fg">{confirmText}</code> to confirm
          </span>
          <input className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {done && <p className="text-sm text-success" role="status">{done}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="h-9 px-3.5 rounded-lg border border-border text-sm text-muted hover:text-fg hover:bg-panel">
          {done ? "Close" : "Cancel"}
        </button>
        {!done && (
          <button
            type="button"
            onClick={run}
            disabled={disabled}
            className={`h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              copy.danger ? "bg-danger-solid text-white hover:brightness-110" : "bg-secondary text-bg hover:brightness-110"
            }`}
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {copy.cta}
          </button>
        )}
      </div>
    </div>
  );
}
