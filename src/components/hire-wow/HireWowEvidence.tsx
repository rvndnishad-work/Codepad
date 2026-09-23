import { Award, ShieldCheck, X } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

const RESUME_BULLETS = ["5 years Node.js", "Ex-FAANG (unverified)", "“Team player”", "Lists React, Vue, Angular…", "No code attached. Ever."];

/** What a finished attempt leaves behind: attempt, result, signals, judgement. */
const RECORD = [
  {
    label: "The attempt",
    body: "Every keystroke, run and submission on a timeline you can scrub — not a final diff with no history behind it.",
  },
  {
    label: "The result",
    body: "Hidden tests executed on our servers in the candidate's language, with the pass/fail matrix that produced the score.",
  },
  {
    label: "The signals",
    body: "Tab switches, clipboard events and timing anomalies, disclosed to the candidate and presented for a human to read.",
  },
  {
    label: "The judgement",
    body: "Rubric scores per dimension from whoever sat in, side by side, so a panel disagreement is visible instead of averaged away.",
  },
];

/**
 * The evidence argument in one section: the resume and the replay side by
 * side (no auto-flip), then the record every attempt closes into.
 */
export default function HireWowEvidence() {
  return (
    <section className="relative bg-surface px-4 py-24 text-fg transition-colors md:py-32">
      <div className="mx-auto max-w-6xl">
        <WowReveal>
          <p className="text-center font-mono text-xs uppercase tracking-[0.12em] text-secondary">same candidate, two stories</p>
          <h2 className="wow-font-display mt-3 text-center text-5xl md:text-7xl">
            Resume <span className="text-subtle">vs</span> <span className="wow-gradient-boss">replay.</span>
          </h2>
        </WowReveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <WowReveal className="h-full">
            <article aria-label="What the resume tells you" className="h-full">
              <div className="ip-invert h-full md:rotate-[-1deg] rounded-3xl border border-border bg-ink p-8 text-fg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xl font-semibold tracking-tight">Candidate.pdf</p>
                    <p className="font-mono text-xs uppercase tracking-widest text-subtle">2 pages · zero verifiable claims</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full border-2 border-danger px-3 py-1 font-mono text-xs font-medium uppercase tracking-widest text-danger">
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
          </WowReveal>
          <WowReveal delay={0.08} className="h-full">
            <article aria-label="What the replay shows you" className="h-full">
              <div className="h-full md:rotate-[1deg] overflow-hidden rounded-3xl border-2 border-secondary/60 bg-panel shadow-[0_0_70px_-18px_rgb(var(--c-accent-2))]">
                <div className="flex items-center gap-3 border-b border-fg/10 px-6 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-ink">▶</span>
                  <div>
                    <p className="text-[15px] font-bold text-fg">debounce-from-scratch · full session</p>
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-fg/45">24:16 · every keystroke kept</p>
                  </div>
                  <span className="ml-auto rounded-full bg-success/10 px-3 py-1 font-mono text-xs font-bold text-success">92/100</span>
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
          </WowReveal>
        </div>
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.12em] text-subtle">Only one of them is evidence</p>

        <WowReveal>
          <p className="mt-24 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-secondary"><Award className="h-3.5 w-3.5" /> the record</p>
          <h3 className="wow-font-display mt-3 text-4xl md:text-6xl">What you are left with,<br /><span className="wow-gradient-boss">per candidate.</span></h3>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            A hiring decision is easy to make and hard to defend three months
            later. Every attempt closes into one record your team can reopen,
            and hand to the person who asks why.
          </p>
        </WowReveal>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <WowReveal className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-border bg-panel backdrop-blur-sm">
              {RECORD.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex flex-col gap-1.5 px-6 py-5 sm:flex-row sm:gap-6 sm:items-baseline ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <span className="flex shrink-0 items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.12em] text-secondary sm:w-36">
                    <span className="font-semibold tabular-nums text-subtle">0{i + 1}</span>
                    {row.label}
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-muted">{row.body}</span>
                </div>
              ))}
            </div>
          </WowReveal>

          <div className="flex flex-col justify-between gap-6 lg:col-span-5">
            <WowReveal>
              <blockquote className="rounded-3xl border border-secondary/40 bg-secondary/[0.07] p-7">
                <p className="wow-font-display text-3xl leading-[0.95] md:text-4xl">
                  The candidate keeps the work. You keep the reasoning.
                </p>
              </blockquote>
            </WowReveal>
            <WowReveal delay={0.08}>
              <p className="text-[13px] leading-relaxed text-subtle">
                Records stay in the workspace under its retention policy, are
                written to an append-only audit log, and travel to Greenhouse,
                Lever or Ashby with the verdict attached.
              </p>
            </WowReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
