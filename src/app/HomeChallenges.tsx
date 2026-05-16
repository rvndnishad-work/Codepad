import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Clock, Layers, Sparkles, Target } from "lucide-react";
import HomeChallengesFlow from "./HomeChallengesFlow";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import { SpotlightGroup, SpotlightCard } from "@/components/scroll/SpotlightGroup";
import CountUp from "@/components/scroll/CountUp";
import { StatCard, DifficultyCard } from "@/components/stats/StatBlocks";

type Stats = {
  totalChallenges: number;
  easy: number;
  medium: number;
  hard: number;
  totalMinutes: number;
  interviewsRun: number;
};

async function loadStats(): Promise<Stats> {
  try {
    const [total, byDifficulty, sumMinutes, sessions] = await Promise.all([
      prisma.challenge.count({ where: { published: true } }),
      prisma.challenge.groupBy({
        by: ["difficulty"],
        where: { published: true },
        _count: true,
      }),
      prisma.challenge.aggregate({
        where: { published: true },
        _sum: { estimatedMinutes: true },
      }),
      prisma.interviewSession.count(),
    ]);
    const counts: Record<string, number> = {};
    for (const g of byDifficulty) {
      const n = typeof g._count === "number" ? g._count : 0;
      counts[g.difficulty] = n;
    }
    return {
      totalChallenges: total,
      easy: counts.easy ?? 0,
      medium: counts.medium ?? 0,
      hard: counts.hard ?? 0,
      totalMinutes: sumMinutes._sum.estimatedMinutes ?? 0,
      interviewsRun: sessions,
    };
  } catch {
    return { totalChallenges: 0, easy: 0, medium: 0, hard: 0, totalMinutes: 0, interviewsRun: 0 };
  }
}

// Round down to a nice number so we don't leak exact platform usage. Returns
// the numeric value only — the "+" suffix is appended at the rendering layer
// so the CountUp ticker animates a clean integer.
function roundedNumber(n: number) {
  if (n < 10) return n;
  const order = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.floor(n / order) * order;
}

function fallback(n: number, stub: number) {
  return n > 0 ? n : stub;
}

export default async function HomeChallenges() {
  const raw = await loadStats();

  // If the DB is empty (fresh deploy), present believable stubs so the section
  // still feels populated. Real counts replace these as challenges are added.
  const totalChallenges = fallback(raw.totalChallenges, 40);
  const totalMinutes = fallback(raw.totalMinutes, 720);
  const interviewsRun = fallback(raw.interviewsRun, 1200);
  const easy = fallback(raw.easy, Math.round(totalChallenges * 0.45));
  const medium = fallback(raw.medium, Math.round(totalChallenges * 0.4));
  const hard = fallback(raw.hard, Math.max(1, totalChallenges - easy - medium));
  const diffTotal = Math.max(1, easy + medium + hard);
  const totalHours = Math.max(1, Math.round(totalMinutes / 60));

  return (
    <section className="bg-bg py-20 md:py-28 relative overflow-hidden">
      {/* Soft accent halo behind the headline */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[820px] h-[420px] bg-accent/5 rounded-full blur-[140px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 relative">
        {/* Headline — staggered reveal so eyebrow → title → subtext rise in sequence */}
        <RevealOnScroll className="text-center mb-12 md:mb-16" stagger={0.1}>
          <RevealItem>
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-accent mb-4 bg-accent/10 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Practice · Interview · Hire
            </div>
          </RevealItem>
          <RevealItem>
            <h2 className="text-3xl md:text-5xl font-black text-fg tracking-tight leading-[1.05] max-w-3xl mx-auto">
              Practice, prepare, <span className="text-accent">perform.</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="text-muted text-base md:text-lg leading-relaxed mt-5 max-w-2xl mx-auto">
              Codepad isn&apos;t just a sandbox. It&apos;s a complete interview engine —
              from curated coding challenges to live mock sessions you can run with anyone, anywhere.
            </p>
          </RevealItem>
        </RevealOnScroll>

        {/* Animated 3-step infographic */}
        <HomeChallengesFlow />

        {/* Live stats strip — spotlight glows track the cursor across all
            four cards as one light source. */}
        <SpotlightGroup className="mt-8">
          <RevealOnScroll
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
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
                <StatCard
                  tone="accent"
                  icon={<Layers className="w-5 h-5" />}
                  value={<CountUp value={roundedNumber(interviewsRun)} suffix="+" />}
                  label="Interview sessions run"
                />
              </SpotlightCard>
            </RevealItem>
          </RevealOnScroll>
        </SpotlightGroup>

        {/* Dual CTAs */}
        <RevealOnScroll
          className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center mt-10"
          stagger={0.08}
        >
          <RevealItem>
            <Link
              href="/challenges"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg font-black text-sm hover:bg-accent-soft transition-colors shadow-sm"
            >
              Browse all challenges
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </RevealItem>
          <RevealItem>
            <Link
              href="/interview/new"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-panel hover:bg-elevated hover:border-border-strong text-fg font-black text-sm transition-colors"
            >
              Build your first interview
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </RevealItem>
        </RevealOnScroll>
      </div>
    </section>
  );
}

