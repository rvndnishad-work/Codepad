import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  Building2,
  FlaskConical,
  Map as MapIcon,
  MessagesSquare,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import SectionHeading from "@/components/home/SectionHeading";

/**
 * "The prep arsenal" — the interview-prep universe in one bento, fed with real
 * DB counts (never invented numbers; cards hide themselves when a feature has
 * no content yet). Sits right under the developer hero so the breadth of the
 * platform is the first thing a visitor scrolls into.
 *
 * Revamp notes: entrance reveals via the shared RevealOnScroll rhythm, and a
 * single tokenized card treatment (accent-tinted tiles instead of the old
 * per-card rainbow gradients) so the section reads as one system.
 */

export interface ArsenalCounts {
  prepQuestions: number;
  techs: { technology: string; count: number }[];
  companies: number;
  reviewChallenges: number;
  promptScenarios: number;
  challenges: number;
  journeys: number;
}

const TECH_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  "javascript-coding": "JS Coding",
  typescript: "TypeScript",
  reactjs: "React",
  angular: "Angular",
  vuejs: "Vue",
  nodejs: "Node.js",
  nextjs: "Next.js",
  python: "Python",
  sql: "SQL",
  dsa: "DSA",
  "machine-coding": "Machine Coding",
  "system-design": "System Design",
  "ai-engineering": "AI Engineering",
};

export default function HomeArsenal({ counts }: { counts: ArsenalCounts }) {
  const topTechs = [...counts.techs].sort((a, b) => b.count - a.count);
  const shownTechs = topTechs.slice(0, 9);
  const moreTechs = Math.max(0, topTechs.length - shownTechs.length);

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Ambient background — accent-tinted, on-token */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 space-y-12">
        <SectionHeading
          eyebrow="The prep arsenal"
          eyebrowIcon={<Target className="w-3.5 h-3.5" />}
          title="Everything between you"
          highlight="and the offer."
          lede="Question banks, runnable challenges, AI-readiness training, and company-specific prep — one account, zero setup."
        />

        {/* Bento */}
        <RevealOnScroll stagger={0.1} amount={0.15} className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* ── Question banks — the flagship card ── */}
          {counts.prepQuestions > 0 && (
            <RevealItem className="md:col-span-7">
              <Link
                href="/interview-questions"
                className="group relative block h-full rounded-3xl border border-border bg-surface shadow-tile overflow-hidden p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/45 hover:shadow-tile-hover"
              >
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/10 blur-[100px] opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <span
                  aria-hidden
                  className="absolute -bottom-10 -right-2 text-[9rem] leading-none font-black text-fg opacity-[0.04] select-none pointer-events-none"
                >
                  ?
                </span>

                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl border border-accent/25 bg-accent/10 text-accent flex items-center justify-center">
                        <BookOpenCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-fg tracking-tight">
                          Interview question banks
                        </h3>
                        <p className="text-xs text-muted font-medium mt-0.5">
                          Every answer hand-written: diagrams, tables & runnable examples
                        </p>
                      </div>
                    </div>
                    <ArrowChip />
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-fg tabular-nums">
                      {formatK(counts.prepQuestions)}
                    </span>
                    <span className="text-sm font-bold text-muted">
                      questions · {counts.techs.length} technologies
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {shownTechs.map((t) => (
                      <span
                        key={t.technology}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-bg/60 text-[11px] font-bold text-fg"
                      >
                        {TECH_LABELS[t.technology] ?? t.technology}
                        <span className="text-muted/70 font-mono tabular-nums">{t.count}</span>
                      </span>
                    ))}
                    {moreTechs > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-dashed border-border text-[11px] font-bold text-muted">
                        +{moreTechs} more
                      </span>
                    )}
                  </div>

                  {counts.companies > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted pt-1">
                      <Building2 className="w-3.5 h-3.5 opacity-70" />
                      Plus company-wise questions & real interview experiences
                    </div>
                  )}
                </div>
              </Link>
            </RevealItem>
          )}

          {/* ── Review the AI's Code ── */}
          {counts.reviewChallenges > 0 && (
            <RevealItem className="md:col-span-5">
              <Link
                href="/interview/ai-code-review"
                className="group relative flex h-full flex-col rounded-3xl border border-border bg-surface shadow-tile overflow-hidden p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/45 hover:shadow-tile-hover"
              >
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/10 blur-[100px] opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <span
                  aria-hidden
                  className="absolute -bottom-9 -right-1 text-[8rem] leading-none font-black text-fg opacity-[0.04] select-none pointer-events-none"
                >
                  {"</>"}
                </span>

                <div className="relative space-y-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl border border-accent/25 bg-accent/10 text-accent flex items-center justify-center">
                        <Bot className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-extrabold text-fg tracking-tight">
                            Review the AI&apos;s code
                          </h3>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[9px] font-black uppercase tracking-wider">
                            New
                          </span>
                        </div>
                        <p className="text-xs text-muted font-medium mt-0.5">
                          The AI-readiness skill interviews now test
                        </p>
                      </div>
                    </div>
                    <ArrowChip />
                  </div>

                  <p className="text-sm text-muted leading-relaxed">
                    Plausible AI-generated answers with planted flaws — hallucinated
                    APIs, logic bugs, security holes. Find them all before shipping,
                    or race the clock in Hallucination Hunt.
                  </p>

                  <div className="mt-auto flex items-baseline gap-2">
                    <span className="text-4xl font-black text-fg tabular-nums">
                      {counts.reviewChallenges}
                    </span>
                    <span className="text-sm font-bold text-muted">
                      challenges · JS, TS, Python & SQL
                    </span>
                  </div>
                </div>
              </Link>
            </RevealItem>
          )}

          {/* ── Row 2: three equal cards ── */}
          {counts.challenges > 0 && (
            <RevealItem className="md:col-span-4">
              <SmallCard
                href="/challenges"
                icon={<Swords className="w-6 h-6" />}
                title="Coding challenges"
                stat={`${counts.challenges}`}
                statLabel="server-graded"
                blurb="Real execution in 8 languages, hidden tests, and instant verdicts — like the take-home, before the take-home."
              />
            </RevealItem>
          )}
          {counts.promptScenarios > 0 && (
            <RevealItem className="md:col-span-4">
              <SmallCard
                href="/interview/prompt-practice"
                icon={<MessagesSquare className="w-6 h-6" />}
                title="Prompt Arena"
                stat={`${counts.promptScenarios}`}
                statLabel="scenarios"
                blurb="Write prompts against real scenarios and get scored — the skill every AI-era JD quietly expects."
              />
            </RevealItem>
          )}
          <RevealItem className="md:col-span-4">
            <SmallCard
              href={counts.journeys > 0 ? "/prep" : "/interview-questions"}
              icon={<MapIcon className="w-6 h-6" />}
              title="Prep journeys"
              stat="Day-by-day"
              statLabel="role-based plans"
              blurb="Pick a target role — the plan sequences banks, challenges and scenarios into a phased track you can check off."
            />
          </RevealItem>
        </RevealOnScroll>

        {/* AI-readiness ribbon */}
        <RevealOnScroll delay={0.15} className="flex justify-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>
              New here?{" "}
              <Link
                href="/prep"
                className="text-fg font-bold underline decoration-accent/50 underline-offset-4 hover:decoration-accent transition-colors"
              >
                Take the AI-Ready journey
              </Link>{" "}
              — question bank, prompt drills and code-review challenges in one track.
            </span>
            <FlaskConical className="w-3.5 h-3.5 text-accent" />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function SmallCard({
  href,
  icon,
  title,
  stat,
  statLabel,
  blurb,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  stat: string;
  statLabel: string;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col rounded-3xl border border-border bg-surface shadow-tile overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/45 hover:shadow-tile-hover"
    >
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-accent/10 blur-[90px] opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl border border-accent/25 bg-accent/10 text-accent flex items-center justify-center">
            {icon}
          </div>
          <ArrowChip />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-fg tracking-tight">{title}</h3>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-fg tabular-nums">{stat}</span>
            <span className="text-xs font-bold text-muted">{statLabel}</span>
          </div>
        </div>
        <p className="text-xs text-muted leading-relaxed">{blurb}</p>
      </div>
    </Link>
  );
}

function ArrowChip() {
  return (
    <span className="flex-shrink-0 w-8 h-8 rounded-full border border-border bg-bg/60 flex items-center justify-center text-muted group-hover:text-fg group-hover:translate-x-1 transition-all duration-300">
      <ArrowRight className="w-4 h-4" />
    </span>
  );
}

function formatK(n: number): string {
  return n >= 1000 ? `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+` : String(n);
}
