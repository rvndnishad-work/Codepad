"use client";

import Link from "next/link";
import { Zap, ShieldCheck, Share2, Code2, ArrowUpRight, Monitor, Laptop, Globe, Cpu } from "lucide-react";
import { TemplateLogo, templateIcon } from "@/lib/icons";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant Spin-up",
    body: "Zero install, zero config. From idea to running code in under 2 seconds.",
    color: "#FFE600"
  },
  {
    icon: ShieldCheck,
    title: "Secure Sandbox",
    body: "Fully isolated execution environment. Your code runs locally in your browser.",
    color: "#9DFF00"
  },
  {
    icon: Share2,
    title: "Pro Sharing",
    body: "Public links, forking, and embedding. Build a portfolio of tiny ideas.",
    color: "#FFB800"
  }
];

const QUICK_STARTS = [
  { id: "react", label: "React", desc: "Hooks, JSX, Fast Refresh" },
  { id: "typescript", label: "TypeScript", desc: "Strict Types, TS Config" },
  { id: "javascript", label: "JavaScript", desc: "Modern ES Modules" },
  { id: "vue", label: "Vue 3", desc: "SFC, Composition API" },
];

export default function HomeBento() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Main Feature: Live Preview Lookalike */}
        <div className="md:col-span-8 rounded-3xl border border-border bg-surface p-1 overflow-hidden group shadow-2xl hover:border-border-strong transition-colors">
          <div className="bg-panel rounded-[22px] h-full overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-surface/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
              <div className="mx-auto px-3 py-1 rounded-md bg-bg/40 text-[10px] font-mono text-muted flex items-center gap-2">
                <Globe className="w-3 h-3" />
                interviewpad.in/play/sum-function
              </div>
            </div>
            <div className="flex-1 p-6 font-mono text-sm">
              <div className="text-muted/40 mb-4 text-xs italic">// Interviewpad IntelliSense active</div>
              <div className="space-y-1">
                <div><span className="text-purple-400">function</span> <span className="text-accent">sum</span>(a, b) {"{"}</div>
                <div className="pl-4 text-fg">  <span className="text-purple-400">return</span> a + b;</div>
                <div>{"}"}</div>
                <div className="pt-4 text-muted">// Result: 3</div>
                <div><span className="text-blue-400">console</span>.<span className="text-accent">log</span>(<span className="text-accent">sum</span>(<span className="text-orange-400">1</span>, <span className="text-orange-400">2</span>));</div>
              </div>
            </div>
            <div className="p-4 bg-accent flex items-center justify-between">
              <span className="text-bg font-bold text-xs uppercase tracking-widest">Built-in Console Output</span>
              <div className="flex items-center gap-2 text-bg/60 font-bold text-xs underline cursor-pointer">
                Run Manually <Zap className="w-3 h-3 fill-current" />
              </div>
            </div>
          </div>
        </div>

        {/* Side Bento: Stats/Highlight */}
        <div className="md:col-span-4 grid grid-cols-1 gap-4">
          <div className="rounded-3xl border border-accent/20 bg-accent/5 p-6 flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-[0.05] transition-transform group-hover:scale-110">
              <Cpu className="w-32 h-32 text-accent" />
            </div>
            <h3 className="text-accent font-black uppercase tracking-widest text-xs mb-2">Engine</h3>
            <p className="text-fg text-xl md:text-2xl font-black leading-tight relative z-10">
              Powered by the <br /> 
              <span className="text-accent">Sandpack v2</span> <br /> 
              Runtime.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-panel p-6 flex flex-col justify-between group hover:border-border-strong transition-colors">
             <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                   <Monitor className="w-5 h-5 text-muted" />
                </div>
                <div className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-full uppercase">Stable</div>
             </div>
             <div>
               <div className="text-2xl font-black text-fg italic">PRO</div>
               <div className="text-xs text-muted">Desktop Optimized Editor</div>
             </div>
          </div>
        </div>

        {/* Feature Matrix */}
        {FEATURES.map((f, i) => (
          <div key={i} className="md:col-span-4 rounded-3xl border border-border bg-panel p-6 hover:bg-elevated hover:border-border-strong transition-colors group">
             <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ borderColor: `${f.color}33` }}>
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
             </div>
             <h4 className="text-fg font-black text-xl mb-2">{f.title}</h4>
             <p className="text-muted text-sm md:text-base leading-relaxed">{f.body}</p>
          </div>
        ))}

        {/* Quick Starts Title */}
        <div className="md:col-span-12 mt-12 mb-6">
           <h2 className="text-2xl md:text-3xl font-black text-fg tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-8 bg-accent rounded-full" />
              Popular Starters
           </h2>
        </div>

        {/* Quick Start Grid */}
        <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_STARTS.map((q) => {
            const meta = templateIcon[q.id];
            const accentColor = meta?.color ?? "var(--accent)";
            return (
              <Link
                key={q.id}
                href={`/play?template=${q.id}`}
                className="group relative flex items-center gap-4 p-3.5 rounded-[1.75rem] border border-border bg-surface hover:bg-elevated transition-all duration-500 hover:scale-[1.02] hover:rotate-1 hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.5)] overflow-hidden"
              >
                {/* Background Glow */}
                <div
                  className="absolute -left-10 -top-10 w-28 h-28 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                  style={{ background: accentColor }}
                />

                {/* Icon Stage */}
                <div className="relative w-[32%] aspect-square shrink-0 flex items-center justify-center">
                  <div 
                    className="absolute inset-0 rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%] animate-[blobby_10s_ease-in-out_infinite] opacity-20 group-hover:opacity-40 transition-all duration-700 blur-[2px] border border-white/10"
                    style={{ background: accentColor }}
                  />
                  <div className="relative w-[50%] h-[50%] flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                    <TemplateLogo id={q.id} className="w-full h-full drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-base font-black text-fg tracking-tight group-hover:text-accent transition-colors leading-tight truncate">
                      {q.label}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </div>
                  
                  <p className="text-xs text-muted leading-tight line-clamp-1 mt-0.5">
                    {q.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}
