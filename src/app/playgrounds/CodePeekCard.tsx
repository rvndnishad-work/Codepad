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
};

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

export function CodePeekCard({
  t,
  variant = "standard",
}: {
  t: TemplateDef;
  variant?: Variant;
}) {
  const showpiece = useMemo(() => pickShowpiece(t), [t]);
  const maxLines = variant === "featured" ? 11 : 6;
  const highlighted = useMemo(() => {
    if (!showpiece) return "";
    return highlight(trimForPeek(showpiece.code, maxLines), showpiece.lang);
  }, [showpiece, maxLines]);

  const accent = templateIcon[t.id]?.color ?? t.accent ?? "var(--accent)";
  const depCount = t.dependencies ? Object.keys(t.dependencies).length : 0;

  // Featured tiles read more like a code-window screenshot — slightly larger
  // window chrome, bigger code, more vertical room. Standard tiles get a
  // tighter, snippet-sized window so they tile densely.
  const isFeatured = variant === "featured";

  return (
    <Link
      href={`/play?template=${t.id}`}
      className={`group relative flex flex-col rounded-2xl border border-border bg-surface hover:border-border-strong overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] ${
        isFeatured ? "min-h-[320px]" : "min-h-[200px]"
      }`}
    >
      {/* Accent halo on hover — tinted by template color, lives behind chrome. */}
      <div
        className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
        style={{ background: accent }}
      />

      {/* Window chrome — file path + lang pill, mac-style dots on the left. */}
      <div className="relative flex items-center gap-2 px-3 py-2 border-b border-border bg-bg/40">
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-2 h-2 rounded-full bg-rose-500/50" />
          <span className="w-2 h-2 rounded-full bg-amber-500/50" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
        </div>
        <span className="text-[10px] font-mono text-muted truncate flex-1 min-w-0">
          {showpiece ? basename(showpiece.path) : "—"}
        </span>
        {showpiece && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{
              color: accent,
              background: `${accent}1a`,
            }}
          >
            {LANG_LABEL[showpiece.lang] ?? showpiece.lang}
          </span>
        )}
      </div>

      {/* Code body */}
      <div className="relative flex-1 min-h-0 bg-[#0b0f17] dark:bg-[#0b0f17] overflow-hidden">
        {showpiece ? (
          <pre
            className={`code-peek font-mono leading-relaxed text-slate-200 m-0 px-4 py-3 whitespace-pre overflow-hidden ${
              isFeatured ? "text-[12px]" : "text-[11px]"
            }`}
          >
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        ) : (
          <div className="px-4 py-3 text-[11px] text-slate-500 font-mono">
            // empty
          </div>
        )}
        {/* Bottom gradient fade — hints there's more code without scroll. */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0b0f17] to-transparent pointer-events-none" />
      </div>

      {/* Footer — template identity + open affordance */}
      <div className="relative flex items-center gap-3 px-4 py-3 border-t border-border bg-surface">
        <div
          className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
          style={{ background: `${accent}1a` }}
        >
          <TemplateLogo id={t.id} size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-fg leading-tight truncate group-hover:text-accent transition-colors">
            {t.title}
          </div>
          <div className="text-[10px] text-muted truncate">
            {t.subtitle ?? (depCount > 0 ? `${depCount} ${depCount === 1 ? "dep" : "deps"}` : "Zero deps")}
          </div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted/40 group-hover:text-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}
