"use client";

import { ShieldCheck, TriangleAlert, Play, Radar } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

const BLIPS = [
  { x: "22%", y: "30%", label: "AK · paste burst ×7", bad: true },
  { x: "68%", y: "22%", label: "RS · clean run", bad: false },
  { x: "76%", y: "62%", label: "JM · 4 tab exits", bad: true },
  { x: "38%", y: "70%", label: "TP · AI-likelihood 12%", bad: false },
  { x: "55%", y: "45%", label: "ND · steady focus", bad: false },
];

const SIGNALS = [
  { ok: false, text: "Paste burst ×7 in 40s — attempt flagged for review" },
  { ok: true, text: "RS · 38 min steady focus, zero exits — signal strong" },
  { ok: false, text: "4 tab exits during hidden tests — timestamped" },
  { ok: true, text: "TP · AI-likelihood 12% — comfortably human" },
];

/**
 * Integrity radar showpiece: sweeping scope with pinging attempt blips
 * beside the signal log. Pure CSS motion — a dark chapter in both themes.
 */
export default function HireWowRadar() {
  return (
    <section className="relative overflow-hidden bg-bg px-4 py-24 text-fg md:py-32">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/15 blur-[140px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <WowReveal className="order-2 lg:order-1">
          <div className="relative mx-auto aspect-square w-full max-w-[480px]">
            <div aria-hidden className="absolute inset-0 rounded-full border border-secondary/25" />
            <div aria-hidden className="absolute inset-[16%] rounded-full border border-secondary/20" />
            <div aria-hidden className="absolute inset-[32%] rounded-full border border-secondary/15" />
            <div aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-secondary/15" />
            <div aria-hidden className="absolute left-0 top-1/2 h-px w-full bg-secondary/15" />
            <div
              aria-hidden
              className="absolute inset-0 motion-safe:animate-[wow-spin_4s_linear_infinite] rounded-full"
              style={{ background: "conic-gradient(from 0deg, rgb(var(--c-accent-2)/0.55), transparent 22%)" }}
            />
            <div aria-hidden className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary-soft shadow-[0_0_16px_4px_rgb(var(--c-accent-2)/0.8)]" />
            {BLIPS.map((b) => (
              <div key={b.label} className="group absolute" style={{ left: b.x, top: b.y }}>
                <span className={`absolute -left-1.5 -top-1.5 h-3 w-3 motion-safe:animate-ping rounded-full ${b.bad ? "bg-danger" : "bg-success"}`} style={{ animationDuration: "2.2s" }} />
                <span className={`absolute -left-1 -top-1 h-2 w-2 rounded-full ${b.bad ? "bg-danger" : "bg-success"}`} />
                <span className="absolute left-3 top-[-10px] whitespace-nowrap rounded-full border border-fg/15 bg-bg/75 px-2.5 py-1 font-mono text-[11px] tracking-wide text-fg/90 opacity-0 backdrop-blur transition group-hover:opacity-100">
                  {b.label}
                </span>
              </div>
            ))}
            <span aria-hidden className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-secondary" />
            <span aria-hidden className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-secondary" />
            <span aria-hidden className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-secondary" />
            <span aria-hidden className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-secondary" />
          </div>
          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-fg/40">
            <span className="mr-3 text-success">● clean</span>
            <span className="text-danger">● needs review</span>
            <span className="ml-3 text-fg/40">— hover a blip</span>
          </p>
        </WowReveal>

        <div className="order-1 lg:order-2">
          <WowReveal>
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-secondary"><Radar className="h-3.5 w-3.5" /> integrity radar</p>
            <h2 className="wow-font-display mt-3 text-5xl md:text-6xl">EVERY ATTEMPT<br />IS <span className="wow-gradient-boss">ON THE SCOPE.</span></h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fg/65">
              Tab switches, clipboard events and timing anomalies — disclosed to
              the candidate, timestamped onto the replay, and presented for a
              human to read. The panel debates skill, never suspicion.
            </p>
          </WowReveal>
          <WowReveal delay={0.1}>
            <ul className="mt-7 space-y-2.5">
              {SIGNALS.map((s) => (
                <li key={s.text} className="flex items-center gap-3 rounded-2xl border border-fg/10 bg-fg/[0.03] px-4 py-3 text-[13.5px] font-medium text-fg/85">
                  {s.ok
                    ? <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                    : <TriangleAlert className="h-4 w-4 shrink-0 text-danger" />}
                  {s.text}
                  <Play className="ml-auto h-3.5 w-3.5 shrink-0 text-fg/30" />
                </li>
              ))}
            </ul>
          </WowReveal>
        </div>
      </div>
    </section>
  );
}
