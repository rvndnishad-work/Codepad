"use client";

import Link from "next/link";
import { Sparkles, Plus, Zap, Code2, Rocket } from "lucide-react";
import { TemplateLogo } from "@/lib/icons";

const QUICK_TEMPLATES = [
  { id: "react", label: "React", accent: "#61dafb" },
  { id: "typescript", label: "TypeScript", accent: "#3178c6" },
  { id: "empty-js", label: "Blank JS", accent: "#f7df1e" },
];

export default function DashboardHero({ userName }: { userName: string | null }) {
  const firstName = userName?.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-[#0A0A0A] p-8 md:p-12 mb-8">
      {/* Nano Banana Background Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[60%] bg-[#FFE600] opacity-[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[50%] bg-[#9DFF00] opacity-[0.05] blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFE600]/20 bg-[#FFE600]/5 px-3 py-1 text-[11px] font-medium text-[#FFE600] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powering your next big idea</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            {firstName ? `Hey ${firstName},` : "Welcome back,"} <br />
            <span className="text-[#FFE600]">Ready to build?</span>
          </h1>
          
          <p className="text-muted text-lg mb-8 max-w-md leading-relaxed">
            Your personal command center for experiments, snippets, and social coding.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,230,0,0.3)]"
            >
              <Plus className="w-5 h-5" />
              New Snippet
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
            >
              <Rocket className="w-5 h-5" />
              Explore Trends
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-[240px]">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1 ml-1">
            Quick Start
          </div>
          {QUICK_TEMPLATES.map((t) => (
            <Link
              key={t.id}
              href={`/play?template=${t.id}`}
              className="group flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#FFE600]/30 hover:bg-white/[0.06] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black border border-white/10 grid place-items-center transition-transform group-hover:scale-110">
                  <TemplateLogo id={t.id} size={20} />
                </div>
                <span className="font-medium text-sm text-white/90">{t.label}</span>
              </div>
              <Zap className="w-4 h-4 text-muted group-hover:text-[#FFE600] transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
