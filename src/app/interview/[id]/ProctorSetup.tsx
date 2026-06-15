"use client";

import { useState } from "react";
import { MonitorSmartphone, Download, Loader2, ShieldCheck, RefreshCw } from "lucide-react";

type Provisioned = {
  sessionId: string;
  token: string;
  hmacSecret: string;
  launchEnv: {
    PROCTOR_SESSION_ID: string;
    PROCTOR_BACKEND_URL: string;
    PROCTOR_TOKEN: string;
    PROCTOR_HMAC_SECRET: string;
  };
};

/**
 * Recruiter-only control to bind the native screen-proctor agent to this
 * interview session. Issues per-session credentials, then lets the recruiter
 * download the `proctor-config.json` the candidate drops next to the portable
 * agent exe. The candidate runs the exe → consents → it monitors and removes
 * itself when the interview ends.
 */
export default function ProctorSetup({
  interviewId,
  agentDownloadUrl = "/downloads/interviewpad-proctor.exe",
}: {
  interviewId: string;
  agentDownloadUrl?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Provisioned | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function provision() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/${interviewId}/proctor/token`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Could not enable proctoring (are you the interview owner?).");
        return;
      }
      setData((await res.json()) as Provisioned);
    } catch {
      setError("Network error enabling proctoring.");
    } finally {
      setBusy(false);
    }
  }

  function downloadConfig() {
    if (!data) return;
    const cfg = {
      session_id: data.launchEnv.PROCTOR_SESSION_ID,
      backend_url: data.launchEnv.PROCTOR_BACKEND_URL,
      token: data.launchEnv.PROCTOR_TOKEN,
      hmac_secret: data.launchEnv.PROCTOR_HMAC_SECRET,
      scan_interval_secs: 5,
    };
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proctor-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-3">
      <div className="flex items-center gap-2">
        <MonitorSmartphone className="w-4 h-4 text-accent" />
        <span className="text-xs font-black uppercase tracking-wider text-fg">Screen Proctor</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted border border-border rounded px-1.5 py-0.5">
          Recruiter only
        </span>
      </div>

      {!data ? (
        <>
          <p className="text-[11px] text-muted leading-relaxed">
            Optional. Detects hidden AI-assist / answer-overlay tools on the candidate&apos;s
            screen during this interview. The candidate must consent; the agent removes itself
            when the interview ends.
          </p>
          {error && <p className="text-[11px] text-rose-500">{error}</p>}
          <button
            onClick={provision}
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Enable for this interview
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-[11px] text-emerald-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            Enabled. Send the candidate both files below.
          </div>
          <ol className="text-[11px] text-muted leading-relaxed list-decimal pl-4 space-y-1">
            <li>Download the agent and the config file.</li>
            <li>Candidate puts <code className="text-fg">proctor-config.json</code> in the same folder as the agent, then runs the agent.</li>
            <li>They consent; it minimizes and monitors until you conclude the round.</li>
          </ol>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={agentDownloadUrl}
              className="py-2 rounded-lg bg-bg border border-border text-xs font-bold text-fg hover:border-accent/40 hover:text-accent transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Agent (.exe)
            </a>
            <button
              onClick={downloadConfig}
              className="py-2 rounded-lg bg-bg border border-border text-xs font-bold text-fg hover:border-accent/40 hover:text-accent transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Config (.json)
            </button>
          </div>
          <button
            onClick={provision}
            disabled={busy}
            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-muted hover:text-fg transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} />
            Re-issue (revokes the old config)
          </button>
        </>
      )}
    </div>
  );
}
