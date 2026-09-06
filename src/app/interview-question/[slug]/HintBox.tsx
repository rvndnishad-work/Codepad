"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Sparkles, Terminal } from "lucide-react";
import { motion } from "framer-motion";

/**
 * NUDGE CONSOLE — on-demand AI hint reveal. A dark terminal panel (reads as
 * lab equipment next to the classified gate + track dock): status line,
 * transmit button, and the hint streamed as console output. Nudges toward
 * the approach without spoiling the implementation.
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f16] text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,0.8)]"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
        <Terminal className="h-3.5 w-3.5 text-[#22d3ee]" />
        Nudge console
        <span className="ml-auto flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${state === "shown" ? "bg-emerald-400" : state === "loading" ? "animate-pulse bg-amber-400" : "bg-white/25"}`} />
          {state === "shown" ? "received" : state === "loading" ? "uplink…" : "standby"}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[13px] leading-relaxed text-white/60">
            Stuck? Beam a request up — the console returns a conceptual nudge
            that guides your logic without spoiling the implementation.
          </p>

          {state !== "shown" && (
            <button
              onClick={getHint}
              disabled={state === "loading"}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:scale-105 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
            >
              {state === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              {state === "loading"
                ? "Transmitting…"
                : state === "error"
                ? "Signal lost — retry"
                : "Request nudge"}
            </button>
          )}
        </div>

        {state === "shown" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-[#22d3ee]/20 bg-[#22d3ee]/[0.05] p-4"
          >
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#22d3ee]">
              <Sparkles className="h-3.5 w-3.5" /> Incoming nudge
            </div>
            <p className="text-sm leading-relaxed text-white/85">{hint}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
