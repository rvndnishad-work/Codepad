"use client";

import Link from "next/link";
import { Sparkles, Plus, Zap, Code2, Rocket, ArrowRight, Play, LayoutGrid } from "lucide-react";
import { TemplateLogo } from "@/lib/icons";

export default function HomeHero({ 
  sessionName, 
  snippetCount,
  recentSnippet 
}: { 
  sessionName?: string | null;
  snippetCount: number;
  recentSnippet?: { slug: string; title: string; template: string } | null;
}) {
  const firstName = sessionName?.split(" ")[0];

  return (
    <div className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24 border-b border-white/[0.03]">
      {/* Nano Banana Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* The Digital Floor (Grid) */}
        <div className="absolute inset-0 [perspective:1000px] z-0">
          <div className="absolute inset-0 bg-grid-pattern [transform:rotateX(60deg)] origin-top animate-grid-move opacity-40 h-[200%] w-full" />
        </div>
        
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090c] via-transparent to-[#08090c] opacity-80" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[100%] bg-[#FFE600] opacity-[0.03] blur-[140px]" />
        
        {/* Floating Monitor Windows */}
        <div className="absolute top-[15%] left-[5%] w-64 h-36 bg-black/60 backdrop-blur-xl border border-[#FFE600]/10 rounded-xl hidden xl:flex flex-col overflow-hidden animate-float shadow-2xl rotate-[-3deg]">
           <div className="px-3 py-1.5 bg-white/[0.03] flex items-center gap-1.5 border-b border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
              <span className="text-[8px] font-black text-white/20 ml-auto uppercase tracking-widest">Compiler</span>
           </div>
           <div className="p-3 font-mono text-[9px] text-[#FFE600]/40 space-y-1">
              <div className="flex gap-2"><span>$</span><span className="text-white/60">codepad deploy</span></div>
              <div className="text-green-400/60">✔ Compilation successful</div>
              <div className="text-white/30">Optimization complete (12ms)</div>
              <div className="text-white/30">Ready on port 3000</div>
           </div>
        </div>

        <div className="absolute top-[45%] right-[5%] w-72 h-44 bg-black/60 backdrop-blur-xl border border-[#FFE600]/10 rounded-xl hidden xl:flex flex-col overflow-hidden animate-float [animation-delay:2s] shadow-2xl rotate-[2deg]">
           <div className="px-3 py-1.5 bg-white/[0.03] flex items-center gap-1.5 border-b border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
              <span className="text-[8px] font-black text-white/20 ml-auto uppercase tracking-widest">Active Code</span>
           </div>
           <div className="p-3 font-mono text-[9px] text-white/40 space-y-1">
              <div className="text-purple-400">export default function <span className="text-[#FFE600]">App</span>() {"{"}</div>
              <div className="pl-4 text-purple-400">return (</div>
              <div className="pl-8 text-blue-300">{"<div className=\"grid\">"}</div>
              <div className="pl-12 text-white/20">{"<Editor />"}</div>
              <div className="pl-8 text-blue-300">{"</div>"}</div>
              <div className="pl-4 text-purple-400">);</div>
              <div className="text-purple-400">{"}"}</div>
           </div>
        </div>
      </div>
      
      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FFE600]/20 bg-[#FFE600]/5 px-4 py-1.5 text-[11px] font-bold text-[#FFE600] mb-8 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen JavaScript Playground</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          Code at the speed <br />
          <span className="text-[#FFE600] drop-shadow-[0_0_15px_rgba(255,230,0,0.2)]">of thought.</span>
        </h1>
        
        <p className="text-muted text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          The most powerful browser-based sandbox for JS, TS, and modern frameworks. 
          Save, share, and embed snippets in seconds.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          {recentSnippet ? (
            <Link
              href={`/play/${recentSnippet.slug}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,230,0,0.2)]"
            >
              <Play className="w-5 h-5 fill-current" />
              Continue: {recentSnippet.title}
            </Link>
          ) : (
            <Link
              href="/play?template=react"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,230,0,0.2)]"
            >
              <Plus className="w-5 h-5" />
              Create First Snippet
            </Link>
          )}
          
          <Link
            href={sessionName ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all font-semibold"
          >
            {sessionName ? (
              <>
                <LayoutGrid className="w-5 h-5" />
                Your Dashboard
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Sign in to save
              </>
            )}
          </Link>
        </div>

        {/* Platform stats */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs font-bold uppercase tracking-widest text-muted/60 animate-in fade-in duration-1000 delay-500">
          <div className="flex flex-col items-center gap-2">
            <span className="text-white text-xl">16+</span>
            <span>Templates</span>
          </div>
          <div className="w-px h-8 bg-white/5 hidden sm:block" />
          <div className="flex flex-col items-center gap-2">
            <span className="text-[#FFE600] text-xl">100%</span>
            <span>Sandboxed</span>
          </div>
          <div className="w-px h-8 bg-white/5 hidden sm:block" />
          <div className="flex flex-col items-center gap-2">
            <span className="text-white text-xl">0s</span>
            <span>Setup Time</span>
          </div>
        </div>
      </div>
    </div>
  );
}
