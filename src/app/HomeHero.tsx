"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Plus, Play, LayoutGrid, ChevronRight, Building2 } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

export default function HomeHero({ 
  sessionName, 
  snippetCount,
  recentSnippet 
}: { 
  sessionName?: string | null;
  snippetCount: number;
  recentSnippet?: { slug: string; title: string; template: string } | null;
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Scroll-linked parallax: the hero anchors at the top of the page and we
  // measure progress as the section travels from "filling the viewport" to
  // "fully scrolled past the top". Title moves least (it's the anchor),
  // eyebrow and CTAs move more — a subtle 3-layer depth effect.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.6, 0.2]);
  const fastY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const fastOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.4, 0]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-32"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Premium Background Setup ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {/* Theme-aware base */}
        <div className="absolute inset-0 bg-bg" />
        
        {/* Subtle non-moving structural grid fading out at the edges */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.03)_1px,transparent_1px)] bg-[size:48px_48px]" 
          style={{ 
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)", 
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)" 
          }}
        />

        {/* Cursor-following "Spotlight" */}
        <div 
          className="absolute inset-0 transition-opacity duration-1000 opacity-0 group-hover:opacity-100"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--accent-rgb), 0.08), transparent 40%)`,
          }}
        />

        {/* Central glowing orb for depth */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-accent/15 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>
      
      {/* ── Hero Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
        {/* Badge — eyebrow rushes past fastest as you scroll out.
            Reveal timings: tightened from 1000ms/500ms-delay cascade (1.5s)
            down to 500ms duration with 80ms staggers (~740ms) so the hero
            feels present immediately instead of slowly drifting in. */}
        <motion.div
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-2 text-xs font-black text-muted mb-8 tracking-widest uppercase backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Interviewpad Pro & B2B Recruitment Suite</span>
        </motion.div>

        {/* Main Headline — anchor layer, moves least */}
        <motion.h1
          className="text-5xl md:text-7xl font-black tracking-tight text-fg mb-6 leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-500 delay-[80ms]"
          style={reducedMotion ? undefined : { y: titleY, opacity: titleOpacity }}
        >
          Evaluate developers <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-soft">at scale.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-muted text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-500 delay-[160ms] font-medium"
          style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
        >
          The most powerful collaborative sandbox for developers and technical recruiters.
          Host live multiplayer coding panels, execute secure take-home assessments, and review timeline replays with AI proctoring telemetry.
        </motion.p>

        {/* Call to Actions */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-500 delay-[240ms]"
          style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
        >
          {recentSnippet ? (
            <Link
              href={`/play/${recentSnippet.slug}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(var(--accent-rgb),0.25)]"
            >
              <Play className="w-5 h-5 fill-current" />
              Sandbox Playground
            </Link>
          ) : (
            <Link
              href="/playgrounds"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(var(--accent-rgb),0.25)]"
            >
              <Plus className="w-5 h-5" />
              Open Playground
            </Link>
          )}

          <Link
            href="/features"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Building2 className="w-5 h-5 text-accent" />
            Recruiter Platform
          </Link>
          
          <Link
            href={sessionName ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-surface/40 hover:bg-surface text-fg border border-border transition-all font-semibold"
          >
            {sessionName ? (
              <>
                <LayoutGrid className="w-5 h-5" />
                Dashboard
              </>
            ) : (
              <>
                <ChevronRight className="w-5 h-5" />
                Sign In
              </>
            )}
          </Link>
        </motion.div>
      </div>

      {/* ── Localized Grid "Halo" ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute inset-0 [perspective:1000px]"
          style={{ 
            maskImage: "radial-gradient(ellipse 60% 50% at 50% 45%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 45%, black 0%, transparent 70%)"
          }}
        >
          {/* Moving perspective grid */}
          <div className="absolute inset-0 [transform:rotateX(35deg)] origin-center">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.25] animate-grid-move" />
            <div 
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(var(--accent-rgb),0.3)_1px,transparent_1px)] bg-[size:100%_60px] animate-grid-move" 
              style={{
                background: isHovered 
                  ? `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--accent-rgb), 0.15), transparent 60%)`
                  : undefined
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
