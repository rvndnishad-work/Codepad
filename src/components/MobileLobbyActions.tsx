"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, ArrowRight, Check, Loader2 } from "lucide-react";
import { MOBILE_BYPASS_QUERY } from "@/lib/device";

type Props = {
  url: string;
  emailEnabled: boolean;
};

export default function MobileLobbyActions({ url, emailEnabled }: Props) {
  const [copied, setCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok" }
    | { kind: "error"; reason: string }
  >({ kind: "idle" });
  const [continuing, startContinue] = useTransition();

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigator.clipboard can fail on insecure origins / older mobile
      // browsers; fall back to a manual selection prompt.
      window.prompt("Copy this link:", url);
    }
  }

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValue.trim()) return;
    setEmailStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/lobby/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email: emailValue.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailStatus({
          kind: "error",
          reason: data?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      setEmailStatus({ kind: "ok" });
    } catch (err) {
      setEmailStatus({
        kind: "error",
        reason: (err as Error)?.message ?? "Network error",
      });
    }
  }

  function onContinueAnyway() {
    startContinue(() => {
      // Drop a bypass cookie so subsequent loads of the same route skip the
      // lobby — Path=/ scope is fine since the cookie name is specific to
      // this feature.
      document.cookie = `ipad_mobile_bypass=1; path=/; max-age=3600`;
      // Append ?desktop=force so the very next request (which races the
      // cookie) sees the explicit bypass intent too.
      const u = new URL(url, window.location.origin);
      u.searchParams.set(MOBILE_BYPASS_QUERY, "force");
      window.location.href = u.toString();
    });
  }

  return (
    <section className="space-y-2.5">
      {/* Primary row: Copy + Email */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#1f2738] bg-[#0F1422] text-sm font-semibold text-[#F3F4F6] hover:bg-[#161B2E] active:scale-[0.98] transition"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy link
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => emailEnabled && setEmailOpen((v) => !v)}
          disabled={!emailEnabled}
          title={!emailEnabled ? "Email service coming soon (IP-24)." : "Email this link to yourself"}
          aria-expanded={emailOpen}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#1f2738] bg-[#0F1422] text-sm font-semibold text-[#F3F4F6] hover:bg-[#161B2E] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="w-4 h-4" />
          Email me
        </button>
      </div>

      {/* Email form — slides in when emailOpen */}
      {emailOpen && emailEnabled && (
        <form
          onSubmit={onSubmitEmail}
          className="rounded-xl border border-[#1f2738] bg-[#0F1422] p-3 space-y-2"
        >
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8] block">
            Send to
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-3 py-2 rounded-lg bg-[#0B0F19] border border-[#1f2738] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]/40"
            />
            <button
              type="submit"
              disabled={emailStatus.kind === "loading"}
              className="px-3 py-2 rounded-lg bg-[#F3F4F6] text-[#0B0F19] text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {emailStatus.kind === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Send"
              )}
            </button>
          </div>
          {emailStatus.kind === "ok" && (
            <div className="text-[11px] text-emerald-400">
              Sent — check your inbox.
            </div>
          )}
          {emailStatus.kind === "error" && (
            <div className="text-[11px] text-rose-300">{emailStatus.reason}</div>
          )}
        </form>
      )}

      {/* Continue anyway escape hatch */}
      <button
        type="button"
        onClick={onContinueAnyway}
        disabled={continuing}
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#94a3b8] hover:text-[#F3F4F6] transition disabled:opacity-50"
      >
        Continue on this device anyway
        <ArrowRight className="w-3 h-3" />
      </button>
    </section>
  );
}
