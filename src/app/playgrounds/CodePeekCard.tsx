"use client";

import Link from "next/link";
import { useMemo } from "react";
import { templateIcon, TemplateLogo } from "@/lib/icons";
import type { TemplateDef } from "@/lib/templates";
import { highlight, pickShowpiece, trimForPeek } from "@/lib/code-peek";
import { runsOnServer, templateBlurb } from "@/lib/playground-catalog";

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

/** Stable per-template offset into the backdrop loop, so cards drift apart. */
function loopOffset(id: string): string {
  let n = 0;
  for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 1400;
  return `-${(n / 100).toFixed(1)}s`;
}

/** Brand logo on its tinted, slowly morphing backdrop. */
export function LogoBlob({ t, size }: { t: TemplateDef; size: number }) {
  const color = templateIcon[t.id]?.color ?? t.accent ?? "var(--accent)";
  const delay = loopOffset(t.id);
  return (
    <span
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, color }}
      aria-hidden
    >
      <span className="pgl-blob" style={{ background: color, animationDelay: delay }} />
      <span className="pgl-ring" style={{ animationDelay: delay }} />
      <TemplateLogo id={t.id} size={Math.round(size / 2)} className="pgl-logo" />
    </span>
  );
}

/** Where the code runs, as a dot and a word. */
export function RuntimeTag({ t }: { t: TemplateDef }) {
  const server = runsOnServer(t);
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-subtle">
      <span className={`h-1.5 w-1.5 rounded-full ${server ? "bg-secondary" : "bg-success"}`} aria-hidden />
      {server ? "Server" : "Browser"}
    </span>
  );
}

/** Catalogue card: logo, name, where it runs and what is inside. */
export function CatalogCard({ t }: { t: TemplateDef }) {
  return (
    <Link
      href={`/play?template=${t.id}`}
      className="pgl-card group flex h-[88px] items-center gap-3.5 rounded-2xl border border-border bg-surface py-3.5 pl-3.5 pr-4 hover:border-border-strong hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <LogoBlob t={t} size={56} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-fg">{t.title}</span>
          <RuntimeTag t={t} />
        </span>
        <span className="truncate text-[13px] text-subtle">{templateBlurb(t)}</span>
      </span>
    </Link>
  );
}

const PEEK_LINES = 6;

/** Card with the opening lines of the template's main file. */
export function CodePeekCard({ t }: { t: TemplateDef }) {
  const showpiece = useMemo(() => pickShowpiece(t), [t]);
  const code = useMemo(() => (showpiece ? trimForPeek(showpiece.code, PEEK_LINES) : ""), [showpiece]);
  const html = useMemo(() => (showpiece ? highlight(code, showpiece.lang) : ""), [showpiece, code]);
  // Always draw the same gutter so cards in a row line up.
  const gutter = Array.from({ length: PEEK_LINES }, (_, i) => i + 1);

  return (
    <Link
      href={`/play?template=${t.id}`}
      className="pgl-card group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="flex h-9 items-center justify-between border-b border-border bg-panel/50 px-3.5">
        <span className="truncate font-mono text-xs text-subtle">
          {showpiece ? basename(showpiece.path) : "sandbox"}
        </span>
        <RuntimeTag t={t} />
      </span>
      <span className="flex h-[138px] overflow-hidden bg-bg pr-3.5 pt-3">
        <span className="w-9 shrink-0 select-none pr-3 text-right font-mono text-xs leading-5 text-subtle/50" aria-hidden>
          {gutter.map((n) => (
            <span key={n} className="block">
              {n}
            </span>
          ))}
        </span>
        <pre className="code-peek m-0 min-w-0 flex-1 overflow-hidden whitespace-pre font-mono text-xs leading-5 text-muted">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </span>
      <span className="flex items-center gap-3 border-t border-border px-3.5 py-3">
        <LogoBlob t={t} size={52} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold text-fg">{t.title}</span>
          <span className="truncate text-[13px] text-subtle">{templateBlurb(t)}</span>
        </span>
        <span className="pgl-open text-accent" aria-hidden>
          →
        </span>
      </span>
    </Link>
  );
}
