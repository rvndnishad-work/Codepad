import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  Map as MapIcon,
  MessagesSquare,
  Swords,
  Target,
} from "lucide-react";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import SectionHeading from "@/components/home/SectionHeading";

/**
 * "The prep arsenal" — the interview-prep universe, fed with real DB counts
 * (never invented numbers; blocks hide themselves when a feature has no
 * content yet).
 *
 * Structurally this is ONE ruled table, not five floating cards. Every block
 * shares outer edges with its neighbours and is divided by a single hairline,
 * so the section reads as a specification sheet — which is also why the
 * densities differ: the flagship gets air, the trailing row is compact. That
 * contrast in rhythm is the point.
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
  const shownTechs = topTechs.slice(0, 10);
  const moreTechs = Math.max(0, topTechs.length - shownTechs.length);

  const trailing: {
    href: string;
    icon: React.ReactNode;
    title: string;
    stat: string;
    statLabel: string;
    blurb: string;
  }[] = [];

  if (counts.challenges > 0) {
    trailing.push({
      href: "/challenges",
      icon: <Swords className="h-4 w-4" />,
      title: "Coding challenges",
      stat: String(counts.challenges),
      statLabel: "server-graded",
      blurb:
        "Real execution in 8 languages, hidden tests, instant verdicts — the take-home, before the take-home.",
    });
  }
  if (counts.promptScenarios > 0) {
    trailing.push({
      href: "/interview/prompt-practice",
      icon: <MessagesSquare className="h-4 w-4" />,
      title: "Prompt Arena",
      stat: String(counts.promptScenarios),
      statLabel: "scenarios",
      blurb:
        "Write prompts against real scenarios and get scored — the skill every AI-era JD quietly expects.",
    });
  }
  trailing.push({
    href: counts.journeys > 0 ? "/prep" : "/interview-questions",
    icon: <MapIcon className="h-4 w-4" />,
    title: "Prep journeys",
    stat: "Day-by-day",
    statLabel: "role-based plans",
    blurb:
      "Pick a target role — the plan sequences banks, challenges and scenarios into a phased track.",
  });

  const trailingCols =
    trailing.length === 1 ? "md:grid-cols-1" : trailing.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";

  return (
    <section className="relative border-b border-border py-20 md:py-28">
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionHeading
          index="02"
          eyebrow="The prep arsenal"
          eyebrowIcon={<Target className="h-3 w-3" />}
          title="Everything between you"
          highlight="and the offer."
          lede="Question banks, runnable challenges, AI-readiness training and company-specific prep — one account, zero setup."
        />

        <RevealOnScroll amount={0.12} stagger={0.08}>
          {/* ══ The flagship band — asymmetric 7/5 split inside one frame ══ */}
          {(counts.prepQuestions > 0 || counts.reviewChallenges > 0) && (
            <RevealItem>
              <div className="ip-frame ip-ticks grid grid-cols-1 lg:grid-cols-12">
                {counts.prepQuestions > 0 && (
                  <Link
                    href="/interview-questions"
                    className="group relative flex flex-col justify-between gap-8 p-7 md:p-9 lg:col-span-7"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="ip-label ip-label-accent">Question banks</span>
                        <span className="ip-rule w-8" aria-hidden />
                      </div>

                      {/* The number leads. It is the largest thing in the
                          section after the section title — a measurement,
                          set in the display voice with tabular figures. */}
                      <div className="mt-6 flex items-baseline gap-3">
                        <span className="ip-display ip-display-lg ip-nums text-fg">
                          {formatK(counts.prepQuestions)}
                        </span>
                        <span className="ip-label">
                          questions · {counts.techs.length} technologies
                        </span>
                      </div>

                      <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted">
                        Every answer hand-written — diagrams, comparison tables and runnable
                        examples, not a scraped paragraph with a code block bolted on.
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1.5">
                        {shownTechs.map((t) => (
                          <span key={t.technology} className="ip-chip">
                            {TECH_LABELS[t.technology] ?? t.technology}
                            <span className="text-subtle">{t.count}</span>
                          </span>
                        ))}
                        {moreTechs > 0 && (
                          <span className="ip-chip border-dashed">+{moreTechs}</span>
                        )}
                      </div>

                      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {counts.companies > 0 && (
                          <span className="flex items-center gap-2 text-[12px] text-subtle">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            Company-wise sets &amp; real interview experiences
                          </span>
                        )}
                        <span className="ip-link shrink-0 self-start text-[13px] sm:ml-auto">
                          Browse the bank
                          <ArrowRight className="ip-arrow h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )}

                {counts.reviewChallenges > 0 && (
                  <Link
                    href="/interview/ai-code-review"
                    className="group relative flex flex-col justify-between gap-8 border-t border-border bg-panel/40 p-7 md:p-9 lg:col-span-5 lg:border-l lg:border-t-0"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="ip-label ip-label-accent">New</span>
                        <span className="ip-label">AI-readiness</span>
                      </div>

                      <h3 className="ip-display ip-display-md mt-6 text-fg">
                        Review the AI&apos;s code.
                      </h3>

                      <p className="mt-4 text-[14px] leading-relaxed text-muted">
                        Plausible AI-generated answers with planted flaws — hallucinated APIs,
                        logic bugs, security holes. Find them all before shipping, or race the
                        clock in Hallucination Hunt.
                      </p>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="ip-display ip-display-md ip-nums text-fg">
                          {counts.reviewChallenges}
                        </div>
                        <div className="ip-label mt-1.5">challenges · JS TS PY SQL</div>
                      </div>
                      <Bot className="h-8 w-8 shrink-0 text-border-strong transition-colors group-hover:text-accent" />
                    </div>
                  </Link>
                )}
              </div>
            </RevealItem>
          )}

          {/* ══ Trailing row — compact, fused to the band above ══ */}
          <RevealItem>
            <div className={`ip-frame grid grid-cols-1 border-t-0 ${trailingCols}`}>
              {trailing.map((card, i) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`group flex flex-col gap-3 p-6 ${
                    i > 0 ? "border-t border-border md:border-l md:border-t-0" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-subtle transition-colors group-hover:text-accent">
                    {card.icon}
                    <span className="ip-label ip-label-fg">{card.title}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="ip-nums text-2xl font-bold tracking-tight text-fg">
                      {card.stat}
                    </span>
                    <span className="ip-label">{card.statLabel}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-muted">{card.blurb}</p>
                </Link>
              ))}
            </div>
          </RevealItem>
        </RevealOnScroll>

        {/* A single closing line, set as a footnote rather than a banner. */}
        <RevealOnScroll delay={0.1}>
          <p className="mt-6 text-[12.5px] text-subtle">
            New here?{" "}
            <Link href="/prep" className="ip-link text-[12.5px]">
              Take the AI-Ready journey
            </Link>{" "}
            — question bank, prompt drills and code-review challenges in one track.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function formatK(n: number): string {
  return n >= 1000 ? `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+` : String(n);
}
