"use client";

import { Sparkles, Construction, Rocket, ArrowLeft, MousePointer2 } from "lucide-react";
import Link from "next/link";

export default function ComingSoon({ feature }: { feature?: string }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      
      {/* Main Content */}
      <div className="max-w-xl w-full relative z-10">
        {/* SVG Illustration - UX Style */}
        <div className="mb-10 relative">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-accent/20 to-accent-soft/20 rounded-3xl flex items-center justify-center relative group">
            <Construction className="w-16 h-16 text-accent animate-bounce" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-bg border border-border rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          
          {/* Floating UI Elements (SVGs) */}
          <div className="absolute -left-4 top-0 w-24 h-16 bg-surface border border-border rounded-xl shadow-2xl p-2 hidden md:block">
             <div className="w-full h-2 bg-border rounded-full mb-2" />
             <div className="w-2/3 h-2 bg-border rounded-full" />
             <div className="absolute bottom-2 right-2 w-4 h-4 bg-accent/20 rounded-full" />
          </div>

          <div className="absolute -right-8 bottom-0 w-28 h-20 bg-surface border border-border rounded-xl shadow-2xl p-3 hidden md:block">
             <div className="flex gap-1 mb-2">
                <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-400/50" />
                <div className="w-2 h-2 rounded-full bg-emerald-400/50" />
             </div>
             <div className="w-full h-1.5 bg-accent/10 rounded-full" />
             <div className="absolute -bottom-2 -right-2 text-accent">
                <MousePointer2 className="w-5 h-5 fill-current" />
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-full">
            <Rocket className="w-3 h-3" />
            In the Works
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-fg leading-tight">
            Something <span className="text-accent italic">exciting</span> is brewing.
          </h1>
          
          <p className="text-muted text-base max-w-md mx-auto leading-relaxed">
            We're currently polishing the <span className="text-fg font-bold underline decoration-accent/30">{feature ?? "new features"}</span> experience to ensure it meets our premium standard. Stay tuned!
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-fg text-bg text-sm font-bold hover:bg-fg/90 transition-all shadow-soft active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <button
             onClick={() => window.location.reload()}
             className="px-6 py-3 rounded-xl border border-border bg-surface text-sm font-bold text-muted hover:text-fg hover:bg-elevated transition-all active:scale-95"
          >
             Check Again
          </button>
        </div>
      </div>
      
      {/* Footer Decoration */}
      <div className="mt-20 text-[10px] font-mono text-muted/30 tracking-widest uppercase">
         INTERVIEWPAD PRO · EST 2026
      </div>
    </div>
  );
}
