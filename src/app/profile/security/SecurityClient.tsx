"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Loader2,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ArrowLeft,
  Clock,
} from "lucide-react";
import {
  startTotpEnrollmentAction,
  verifyTotpEnrollmentAction,
  disableTotpAction,
  regenerateBackupCodesAction,
  cancelPendingEnrollmentAction,
} from "./actions";

type AuditEvent = {
  id: string;
  event: string;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
};

type Props = {
  email: string | null;
  enrolled: boolean;
  enabledAt: string | null;
  pendingEnrollment: boolean;
  unusedBackupCodes: number;
  recentEvents: AuditEvent[];
};

type EnrollmentStep =
  | { stage: "idle" }
  | {
      stage: "scan";
      secret: string;
      otpauthUri: string;
      accountLabel: string;
      qrPngDataUrl: string | null;
    }
  | { stage: "show-codes"; codes: string[] };

const EVENT_LABELS: Record<string, { label: string; tone: "ok" | "warn" | "neutral" }> = {
  TOTP_ENROLL_START: { label: "Started 2FA setup", tone: "neutral" },
  TOTP_ENROLL_VERIFY: { label: "Enabled 2FA", tone: "ok" },
  TOTP_DISABLE: { label: "Disabled 2FA", tone: "warn" },
  TOTP_VERIFY_FAILED: { label: "Failed code attempt", tone: "warn" },
  TOTP_BACKUP_REGEN: { label: "Regenerated backup codes", tone: "neutral" },
  TOTP_VERIFY_OK_LOGIN: { label: "Signed in with 2FA", tone: "ok" },
  TOTP_BACKUP_USED_LOGIN: { label: "Signed in with a backup code", tone: "warn" },
};

export default function SecurityClient({
  email,
  enrolled,
  enabledAt,
  pendingEnrollment,
  unusedBackupCodes,
  recentEvents,
}: Props) {
  const [enrollStep, setEnrollStep] = useState<EnrollmentStep>({ stage: "idle" });
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [regenCode, setRegenCode] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [showRegenForm, setShowRegenForm] = useState(false);
  const [busy, startBusy] = useTransition();

  async function makeQrDataUrl(uri: string): Promise<string | null> {
    try {
      // Lazy-load qrcode in the browser — only when the user actually starts
      // enrollment.
      const QRCode = (await import("qrcode")).default;
      return await QRCode.toDataURL(uri, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      });
    } catch {
      return null;
    }
  }

  async function onStartEnroll() {
    startBusy(async () => {
      try {
        const result = await startTotpEnrollmentAction();
        const qr = await makeQrDataUrl(result.otpauthUri);
        setEnrollStep({
          stage: "scan",
          secret: result.secret,
          otpauthUri: result.otpauthUri,
          accountLabel: result.accountLabel,
          qrPngDataUrl: qr,
        });
        setVerifyCode("");
      } catch (err) {
        toast.error((err as Error)?.message ?? "Failed to start 2FA setup");
      }
    });
  }

  async function onResumeEnroll() {
    // Cancel the stale pending enrollment and start a fresh one so we don't
    // accidentally verify against a secret the user never finished scanning.
    startBusy(async () => {
      try {
        await cancelPendingEnrollmentAction();
        await onStartEnroll();
      } catch (err) {
        toast.error((err as Error)?.message ?? "Failed to restart 2FA setup");
      }
    });
  }

  async function onVerifyEnroll() {
    if (verifyCode.replace(/\s+/g, "").length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    startBusy(async () => {
      try {
        const { backupCodes } = await verifyTotpEnrollmentAction(verifyCode);
        setEnrollStep({ stage: "show-codes", codes: backupCodes });
        setVerifyCode("");
        toast.success("2FA enabled. Save your backup codes — you won't see them again.");
      } catch (err) {
        toast.error((err as Error)?.message ?? "Verification failed");
      }
    });
  }

  async function onCancelEnroll() {
    startBusy(async () => {
      try {
        await cancelPendingEnrollmentAction();
        setEnrollStep({ stage: "idle" });
      } catch (err) {
        toast.error((err as Error)?.message ?? "Couldn't cancel enrollment");
      }
    });
  }

  async function onDisable() {
    if (disableCode.replace(/\s+/g, "").length !== 6) {
      toast.error("Enter your current 6-digit code to confirm.");
      return;
    }
    startBusy(async () => {
      try {
        await disableTotpAction(disableCode);
        toast.success("2FA disabled.");
        setDisableCode("");
        setShowDisableForm(false);
        // Refresh to pull the new server-side state (enrolled = false).
        window.location.reload();
      } catch (err) {
        toast.error((err as Error)?.message ?? "Disable failed");
      }
    });
  }

  async function onRegen() {
    if (regenCode.replace(/\s+/g, "").length !== 6) {
      toast.error("Enter your current 6-digit code to confirm.");
      return;
    }
    startBusy(async () => {
      try {
        const { backupCodes } = await regenerateBackupCodesAction(regenCode);
        setEnrollStep({ stage: "show-codes", codes: backupCodes });
        setRegenCode("");
        setShowRegenForm(false);
        toast.success("New backup codes minted. Old ones are now invalid.");
      } catch (err) {
        toast.error((err as Error)?.message ?? "Regenerate failed");
      }
    });
  }

  function copyCodesToClipboard(codes: string[]) {
    navigator.clipboard
      .writeText(codes.join("\n"))
      .then(() => toast.success("Backup codes copied."))
      .catch(() => toast.error("Copy failed — select and copy manually."));
  }

  function downloadCodesTxt(codes: string[]) {
    const body =
      `Interviewpad — 2FA backup codes for ${email ?? "your account"}\n` +
      `Generated ${new Date().toISOString()}\n\n` +
      `Each code works ONCE. Keep this file somewhere safe — your\n` +
      `password manager or a printed copy in a drawer.\n\n` +
      codes.map((c) => `  ${c}`).join("\n") +
      `\n`;
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interviewpad-2fa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-bg text-fg pt-20 pb-16 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-fg"
            >
              <ArrowLeft className="w-3 h-3" /> Back to profile
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
            <p className="text-sm text-muted leading-relaxed">
              Manage two-factor authentication for{" "}
              <span className="text-fg font-medium">{email ?? "this account"}</span>.
            </p>
          </div>
        </header>

        {/* 2FA status card */}
        <section className="rounded-2xl border border-border bg-surface/60 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  enrolled
                    ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
                    : "bg-amber-500/10 border border-amber-500/25 text-amber-300"
                }`}
              >
                {enrolled ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-fg">
                  Two-factor authentication
                </div>
                <div className="text-[12px] text-muted">
                  {enrolled
                    ? `Enabled${
                        enabledAt
                          ? ` since ${new Date(enabledAt).toLocaleDateString()}`
                          : ""
                      } · ${unusedBackupCodes} backup code${
                        unusedBackupCodes === 1 ? "" : "s"
                      } remaining`
                    : pendingEnrollment
                      ? "Setup started but not verified yet."
                      : "Not enabled — your account is protected by password only."}
                </div>
              </div>
            </div>

            {!enrolled && enrollStep.stage === "idle" && !pendingEnrollment && (
              <button
                type="button"
                onClick={onStartEnroll}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-fg text-bg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                Set up 2FA
              </button>
            )}
            {!enrolled && pendingEnrollment && enrollStep.stage === "idle" && (
              <button
                type="button"
                onClick={onResumeEnroll}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-fg text-bg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                Restart setup
              </button>
            )}
          </div>

          {/* Enrollment — scan & verify */}
          {enrollStep.stage === "scan" && (
            <div className="rounded-xl border border-border bg-bg/40 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-fg">
                  Step 1 — scan with your authenticator app
                </div>
                <button
                  type="button"
                  onClick={onCancelEnroll}
                  disabled={busy}
                  className="text-[11px] text-muted hover:text-fg inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
              <div className="grid sm:grid-cols-[220px_1fr] gap-4 items-start">
                <div className="bg-white rounded-lg p-3 w-[220px] h-[220px] grid place-items-center">
                  {enrollStep.qrPngDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={enrollStep.qrPngDataUrl}
                      alt="2FA QR code"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="text-[10px] text-zinc-500 text-center">
                      QR couldn't render — use the secret below.
                    </div>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <p className="text-[12px] text-muted leading-relaxed">
                    Scan the QR with Google Authenticator, Authy, 1Password, or any
                    RFC-6238 client. Can't scan? Enter this secret manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1.5 rounded bg-bg border border-border font-mono text-[11px] text-fg/90 break-all">
                      {enrollStep.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(enrollStep.secret);
                        toast.success("Secret copied");
                      }}
                      className="px-2 py-1.5 rounded text-[10px] font-semibold border border-border text-muted hover:text-fg"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted/80">
                    Account label: <span className="font-mono">{enrollStep.accountLabel}</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <div className="text-xs font-semibold text-fg">
                  Step 2 — enter the 6-digit code from your app
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) =>
                      setVerifyCode(e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="123456"
                    className="flex-1 max-w-[160px] px-3 py-2 bg-bg border border-border rounded-md font-mono text-lg tracking-[0.4em] text-fg focus:outline-none focus:border-fg"
                  />
                  <button
                    type="button"
                    onClick={onVerifyEnroll}
                    disabled={busy || verifyCode.length !== 6}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-fg text-bg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Verify & enable
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Backup codes — one-time display */}
          {enrollStep.stage === "show-codes" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-fg">
                    Save these backup codes now
                  </div>
                  <div className="text-[11px] text-muted leading-relaxed">
                    Each code works <span className="text-fg font-medium">once</span>. They're your
                    way back in if you lose your authenticator device. We won't show them again.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {enrollStep.codes.map((c) => (
                  <code
                    key={c}
                    className="px-2 py-1.5 rounded bg-bg border border-border font-mono text-[12px] text-fg text-center"
                  >
                    {c}
                  </code>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyCodesToClipboard(enrollStep.codes)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel"
                >
                  <Copy className="w-3 h-3" />
                  Copy all
                </button>
                <button
                  type="button"
                  onClick={() => downloadCodesTxt(enrollStep.codes)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel"
                >
                  <Download className="w-3 h-3" />
                  Download .txt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnrollStep({ stage: "idle" });
                    window.location.reload();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-bg bg-fg hover:opacity-90 ml-auto"
                >
                  I've saved them
                </button>
              </div>
            </div>
          )}

          {/* Enabled-state actions */}
          {enrolled && enrollStep.stage === "idle" && (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegenForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate backup codes
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisableForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-rose-300 border border-rose-500/30 bg-rose-500/[0.04] hover:bg-rose-500/[0.1]"
                >
                  <ShieldAlert className="w-3 h-3" />
                  Disable 2FA
                </button>
              </div>

              {showRegenForm && (
                <form
                  className="rounded-lg border border-border bg-bg/40 p-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onRegen();
                  }}
                >
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
                    Enter your current 6-digit code to confirm
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={regenCode}
                      onChange={(e) =>
                        setRegenCode(e.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="123456"
                      className="flex-1 max-w-[160px] px-3 py-2 bg-bg border border-border rounded-md font-mono tracking-[0.3em] text-fg focus:outline-none focus:border-fg"
                    />
                    <button
                      type="submit"
                      disabled={busy || regenCode.length !== 6}
                      className="px-3 py-2 rounded-md bg-fg text-bg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate"}
                    </button>
                  </div>
                </form>
              )}

              {showDisableForm && (
                <form
                  className="rounded-lg border border-rose-500/30 bg-rose-500/[0.04] p-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onDisable();
                  }}
                >
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-rose-300 block">
                    Confirm disable — enter your 6-digit code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={disableCode}
                      onChange={(e) =>
                        setDisableCode(e.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="123456"
                      className="flex-1 max-w-[160px] px-3 py-2 bg-bg border border-rose-500/30 rounded-md font-mono tracking-[0.3em] text-fg focus:outline-none focus:border-rose-400"
                    />
                    <button
                      type="submit"
                      disabled={busy || disableCode.length !== 6}
                      className="px-3 py-2 rounded-md bg-rose-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Disable"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-2xl border border-border bg-surface/60 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Recent security events
            </h2>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-muted/80">
              No security events yet. They'll show up here as you enroll, sign in with 2FA,
              or rotate backup codes.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 -mx-2">
              {recentEvents.map((e) => {
                const meta = EVENT_LABELS[e.event] ?? {
                  label: e.event,
                  tone: "neutral" as const,
                };
                return (
                  <li
                    key={e.id}
                    className="px-2 py-2 flex items-center justify-between gap-3 text-[11px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex h-1.5 w-1.5 rounded-full shrink-0 ${
                          meta.tone === "ok"
                            ? "bg-emerald-400"
                            : meta.tone === "warn"
                              ? "bg-amber-400"
                              : "bg-muted/50"
                        }`}
                      />
                      <span className="text-fg font-medium truncate">{meta.label}</span>
                      {e.ip && (
                        <span className="text-muted/70 font-mono">· {e.ip}</span>
                      )}
                    </div>
                    <time
                      dateTime={e.createdAt}
                      className="text-muted/70 font-mono shrink-0"
                      title={new Date(e.createdAt).toLocaleString()}
                    >
                      {new Date(e.createdAt).toLocaleString()}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Deferred-feature callout */}
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
          <div className="flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted leading-relaxed space-y-1">
              <div className="text-fg font-medium">Login enforcement is shipping next.</div>
              <div>
                Today you can enroll and manage 2FA from this page. Forcing the second
                factor at login (and forcing admins/paid-plan workspace admins to enroll)
                is part of the same epic and rolls out alongside this UI — see ticket{" "}
                <code className="font-mono">IP-42</code>.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
