"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
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
  python: "Python",
  go: "Go",
  java: "Java",
  cpp: "C++",
  rust: "Rust",
};

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

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
  return "139, 92, 246";
}

export function CodePeekCard({
  t,
  variant = "standard",
  compact = false,
}: {
  t: TemplateDef;
  variant?: Variant;
  compact?: boolean;
}) {
  const showpiece = useMemo(() => pickShowpiece(t), [t]);
  // Always render 5 lines worth of room so cards in a row stay the same
  // height even when the underlying file is shorter than the window.
  const maxLines = 5;
  const trimmedCode = useMemo(
    () => (showpiece ? trimForPeek(showpiece.code, maxLines) : ""),
    [showpiece]
  );
  const highlighted = useMemo(
    () =>
      showpiece ? highlight(trimmedCode, showpiece.lang) : "",
    [showpiece, trimmedCode]
  );

  const accent = templateIcon[t.id]?.color ?? t.accent ?? "var(--accent)";
  const rgbAccent = useMemo(() => hexToRgb(accent), [accent]);
  const depCount = t.dependencies ? Object.keys(t.dependencies).length : 0;
  const isFeatured = variant === "featured";

  // Pad line numbers so every card shows the same 1..5 gutter even when the
  // code itself only fills three lines. The "phantom" lines render an empty
  // pre body so the cursor block (last line) lines up with the gutter.
  const codeLineCount = trimmedCode ? trimmedCode.split("\n").length : 0;
  const lineCount = Math.max(maxLines, codeLineCount);
  const cursorRow = Math.min(codeLineCount + 1, lineCount);

  return (
    <Link
      href={`/play?template=${t.id}`}
      data-accent-rgb={rgbAccent}
      style={
        {
          "--theme-accent": accent,
          "--theme-accent-rgb": rgbAccent,
        } as React.CSSProperties
      }
      className="group relative flex flex-col rounded-2xl border border-border bg-surface dark:bg-panel overflow-hidden transition-all duration-300 ease-out will-change-transform hover:scale-[1.02] hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.45)]"
    >
      {/* Window chrome — dots left, file name centered, lang pill right */}
      {!compact && (
        <div className="relative flex items-center px-4 py-2.5 bg-bg/40 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 text-[11px] font-mono text-muted truncate max-w-[140px]">
            {showpiece ? basename(showpiece.path) : "sandbox"}
          </span>
          <div className="ml-auto flex items-center gap-1.5 z-10">
            {t.group === "backend" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                JIT 0ms
              </span>
            )}
            {showpiece && (
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest"
                style={{
                  color: accent,
                  background: `rgba(${rgbAccent}, 0.15)`,
                }}
              >
                {LANG_LABEL[showpiece.lang] ?? showpiece.lang}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Code body with line-number gutter and trailing cursor block */}
      {!compact && (
        <div className="relative flex bg-[#07090e] dark:bg-[#07090e] overflow-hidden">
          {/* Line gutter */}
          <div
            className={`shrink-0 select-none px-3 py-3 font-mono text-slate-700 leading-relaxed text-right ${
              isFeatured ? "text-[11px]" : "text-[10px]"
            }`}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code column */}
          <div className="relative flex-1 min-w-0 py-3 pr-4">
            {showpiece ? (
              <pre
                className={`code-peek font-mono leading-relaxed text-slate-300 m-0 whitespace-pre overflow-hidden ${
                  isFeatured ? "text-[12px]" : "text-[11px]"
                }`}
              >
                <code dangerouslySetInnerHTML={{ __html: highlighted }} />
              </pre>
            ) : (
              <pre className="font-mono leading-relaxed text-slate-600 italic text-[11px] m-0">
                // empty sandbox
              </pre>
            )}

            {/* Faux cursor block — sits at the first unused line so the card
                feels like an open editor waiting for input. */}
            <span
              aria-hidden
              className={`absolute left-0 inline-block bg-violet-500/80 ${
                isFeatured ? "w-[7px] h-[14px]" : "w-[6px] h-[12px]"
              }`}
              style={{
                top: `calc(0.75rem + (${cursorRow - 1}) * ${isFeatured ? "1.65em" : "1.6em"})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Accent-tinted hover glow */}
      <div
        className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none z-0"
        style={{ background: accent }}
      />

      {/* Footer — mirrors the home-page TemplateCardShell card bottom:
          a blob-shaped icon stage whose accent color glows on hover, then
          the title row with an inline arrow and a subtitle below. */}
      <div className={`relative flex items-center gap-4 p-4 bg-surface/90 dark:bg-[#11131a]/95 z-10 group-hover:bg-elevated/40 transition-colors ${compact ? "" : "border-t border-black/[0.06] dark:border-white/[0.06]"}`}>
        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%] opacity-20 group-hover:opacity-40 transition-opacity duration-500 blur-[1px]"
            style={{ background: accent }}
          />
          <div className="relative w-1/2 h-1/2 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <TemplateLogo id={t.id} className="w-full h-full" />
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base font-black text-fg tracking-tight leading-tight truncate dark:group-hover:text-[rgba(var(--theme-accent-rgb),1)] transition-colors">
                {t.title}
              </span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </div>
          <p className="text-[11px] text-muted leading-relaxed line-clamp-1">
            {t.subtitle ??
              (depCount > 0
                ? `${depCount} ${depCount === 1 ? "dep" : "deps"}`
                : "Zero-install starter")}
          </p>
        </div>
      </div>
    </Link>
  );
}
