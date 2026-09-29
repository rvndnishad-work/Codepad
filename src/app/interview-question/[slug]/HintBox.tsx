"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";

/**
 * On-demand hint: asks the hint endpoint for a nudge toward the approach
 * that does not give the implementation away, and shows it under the prompt.
 */
export default function HintBox({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "loading" | "shown" | "error">("idle");
  const [hint, setHint] = useState("");

  async function getHint() {
    setState("loading");
    try {
      const res = await fetch(`/api/interview-questions/${slug}/hint`, { method: "POST" });
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json();
      setHint(data.hint ?? "");
      setState("shown");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning" aria-hidden>
          <Lightbulb className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-fg">Stuck? Get a hint.</p>
          <p className="mt-0.5 text-sm leading-relaxed text-subtle">
            A short nudge toward the approach. It will not give the answer away.
          </p>
        </div>
        {state !== "shown" && (
          <button
            type="button"
            onClick={getHint}
            disabled={state === "loading"}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border-strong bg-panel px-5 text-sm font-medium text-fg transition-colors hover:border-fg/40 hover:bg-elevated disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
          >
            {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {state === "loading" ? "Thinking…" : state === "error" ? "Try again" : "Get a hint"}
          </button>
        )}
      </div>

      {state === "error" && (
        <p role="alert" className="mt-3 text-sm text-danger">
          The hint could not load. Try again in a moment.
        </p>
      )}

      {state === "shown" && (
        <div className="qa-in mt-5 rounded-xl border border-accent-2/25 bg-accent-2/[0.07] p-4">
          <p className="flex items-center gap-2 text-[13px] font-medium text-accent-2">
            <Sparkles className="h-4 w-4" aria-hidden /> Hint
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{hint}</p>
        </div>
      )}
    </div>
  );
}
