"use client";

import Link from "next/link";
import { Sparkles, Plus, Play, LayoutGrid, Lock, ChevronRight, FileCode2, Terminal } from "lucide-react";

export default function HomeHero({ 
  sessionName, 
  snippetCount,
  recentSnippet 
}: { 
  sessionName?: string | null;
  snippetCount: number;
  recentSnippet?: { slug: string; title: string; template: string } | null;
}) {
  return (
    <div className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-32">
      {/* ── Premium Background Setup ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {/* Theme-aware base */}
        <div className="absolute inset-0 bg-bg" />
        
        {/* Subtle non-moving structural grid fading out at the edges */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.03)_1px,transparent_1px)] bg-[size:48px_48px]" 
          style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)" }}
        />

        {/* Central glowing orb for depth */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-accent/15 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>
      
      {/* ── Hero Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-2 text-xs font-black text-muted mb-8 tracking-widest uppercase backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Interviewpad Pro Sandbox</span>
        </div>
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-fg mb-6 leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
          Code at the speed <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent via-accent-soft to-[#FF9900]">of thought.</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-muted text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 font-medium">
          The most powerful browser-based sandbox for JS, TS, and modern frameworks. 
          Zero setup. Infinite possibilities.
        </p>
        
        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          {recentSnippet ? (
            <Link
              href={`/play/${recentSnippet.slug}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,230,0,0.25)]"
            >
              <Play className="w-5 h-5 fill-current" />
              Continue: {recentSnippet.title}
            </Link>
          ) : (
            <Link
              href="/play?template=react"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,230,0,0.25)]"
            >
              <Plus className="w-5 h-5" />
              Create First Snippet
            </Link>
          )}
          
          <Link
            href={sessionName ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold"
          >
            {sessionName ? (
              <>
                <LayoutGrid className="w-5 h-5" />
                Your Dashboard
              </>
            ) : (
              <>
                <ChevronRight className="w-5 h-5" />
                Sign in to save
              </>
            )}
          </Link>
        </div>
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
          <div className="absolute inset-0 [transform:rotateX(35deg)] origin-center">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.25] animate-grid-move" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(var(--accent-rgb),0.3)_1px,transparent_1px)] bg-[size:100%_60px] animate-grid-move" />
          </div>
        </div>
      </div>
    </div>
  );
}
