"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";

/** On-demand AI hint reveal. Nudges toward the approach without spoiling. */
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

  if (state === "shown") {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
        <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
          <Sparkles className="w-3.5 h-3.5" /> AI hint
        </div>
        <p className="text-sm text-fg/85 leading-relaxed">{hint}</p>
      </div>
    );
  }

  return (
    <button
      onClick={getHint}
      disabled={state === "loading"}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-amber-500 text-sm font-bold hover:bg-amber-500/10 transition disabled:opacity-70"
    >
      {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
      {state === "loading" ? "Thinking…" : state === "error" ? "Hint unavailable — retry" : "Stuck? Get an AI hint"}
    </button>
  );
}
