"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lottie, type LottieHandle } from "lottie-react";
import { ArrowUpRight } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

export type PortalCounts = {
  prepQuestions: number;
  techCount: number;
  companies: number;
  reviewChallenges: number;
  promptScenarios: number;
  challenges: number;
  journeys: number;
};

const LOTTIES: Record<string, string> = {
  bank: "https://assets1.lottiefiles.com/packages/lf20_w51pcehl.json",
  arena: "https://assets9.lottiefiles.com/packages/lf20_jtbfg2nb.json",
  ai: "https://assets2.lottiefiles.com/packages/lf20_3rwasyjy.json",
  hire: "https://assets1.lottiefiles.com/packages/lf20_kq5rGs.json",
};

function LottieBox({ src, className }: { src: string; className?: string }) {
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<LottieHandle>(null);
  useEffect(() => {
    let live = true;
    fetch(src).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => live && setData(j)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [src]);
  // Play only while visible: the WCAG 2.2.2 warning fires on autoplay, and
  // offscreen players are pure CPU cost. Respects reduced motion too.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !data) return;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) handleRef.current?.play();
        else handleRef.current?.pause();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data]);
  if (failed || data === null) {
    return (
      <div className={`grid place-items-center overflow-hidden ${className ?? ""}`}>
        <svg viewBox="0 0 200 200" className="wow-spin-slow h-full w-full opacity-80">
          <circle cx="100" cy="100" r="70" fill="none" stroke="#8b93ff" strokeWidth="2" strokeDasharray="10 8" />
          <circle cx="100" cy="100" r="46" fill="none" stroke="#ff2fb3" strokeWidth="2" strokeDasharray="6 10" />
          <text x="100" y="112" textAnchor="middle" fontSize="44" fontWeight="900" fill="currentColor">{"</>"}</text>
        </svg>
      </div>
    );
  }
  return (
    <div ref={wrapRef} className={className} aria-hidden>
      <Lottie src={data} loop autoplay={false} lottieRef={handleRef} className="h-full w-full" />
    </div>
  );
}

function formatK(n: number): string {
  return n >= 1000 ? `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+` : String(n);
}

type Portal = {
  key: string;
  tag: string;
  title: string;
  copy: string;
  stat: string;
  statLabel: string;
  img: string;
  href: string;
  cta: string;
  accent: string;
  span: string;
};

/**
 * Four worlds, every number from the DB. Cards with no content hide
 * themselves (same honesty rule as the old arsenal) — except Hiring Realm,
 * which is a doorway, not a catalogue.
 */
export default function HomeWowPortals({ counts }: { counts: PortalCounts }) {
  const portals: Portal[] = [];

  if (counts.prepQuestions > 0) {
    portals.push({
      key: "bank",
      tag: "LVL 01 — grind",
      title: "Question Vault",
      copy: `Hand-written answers with diagrams and runnable examples — not scraped paragraphs.${counts.companies > 0 ? ` Plus company-wise sets from ${counts.companies} companies.` : ""}`,
      stat: formatK(counts.prepQuestions),
      statLabel: `questions · ${counts.techCount} techs`,
      img: "/images/wow/code-editor.jpg",
      href: "/interview-questions",
      cta: "Enter the vault",
      accent: "#ffe600",
      span: "md:col-span-7",
    });
  }
  if (counts.challenges > 0) {
    portals.push({
      key: "arena",
      tag: "LVL 02 — fight",
      title: "Code Arena",
      copy: "Real execution in 8 languages. Hidden tests. Instant verdict. Crowd goes wild.",
      stat: String(counts.challenges),
      statLabel: "server-graded fights",
      img: "/images/wow/code-dark.jpg",
      href: "/challenges",
      cta: "Fight now",
      accent: "#ff2fb3",
      span: "md:col-span-5",
    });
  }
  if (counts.reviewChallenges > 0 || counts.promptScenarios > 0) {
    const bits: string[] = [];
    if (counts.reviewChallenges > 0) bits.push(`${counts.reviewChallenges} review fights`);
    if (counts.promptScenarios > 0) bits.push(`${counts.promptScenarios} prompt scenarios`);
    portals.push({
      key: "ai",
      tag: "LVL 03 — spar",
      title: "AI Dojo",
      copy: "Review hallucinated PRs, hunt planted bugs, duel prompt scenarios scored live.",
      stat: bits.join(" + ") || "AI-readiness",
      statLabel: "the skill every JD expects",
      img: "/images/wow/whiteboard.jpg",
      href: "/interview/ai-code-review",
      cta: "Spar the AI",
      accent: "#22d3ee",
      span: "md:col-span-5",
    });
  }
  portals.push({
    key: "hire",
    tag: "BOSS MODE",
    title: "Hiring Realm",
    copy: "Live interviews, async take-homes, replay timelines + integrity radar. Ship offers.",
    stat: counts.journeys > 0 ? "Day-by-day" : "Evidence",
    statLabel: counts.journeys > 0 ? "role-based prep plans" : "over vibes, always",
    img: "/images/wow/pair-programming.jpg",
    href: "/hire",
    cta: "Open realm",
    accent: "#8b93ff",
    span: portals.length % 2 === 0 ? "md:col-span-7" : "md:col-span-5",
  });

  return (
    <section className="relative bg-[var(--wow-bg)] px-4 py-24 text-[var(--wow-fg)] transition-colors md:py-32">
      <div className="mx-auto max-w-7xl">
        <WowReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8b93ff]">✦ choose your dimension</p>
          <h2 className="wow-font-display mt-3 text-5xl md:text-7xl">FOUR WORLDS.<br /><span className="wow-gradient-text">ZERO TUTORIAL HELL.</span></h2>
        </WowReveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-12">
          {portals.map((p) => (
            <WowReveal key={p.key} className={p.span}>
              <Link
                href={p.href}
                className="wow-card-glow group relative block overflow-hidden rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 transition duration-700 group-hover:scale-105 group-hover:opacity-55 dark:opacity-45 dark:group-hover:opacity-60" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
                <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" style={{ background: `radial-gradient(600px circle at 70% 20%, ${p.accent}33, transparent 65%)` }} />
                <div className="relative flex min-h-[340px] flex-col justify-end gap-3 p-7 md:min-h-[380px] md:p-9">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full border border-[var(--wow-card-border)] bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur" style={{ borderColor: `${p.accent}66` }}>
                      <span style={{ color: p.accent }}>{p.tag}</span>
                    </span>
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-black/45 text-white backdrop-blur-sm md:h-28 md:w-28">
                      <LottieBox src={LOTTIES[p.key]} className="h-full w-full" />
                    </div>
                  </div>
                  <h3 className="wow-font-display text-4xl text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] md:text-5xl">{p.title}</h3>
                  <p className="max-w-md text-sm font-medium leading-relaxed text-white/85 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">{p.copy}</p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/80 [text-shadow:0_1px_10px_rgba(0,0,0,0.9)]">
                    <span className="wow-font-display text-2xl normal-case tracking-normal" style={{ color: p.accent }}>{p.stat}</span>
                    {"  "}{p.statLabel}
                  </p>
                  <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition group-hover:gap-3" style={{ background: p.accent }}>
                    {p.cta} <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </WowReveal>
          ))}
        </div>

        <WowReveal delay={0.1}>
          <p className="mt-6 text-[13px] text-[var(--wow-faint)]">
            New here?{" "}
            <Link href="/prep" className="font-semibold text-[var(--wow-fg)] underline decoration-[#8b93ff] decoration-2 underline-offset-4">
              Take the AI-Ready journey
            </Link>{" "}
            — question bank, prompt drills and code-review challenges in one track.
          </p>
        </WowReveal>
      </div>
    </section>
  );
}
