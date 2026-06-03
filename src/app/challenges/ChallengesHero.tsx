import { Clock, Layers, Sparkles, Target } from "lucide-react";
import CountUp from "@/components/scroll/CountUp";
import { SpotlightGroup, SpotlightCard } from "@/components/scroll/SpotlightGroup";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import {
  DifficultyCard,
  ProgressCard,
  StatCard,
} from "@/components/stats/StatBlocks";

export type ChallengesHeroStats = {
  totalChallenges: number;
  easy: number;
  medium: number;
  hard: number;
  totalMinutes: number;
  /** Total interview sessions ever run — used as the 4th card for anon users. */
  interviewsRun: number;
  /** Logged-in user's solved counts; null when anon (4th card swaps in). */
  personal: {
    solved: number;
    total: number;
    byDifficulty: { easy: number; medium: number; hard: number };
  } | null;
};

// Same rounding rule used on the homepage so the two surfaces never disagree
// about how to display "1200+" vs the exact 1247.
function roundedNumber(n: number) {
  if (n < 10) return n;
  const order = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.floor(n / order) * order;
}

export default function ChallengesHero({ stats }: { stats: ChallengesHeroStats }) {
  const {
    totalChallenges,
    easy,
    medium,
    hard,
    totalMinutes,
    interviewsRun,
    personal,
  } = stats;

  const totalHours = Math.max(1, Math.round(totalMinutes / 60));
  const diffTotal = Math.max(1, easy + medium + hard);

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Soft accent halo — same visual language as the homepage hero glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[820px] h-[360px] bg-accent/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-14 md:py-16">
        {/* Headline cluster — staggered reveal */}
        <RevealOnScroll className="mb-10 md:mb-12" stagger={0.09}>
          <RevealItem>
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-accent mb-4 bg-accent/10 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Practice · Sharpen · Ship
            </div>
          </RevealItem>
          <RevealItem>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-fg leading-[1.05] max-w-3xl">
              Challenges built for{" "}
              <span className="text-accent">real interviews.</span>
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="text-muted text-base md:text-lg leading-relaxed mt-4 max-w-2xl">
              Curated coding problems with hidden tests. Write your solution, run the
              tests, ship when you pass — and pull any challenge into an Interview
              Session later.
            </p>
          </RevealItem>
        </RevealOnScroll>

        {/* Stats infographic — 4-card strip. Reuses the homepage spotlight
            group pattern so the accent glow tracks the cursor across cards. */}
        <SpotlightGroup>
          <RevealOnScroll
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            stagger={0.08}
          >
            <RevealItem>
              <SpotlightCard className="rounded-2xl h-full">
                <StatCard
                  tone="emerald"
                  icon={<Target className="w-5 h-5" />}
                  value={<CountUp value={totalChallenges} suffix="+" />}
                  label="Curated challenges"
                />
              </SpotlightCard>
            </RevealItem>
            <RevealItem>
              <SpotlightCard className="rounded-2xl h-full">
                <DifficultyCard easy={easy} medium={medium} hard={hard} total={diffTotal} />
              </SpotlightCard>
            </RevealItem>
            <RevealItem>
              <SpotlightCard className="rounded-2xl h-full">
                <StatCard
                  tone="amber"
                  icon={<Clock className="w-5 h-5" />}
                  value={<CountUp value={totalHours} suffix="h+" />}
                  label="Of practice content"
                />
              </SpotlightCard>
            </RevealItem>
            <RevealItem>
              <SpotlightCard className="rounded-2xl h-full">
                {personal ? (
                  <ProgressCard
                    solved={personal.solved}
                    total={personal.total}
                    byDifficulty={personal.byDifficulty}
                  />
                ) : (
                  <StatCard
                    tone="accent"
                    icon={<Layers className="w-5 h-5" />}
                    value={<CountUp value={roundedNumber(interviewsRun)} suffix="+" />}
                    label="Interview sessions run"
                  />
                )}
              </SpotlightCard>
            </RevealItem>
          </RevealOnScroll>
        </SpotlightGroup>
      </div>
    </section>
  );
}
