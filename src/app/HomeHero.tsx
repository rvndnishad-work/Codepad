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
    <div className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-32 border-b border-white/[0.03]">
      {/* ── Premium Background Setup ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {/* Solid dark base */}
        <div className="absolute inset-0 bg-[#050505]" />
        
        {/* Subtle non-moving structural grid fading out at the edges */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" 
          style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)" }}
        />

        {/* Central glowing orb for depth */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#FFE600]/15 blur-[120px] rounded-full mix-blend-screen" />
      </div>
      
      {/* ── Hero Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-1.5 text-[10px] font-semibold text-white/70 mb-8 tracking-widest uppercase backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles className="w-3.5 h-3.5 text-[#FFE600]" />
          <span>Codepad Pro Sandbox</span>
        </div>
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
          Code at the speed <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#FFE600] via-[#FFD700] to-[#FF9900]">of thought.</span>
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
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 transition-all font-semibold"
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

      {/* ── Abstract IDE Mockup ── */}
      <div className="mx-auto max-w-4xl px-4 mt-20 relative z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700">
        {/* Glow behind mockup */}
        <div className="absolute inset-x-10 top-10 bottom-0 bg-[#FFE600]/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative rounded-xl border border-white/[0.08] bg-[#0A0A0A] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Window Controls / Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.04] bg-white/[0.01]">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
              <Lock className="w-3 h-3 text-white/30" />
              <span className="text-[10px] font-mono text-white/50">codepad.app / sandbox</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
          
          {/* Editor Body */}
          <div className="grid grid-cols-12 h-[320px] md:h-[400px]">
            {/* Sidebar Fake */}
            <div className="col-span-3 border-r border-white/[0.04] bg-[#050505] p-4 hidden md:block">
              <div className="text-[10px] uppercase font-bold tracking-widest text-white/20 mb-4">Explorer</div>
              <div className="space-y-2 font-mono text-xs text-white/60">
                <div className="flex items-center gap-2 text-white/90 bg-white/[0.04] px-2 py-1 -ml-2 rounded">
                  <FileCode2 className="w-3.5 h-3.5 text-blue-400" /> index.tsx
                </div>
                <div className="flex items-center gap-2 px-2 py-1 -ml-2">
                  <FileCode2 className="w-3.5 h-3.5 text-yellow-400" /> styles.css
                </div>
                <div className="flex items-center gap-2 px-2 py-1 -ml-2">
                  <FileCode2 className="w-3.5 h-3.5 text-white/40" /> package.json
                </div>
              </div>
            </div>
            
            {/* Code Fake */}
            <div className="col-span-12 md:col-span-9 bg-[#0A0A0A] p-6 font-mono text-[13px] md:text-sm leading-[1.7] overflow-hidden relative">
              {/* Code lines */}
              <div className="text-purple-400">import <span className="text-white/90">React</span>, {"{ useState }"} from <span className="text-green-400">'react'</span>;</div>
              <br />
              <div className="text-purple-400">export default function <span className="text-yellow-300">NanoBanana</span>() {"{"}</div>
              <div className="pl-4 text-purple-400">const <span className="text-blue-300">[</span><span className="text-white/90">ready</span>, <span className="text-blue-300">setReady]</span> = <span className="text-yellow-300">useState</span>(<span className="text-[#FFE600]">true</span>);</div>
              <br />
              <div className="pl-4 text-purple-400">return (</div>
              <div className="pl-8 text-blue-300">{"<div className=\"h-screen bg-black text-white\">"}</div>
              <div className="pl-12 text-blue-300">{"<Header />"}</div>
              <div className="pl-12 text-blue-300">{"<Workspace"}</div>
              <div className="pl-16 text-blue-300">theme=<span className="text-green-400">"pro"</span></div>
              <div className="pl-16 text-blue-300">turbo={<span className="text-purple-400">true</span>}</div>
              <div className="pl-12 text-blue-300">{"/>"}</div>
              <div className="pl-8 text-blue-300">{"</div>"}</div>
              <div className="pl-4 text-purple-400">);</div>
              <div className="text-purple-400">{"}"}</div>
              
              {/* Overlay Terminal */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-[#050505] border-t border-white/[0.04]">
                <div className="flex items-center gap-2 px-4 h-8 border-b border-white/[0.02]">
                  <Terminal className="w-3 h-3 text-white/40" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Terminal</span>
                </div>
                <div className="p-4 font-mono text-[11px] text-white/60 space-y-1">
                  <div><span className="text-green-400">➜</span> <span className="text-blue-400">~</span> <span className="text-white/90">npm</span> run dev</div>
                  <div className="text-white/30">ready - started server on 0.0.0.0:3000, url: http://localhost:3000</div>
                  <div className="text-emerald-400/80">event - compiled client and server successfully in 128 ms</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
