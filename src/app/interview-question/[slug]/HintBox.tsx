"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

/** On-demand AI hint reveal card. Nudges toward the approach without spoiling. */
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

  const fadeInVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
      className="rounded-3xl border border-amber-500/35 dark:border-amber-500/20 bg-amber-500/[0.06] dark:bg-amber-500/[0.03] p-5 shadow-sm space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Stuck? AI Nudge Available
          </h3>
          <p className="text-xs text-muted max-w-md">
            Get a conceptual hint to guide your logic without spoiling the final implementation.
          </p>
        </div>

        {state !== "shown" && (
          <div className="shrink-0">
            <button
              onClick={getHint}
              disabled={state === "loading"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-amber-500 text-sm font-bold hover:bg-amber-500/10 transition disabled:opacity-70"
            >
              {state === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4" />
              )}
              {state === "loading"
                ? "Thinking…"
                : state === "error"
                ? "Hint unavailable — retry"
                : "Stuck? Get an AI hint"}
            </button>
          </div>
        )}
      </div>

      {state === "shown" && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AI hint
          </div>
          <p className="text-sm text-fg/85 leading-relaxed">{hint}</p>
        </div>
      )}
    </motion.div>
  );
}

