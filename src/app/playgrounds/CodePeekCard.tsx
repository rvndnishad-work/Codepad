"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Terminal, Sparkles, Play } from "lucide-react";
import { templateIcon, TemplateLogo } from "@/lib/icons";
import type { TemplateDef } from "@/lib/templates";
import { highlight, pickShowpiece, trimForPeek } from "@/lib/code-peek";

type Variant = "featured" | "standard";

const LANG_LABEL: Record<string, string> = {
  typescript: "TS",
  javascript: "JS",
  xml: "Markup",
  css: "CSS",
  plaintext: "Text",
};

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

// Simple helper to convert hex to rgb for custom CSS glows
function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return "255, 230, 0"; // fallback yellow
}

export function CodePeekCard({
  t,
  variant = "standard",
}: {
  t: TemplateDef;
  variant?: Variant;
}) {
  const showpiece = useMemo(() => pickShowpiece(t), [t]);
  const maxLines = variant === "featured" ? 12 : 7;
  const highlighted = useMemo(() => {
    if (!showpiece) return "";
    return highlight(trimForPeek(showpiece.code, maxLines), showpiece.lang);
  }, [showpiece, maxLines]);

  const accent = templateIcon[t.id]?.color ?? t.accent ?? "var(--accent)";
  const rgbAccent = useMemo(() => hexToRgb(accent), [accent]);
  const depCount = t.dependencies ? Object.keys(t.dependencies).length : 0;
  const isFeatured = variant === "featured";

  return (
    <Link
      href={`/play?template=${t.id}`}
      style={{
        "--theme-accent": accent,
        "--theme-accent-rgb": rgbAccent,
      } as React.CSSProperties}
      className={`group relative flex flex-col rounded-2xl border border-border/80 bg-surface/80 dark:bg-[#11131a]/85 backdrop-blur-md overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-[rgba(var(--theme-accent-rgb),0.4)] ${
        isFeatured
          ? "min-h-[350px] lg:col-span-1"
          : "min-h-[220px]"
      } hover:shadow-[0_20px_50px_-12px_rgba(var(--theme-accent-rgb),0.18)]`}
    >
      {/* Dynamic ambient glow behind the card content */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[64px] opacity-10 group-hover:opacity-25 transition-all duration-700 pointer-events-none"
        style={{ background: accent }}
      />
      
      {/* Top running environment visual accent line */}
      <div 
        className="absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />

      {/* Terminal Titlebar Chrome */}
      <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg/40 backdrop-blur-md">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 group-hover:bg-rose-500 transition-colors" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 group-hover:bg-amber-500 transition-colors" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 group-hover:bg-emerald-500 transition-colors" />
        </div>
        
        {/* Active file indicator tab */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-md bg-surface/50 border border-border/60 text-[10px] font-mono text-muted group-hover:text-fg transition-colors">
          <Terminal className="w-3 h-3 text-[rgba(var(--theme-accent-rgb),0.8)]" />
          <span className="truncate max-w-[120px] font-medium">
            {showpiece ? basename(showpiece.path) : "sandbox"}
          </span>
        </div>

        {showpiece && (
          <span
            className="text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase border transition-all duration-300"
            style={{
              color: accent,
              borderColor: `rgba(${rgbAccent}, 0.25)`,
              background: `rgba(${rgbAccent}, 0.08)`,
            }}
          >
            {LANG_LABEL[showpiece.lang] ?? showpiece.lang}
          </span>
        )}
      </div>

      {/* Live code peek preview area */}
      <div className="relative flex-1 min-h-0 bg-[#07090e] dark:bg-[#07090e] overflow-hidden group-hover:bg-[#05070a] transition-colors duration-500">
        {/* Subtle code terminal scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.025),rgba(0,255,0,0.01),rgba(0,0,255,0.025))] bg-[size:100%_4px,3px_100%] opacity-20 pointer-events-none" />

        {showpiece ? (
          <pre
            className={`code-peek font-mono leading-relaxed text-slate-300 m-0 px-5 py-4 whitespace-pre overflow-hidden transition-all duration-500 ${
              isFeatured ? "text-[12px]" : "text-[11px]"
            } group-hover:text-slate-100`}
          >
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        ) : (
          <div className="px-5 py-4 text-[11px] text-slate-500 font-mono italic">
            // empty sandbox template
          </div>
        )}
        
        {/* Premium fading mask so the code doesn't look cut off */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#07090e] to-transparent pointer-events-none group-hover:h-20 transition-all duration-500" />
        
        {/* Interactive hover float: "Click to Launch ⚡" */}
        <div className="absolute inset-0 flex items-center justify-center bg-[#07090e]/60 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg border border-border shadow-2xl scale-95 group-hover:scale-100 transition-all duration-300">
            <Play className="w-3.5 h-3.5 fill-current text-[rgba(var(--theme-accent-rgb),1)]" />
            <span className="text-xs font-bold tracking-wide text-fg">
              Launch Sandbox
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info Panel */}
      <div className="relative flex items-center gap-3.5 px-4 py-3.5 border-t border-border bg-surface/90 dark:bg-[#11131a]/95 backdrop-blur-md transition-colors duration-500 group-hover:bg-bg/40">
        <div
          className="w-8.5 h-8.5 rounded-xl border border-border/80 grid place-items-center shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
          style={{ 
            background: `rgba(${rgbAccent}, 0.08)`,
            borderColor: `rgba(${rgbAccent}, 0.15)`
          }}
        >
          <TemplateLogo id={t.id} size={18} />
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-fg leading-tight truncate group-hover:text-[rgba(var(--theme-accent-rgb),1)] transition-colors duration-300">
              {t.title}
            </span>
            {isFeatured && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500 uppercase tracking-widest">
                <Sparkles className="w-2 h-2" />
                Popular
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted truncate mt-0.5">
            {t.subtitle ?? (depCount > 0 ? `${depCount} npm package${depCount === 1 ? "" : "s"}` : "Zero-install starter")}
          </div>
        </div>

        {/* Dynamic button with shifting arrow icon */}
        <div className="w-7 h-7 rounded-lg border border-border bg-bg/50 grid place-items-center group-hover:border-[rgba(var(--theme-accent-rgb),0.3)] group-hover:bg-[rgba(var(--theme-accent-rgb),0.1)] transition-all shrink-0">
          <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-[rgba(var(--theme-accent-rgb),1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
        </div>
      </div>
    </Link>
  );
}
