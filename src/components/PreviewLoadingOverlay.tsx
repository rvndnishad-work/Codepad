"use client";

import { useEffect, useState } from "react";
import { SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { AlertTriangle } from "lucide-react";

type PreviewProps = React.ComponentProps<typeof SandpackPreview>;

/**
 * `SandpackPreview` with a first-load overlay.
 *
 * The preview iframe sits blank (or white) for seconds while Sandpack installs
 * npm deps and runs the first bundle — especially on the default v1 bundler.
 * This wrapper covers exactly the preview area with a loading state until the
 * first successful compile, then latches open so later recompiles (already
 * signaled by the StatusDot pulse) never flash the overlay.
 *
 * Must render inside a `SandpackProvider`. Dismissal signals, in order:
 *   1. `sandpack.status` reaching `"idle"`/`"done"` (with `autorun: false` the
 *      initial status is already `"idle"`, so no overlay ever shows);
 *   2. a bundler `"done"` message via `listen` (lands a beat before the status
 *      transition — same fast-path `RunBridge` uses).
 * The overlay yields to errors (`sandpack.error` → our `ErrorOverlay` takes
 * over) and to `"timeout"` (swaps to a retry state instead of spinning forever).
 */
export function SandpackPreviewWithLoader({
  title,
  ...previewProps
}: PreviewProps & { title: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <SandpackPreview {...previewProps} />
      <PreviewLoadingOverlay title={title} />
    </div>
  );
}

function PreviewLoadingOverlay({ title }: { title: string }) {
  const { sandpack, listen, dispatch } = useSandpack();
  const [ready, setReady] = useState(false);
  // After a few seconds reassure instead of just spinning — first loads
  // install dependencies and can legitimately take a while.
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (sandpack.status === "idle" || sandpack.status === "done") {
      setReady(true);
    }
  }, [sandpack.status]);

  useEffect(() => {
    const unsubscribe = listen((msg: unknown) => {
      const m = msg as { type?: string };
      if (m?.type === "done") setReady(true);
    });
    return () => unsubscribe();
  }, [listen]);

  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [ready]);

  // A bundler error has its own surface (ErrorOverlay) — get out of its way.
  if (ready || sandpack.error) return null;

  const timedOut = sandpack.status === "timeout";

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0d0f16] px-6 text-center animate-in fade-in duration-300"
    >
      {timedOut ? (
        <>
          <span className="grid h-12 w-12 place-items-center rounded-full border border-amber-400/30 bg-amber-400/10">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
          </span>
          <div>
            <p className="text-sm font-bold text-white/90">Preview timed out</p>
            <p className="mt-1 text-xs text-white/50">
              The sandbox did not respond. Check your connection and try again.
            </p>
          </div>
          <button
            onClick={() => {
              setSlow(false);
              sandpack.runSandpack?.();
              dispatch({ type: "refresh" });
            }}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-white/80 transition hover:border-[#8b93ff]/50 hover:text-white"
          >
            Retry preview
          </button>
        </>
      ) : (
        <>
          <span className="relative grid h-12 w-12 place-items-center" aria-hidden>
            <span className="absolute inset-0 rounded-full border-2 border-accent/20" />
            <span className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          </span>
          <div>
            <p className="text-sm font-bold text-white/90">
              Preparing {title} preview
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
              {sandpack.status === "running"
                ? "Bundling preview…"
                : "Starting sandbox…"}
            </p>
          </div>
          {/* Skeleton hint of the content to come — pulses while bundling. */}
          <div className="w-full max-w-[220px] space-y-2" aria-hidden>
            <div className="h-2 rounded-full bg-white/10 animate-pulse" />
            <div className="h-2 w-3/4 mx-auto rounded-full bg-white/[0.07] animate-pulse" />
            <div className="h-2 w-1/2 mx-auto rounded-full bg-white/[0.05] animate-pulse" />
          </div>
          {slow && (
            <p className="max-w-[260px] text-[11px] leading-relaxed text-white/40">
              First load installs dependencies — hang tight, this can take a
              moment.
            </p>
          )}
        </>
      )}
    </div>
  );
}
