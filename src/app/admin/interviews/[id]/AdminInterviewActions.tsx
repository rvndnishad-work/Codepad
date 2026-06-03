"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Square, CheckCircle2, Copy } from "lucide-react";

interface AdminInterviewActionsProps {
  sessionId: string;
  status: string;
  shareUrl: string;
}

export default function AdminInterviewActions({
  sessionId,
  status,
  shareUrl,
}: AdminInterviewActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function patch(body: object, action: string) {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/interviews/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } catch {
      alert(`Failed to ${action.replace("-", " ")}.`);
    } finally {
      setBusy(null);
    }
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={copyShare}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-bold text-muted hover:text-fg hover:bg-elevated transition"
      >
        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy share link"}
      </button>

      <button
        onClick={() => patch({ regenerateShareToken: true }, "regenerate-token")}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-bold text-muted hover:text-fg hover:bg-elevated transition disabled:opacity-40"
      >
        {busy === "regenerate-token" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        Rotate token
      </button>

      {status !== "completed" && (
        <button
          onClick={() => patch({ status: "completed" }, "force-complete")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold hover:bg-emerald-500/15 transition disabled:opacity-40"
        >
          {busy === "force-complete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Force complete
        </button>
      )}

      {status !== "abandoned" && (
        <button
          onClick={() => patch({ status: "abandoned" }, "abandon")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold hover:bg-red-500/15 transition disabled:opacity-40"
        >
          {busy === "abandon" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
          Mark abandoned
        </button>
      )}
    </div>
  );
}
