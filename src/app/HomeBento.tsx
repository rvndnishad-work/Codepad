"use client";

import Link from "next/link";
import { Zap, ShieldCheck, Share2, Code2, ArrowUpRight, Monitor, Laptop, Globe, Cpu } from "lucide-react";
import { TemplateLogo } from "@/lib/icons";

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
        <div className="md:col-span-8 rounded-3xl border border-white/[0.10] bg-[#0A0A0A] p-1 overflow-hidden group shadow-2xl hover:border-white/[0.16] transition-colors">
          <div className="bg-panel rounded-[22px] h-full overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.03] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
              <div className="mx-auto px-3 py-1 rounded-md bg-black/40 text-[10px] font-mono text-muted flex items-center gap-2">
                <Globe className="w-3 h-3" />
                interviewpad.in/play/sum-function
              </div>
            </div>
            <div className="flex-1 p-6 font-mono text-sm">
              <div className="text-muted/40 mb-4 text-xs italic">// Nano Banana Pro IntelliSense active</div>
              <div className="space-y-1">
                <div><span className="text-purple-400">function</span> <span className="text-[#FFE600]">sum</span>(a, b) {"{"}</div>
                <div className="pl-4 text-white">  <span className="text-purple-400">return</span> a + b;</div>
                <div>{"}"}</div>
                <div className="pt-4 text-muted">// Result: 3</div>
                <div><span className="text-blue-400">console</span>.<span className="text-[#FFE600]">log</span>(<span className="text-[#FFE600]">sum</span>(<span className="text-orange-400">1</span>, <span className="text-orange-400">2</span>));</div>
              </div>
            </div>
            <div className="p-4 bg-[#FFE600] flex items-center justify-between">
              <span className="text-black font-bold text-xs uppercase tracking-widest">Built-in Console Output</span>
              <div className="flex items-center gap-2 text-black/60 font-bold text-xs underline cursor-pointer">
                Run Manually <Zap className="w-3 h-3 fill-current" />
              </div>
            </div>
          </div>
        </div>

        {/* Side Bento: Stats/Highlight */}
        <div className="md:col-span-4 grid grid-cols-1 gap-4">
          <div className="rounded-3xl border border-[#FFE600]/20 bg-[#FFE600]/5 p-6 flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-[0.05] transition-transform group-hover:scale-110">
              <Cpu className="w-32 h-32 text-[#FFE600]" />
            </div>
            <h3 className="text-[#FFE600] font-black uppercase tracking-widest text-[11px] mb-2">Engine</h3>
            <p className="text-white text-xl font-bold leading-snug relative z-10">
              Powered by the <br /> 
              <span className="text-[#FFE600]">Sandpack v2</span> <br /> 
              Runtime.
            </p>
          </div>
          <div className="rounded-3xl border border-white/[0.10] bg-panel p-6 flex flex-col justify-between group hover:border-white/[0.16] transition-colors">
             <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                   <Monitor className="w-5 h-5 text-muted" />
                </div>
                <div className="text-[10px] font-bold text-muted bg-white/5 px-2 py-0.5 rounded-full uppercase">Stable</div>
             </div>
             <div>
               <div className="text-2xl font-black text-white italic">PRO</div>
               <div className="text-xs text-muted">Desktop Optimized Editor</div>
             </div>
          </div>
        </div>

        {/* Feature Matrix */}
        {FEATURES.map((f, i) => (
          <div key={i} className="md:col-span-4 rounded-3xl border border-white/[0.10] bg-panel p-6 hover:bg-elevated hover:border-white/[0.16] transition-colors group">
             <div className="w-12 h-12 rounded-2xl bg-panel border border-white/[0.10] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ borderColor: `${f.color}33` }}>
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
             </div>
             <h4 className="text-white font-bold text-lg mb-2">{f.title}</h4>
             <p className="text-muted text-sm leading-relaxed">{f.body}</p>
          </div>
        ))}

        {/* Quick Starts Title */}
        <div className="md:col-span-12 mt-8 mb-4">
           <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
             <div className="w-1.5 h-8 bg-[#FFE600] rounded-full" />
             Popular Starters
           </h2>
        </div>

        {/* Quick Start Grid */}
        {QUICK_STARTS.map((q) => (
           <Link key={q.id} href={`/play?template=${q.id}`} className="md:col-span-3 rounded-2xl border border-white/[0.10] bg-panel/40 p-4 hover:border-[#FFE600]/40 hover:bg-panel transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface border border-white/[0.10] grid place-items-center group-hover:scale-110 transition-transform">
                  <TemplateLogo id={q.id} size={20} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-[#FFE600] transition-colors" />
              </div>
              <div className="font-bold text-white mb-1">{q.label}</div>
              <div className="text-[11px] text-muted leading-relaxed line-clamp-1">{q.desc}</div>
           </Link>
        ))}

      </div>
    </section>
  );
}
