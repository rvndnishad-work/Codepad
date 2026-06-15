"use client";

import { useEffect, useState } from "react";
import { MonitorSmartphone, ShieldCheck, AlertTriangle, Loader2, WifiOff } from "lucide-react";

type ProctorSignal = {
  kind: string;
  severity: string;
  window_title: string;
  process_name: string;
  detail: string;
};

type Status = {
  provisioned: boolean;
  everConnected: boolean;
  connected: boolean;
  suspicionScore: number;
  peakSuspicion: number;
  scannedWindows: number;
  reportCount: number;
  signals: ProctorSignal[];
};

/**
 * Interviewer-only live badge: polls the proctor status endpoint every few
 * seconds and surfaces the native overlay-detection risk while the session is
 * live. Renders nothing until an agent has been provisioned for the session.
 */
export default function ProctorLiveBadge({
  interviewId,
  token,
}: {
  interviewId: string;
  token?: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const url = `/api/interview/${interviewId}/proctor/status${token ? `?token=${token}` : ""}`;
    const poll = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Status;
        if (alive) setStatus(data);
      } catch {
        /* transient; keep last state */
      } finally {
        if (alive) setLoading(false);
      }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [interviewId, token]);

  // Nothing to show until an agent token has been issued for this session.
  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-border bg-surface/40 flex items-center gap-2.5 text-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-bold">Checking screen proctor…</span>
      </div>
    );
  }
  if (!status || !status.provisioned) return null;

  const score = status.connected ? status.suspicionScore : status.peakSuspicion;
  const risk = score > 60 ? "high" : score > 30 ? "medium" : "low";
  const tone =
    risk === "high"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
      : risk === "medium"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";

  return (
    <div className={`p-4 rounded-xl border ${tone} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-wider">Screen Proctor</span>
        </div>
        {status.connected ? (
          <span className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
            <WifiOff className="w-3 h-3" />
            {status.everConnected ? "DISCONNECTED" : "AWAITING AGENT"}
          </span>
        )}
      </div>

      <div className="flex items-end gap-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted">
            {status.connected ? "Current risk" : "Peak risk"}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black">{score}</span>
            <span className="text-[10px] text-muted">/ 100</span>
          </div>
        </div>
        <div className="text-[10px] text-muted leading-tight pb-1">
          {status.scannedWindows} windows scanned · {status.reportCount} reports
        </div>
      </div>

      {status.signals.length > 0 ? (
        <div className="space-y-1.5 pt-1 border-t border-current/15">
          {status.signals.slice(0, 4).map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="text-fg/80 leading-tight">
                <span className="font-mono font-bold">{s.process_name || "unknown"}</span>
                {s.window_title ? ` — ${s.window_title}` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-muted pt-1 border-t border-current/15">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          No overlay or capture-excluded windows detected.
        </div>
      )}
    </div>
  );
}
