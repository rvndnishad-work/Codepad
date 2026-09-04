import { Bot, Clock, FileCode2, Inbox, Layers, ShieldAlert, TrendingDown } from "lucide-react";
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
const HIDDEN_GEM = 71; // the applicant nobody ever opens

const RANKED = Array.from({ length: APPLICANTS }, (_, i) => i).sort((a, b) => {
  if (a === HIDDEN_GEM) return -1;
  if (b === HIDDEN_GEM) return 1;
  return scoreFor(b) - scoreFor(a);
});

const MECHANISMS = [
  {
    icon: FileCode2,
    kicker: "Take-home assignments",
    title: "Everyone gets the same problem",
    body:
      "One link goes to the whole applicant list. Real code, real execution, hidden tests — graded on our servers against your rubric, not skimmed by a tired human at 6pm.",
  },
  {
    icon: Bot,
    kicker: "AI interview",
    title: "Round one runs without you",
    body:
      "An AI screening interview talks to candidates in parallel, probes their answers with follow-ups, and returns a scored transcript. Hundreds of first rounds, none of them on your calendar.",
  },
  {
    icon: ShieldAlert,
    kicker: "Anti-cheat built in",
    title: "So the ranking means something",
    body:
      "Paste bursts, tab exits, timing anomalies and AI-likelihood are captured on every attempt and disclosed to the candidate. A score you can trust is the entire point of ranking.",
  },
];

export default function HireWowFlood() {
  const gemRank = RANKED.indexOf(HIDDEN_GEM) + 1;

  return (
    <section className="relative overflow-hidden bg-[var(--wow-bg-2)] px-4 py-24 text-[var(--wow-fg)] transition-colors md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-180px] top-1/3 h-[420px] w-[420px] rounded-full bg-[var(--wow-glow-a)] blur-[130px]"
      />
      <div className="relative mx-auto max-w-7xl">
        <WowReveal>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#8b93ff]">
            <Inbox className="h-3.5 w-3.5" /> the problem you actually have
          </p>
          <h2 className="wow-font-display mt-3 max-w-4xl text-5xl md:text-7xl">
            THE PILE ISN&apos;T SORTED
            <br />
            <span className="wow-gradient-boss">BY TALENT.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--wow-muted)]">
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
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card-border)] sm:grid-cols-3">
            {[
              { icon: Layers, v: "900", l: "Applications for one opening" },
              { icon: Clock, v: "75 hrs", l: "To read them all at 5 min each" },
              { icon: TrendingDown, v: "~4%", l: "Of the pile a human ever opens" },
            ].map((s) => (
              <div key={s.l} className="flex items-center gap-4 bg-[var(--wow-card)] px-6 py-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-400">
                  <s.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="wow-font-display block text-3xl tabular-nums">{s.v}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--wow-muted)]">{s.l}</span>
                </span>
              </div>
            ))}
          </div>
        </WowReveal>

        {/* The same pile, twice */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <WowReveal delay={0.1} className="h-full">
            <article className="flex h-full flex-col rounded-3xl border border-rose-500/25 bg-[var(--wow-card)] p-6 backdrop-blur-sm">
              <header className="flex items-baseline justify-between gap-3">
                <h3 className="wow-font-display text-2xl">Read in arrival order</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-400">today</span>
              </header>
              <p className="mt-1.5 text-[13px] text-[var(--wow-muted)]">
                Attention runs out long before the pile does.
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
                          ? "bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.55)]"
                          : read
                            ? "bg-[var(--wow-fg)]/45"
                            : "bg-[var(--wow-fg)]/10"
                      }`}
                    >
                      {gem && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-400/30 bg-[#05081a] px-2.5 py-1 font-mono text-[10px] text-emerald-200 opacity-0 transition group-hover:opacity-100">
                          #{HIDDEN_GEM + 1} · never opened
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--wow-faint)]">
                <span className="text-[var(--wow-fg)]/60">■ read</span>
                <span className="ml-3">■ never opened</span>
                <span className="ml-3 text-emerald-400">■ your best hire</span>
              </p>

              <ul className="mt-5 space-y-2 border-t border-[var(--wow-card-border)] pt-4 text-[13px] leading-snug text-[var(--wow-muted)]">
                <li>· Screening quality decays with every resume read</li>
                <li>· Two recruiters rank the same pile differently</li>
                <li>· Strong candidates go cold waiting for a reply</li>
                <li>· The verdict rests on claims nobody verified</li>
              </ul>
            </article>
          </WowReveal>

          <WowReveal delay={0.16} className="h-full">
            <article className="flex h-full flex-col rounded-3xl border border-[#8b93ff]/40 bg-[var(--wow-card)] p-6 shadow-[0_24px_70px_-30px_rgba(139,147,255,0.6)] backdrop-blur-sm">
              <header className="flex items-baseline justify-between gap-3">
                <h3 className="wow-font-display text-2xl">Ranked by what they built</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b93ff]">here</span>
              </header>
              <p className="mt-1.5 text-[13px] text-[var(--wow-muted)]">
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
                          ? "bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.55)]"
                          : band < 0.17
                            ? "bg-[#8b93ff]"
                            : band < 0.42
                              ? "bg-[#8b93ff]/55"
                              : "bg-[#8b93ff]/20"
                      }`}
                    >
                      {gem && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-400/30 bg-[#05081a] px-2.5 py-1 font-mono text-[10px] text-emerald-200 opacity-0 transition group-hover:opacity-100">
                          #{HIDDEN_GEM + 1} · now rank {gemRank} · 92/100
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--wow-faint)]">
                <span className="text-[#8b93ff]">■ interview these</span>
                <span className="ml-3">■ scored, kept warm</span>
                <span className="ml-3 text-emerald-400">■ surfaced at rank {gemRank}</span>
              </p>

              <ul className="mt-5 space-y-2 border-t border-[var(--wow-card-border)] pt-4 text-[13px] leading-snug text-[var(--wow-fg)]/85">
                <li>· Every applicant gets the same assessment and rubric</li>
                <li>· Grading runs on our servers while you sleep</li>
                <li>· Integrity signals attached, so the top of the list is real</li>
                <li>· You spend your hours on the twenty worth your hours</li>
              </ul>
            </article>
          </WowReveal>
        </div>

        {/* How the ranking gets built */}
        <WowReveal delay={0.08}>
          <h3 className="wow-font-display mt-16 text-3xl md:text-4xl">
            THREE THINGS DO THE <span className="wow-gradient-boss">SORTING.</span>
          </h3>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--wow-muted)]">
            None of them need your calendar, and each one runs across the whole
            list at once.
          </p>
        </WowReveal>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {MECHANISMS.map((m, i) => (
            <WowReveal key={m.kicker} delay={i * 0.07} className="h-full">
              <article className="flex h-full flex-col gap-4 rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#8b93ff]/60 hover:shadow-[0_20px_60px_-20px_rgba(139,147,255,0.5)]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#8b93ff]/30 bg-[#8b93ff]/10 text-[#8b93ff]">
                  <m.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b93ff]">
                    {m.kicker}
                  </p>
                  <h4 className="mt-2 text-[17px] font-extrabold leading-snug tracking-tight">{m.title}</h4>
                </div>
                <p className="text-[13.5px] leading-relaxed text-[var(--wow-muted)]">{m.body}</p>
              </article>
            </WowReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
