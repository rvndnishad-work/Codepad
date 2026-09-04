import { Award } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

/**
 * What a finished attempt leaves behind — the same four honest rows
 * (attempt / result / signals / judgement) plus the ATS line, reskinned.
 */
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

export default function HireWowRecord() {
  return (
    <section className="relative bg-[var(--wow-bg-2)] px-4 py-24 text-[var(--wow-fg)] transition-colors md:py-32">
      <div className="mx-auto max-w-6xl">
        <WowReveal>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#8b93ff]"><Award className="h-3.5 w-3.5" /> the record</p>
          <h2 className="wow-font-display mt-3 text-5xl md:text-7xl">WHAT YOU ARE LEFT WITH,<br /><span className="wow-gradient-boss">PER CANDIDATE.</span></h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--wow-muted)]">
            A hiring decision is easy to make and hard to defend three months
            later. Every attempt closes into one record your team can reopen —
            and hand to the person who asks why.
          </p>
        </WowReveal>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <WowReveal className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] backdrop-blur-sm">
              {RECORD.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex flex-col gap-1.5 px-6 py-5 sm:flex-row sm:gap-6 ${
                    i > 0 ? "border-t border-[var(--wow-card-border)]" : ""
                  } ${i === 0 ? "sm:items-baseline" : "sm:items-baseline"}`}
                >
                  <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b93ff] sm:w-36">
                    <span className="font-black tabular-nums text-[var(--wow-faint)]">0{i + 1}</span>
                    {row.label}
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-[var(--wow-muted)]">{row.body}</span>
                </div>
              ))}
            </div>
          </WowReveal>

          <div className="flex flex-col justify-between gap-6 lg:col-span-5">
            <WowReveal>
              <blockquote className="rounded-3xl border border-[#8b93ff]/40 bg-[#8b93ff]/[0.07] p-7">
                <p className="wow-font-display text-3xl leading-[0.95] md:text-4xl">
                  The candidate keeps the work. You keep the reasoning.
                </p>
              </blockquote>
            </WowReveal>
            <WowReveal delay={0.08}>
              <p className="text-[13px] leading-relaxed text-[var(--wow-faint)]">
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
