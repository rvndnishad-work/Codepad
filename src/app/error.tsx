"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full rounded-3xl border border-border bg-surface p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 grid place-items-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-fg mb-2">
          Something broke on our end
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-6">
          We hit an unexpected error rendering this page. Try again, and if it
          keeps happening, please let us know.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-muted/50 mb-6 break-all">
            ref: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-bg text-sm font-semibold hover:opacity-90 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-panel border border-border text-sm text-fg hover:bg-elevated transition"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
