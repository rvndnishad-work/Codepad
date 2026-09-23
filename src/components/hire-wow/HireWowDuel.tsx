"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Clapperboard, ShieldCheck, X } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

const RESUME_BULLETS = ["5 years Node.js", "Ex-FAANG (unverified)", "“Team player”", "Lists React, Vue, Angular…", "No code attached. Ever."];

/** Resume vs replay duel — the visceral argument, auto-cycling until held. */
export default function HireWowDuel() {
  const [side, setSide] = useState<"replay" | "resume">("replay");
  const [held, setHeld] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (held) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = root.current;
    if (!el) return;
    let live = true;
    const obs = new IntersectionObserver(([e]) => { live = e.isIntersecting; }, { threshold: 0.3 });
    obs.observe(el);
    const t = setInterval(() => {
      if (live) setSide((s) => (s === "replay" ? "resume" : "replay"));
    }, 6000);
    return () => { obs.disconnect(); clearInterval(t); };
  }, [held]);

  const replay = side === "replay";

  return (
    <section className="relative bg-bg px-4 py-24 text-fg transition-colors md:py-32">
      <div className="mx-auto max-w-5xl">
        <WowReveal>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">◆ the argument, in one flip</p>
          <h2 className="wow-font-display mt-3 text-center text-5xl md:text-7xl">
            RESUME <span className="text-subtle">vs</span> <span className="wow-gradient-boss">REPLAY.</span>
          </h2>
        </WowReveal>

        <WowReveal delay={0.08}>
          <div className="mt-8 flex justify-center" onMouseEnter={() => setHeld(true)} onFocus={() => setHeld(true)}>
            <div className="flex rounded-full border border-border bg-surface p-1 font-mono text-[11px] uppercase tracking-[0.18em]">
              <button
                onClick={() => { setSide("resume"); setHeld(true); }}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 transition ${!replay ? "bg-fg font-bold text-bg" : "text-subtle hover:text-fg"}`}
              >
                <FileText className="h-3.5 w-3.5" /> Resume
              </button>
              <button
                onClick={() => { setSide("replay"); setHeld(true); }}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 transition ${replay ? "bg-secondary font-bold text-secondary-ink" : "text-subtle hover:text-fg"}`}
              >
                <Clapperboard className="h-3.5 w-3.5" /> Replay
              </button>
            </div>
          </div>
        </WowReveal>

        <div ref={root} className="relative mt-8 min-h-[400px]">
          <article
            className={`absolute inset-0 transition-all duration-700 ${replay ? "pointer-events-none -translate-x-8 opacity-0" : "translate-x-0 opacity-100"}`}
            aria-hidden={replay}
          >
            <div className="mx-auto max-w-2xl ip-invert rotate-[-1deg] rounded-3xl border border-border bg-ink p-8 text-fg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl font-extrabold tracking-tight">Candidate.pdf</p>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-subtle">2 pages · zero verifiable claims</p>
                </div>
                <span className="flex items-center gap-1 rounded-full border-2 border-danger px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-danger">
                  <X className="h-3 w-3" /> unverified
                </span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {RESUME_BULLETS.map((b) => (
                  <li key={b} className="border-b border-border pb-2.5 text-[15px] font-medium text-muted">• {b}</li>
                ))}
              </ul>
            </div>
          </article>

          <article
            className={`absolute inset-0 transition-all duration-700 ${replay ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-8 opacity-0"}`}
            aria-hidden={!replay}
          >
            <div className="mx-auto max-w-2xl rotate-[1deg] overflow-hidden rounded-3xl border-2 border-secondary/60 bg-surface shadow-[0_0_70px_-18px_rgb(var(--c-accent-2))]">
              <div className="flex items-center gap-3 border-b border-fg/10 px-6 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-black text-secondary-ink">▶</span>
                <div>
                  <p className="text-[15px] font-bold text-fg">debounce-from-scratch · full session</p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg/45">24:16 · every keystroke kept</p>
                </div>
                <span className="ml-auto rounded-full bg-success/10 px-3 py-1 font-mono text-[11px] font-bold text-success">92/100</span>
              </div>
              <div className="space-y-3 px-6 py-5 text-[14px] text-fg/85">
                <p className="flex gap-2"><span className="font-mono text-fg/40">04:12</span> Writes failing test <em className="text-secondary-soft not-italic">first</em> — unprompted.</p>
                <p className="flex gap-2"><span className="font-mono text-fg/40">11:47</span> Catches own stale-closure bug, laughs, fixes it.</p>
                <p className="flex gap-2"><span className="font-mono text-fg/40">19:03</span> Explains trade-offs out loud. Panel nods.</p>
                <p className="flex items-center gap-2 rounded-2xl border border-success/25 bg-success/[0.07] px-4 py-2.5 font-medium text-success">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-success" /> Integrity PASS — hire with confidence.
                </p>
              </div>
            </div>
          </article>
        </div>
        <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-subtle">Same candidate · two stories · only one is evidence</p>
      </div>
    </section>
  );
}
