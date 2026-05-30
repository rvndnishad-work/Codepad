"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";

export default function StartButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function handleStart() {
    if (!confirm("Are you ready to initiate your test? The countdown clock will start immediately and cannot be paused.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/take-home/${token}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { slug: string; attemptId: string };
      toast.success("Sandbox environment spawned!");
      
      // Direct hard redirect to initiate Monaco workspace mounting and timer sync
      window.location.href = `/challenges/${data.slug}/attempt?token=${token}`;
    } catch (err) {
      toast.error("Failed to start assessment", {
        description: err instanceof Error ? err.message : String(err),
      });
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <label className="flex items-start gap-3 cursor-pointer select-none text-sm text-muted hover:text-fg transition-colors max-w-xl">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-border bg-panel cursor-pointer accent-accent shrink-0"
        />
        <span className="leading-relaxed">
          I acknowledge the proctoring disclosures and agree to abide by the technical assessment rules and protocol.
        </span>
      </label>

      <button
        onClick={handleStart}
        disabled={loading || !accepted}
        className="group/btn shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg font-black uppercase tracking-wider text-xs transition-all duration-300 shadow-[0_0_24px_rgba(var(--accent-rgb),0.15)] hover:shadow-[0_0_32px_rgba(var(--accent-rgb),0.35)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed"
      >
        <span>{loading ? "Spawning secure sandbox…" : "I'm ready — start the timer"}</span>
        <Play className="w-3.5 h-3.5 fill-current transition-transform group-hover/btn:translate-x-0.5" />
      </button>
    </div>
  );
}

