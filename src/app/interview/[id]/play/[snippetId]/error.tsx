"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

export default function PlaygroundError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in the console so it's at least visible
    // to anyone who opens DevTools. The Next.js generic page hides it.
    // eslint-disable-next-line no-console
    console.error("Multiplayer playground error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-bg">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-8 space-y-5 shadow-2xl shadow-black/30 ring-1 ring-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 grid place-items-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">
              Workspace error
            </p>
            <h1 className="text-lg font-black tracking-tight text-fg">
              The collaborative workspace failed to load
            </h1>
          </div>
        </div>

        <p className="text-sm text-muted leading-relaxed">
          {error.message ||
            "An unexpected error occurred while wiring up the playground. The most common causes are an expired session, a snippet that no longer exists, or a temporary signaling outage."}
        </p>

        {error.digest && (
          <p className="text-[10px] font-mono text-muted/60">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold transition"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/interview"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-elevated hover:brightness-125 text-fg text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sessions
          </Link>
        </div>
      </div>
    </div>
  );
}
