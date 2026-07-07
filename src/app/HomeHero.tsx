"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Sparkles, Plus, Play, LayoutGrid, Building2, User, BadgeDollarSign } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import Lazy3D from "@/components/home/Lazy3D";

// The runnable editor pulls CodeMirror — keep it out of the critical path so
// the hero copy + CTAs paint first.
const HeroRunner = dynamic(() => import("@/components/home/HeroRunner"), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl border border-border bg-[#0d1117] h-[420px] animate-pulse flex items-center justify-center">
      <span className="text-xs font-mono text-slate-500">Loading sandbox…</span>
    </div>
  ),
});

export type HeroPersona = "candidate" | "recruiter";

/**
 * Persona is URL-driven: `/` renders the developer hero, `/hire` the
 * recruiter hero. The toggle is plain links — both pages are crawlable,
 * linkable, and ad-targetable. The previous localStorage gate (blank hero
 * until the visitor picked a side) is gone.
 */
export default function HomeHero({
  persona,
  sessionName,
  recentSnippet,
}: {
  persona: HeroPersona;
  sessionName?: string | null;
  snippetCount?: number;
  recentSnippet?: { slug: string; title: string; template: string } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const isRecruiter = persona === "recruiter";

  // Remember the visitor's last-used side so the header/login flows can
  // deep-link sensibly. Purely an enhancement — nothing renders off it.
  useEffect(() => {
    try {
      localStorage.setItem("ipad.persona", persona);
    } catch {
      /* private mode */
    }
  }, [persona]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.6, 0.2]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 bg-bg min-h-[80vh] flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:48px_48px]"
          style={{
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(${isRecruiter ? "99,102,241" : "var(--accent-rgb)"}, 0.06), transparent 40%)`,
          }}
        />
        <div
          className={`absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen ${
            isRecruiter ? "bg-indigo-500/10" : "bg-accent/10"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 w-full">
        {/* ── Persona toggle (links, not state) ── */}
        <div className="flex justify-center lg:justify-start mb-8">
          <nav
            aria-label="Choose your view"
            className="inline-flex items-center rounded-full border border-border bg-surface/60 backdrop-blur-md p-1 text-xs font-bold"
          >
            <Link
              href="/"
              aria-current={!isRecruiter ? "page" : undefined}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors ${
                !isRecruiter ? "bg-accent text-bg" : "text-muted hover:text-fg"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              For developers
            </Link>
            <Link
              href="/hire"
              aria-current={isRecruiter ? "page" : undefined}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors ${
                isRecruiter ? "bg-indigo-500 text-white" : "text-muted hover:text-fg"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              For hiring teams
            </Link>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* ── Copy column ── */}
          <div className="text-center lg:text-left space-y-7">
            <motion.div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black tracking-widest uppercase backdrop-blur-md ${
                isRecruiter
                  ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-400"
                  : "border-border bg-surface/50 text-muted"
              }`}
            >
              {isRecruiter ? (
                <>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Evaluate developers at scale</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Real code. Real sandbox. Right here.</span>
                </>
              )}
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-black tracking-tight text-fg leading-[1.05]"
              style={reducedMotion ? undefined : { y: titleY, opacity: titleOpacity }}
            >
              {isRecruiter ? (
                <>
                  See how candidates <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-indigo-600">
                    think, not just ship.
                  </span>
                </>
              ) : (
                <>
                  Practice, perform, and <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-soft">
                    land your next role.
                  </span>
                </>
              )}
            </motion.h1>

            <p className="text-muted text-lg md:text-xl leading-relaxed font-medium max-w-xl mx-auto lg:mx-0">
              {isRecruiter
                ? "Live coding interviews with replay, async take-homes with server-side grading, AI screening at batch scale, and integrity signals on every attempt — in one workspace."
                : "Hand-written interview question banks, runnable challenges in eight languages, and an AI-readiness track — practice in a real sandbox and turn it all into a shareable portfolio."}
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
              {isRecruiter ? (
                <>
                  <Link
                    href={sessionName ? "/dashboard" : "/login?next=/dashboard"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(99,102,241,0.25)] whitespace-nowrap"
                  >
                    <LayoutGrid className="w-5 h-5" />
                    {sessionName ? "Open your workspace" : "Create a workspace — free"}
                  </Link>
                  <Link
                    href="/pricing"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                  >
                    <BadgeDollarSign className="w-5 h-5 text-indigo-400" />
                    See pricing
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/challenges"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(var(--accent-rgb),0.25)] whitespace-nowrap"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Explore challenges
                  </Link>
                  {recentSnippet ? (
                    <Link
                      href={`/play/${recentSnippet.slug}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                    >
                      <LayoutGrid className="w-5 h-5 text-accent" />
                      Resume sandbox
                    </Link>
                  ) : (
                    <Link
                      href="/playgrounds"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                    >
                      <Plus className="w-5 h-5" />
                      Open a playground
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Visual column ── */}
          <div className="w-full">
            {isRecruiter ? (
              <div>
                <Lazy3D
                  scene="funnel"
                  className="h-[340px] md:h-[400px] w-full"
                  poster={<FunnelPoster />}
                />
                <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] font-mono uppercase tracking-wider text-muted/70">
                  <span>Applied</span>
                  <span>→ Screened</span>
                  <span>→ Take-home</span>
                  <span>→ Onsite</span>
                  <span>→ Offer</span>
                  <span className="text-emerald-500">→ Hired</span>
                </div>
              </div>
            ) : (
              <HeroRunner />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static funnel fallback for reduced-motion / small screens / while the 3D chunk loads. */
function FunnelPoster() {
  return (
    <div className="h-full w-full flex items-center justify-center" aria-hidden>
      <div className="flex items-center gap-3">
        {[64, 52, 42, 33, 26].map((size, i) => (
          <div
            key={i}
            className="rounded-full border-2 border-indigo-500/50 bg-indigo-500/5"
            style={{ width: size * 2, height: size * 2 }}
          />
        ))}
      </div>
    </div>
  );
}
