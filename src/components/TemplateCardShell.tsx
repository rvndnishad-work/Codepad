"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { templateIcon, TemplateLogo } from "@/lib/icons";

/**
 * Shared visual chrome for all "template-style" cards across the app —
 * Templates page tiles, Quick Starts on the homepage, Community Trends,
 * Featured snippets, etc. Owns:
 *   - padding, border-radius, border, hover state
 *   - background-glow on hover (accent-tinted)
 *   - icon stage (fixed pixel size, blob backdrop)
 *   - top-right arrow affordance
 *
 * Each call site renders its own *content* (title, subtitle, chips, author,
 * meta) so cards can keep their unique data shapes without re-implementing
 * the chrome.
 */
export function TemplateCardShell({
  href,
  templateId,
  accent,
  children,
}: {
  href: string;
  templateId?: string;
  /** Override the accent color (otherwise derived from templateId). */
  accent?: string;
  children: React.ReactNode;
}) {
  const meta = templateId ? templateIcon[templateId] : undefined;
  const accentColor = accent ?? meta?.color ?? "var(--accent)";

  return (
    <Link
      href={href}
      // Calmer hover: just scale + shadow + arrow tilt. The previous
      // hover:rotate-1 on the card + hover:-rotate-3 on the icon stacked
      // up to four moving things at once.
      className="group relative flex items-center gap-4 p-4 border border-border bg-surface hover:bg-elevated hover:border-border-strong transition-all duration-300 hover:scale-[1.015] hover: dark:hover: overflow-hidden h-full"
    >
      {/* Accent-tinted hover glow */}

      {/* Icon stage — fixed 64×64 so it never balloons or shrinks with grid width */}
      <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
        <div className="relative w-1/2 h-1/2 flex items-center justify-center transition- duration-300">
          {templateId ? (
            <TemplateLogo
              id={templateId}
              className="w-full h-full"
            />
          ) : null}
        </div>
      </div>

      {/* Content slot */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">{children}</div>
    </Link>
  );
}

/**
 * Standard top row of the card content: title + a faint arrow.
 * Pulled out so titles stay consistent (text-base font-bold) and the arrow
 * affordance is always present in the same spot.
 */
export function CardTitleRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-base font-bold text-fg tracking-tight group-hover:text-accent transition-colors leading-tight truncate">
        {children}
      </span>
      <ArrowUpRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 group- transition-all shrink-0" />
    </div>
  );
}

/** One-line description / subtitle. */
export function CardSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted leading-relaxed line-clamp-1">
      {children}
    </p>
  );
}

/** Small badge chip for tech metadata (e.g. "TS", "0 deps"). */
export function CardChip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent";
}) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
        tone === "accent"
          ? "bg-accent/10 border-accent/30 text-accent"
          : "bg-bg/40 border-border text-muted/80"
      }`}
    >
      {children}
    </span>
  );
}
