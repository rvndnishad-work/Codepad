"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";

export default function StartButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);

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
    <button
      onClick={handleStart}
      disabled={loading}
      className="w-full relative overflow-hidden group/btn px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg transition-all duration-300 shadow-[0_0_24px_rgba(var(--accent-rgb),0.15)] hover:shadow-[0_0_32px_rgba(var(--accent-rgb),0.35)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
    >
      <span className="text-xs font-black uppercase tracking-wider text-bg">
        {loading ? "Spawning Secure Sandbox..." : "Start Assessment"}
      </span>
      <Play className="w-3.5 h-3.5 fill-current text-bg transition-transform group-hover/btn:translate-x-0.5" />
    </button>
  );
}
