"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AudioWaveform, ChevronLeft, ChevronRight, Eye, Heart, Radar } from "lucide-react";
import CountUp from "@/components/scroll/CountUp";
import GlobalSearch from "../GlobalSearch";

gsap.registerPlugin(ScrollTrigger);

const SunScene3D = dynamic(() => import("./SunScene3D"), { ssr: false });

export type FeaturedQuestion = {
  title: string;
  slug: string;
  difficulty: string;
  technology: string | null;
  views: number;
  likes: number;
  company: { name: string; slug: string } | null;
};

const BANDS: { id: "all" | "easy" | "medium" | "hard"; label: string; dot: string }[] = [
  { id: "all", label: "All bands", dot: "#ffb64d" },
  { id: "easy", label: "Easy", dot: "#34d399" },
  { id: "medium", label: "Medium", dot: "#fbbf24" },
  { id: "hard", label: "Hard", dot: "#fb7185" },
];

/**
 * SOL DECK — a synthwave half-sun rising on the left over a horizon grid,
 * copy commanding the right. The difficulty tuner retunes the sun's corona
 * + embers and filters the decoder feed. The decoder is MANUAL (dots +
 * arrows) — no autoplay.
 */
export default function QuestionVerseHero({
  total,
  stacks,
  companies,
  featured,
}: {
  total: number;
  stacks: number;
  companies: number;
  featured: FeaturedQuestion[];
}) {
  const root = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [band, setBand] = useState<(typeof BANDS)[number]["id"]>("all");
  const [feedIdx, setFeedIdx] = useState(0);

  const feed = useMemo(() => {
    const pool = band === "all" ? featured : featured.filter((f) => f.difficulty === band);
    return (pool.length > 0 ? pool : featured).slice(0, 6);
  }, [band, featured]);

  useEffect(() => setFeedIdx(0), [band]);

  useEffect(() => {
    if (reduceMotion) {
      setPaused(true);
      return;
    }
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
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".qv2-line", { yPercent: 115, duration: 1.05, stagger: 0.11 })
        .from(".qv2-fade", { y: 24, opacity: 0, duration: 0.85, stagger: 0.08 }, "-=0.6")
        .from(".qv2-scene", { opacity: 0, scale: 1.04, duration: 1.4 }, "-=0.9")
        .from(".qv2-hud", { opacity: 0, duration: 0.6, stagger: 0.06 }, "-=0.8");
      gsap.to(".qv2-bg", {
        yPercent: 10, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, [reduceMotion]);

  const current = feed.length > 0 ? feed[feedIdx % feed.length] : null;
  const activeDot = BANDS.find((b) => b.id === band)?.dot ?? "#ffb64d";
  const step = (dir: 1 | -1) => {
    if (feed.length === 0) return;
    setFeedIdx((i) => (i + dir + feed.length) % feed.length);
  };

  return (
    <section ref={root} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-[#07070e] text-white">
      {/* sun backdrop — half sun low on the left */}
      <div aria-hidden className="qv2-bg pointer-events-none absolute inset-0">
        <div className="qv2-scene absolute inset-0">
          <SunScene3D paused={paused || scrolling} accent={activeDot} />
        </div>
      </div>
      {/* readability veils: text lives right, fade at the bottom */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#07070e]/90 via-[#07070e]/35 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07070e]/40 via-transparent to-[#07070e]" />

      {/* HUD frame */}
      <div aria-hidden className="pointer-events-none absolute inset-4 z-20 hidden sm:block">
        <span className="qv2-hud absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#ffb64d]/60" />
        <span className="qv2-hud absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[#ffb64d]/60" />
        <span className="qv2-hud absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[#ffb64d]/60" />
        <span className="qv2-hud absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#ffb64d]/60" />
        <span className="qv2-hud absolute left-10 top-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          SOL // east horizon
        </span>
        <span className="qv2-hud absolute right-10 top-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          BAND // {band.toUpperCase()}
        </span>
      </div>

      <div className="relative z-20 mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-24 md:pt-32 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        {/* left cell breathes over the sun */}
        <div className="hidden lg:block" />

        {/* ── Right: command column ── */}
        <div>
          <p className="qv2-fade inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
            <AudioWaveform className="h-3.5 w-3.5 text-[#ffb64d]" />
            Interrogation archive v2.0
          </p>

          <h1 className="wow-font-display mt-6 text-[13vw] leading-[0.92] drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] sm:text-7xl lg:text-[5.2rem]">
            <span className="block overflow-hidden pb-1"><span className="qv2-line block">EVERY ROOM</span></span>
            <span className="block overflow-hidden pb-1"><span className="qv2-line wow-gradient-text block pb-2">LEAKS ITS</span></span>
            <span className="block overflow-hidden pb-2"><span className="qv2-line wow-text-stroke block">QUESTIONS.</span></span>
          </h1>

          <p className="qv2-fade mt-5 max-w-xl text-balance text-[15px] font-medium leading-relaxed text-white/70 md:text-base">
            <strong className="font-extrabold text-white"><CountUp value={total} /></strong> intercepted
            transmissions · <strong className="font-extrabold text-white">{stacks} stacks</strong> ·{" "}
            <strong className="font-extrabold text-white">{companies} companies</strong>. Tune a
            frequency, watch the sun respond, decode before tip-off.
          </p>

          {/* Frequency tuner — retunes the corona + embers AND the decoder feed */}
          <div className="qv2-fade mt-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Tune frequency // difficulty</p>
            <div className="mt-2.5 flex flex-wrap gap-2" role="tablist" aria-label="Difficulty frequency">
              {BANDS.map((b) => (
                <button
                  key={b.id}
                  role="tab"
                  aria-selected={band === b.id}
                  onClick={() => setBand(b.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-all duration-300 ${
                    band === b.id
                      ? "bg-white font-bold text-black shadow-[0_0_28px_-8px_rgba(255,255,255,0.7)]"
                      : "border border-white/15 bg-white/[0.06] text-white/60 backdrop-blur hover:border-white/35 hover:text-white"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: b.dot, boxShadow: `0 0 8px 1px ${b.dot}` }} />
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="qv2-fade mt-7 max-w-xl">
            <GlobalSearch variant="hero" />
          </div>
        </div>
      </div>

      {/* ── Bottom: decoder strip (MANUAL — dots + arrows, no autoplay) ── */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 pb-16">
        <div className="qv2-fade overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a12]/80 backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
            <Radar className="h-3.5 w-3.5" style={{ color: activeDot }} />
            Decoder // {band === "all" ? "all bands" : `${band} frequency`}
            <span className="ml-auto flex items-center gap-2">
              <button onClick={() => step(-1)} aria-label="Previous transmission" className="grid h-6 w-6 place-items-center rounded-full border border-white/15 text-white/60 transition hover:border-white/40 hover:text-white">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="flex items-center gap-1.5">
                {feed.slice(0, 6).map((f, i) => (
                  <button
                    key={f.slug}
                    onClick={() => setFeedIdx(i)}
                    aria-label={`Show ${f.title}`}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === feedIdx % feed.length ? "w-6 bg-[#ffb64d]" : "w-2 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </span>
              <button onClick={() => step(1)} aria-label="Next transmission" className="grid h-6 w-6 place-items-center rounded-full border border-white/15 text-white/60 transition hover:border-white/40 hover:text-white">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
          <div className="min-h-[86px] px-4 py-3">
            {current ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.slug}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="shrink-0 font-mono text-[11px] text-[#ffb64d]">$ iq intercept</span>
                  <Link
                    href={`/interview-question/${current.slug}`}
                    className="group min-w-0 flex-1 truncate font-extrabold text-white transition-colors hover:text-[#ffe600]"
                    title={current.title}
                  >
                    {current.title}
                    <ChevronRight className="ml-1 inline h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                  <span className="flex shrink-0 items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-white/50">
                    {current.company && <span className="text-white/80">{current.company.name}</span>}
                    <span style={{ color: activeDot }}>{current.difficulty}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{current.views.toLocaleString()}</span>
                    <span className="hidden items-center gap-1 sm:inline-flex"><Heart className="h-3 w-3" />{current.likes.toLocaleString()}</span>
                  </span>
                </motion.div>
              </AnimatePresence>
            ) : (
              <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-white/40">
                No transmissions archived yet — be the first signal.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
