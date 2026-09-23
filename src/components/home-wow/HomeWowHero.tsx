"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ArrowRight, Play, Sparkles, Trophy, Zap } from "lucide-react";
import { prefersReducedMotion } from "@/components/wow/motion";
import CountUp from "@/components/wow/CountUp";

const CodeVerse3D = dynamic(() => import("@/components/wow/CodeVerse3D"), { ssr: false });

export type HeroStats = {
  questions: number;
  challenges: number;
  sessions: number;
};

const PHOTOS = [
  { src: "/images/wow/code-dark.jpg", label: "2:14 AM, every test green", rot: "-6deg", pos: "left-[2%] top-[16%]" },
  { src: "/images/wow/pair-programming.jpg", label: "Pair on real problems", rot: "5deg", pos: "right-[3%] top-[12%]" },
  { src: "/images/wow/hackathon.jpg", label: "Ship it, then defend it", rot: "-4deg", pos: "right-[6%] bottom-[18%]" },
  { src: "/images/wow/reviewer.jpg", label: "Review AI code line by line", rot: "6deg", pos: "left-[4%] bottom-[14%]" },
];

function useTypewriter(words: string[]) {
  const [text, setText] = useState("");
  useEffect(() => {
    let w = 0, c = 0, del = false, t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = words[w];
      c += del ? -1 : 1;
      setText(word.slice(0, c));
      let d = del ? 28 : 55 + Math.random() * 60;
      if (!del && c === word.length) { d = 1400; del = true; }
      if (del && c === 0) { del = false; w = (w + 1) % words.length; d = 350; }
      t = setTimeout(tick, d);
    };
    t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  }, [words.join("|")]);
  return text;
}

function formatK(n: number): string {
  return n >= 1000 ? `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+` : String(n);
}

/**
 * Cinematic hero — intentionally dark in both themes. Live DB numbers feed
 * the stat strip; everything else is the WOW universe.
 */
export default function HomeWowHero({
  stats,
  userName,
  recentSnippet,
}: {
  stats: HeroStats;
  userName?: string | null;
  recentSnippet?: { slug: string; title: string } | null;
}) {
  const root = useRef<HTMLElement>(null);
  const statTiles = [
    { n: stats.questions, v: formatK(stats.questions), l: "Hand-written interview questions" },
    { n: stats.challenges, v: String(stats.challenges), l: "Challenges with hidden tests" },
    { n: stats.sessions, v: formatK(stats.sessions), l: "Interview sessions run" },
  ].filter((s) => s.n > 0);
  const typed = useTypewriter(["solve('lru-cache')", "review(aiPR).findBugs()", "run --tests=hidden", "mock.start('system-design')"]);
  // Offscreen → loop paused (long-session lag fix). Scrolling → loop frozen:
  // a live canvas competing with the scroll compositor is what drops frames
  // on laptop iGPUs. The GSAP parallax is compositor-only, so the frozen
  // frame keeps gliding and the loop resumes after the scroll settles.
  const [paused, setPaused] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setPaused(true);
    } else {
      const el = root.current;
      if (!el) return;
      const obs = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting), { threshold: 0.02 });
      obs.observe(el);
      let t: ReturnType<typeof setTimeout>;
      const onScroll = () => {
        setScrolling(true);
        clearTimeout(t);
        t = setTimeout(() => setScrolling(false), 160);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        obs.disconnect();
        window.removeEventListener("scroll", onScroll);
        clearTimeout(t);
      };
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".wow-hero-line", { yPercent: 110, duration: 1.1, stagger: 0.12 })
        .from(".wow-hero-fade", { y: 26, opacity: 0, duration: 0.9, stagger: 0.1 }, "-=0.6")
        .from(".wow-hero-photo", { scale: 0, rotation: 20, opacity: 0, duration: 1, ease: "back.out(1.6)", stagger: 0.12 }, "-=0.7")
        .from(".wow-hero-terminal", { y: 60, opacity: 0, duration: 1 }, "-=0.6");
      gsap.to(".wow-hero-3d", {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-bg text-fg">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-24 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-secondary/10 blur-[140px]" />
        <div className="absolute right-[-160px] top-1/3 h-[420px] w-[420px] rounded-full bg-accent-4/[0.07] blur-[120px]" />
        <div className="absolute left-[-140px] top-1/2 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="wow-grid-bg absolute inset-0" />
      </div>

      <div className="wow-hero-3d absolute inset-0 transform-gpu opacity-90 will-change-transform">
        <CodeVerse3D paused={paused || scrolling} />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_62%_52%_at_50%_44%,rgb(var(--c-bg)/0.88),transparent_72%)]" />

      {PHOTOS.map((p) => (
        <figure key={p.src} className={`wow-hero-photo wow-float absolute z-10 hidden w-52 lg:block ${p.pos}`} style={{ ["--wow-rot" as string]: p.rot }}>
          <div className="rotate-[var(--wow-rot)] overflow-hidden rounded-2xl border border-fg/25 bg-fg/10 p-2 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt="" className="h-32 w-full rounded-xl object-cover" loading="eager" />
            <figcaption className="px-1 py-2 text-[13px] font-medium leading-snug text-fg/80">{p.label}</figcaption>
          </div>
        </figure>
      ))}

      <div className="relative z-20 mx-auto flex min-h-[100vh] max-w-7xl flex-col items-center px-4 pb-16 pt-24 text-center md:pt-32">
        <div className="wow-hero-fade flex flex-wrap items-center justify-center gap-3">
          {/* persona switch — developers here, hiring teams one tap away */}
          <nav aria-label="Choose your view" className="flex items-center rounded-full border border-fg/15 bg-fg/[0.06] p-1 font-mono text-xs uppercase tracking-[0.12em] backdrop-blur-md">
            <span aria-current="page" className="rounded-full bg-accent px-4 py-1.5 font-bold text-accent-ink">Developers</span>
            <Link href="/hire" className="rounded-full px-4 py-1.5 text-fg/60 transition hover:text-fg">Hiring teams →</Link>
          </nav>

          <div className="flex items-center gap-2 rounded-full border border-fg/15 bg-fg/[0.06] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-fg/80 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {userName ? `Welcome back, ${userName.split(" ")[0]}. Pick up where you left off` : "Practise on the tools hiring teams use"}
            <span className="rounded-full bg-accent px-2 py-0.5 font-bold text-accent-ink">live</span>
          </div>
        </div>

        <h1 className="wow-font-display mt-8 text-[15vw] leading-[0.88] drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] sm:text-[11vw] lg:text-[7.5rem]">
          <span className="block overflow-hidden pb-1"><span className="wow-hero-line block">Don&apos;t learn</span></span>
          <span className="block overflow-hidden pb-1"><span className="wow-hero-line wow-gradient-text block pb-2">to interview.</span></span>
          <span className="block overflow-hidden pb-2"><span className="wow-hero-line wow-text-stroke block">Live inside it.</span></span>
        </h1>

        <p className="wow-hero-fade mt-6 max-w-2xl text-balance text-base font-medium leading-relaxed text-fg/85 [text-shadow:0_2px_18px_rgba(0,0,0,0.9)] md:text-lg">
          Solve problems in a real editor against hidden tests, sit AI mock interviews that ask the
          follow-up, and build a replay portfolio that shows recruiters how you actually work.
        </p>

        <div className="wow-hero-terminal mt-8 w-full max-w-xl overflow-hidden rounded-2xl border border-fg/15 bg-surface/95 text-left shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-1.5 border-b border-fg/10 bg-fg/[0.04] px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="ml-2 font-mono text-xs text-fg/60">codepad — zsh</span>
            <span className="ml-auto flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-success"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />live</span>
          </div>
          <div className="px-4 py-4 font-mono text-sm md:text-[15px]">
            <span className="text-success">➜</span> <span className="text-secondary-soft">~</span> <span className="text-fg">{typed}</span><span className="wow-blink ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-accent" />
            <div className="mt-2 text-fg/70">
              ✓ {formatK(stats.questions)} questions indexed · {stats.challenges > 0 ? `${stats.challenges} challenges ready` : "8 languages online"} · <span className="font-bold text-accent">you&apos;re up</span>
            </div>
          </div>
        </div>

        <div className="wow-hero-fade mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/challenges" className="group flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-accent-ink shadow-[0_10px_30px_-14px_rgb(var(--c-accent)/0.7)] transition hover:scale-[1.02]">
            <Play className="h-4 w-4 fill-accent-ink" /> Start practising free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href={recentSnippet ? `/play/${recentSnippet.slug}` : "/playgrounds"}
            className="flex items-center gap-2 rounded-full border border-fg/20 bg-fg/[0.06] px-8 py-4 text-sm font-semibold text-fg backdrop-blur-md transition hover:border-fg/40 hover:scale-[1.02]"
          >
            <Trophy className="h-4 w-4 text-fg/60" /> {recentSnippet ? "Resume sandbox" : "Open a playground"}
          </Link>
        </div>

        <Link href="/hire" className="wow-hero-fade group mt-5 inline-flex items-center gap-2 rounded-full border border-fg/20 bg-fg/[0.06] px-6 py-3 font-mono text-xs uppercase tracking-[0.12em] text-fg/80 backdrop-blur-md transition hover:border-fg/40 hover:text-fg">
          Hiring? Interviewpad for teams
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>

        {/* live stat strip — every number from the DB; zero-count tiles are
            dropped, same honesty rule as the portals */}
        {statTiles.length > 0 && (
          <div
            className="wow-hero-fade mt-10 grid w-full max-w-2xl gap-px overflow-hidden rounded-2xl border border-fg/12 bg-fg/10"
            style={{ gridTemplateColumns: `repeat(${statTiles.length}, minmax(0, 1fr))` }}
          >
            {statTiles.map((s) => (
              <div key={s.l} className="bg-surface/95 px-4 py-4">
                <p className="wow-font-display text-2xl tabular-nums md:text-3xl"><CountUp value={s.v} /></p>
                <p className="mt-1 text-[13px] leading-snug text-subtle">{s.l}</p>
              </div>
            ))}
          </div>
        )}

        <div className="wow-hero-fade mt-6 flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] text-fg/55">
          <Zap className="h-3.5 w-3.5 text-accent" /> Runs in your browser · No credit card · Free to start
        </div>
      </div>
    </section>
  );
}
