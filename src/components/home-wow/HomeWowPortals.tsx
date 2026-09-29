import Link from "next/link";
import { ArrowUpRight, BookOpenText, Code2, Bot, Briefcase, type LucideIcon } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";
import RevealLines from "@/components/wow/RevealLines";
import CountUp from "@/components/wow/CountUp";

export type PortalCounts = {
  prepQuestions: number;
  techCount: number;
  companies: number;
  reviewChallenges: number;
  promptScenarios: number;
  challenges: number;
  journeys: number;
};

/** A technology the question bank covers, linked to its filtered list. */
export type TechLink = { slug: string; label: string; count: number };

function formatK(n: number): string {
  return n >= 1000 ? `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+` : String(n);
}

type Portal = {
  key: string;
  icon: LucideIcon;
  title: string;
  copy: string;
  /** One number per card; the hiring card has none. */
  stat?: { value: string; label: string };
  href: string;
  cta: string;
  /** Channel var of the card accent, e.g. "--c-accent"; see tone(). */
  accent: string;
};

/** A token colour from its channel var, optionally with alpha. */
function tone(channel: string, alpha?: number): string {
  return alpha === undefined ? `rgb(var(${channel}))` : `rgb(var(${channel}) / ${alpha})`;
}

/**
 * What you can do here: one card per product area, every number from the
 * DB. Cards with no content hide themselves; the hiring card always shows
 * because it is a doorway, not a catalogue.
 */
export default function HomeWowPortals({ counts, techs = [] }: { counts: PortalCounts; techs?: TechLink[] }) {
  const portals: Portal[] = [];

  if (counts.prepQuestions > 0) {
    portals.push({
      key: "bank",
      icon: BookOpenText,
      title: "Interview questions",
      copy: `Detailed, hand-written answers with diagrams, runnable code and the follow-ups interviewers ask next.${counts.companies > 0 ? ` Plus question sets from ${counts.companies} companies.` : ""}`,
      stat: {
        value: formatK(counts.prepQuestions),
        label: counts.techCount > 1 ? `questions across ${counts.techCount} technologies` : "questions",
      },
      href: "/interview-questions",
      cta: "Browse questions",
      accent: "--c-accent-2-soft",
    });
  }
  if (counts.challenges > 0) {
    portals.push({
      key: "arena",
      icon: Code2,
      title: "Coding challenges",
      copy: "Solve real problems in 8 languages against hidden test suites, and get a verdict in seconds, just like an online assessment.",
      stat: { value: String(counts.challenges), label: counts.challenges === 1 ? "graded challenge" : "graded challenges" },
      href: "/challenges",
      cta: "Start a challenge",
      accent: "--c-accent-2-soft",
    });
  }
  if (counts.reviewChallenges > 0 || counts.promptScenarios > 0) {
    const stat =
      counts.reviewChallenges > 0
        ? { value: String(counts.reviewChallenges), label: counts.reviewChallenges === 1 ? "code review exercise" : "code review exercises" }
        : { value: String(counts.promptScenarios), label: counts.promptScenarios === 1 ? "prompt scenario" : "prompt scenarios" };
    portals.push({
      key: "ai",
      icon: Bot,
      title: "AI code review",
      copy: "Review AI-written pull requests, find the bugs planted in them and sharpen your prompting with live scoring. It is the skill teams now screen for.",
      stat,
      href: "/interview/ai-code-review",
      cta: "Try a review",
      accent: "--c-accent-2-soft",
    });
  }
  portals.push({
    key: "hire",
    icon: Briefcase,
    title: "For hiring teams",
    copy: "Run live coding interviews and take-home assessments, then review the full replay with integrity signals before you decide.",
    href: "/hire",
    cta: "See hiring tools",
    accent: "--c-accent-2-soft",
  });

  return (
    <section className="relative bg-surface px-4 py-24 text-fg transition-colors md:py-32">
      <div className="mx-auto max-w-7xl">
        <WowReveal>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-subtle">the platform</p>
          <RevealLines className="wow-font-display mt-3 text-4xl md:text-5xl lg:text-6xl" lines={[<span key="l0">Four ways to get ready.</span>, <span key="l1" className="wow-gradient-text">None of them passive.</span>]} />
        </WowReveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {portals.map((p, i) => {
            // An odd card out spans the row rather than leaving a hole.
            const wide = portals.length % 2 === 1 && i === portals.length - 1;
            return (
              <WowReveal key={p.key} className={wide ? "md:col-span-2" : undefined}>
                <Link
                  href={p.href}
                  data-spotlight
                  className="wow-card-glow group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-panel p-7 md:p-8"
                >
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 transition group-hover:opacity-100" style={{ background: `radial-gradient(520px circle at 100% 0%, ${tone(p.accent, 0.07)}, transparent 60%)` }} />
                  <div className="relative flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border" style={{ borderColor: tone(p.accent, 0.4), background: tone(p.accent, 0.1), color: tone(p.accent) }}>
                      <p.icon className="h-6 w-6" aria-hidden />
                    </span>
                    {p.stat && (
                      <p className="text-right">
                        <CountUp value={p.stat.value} className="wow-font-display block text-4xl tabular-nums text-fg" />
                        <span className="mt-1 block text-[13px] text-subtle">{p.stat.label}</span>
                      </p>
                    )}
                  </div>
                  <h3 className="relative text-2xl font-semibold tracking-[-0.03em] md:text-3xl">{p.title}</h3>
                  <p className="relative max-w-md text-[15px] leading-relaxed text-muted">{p.copy}</p>
                  <span className="relative mt-auto inline-flex w-fit items-center gap-2 pt-2 text-sm font-medium text-fg transition group-hover:gap-3">
                    {p.cta} <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </WowReveal>
            );
          })}
        </div>

        {techs.length > 0 && (
          <WowReveal delay={0.05}>
            <div className="mt-10">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-subtle">Questions by technology</p>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {techs.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/interview-questions/${t.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2 text-[13px] font-semibold transition hover:border-accent hover:text-accent"
                    >
                      {t.label}
                      <span className="font-mono text-xs tabular-nums text-subtle">{t.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </WowReveal>
        )}

        <WowReveal delay={0.1}>
          <p className="mt-8 text-[13px] text-subtle">
            New here?{" "}
            <Link href="/prep" className="font-semibold text-fg underline decoration-secondary decoration-2 underline-offset-4">
              Take the AI-Ready journey
            </Link>{" "}
            — question bank, prompt drills and code-review challenges in one track.
          </p>
        </WowReveal>
      </div>
    </section>
  );
}
