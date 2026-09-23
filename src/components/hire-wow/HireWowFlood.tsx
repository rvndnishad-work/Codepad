import { Clock, Inbox, Layers, TrendingDown } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

/**
 * The core argument of /hire: applications arrive in the order people clicked
 * apply, not in order of ability. A serial human scan stops long before the
 * pile does — so the strongest candidate is often one nobody opened. Left
 * panel dramatises that queue, right panel shows the same pile ranked by
 * evidence. Server component: both grids are deterministic and the tooltips
 * are pure CSS group-hover, so there is nothing to hydrate.
 */

/** Deterministic pseudo-score per applicant — identical on server and client. */
function scoreFor(i: number): number {
  return ((i * 73 + 17) % 101) / 100 + ((i * 29) % 7) / 40;
}

const APPLICANTS = 120;
const READ_DEPTH = 34; // how far a human scan realistically gets
const HIDDEN_GEM = 71; // grid position of the applicant nobody ever opens
const GEM_LABEL = 612; // ...and their number in the real 900-deep pile

const RANKED = Array.from({ length: APPLICANTS }, (_, i) => i).sort((a, b) => {
  if (a === HIDDEN_GEM) return -1;
  if (b === HIDDEN_GEM) return 1;
  return scoreFor(b) - scoreFor(a);
});

export default function HireWowFlood() {
  const gemRank = RANKED.indexOf(HIDDEN_GEM) + 1;

  return (
    <section className="relative overflow-hidden bg-surface px-4 py-24 text-fg transition-colors md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-180px] top-1/3 h-[420px] w-[420px] rounded-full bg-secondary/15 blur-[130px]"
      />
      <div className="relative mx-auto max-w-7xl">
        <WowReveal>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-secondary">
            <Inbox className="h-3.5 w-3.5" /> the problem you actually have
          </p>
          <h2 className="wow-font-display mt-3 max-w-4xl text-5xl md:text-7xl">
            The pile isn&apos;t sorted
            <br />
            <span className="wow-gradient-boss">by talent.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            You post one role and hundreds — sometimes thousands — of
            applications land in a week. Somebody opens them top-down, five
            minutes each, and runs out of attention around number forty. The
            shortlist closes there. The strongest engineer in that pile might be
            number 612, and nobody will ever find out, because the queue decided
            before the skill did.
          </p>
        </WowReveal>

        {/* What the serial scan actually costs */}
        <WowReveal delay={0.06}>
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-3">
            {[
              { icon: Layers, v: "900", l: "Applications for one opening" },
              { icon: Clock, v: "75 hrs", l: "To read them all at 5 min each" },
              { icon: TrendingDown, v: "~4%", l: "Of the pile a human ever opens" },
            ].map((s) => (
              <div key={s.l} className="flex items-center gap-4 bg-panel px-6 py-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-danger/10 text-danger">
                  <s.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="wow-font-display block text-3xl tabular-nums">{s.v}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{s.l}</span>
                </span>
              </div>
            ))}
          </div>
        </WowReveal>

        {/* The same pile, twice */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <WowReveal delay={0.1} className="h-full">
            <article className="flex h-full flex-col rounded-3xl border border-danger/25 bg-panel p-6 backdrop-blur-sm">
              <header className="flex items-baseline justify-between gap-3">
                <h3 className="wow-font-display text-2xl">Read in arrival order</h3>
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-danger">today</span>
              </header>
              <p className="mt-1.5 text-[13px] text-muted">
                Attention runs out long before the pile does. Each square is an applicant.
              </p>

              <div className="mt-5 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1.5">
                {Array.from({ length: APPLICANTS }, (_, i) => {
                  const read = i < READ_DEPTH;
                  const gem = i === HIDDEN_GEM;
                  return (
                    <span
                      key={i}
                      className={`group relative aspect-square rounded-[3px] ${
                        gem
                          ? "bg-success shadow-[0_0_10px_2px_rgb(var(--c-success)/0.55)]"
                          : read
                            ? "bg-fg/45"
                            : "bg-fg/10"
                      }`}
                    >
                      {gem && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-success/30 bg-bg px-2.5 py-1 font-mono text-xs text-success opacity-0 transition group-hover:opacity-100">
                          #{GEM_LABEL} · never opened
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-subtle">
                <span className="text-fg/60">■ read</span>
                <span className="ml-3">■ never opened</span>
                <span className="ml-3 text-success">■ your best hire</span>
              </p>

              <ul className="mt-5 space-y-2 border-t border-border pt-4 text-[13px] leading-snug text-muted">
                <li>· Screening quality decays with every resume read</li>
                <li>· Two recruiters rank the same pile differently</li>
                <li>· Strong candidates go cold waiting for a reply</li>
                <li>· The verdict rests on claims nobody verified</li>
              </ul>
            </article>
          </WowReveal>

          <WowReveal delay={0.16} className="h-full">
            <article className="flex h-full flex-col rounded-3xl border border-secondary/40 bg-panel p-6 shadow-[0_24px_70px_-30px_rgb(var(--c-accent-2)/0.6)] backdrop-blur-sm">
              <header className="flex items-baseline justify-between gap-3">
                <h3 className="wow-font-display text-2xl">Ranked by what they built</h3>
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary">here</span>
              </header>
              <p className="mt-1.5 text-[13px] text-muted">
                Same pile, scored in parallel, best-first by morning.
              </p>

              <div className="mt-5 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1.5">
                {RANKED.map((id, pos) => {
                  const gem = id === HIDDEN_GEM;
                  const band = pos / APPLICANTS;
                  return (
                    <span
                      key={id}
                      className={`group relative aspect-square rounded-[3px] ${
                        gem
                          ? "bg-success shadow-[0_0_10px_2px_rgb(var(--c-success)/0.55)]"
                          : band < 0.17
                            ? "bg-secondary"
                            : band < 0.42
                              ? "bg-secondary/55"
                              : "bg-secondary/20"
                      }`}
                    >
                      {gem && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-success/30 bg-bg px-2.5 py-1 font-mono text-xs text-success opacity-0 transition group-hover:opacity-100">
                          #{GEM_LABEL} · now rank {gemRank} · 92/100
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-subtle">
                <span className="text-secondary">■ interview these</span>
                <span className="ml-3">■ scored, kept warm</span>
                <span className="ml-3 text-success">■ surfaced at rank {gemRank}</span>
              </p>

              <ul className="mt-5 space-y-2 border-t border-border pt-4 text-[13px] leading-snug text-fg/85">
                <li>· Every applicant gets the same assessment and rubric</li>
                <li>· Grading runs on our servers while you sleep</li>
                <li>· Integrity signals attached, so the top of the list is real</li>
                <li>· You spend your hours on the twenty worth your hours</li>
              </ul>
            </article>
          </WowReveal>
        </div>
      </div>
    </section>
  );
}
