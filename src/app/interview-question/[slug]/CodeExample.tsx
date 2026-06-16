"use client";

import { useMemo, useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";
import { highlight } from "@/lib/code-peek";
import { playgroundHref } from "@/lib/playground-handoff";
import { variantMeta } from "@/lib/interview-questions/code-variants";

export type ExampleVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type ExampleData = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: ExampleVariant[];
};

/**
 * Renders one code example as a syntax-highlighted (theme-aware `.iq-hl`) block.
 * If the example has multiple `variants` (e.g. the same algorithm in Python /
 * Go / Java, or a UI in React / Vue / Angular), a dropdown switches between them
 * and each variant's "Open in Playground" hands off to its own template.
 *
 * `defaultTech` is the implicit tech for a single-variant example that has no
 * explicit `tech` (e.g. React question examples are JS/JSX).
 */
export default function CodeExample({
  example,
  defaultTech,
}: {
  example: ExampleData;
  defaultTech?: string;
}) {
  // Normalize to a list of variants so single/multi share one render path.
  const variants: ExampleVariant[] = useMemo(() => {
    if (example.variants && example.variants.length > 0) return example.variants;
    return [
      {
        tech: example.tech ?? defaultTech ?? "",
        code: example.code ?? "",
        runnable: example.runnable,
      },
    ];
  }, [example, defaultTech]);

  const [active, setActive] = useState(0);
  const current = variants[Math.min(active, variants.length - 1)];
  const meta = variantMeta(current.tech);

  const highlighted = useMemo(
    () => highlight(current.code.trim(), meta.hljs),
    [current.code, meta.hljs],
  );

  const hasDropdown = variants.length > 1;
  // Show "Run Playground" only when the variant isn't flagged non-runnable AND
  // its tech maps to a real playground template (e.g. SQL/unknown have none).
  const openable = current.runnable !== false && Boolean(meta.template);

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-bg/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-black text-muted tracking-wide truncate">
            {example.label || current.label || "Code"}
          </span>
          {hasDropdown && (
            <div className="relative shrink-0">
              <select
                value={active}
                onChange={(e) => setActive(Number(e.target.value))}
                aria-label="Choose language / framework"
                className="appearance-none cursor-pointer pl-2.5 pr-7 py-1 rounded-lg border border-border bg-bg text-[11px] font-bold text-fg hover:border-accent/40 focus:outline-none focus:border-accent/60 transition"
              >
                {variants.map((v, i) => (
                  <option key={i} value={i}>
                    {v.label || variantMeta(v.tech).label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {openable && (
          <a
            href={playgroundHref(current.code.trim(), meta.template)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl bg-accent text-bg text-[10px] font-black uppercase tracking-wider hover:bg-accent-soft transition duration-200 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Run Playground
          </a>
        )}
      </div>

      <pre className="iq-hl p-4 overflow-auto text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0a0b10]">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
