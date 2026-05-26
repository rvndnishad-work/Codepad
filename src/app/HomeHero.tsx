"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Plus, Play, LayoutGrid, ChevronRight, Building2, User, ArrowRight, RefreshCw } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from "framer-motion";

export default function HomeHero({ 
  sessionName, 
  snippetCount,
  recentSnippet,
  userType
}: { 
  sessionName?: string | null;
  snippetCount: number;
  recentSnippet?: { slug: string; title: string; template: string } | null;
  userType?: string | null;
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Selected persona state: null = not chosen yet (new logged-out user)
  const [persona, setPersona] = useState<"candidate" | "recruiter" | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (userType === "candidate" || userType === "recruiter") {
      setPersona(userType);
    } else {
      const saved = localStorage.getItem("ipad.persona");
      if (saved === "candidate" || saved === "recruiter") {
        setPersona(saved as "candidate" | "recruiter");
      }
    }
  }, [userType]);

  const selectPersona = (chosen: "candidate" | "recruiter") => {
    setPersona(chosen);
    localStorage.setItem("ipad.persona", chosen);
  };

  const clearPersona = () => {
    setPersona(null);
    localStorage.removeItem("ipad.persona");
  };

  // Scroll-linked parallax measurements
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.6, 0.2]);
  const fastY = useTransform(scrollYProgress, [0, 1], [0, -70]);
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
      className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-36 bg-bg min-h-[85vh] flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Premium Background Setup ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {/* Subtle non-moving structural grid fading out at the edges */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:48px_48px]" 
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
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--accent-rgb), 0.06), transparent 40%)`,
          }}
        />

        {/* Central glowing orb for depth */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-accent/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>
      
      {/* ── Hero Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center w-full">
        <AnimatePresence mode="wait">
          {!isMounted ? (
            // Spinner placeholder to prevent hydration flash
            <motion.div 
              key="loader"
              className="flex justify-center items-center py-20"
            >
              <div className="w-8 h-8 border-2 border-accent/25 border-t-accent rounded-full animate-spin" />
            </motion.div>
          ) : persona === null ? (
            // DUAL-PERSONA SWITCHER VIEW (Logged out or first-time visitor)
            <motion.div
              key="switcher"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-12 max-w-4xl mx-auto"
            >
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-2 text-xs font-black text-muted tracking-widest uppercase backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                  <span>Next-Generation Technical Coding Platform</span>
                </span>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-fg leading-tight">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-soft">Interviewpad.</span>
                </h1>
                <p className="text-muted text-base md:text-lg max-w-2xl mx-auto font-medium">
                  The ultimate sandboxed environment for developers to practice coding and recruiters to evaluate candidate talents. Choose your track below to get started.
                </p>
              </div>

              {/* Side-by-Side Switcher Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
                {/* Left Card: Candidates */}
                <div 
                  onClick={() => selectPersona("candidate")}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border bg-surface/30 hover:border-accent/40 p-8 transition-all hover:translate-y-[-4px] hover:shadow-[0_12px_40px_rgba(var(--accent-rgb),0.06)]"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl group-hover:bg-accent/10 transition-colors" />
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-fg mb-3 group-hover:text-accent transition-colors flex items-center gap-2">
                    For Candidates & Developers
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-muted text-sm leading-relaxed mb-6 font-medium">
                    Practice structured technical coding challenges, mount freeform sandboxes, solve real-world algorithms, and maintain a public portfolio profile to stand out.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-accent">
                    Solve & Practice Free <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Right Card: Recruiters */}
                <div 
                  onClick={() => selectPersona("recruiter")}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border bg-surface/30 hover:border-accent/40 p-8 transition-all hover:translate-y-[-4px] hover:shadow-[0_12px_40px_rgba(var(--accent-rgb),0.06)]"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-fg mb-3 group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                    For Recruiters & Hiring Teams
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-muted text-sm leading-relaxed mb-6 font-medium">
                    Host secure multiplayer live coding panels, deploy robust take-home assignments, access standard test autograders, and review timeline replays with anti-cheat telemetry.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-indigo-400">
                    Host Technical Interviews <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          ) : persona === "candidate" ? (
            // CANDIDATE SPECIFIC HERO VIEW
            <motion.div
              key="candidate"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Eyebrow */}
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-2 text-xs font-black text-muted tracking-widest uppercase backdrop-blur-md"
                style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Coding interviews, without the friction</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="text-5xl md:text-7xl font-black tracking-tight text-fg leading-[1.05]"
                style={reducedMotion ? undefined : { y: titleY, opacity: titleOpacity }}
              >
                Practice, perform, and <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-soft">land your next role.</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium"
                style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
              >
                Solve real-world coding challenges, practice in a fully loaded framework sandbox, and build a beautiful shareable developer portfolio to land your dream tech job.
              </motion.p>

              {/* Call to Actions */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto"
                style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
              >
                <Link
                  href="/challenges"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(var(--accent-rgb),0.25)]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Explore Challenges
                </Link>

                {recentSnippet ? (
                  <Link
                    href={`/play/${recentSnippet.slug}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <LayoutGrid className="w-5 h-5 text-accent" />
                    Resume Sandbox
                  </Link>
                ) : (
                  <Link
                    href="/playgrounds"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="w-5 h-5" />
                    Open Sandbox Playground
                  </Link>
                )}

                {/* Mobile Compact Selector Trigger */}
                <div className="sm:hidden w-full border-t border-border pt-4 mt-2">
                  <button 
                    onClick={clearPersona}
                    className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-muted hover:text-fg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Are you a recruiter? Switch View
                  </button>
                </div>
              </motion.div>

              {/* Desktop back switcher link */}
              <motion.div 
                className="hidden sm:block pt-6"
                style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
              >
                <button 
                  onClick={clearPersona}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-accent transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Are you a recruiter? Switch to hiring platform view
                </button>
              </motion.div>
            </motion.div>
          ) : (
            // RECRUITER SPECIFIC HERO VIEW
            <motion.div
              key="recruiter"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Eyebrow */}
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-2 text-xs font-black text-indigo-400 tracking-widest uppercase backdrop-blur-md"
                style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Evaluate developers at scale</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="text-5xl md:text-7xl font-black tracking-tight text-fg leading-[1.05]"
                style={reducedMotion ? undefined : { y: titleY, opacity: titleOpacity }}
              >
                Evaluate developers. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-indigo-600">Hire confidently.</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium"
                style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
              >
                See how candidates think, not just what they ship. Host real-time collaborative code whiteboards, send expiring take-home grader cases, and play back standard timeline replays.
              </motion.p>

              {/* Call to Actions */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto"
                style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
              >
                <Link
                  href={sessionName ? "/dashboard" : "/login?next=/dashboard"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(99,102,241,0.25)]"
                >
                  <LayoutGrid className="w-5 h-5" />
                  {sessionName ? "Go to Workspaces" : "Access Workspace"}
                </Link>

                <Link
                  href="/features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Explore Features
                </Link>

                {/* Mobile Compact Selector Trigger */}
                <div className="sm:hidden w-full border-t border-border pt-4 mt-2">
                  <button 
                    onClick={clearPersona}
                    className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-muted hover:text-fg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Are you a developer? Switch View
                  </button>
                </div>
              </motion.div>

              {/* Desktop back switcher link */}
              <motion.div 
                className="hidden sm:block pt-6"
                style={reducedMotion ? undefined : { y: fastY, opacity: fastOpacity }}
              >
                <button 
                  onClick={clearPersona}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-indigo-400 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Are you a candidate? Switch to practice sandbox view
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.2] animate-grid-move" />
            <div 
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(var(--accent-rgb),0.3)_1px,transparent_1px)] bg-[size:100%_60px] animate-grid-move" 
              style={{
                background: isHovered 
                  ? `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--accent-rgb), 0.12), transparent 60%)`
                  : undefined
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
