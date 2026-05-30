"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Play, Clock, Lock, Zap, X } from "lucide-react";

export default function StartButton({
  token,
  timeLimitMin,
}: {
  token: string;
  timeLimitMin?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleStart() {
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
      setConfirming(false);
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
        onClick={() => setConfirming(true)}
        disabled={loading || !accepted}
        className="group/btn shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg font-black uppercase tracking-wider text-xs transition-all duration-300 shadow-[0_0_24px_rgba(var(--accent-rgb),0.15)] hover:shadow-[0_0_32px_rgba(var(--accent-rgb),0.35)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed"
      >
        <span>{loading ? "Spawning secure sandbox…" : "I'm ready — start the timer"}</span>
        <Play className="w-3.5 h-3.5 fill-current transition-transform group-hover/btn:translate-x-0.5" />
      </button>

      <ConfirmStartModal
        open={confirming}
        loading={loading}
        timeLimitMin={timeLimitMin}
        onCancel={() => !loading && setConfirming(false)}
        onConfirm={handleStart}
      />
    </div>
  );
}

function ConfirmStartModal({
  open,
  loading,
  timeLimitMin,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  timeLimitMin?: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Esc to dismiss; focus the primary action on open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => confirmRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, loading, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const minutes = timeLimitMin && timeLimitMin > 0 ? `${timeLimitMin} minutes` : "the full duration";

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-labelledby="confirm-start-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative px-6 pt-7 pb-5 text-center">
          <button
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
            className="absolute right-4 top-4 p-1.5 rounded-lg text-muted hover:text-fg hover:bg-bg/60 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Clock className="w-7 h-7" />
          </div>
          <h2 id="confirm-start-title" className="mt-4 text-lg font-black tracking-tight text-fg">
            Start your assessment?
          </h2>
          <p className="mt-1.5 text-sm text-muted leading-relaxed">
            Once you confirm, the countdown begins and{" "}
            <span className="text-fg font-bold">cannot be paused or restarted</span>.
          </p>
        </div>

        {/* Key facts */}
        <div className="px-6 pb-2 space-y-2.5">
          <Fact icon={<Zap className="w-4 h-4" />}>
            The timer starts the <strong className="text-fg font-bold">moment you confirm</strong>.
          </Fact>
          <Fact icon={<Clock className="w-4 h-4" />}>
            You&apos;ll have <strong className="text-fg font-bold">{minutes}</strong>, counting down continuously — closing the tab won&apos;t stop it.
          </Fact>
          <Fact icon={<Lock className="w-4 h-4" />}>
            At zero, the workspace <strong className="text-fg font-bold">freezes and auto-submits</strong> your work.
          </Fact>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 px-6 py-5 mt-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-panel/50 text-sm font-bold text-muted hover:text-fg hover:bg-panel transition-colors disabled:opacity-40"
          >
            Not yet
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className="flex-[1.4] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-black transition-all shadow-[0_0_24px_rgba(var(--accent-rgb),0.2)] hover:shadow-[0_0_32px_rgba(var(--accent-rgb),0.4)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              "Spawning sandbox…"
            ) : (
              <>
                Start now
                <Play className="w-3.5 h-3.5 fill-current" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-panel/40 px-3.5 py-3">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <p className="text-[13px] text-muted leading-relaxed">{children}</p>
    </div>
  );
}
