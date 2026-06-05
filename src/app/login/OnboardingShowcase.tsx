"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, Sparkles, Users } from "lucide-react";

type Slide = {
  icon: typeof Zap;
  title: string;
  badge?: string;
  description: string;
  preview: React.ReactNode;
};

export default function OnboardingShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const slides: Slide[] = [
    {
      icon: Zap,
      title: "Isolated Sandbox Playgrounds",
      badge: "Fast & Sandboxed",
      description: "Write, test, and run code instantly in isolated browser-only sandboxes. No configuration or installation required.",
      preview: (
        <div 
          className="w-full rounded-2xl bg-gradient-to-b from-[#1e2229]/95 to-[#121418]/95 p-[clamp(1rem,2vh,2rem)] font-mono text-[clamp(0.75rem,1.5vh,1rem)] select-none shadow-2xl shadow-black/50 ring-1 ring-white/5 relative"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div 
            className="flex items-center justify-between pb-[clamp(0.5rem,1vh,1rem)] border-b border-white/5 mb-[clamp(0.5rem,1.2vh,1rem)]"
            style={{ transform: "translateZ(25px)" }}
          >
            <div className="flex gap-1.5">
              <div className="w-[clamp(8px,1.2vh,12px)] h-[clamp(8px,1.2vh,12px)] rounded-full bg-rose-500/80" />
              <div className="w-[clamp(8px,1.2vh,12px)] h-[clamp(8px,1.2vh,12px)] rounded-full bg-amber-500/80" />
              <div className="w-[clamp(8px,1.2vh,12px)] h-[clamp(8px,1.2vh,12px)] rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[clamp(0.65rem,1.2vh,0.875rem)] text-slate-400 font-sans font-medium">playground.tsx</span>
          </div>
          <div 
            className="space-y-[clamp(4px,0.8vh,8px)] text-slate-300 leading-relaxed"
            style={{ transform: "translateZ(40px)" }}
          >
            <div><span className="text-pink-400">const</span> <span className="text-blue-400">greeting</span> = () =&gt; &#123;</div>
            <div className="pl-6"><span className="text-pink-400">return</span> <span className="text-amber-300">"Welcome to Interviewpad!"</span>;</div>
            <div>&#125;;</div>
            <div className="pt-2 text-slate-500">// Run code instantly</div>
            <div><span className="text-purple-400">console</span>.<span className="text-emerald-400">log</span>(<span className="text-blue-400">greeting</span>());</div>
          </div>
          <div 
            className="pt-[clamp(0.5rem,1vh,1rem)] border-t border-white/5 mt-[clamp(0.5rem,1vh,1rem)] text-emerald-400 font-sans text-[clamp(0.7rem,1.4vh,0.875rem)] flex items-center gap-2 font-bold"
            style={{ transform: "translateZ(55px)" }}
          >
            <span className="w-[clamp(6px,1vh,10px)] h-[clamp(6px,1vh,10px)] rounded-full bg-emerald-400 animate-ping" />
            Output: "Welcome to Interviewpad!"
          </div>
        </div>
      ),
    },
    {
      icon: Sparkles,
      title: "Autonomous AI Screening",
      badge: "AI Interactivity",
      description: "Delegate first-round technical evaluations to autonomous AI agents that invite, evaluate, and talk directly with candidates.",
      preview: (
        <div 
          className="w-full rounded-2xl bg-gradient-to-b from-[#1e2229]/95 to-[#121418]/95 p-[clamp(1rem,2vh,2rem)] font-sans text-[clamp(0.75rem,1.5vh,1rem)] select-none shadow-2xl shadow-black/50 ring-1 ring-white/5 space-y-[clamp(0.5rem,1.5vh,1.25rem)] relative"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div 
            className="flex items-center gap-[clamp(0.5rem,1.2vh,1rem)] pb-[clamp(0.5rem,1vh,1rem)] border-b border-white/5"
            style={{ transform: "translateZ(25px)" }}
          >
            <div className="w-[clamp(2rem,4vh,3rem)] h-[clamp(2rem,4vh,3rem)] rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-500/10">
              <Sparkles className="w-[clamp(1rem,2.2vh,1.5rem)] h-[clamp(1rem,2.2vh,1.5rem)] animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-[clamp(0.95rem,2vh,1.25rem)] leading-tight">AI Interviewer</div>
              <div className="text-[clamp(0.7rem,1.4vh,0.875rem)] text-slate-400">Interviewpad Agent</div>
            </div>
          </div>
          <div className="space-y-[clamp(0.5rem,1.5vh,1rem)]">
            <div 
              className="bg-[#16181d]/85 rounded-xl p-[clamp(0.75rem,1.5vh,1rem)] border border-white/5 text-slate-200 leading-relaxed max-w-[85%] shadow-md"
              style={{ transform: "translateZ(40px)" }}
            >
              Let's write a function to reverse a string. Can you implement it in O(1) extra space complexity?
            </div>
            <div 
              className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-[clamp(0.75rem,1.5vh,1rem)] text-amber-200 leading-relaxed max-w-[85%] ml-auto text-right shadow-lg shadow-amber-500/5"
              style={{ transform: "translateZ(55px)" }}
            >
              Sure! I can use the two-pointer technique to reverse the array in place.
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Users,
      title: "Real-time Live Arena",
      badge: "Multiplayer Coding",
      description: "Collaborate, share, and code live with candidates and team members with shared audio, code sync, and terminal output.",
      preview: (
        <div 
          className="w-full rounded-2xl bg-gradient-to-b from-[#1e2229]/95 to-[#121418]/95 p-[clamp(1rem,2vh,2rem)] font-mono text-[clamp(0.75rem,1.5vh,1rem)] select-none shadow-2xl shadow-black/50 ring-1 ring-white/5 relative"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div 
            className="flex items-center justify-between pb-[clamp(0.5rem,1vh,1rem)] border-b border-white/5 mb-[clamp(0.5rem,1.2vh,1rem)] font-sans"
            style={{ transform: "translateZ(25px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-[clamp(8px,1vh,10px)] w-[clamp(8px,1vh,10px)]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-[clamp(8px,1vh,10px)] w-[clamp(8px,1vh,10px)] bg-emerald-500"></span>
              </span>
              <span className="text-[clamp(0.7rem,1.4vh,0.95rem)] text-slate-200 font-bold">Live Session #421</span>
            </div>
            <div 
              className="flex -space-x-2"
              style={{ transform: "translateZ(40px)" }}
            >
              <div className="w-[clamp(1.5rem,3.2vh,2.25rem)] h-[clamp(1.5rem,3.2vh,2.25rem)] rounded-full bg-indigo-500 border-2 border-[#1e2229] flex items-center justify-center text-[clamp(0.65rem,1.2vh,0.875rem)] text-white font-bold font-sans shadow-md z-10">A</div>
              <div className="w-[clamp(1.5rem,3.2vh,2.25rem)] h-[clamp(1.5rem,3.2vh,2.25rem)] rounded-full bg-amber-400 border-2 border-[#1e2229] flex items-center justify-center text-[clamp(0.65rem,1.2vh,0.875rem)] text-neutral-900 font-bold font-sans shadow-md z-0">R</div>
            </div>
          </div>
          <div 
            className="space-y-[clamp(4px,0.8vh,8px)] text-slate-300 leading-relaxed relative"
            style={{ transform: "translateZ(45px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-pink-400">function</span> <span className="text-blue-400">calculateSum</span>(a, b) &#123;
            </div>
            <div className="pl-[clamp(1rem,2vw,1.5rem)] flex items-center gap-1.5 relative">
              <span className="text-pink-400">return</span> a + b;
              <span className="w-0.5 h-[clamp(14px,2.2vh,20px)] bg-indigo-500 animate-pulse ml-1" />
              <span 
                className="absolute -top-5 left-[clamp(80px,15vw,140px)] text-[clamp(8px,1.2vh,11px)] px-1.5 py-0.5 bg-indigo-500 text-white rounded font-sans shadow-lg flex items-center gap-1"
                style={{ transform: "translateZ(60px)" }}
              >
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                Arvind
              </span>
            </div>
            <div>&#125;</div>
          </div>
        </div>
      ),
    },
  ];

  // Auto advance slides every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Mouse coordinates relative to container center
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Max rotation is 12 degrees
    const rotateX = (mouseY / (height / 2)) * -12;
    const rotateY = (mouseX / (width / 2)) * 12;

    // Sheen/glare coordinates
    const glareX = ((e.clientX - rect.left) / width) * 100;
    const glareY = ((e.clientY - rect.top) / height) * 100;

    setTilt({ x: rotateX, y: rotateY });
    setGlare({ x: glareX, y: glareY, opacity: 0.15 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  const getGlowColor = () => {
    switch (activeSlide) {
      case 0:
        return "bg-emerald-500/10 dark:bg-emerald-500/15";
      case 1:
        return "bg-amber-500/10 dark:bg-amber-500/15";
      case 2:
        return "bg-indigo-500/10 dark:bg-indigo-500/15";
      default:
        return "bg-amber-500/10 dark:bg-amber-500/15";
    }
  };

  const getBadgeClass = () => {
    switch (activeSlide) {
      case 0:
        return "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 ring-1 ring-emerald-500/20";
      case 1:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25";
      case 2:
        return "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 ring-1 ring-indigo-500/20";
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25";
    }
  };

  const getTitleGradient = () => {
    switch (activeSlide) {
      case 0:
        return "from-fg via-fg to-emerald-500 dark:to-emerald-400";
      case 1:
        return "from-fg via-fg to-amber-500 dark:to-amber-400";
      case 2:
        return "from-fg via-fg to-indigo-500 dark:to-indigo-400";
      default:
        return "from-fg via-fg to-amber-500 dark:to-amber-400";
    }
  };

  const getIndicatorClass = (idx: number) => {
    if (activeSlide !== idx) return "w-2 bg-border hover:bg-muted/40";
    switch (idx) {
      case 0:
        return "w-12 bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]";
      case 1:
        return "w-12 bg-amber-500 dark:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]";
      case 2:
        return "w-12 bg-indigo-500 dark:bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]";
      default:
        return "w-12 bg-amber-500 dark:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]";
    }
  };

  return (
    <div className="flex flex-col w-full items-center select-none space-y-[clamp(1.5rem,3.5vh,2.5rem)]">
      {/* 3D Visual Sandbox Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative aspect-[4/3] lg:aspect-video w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-[clamp(1rem,3vh,3rem)] max-h-[clamp(220px,36vh,360px)] rounded-[2.5rem] transition-all duration-500 cursor-default"
        style={{ perspective: "1500px", transformStyle: "preserve-3d" }}
      >
        {/* Ambient background glow shifting color */}
        <div
          className={`absolute -inset-10 rounded-full filter blur-[100px] opacity-75 transition-all duration-1000 ${getGlowColor()}`}
          style={{ transform: "translateZ(-50px)" }}
        />

        {/* Decorative Grid Background */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:24px_24px] xl:bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none" 
          style={{ transform: "translateZ(-20px)" }}
        />

        {slides.map((slide, idx) => {
          const isActive = activeSlide === idx;
          return (
            <div
              key={idx}
              className={`w-full max-w-3xl transition-all duration-700 absolute px-6 ${
                isActive
                  ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                  : "opacity-0 translate-y-8 scale-[0.97] pointer-events-none"
              }`}
              style={
                isActive
                  ? {
                      transform: `perspective(1500px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
                      transformStyle: "preserve-3d",
                      transition: isHovered
                        ? "none"
                        : "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.7s ease, visibility 0.7s ease",
                      visibility: "visible",
                    }
                  : {
                      visibility: "hidden",
                      transition: "visibility 0s 0.7s, opacity 0.7s ease, transform 0.7s ease",
                    }
              }
            >
              {slide.preview}

              {/* High-end Sheen reflection glare overlay */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none mix-blend-overlay transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, ${glare.opacity}) 0%, transparent 60%)`,
                    transform: "translateZ(80px)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Slide Text Content */}
      <div className="space-y-[clamp(1rem,2vh,2rem)] w-full max-w-3xl px-6">
        <div className="min-h-[clamp(120px,18vh,180px)] space-y-[clamp(0.5rem,1.5vh,1.25rem)]">
          {slides.map((slide, idx) => {
            const Icon = slide.icon;
            if (activeSlide !== idx) return null;
            return (
              <div
                key={idx}
                className="space-y-[clamp(0.5rem,1.5vh,1.25rem)] animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[clamp(0.7rem,1.4vh,0.875rem)] font-black uppercase tracking-wider transition-colors duration-500 ${getBadgeClass()}`}
                >
                  {slide.badge}
                </span>
                <h3
                  className={`text-[clamp(1.5rem,3.5vh,2.5rem)] font-black bg-gradient-to-r ${getTitleGradient()} bg-clip-text text-transparent flex items-center gap-3 xl:gap-4 tracking-tight transition-all duration-500`}
                >
                  <Icon
                    className={`w-[clamp(1.5rem,3.2vh,2.5rem)] h-[clamp(1.5rem,3.2vh,2.5rem)] transition-colors duration-500 ${
                      activeSlide === 0
                        ? "text-emerald-500 dark:text-emerald-400"
                        : activeSlide === 2
                        ? "text-indigo-500 dark:text-indigo-400"
                        : "text-amber-500 dark:text-amber-400"
                    }`}
                  />
                  {slide.title}
                </h3>
                <p className="text-[clamp(0.85rem,1.8vh,1.15rem)] text-fg/70 leading-relaxed max-w-2xl lg:max-w-3xl">
                  {slide.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Carousel Slide Indicators */}
        <div className="flex items-center gap-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`h-2 rounded-full transition-all duration-500 ${getIndicatorClass(
                idx
              )}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
