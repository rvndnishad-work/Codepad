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
      className="wow-card-glow group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
    >
      {/* Window chrome — dots left, file name centered, lang pill right */}
      {!compact && (
        <div className="relative flex items-center bg-black/30 px-4 py-2.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="absolute left-1/2 max-w-[140px] -translate-x-1/2 truncate font-mono text-[11px] text-white/50">
            {showpiece ? basename(showpiece.path) : "sandbox"}
          </span>
          <div className="z-10 ml-auto flex items-center gap-1.5">
            {t.group === "backend" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                JIT 0ms
              </span>
            )}
            {showpiece && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-widest"
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
        <div className="relative flex overflow-hidden bg-[#07090e]">
          {/* Line gutter */}
          <div className="shrink-0 select-none px-3 py-3 text-right font-mono text-[11px] leading-relaxed text-slate-700">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code column */}
          <div className="relative min-w-0 flex-1 py-3 pr-4">
            {showpiece ? (
              <pre
                className={`code-peek m-0 whitespace-pre font-mono leading-relaxed text-slate-300 overflow-hidden ${
                  isFeatured ? "text-[12px]" : "text-[11px]"
                }`}
              >
                <code dangerouslySetInnerHTML={{ __html: highlighted }} />
              </pre>
            ) : (
              <pre className="m-0 font-mono text-[11px] italic leading-relaxed text-slate-600">
                // empty sandbox
              </pre>
            )}

            {/* Faux cursor block — sits at the first unused line so the card
                feels like an open editor waiting for input. */}
            <span
              aria-hidden
              className={`absolute left-0 inline-block bg-[#8b93ff]/90 ${
                isFeatured ? "w-[7px] h-[14px]" : "w-[6px] h-[12px]"
              }`}
              style={{
                top: `calc(0.75rem + (${cursorRow - 1}) * ${isFeatured ? "1.65em" : "1.6em"})`,
              }}
            />
          </div>
          {/* bottom fade into the footer */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#07090e] to-transparent" />
        </div>
      )}

      {/* Accent-tinted hover glow */}
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 z-0 h-32 w-32 rounded-full opacity-0 blur-[50px] transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: accent }}
      />

      {/* Footer: gradient icon stage + title row + subtitle */}
      <div className="relative z-10 flex items-center gap-4 p-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <div
            className="absolute inset-0 opacity-25 blur-[1px] transition-opacity duration-500 group-hover:opacity-50"
            style={{ background: accent, borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%" }}
          />
          <div className="relative flex h-1/2 w-1/2 items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <TemplateLogo id={t.id} className="h-full w-full" />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-base font-black leading-tight tracking-tight text-[var(--wow-fg)]">
              {t.title}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--wow-faint)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#8b93ff]" />
          </div>
          <p className="line-clamp-1 text-[11px] leading-relaxed text-[var(--wow-faint)]">
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
