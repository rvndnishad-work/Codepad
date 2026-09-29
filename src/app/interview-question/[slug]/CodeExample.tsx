"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Copy, ExternalLink, FileCode } from "lucide-react";
import { highlight } from "@/lib/code-peek";
import { playgroundHref, playgroundFilesHref } from "@/lib/playground-handoff";
import { variantMeta } from "@/lib/interview-questions/code-variants";
import { LANG_COLOR, badge, codeArea, frame, frameBar, frameLabel, iconBtn, runBtn } from "./_components/codeFrame";

/** Copies a code string, showing a tick for a moment. */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={iconBtn}
      aria-label={done ? "Copied" : "Copy code"}
      title={done ? "Copied" : "Copy code"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
    </button>
  );
}

function templateTech(template: string) {
  return template.replace(/^empty-/, "");
}

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
  /** Multi-file solution: a path -> source map (e.g. { "/App.js": …, "/src/Otp.js": … }). */
  files?: Record<string, string>;
};

/** Pick a highlight.js language from a file path. */
function hljsForPath(path: string): string {
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".vue") || path.endsWith(".html") || path.endsWith(".svelte")) return "xml";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  return "javascript";
}

/**
 * Single-line flattened code (e.g. "'use client' import { … } from 'react' // trimmed")
 * was stored in curated JSON without line breaks — it renders as one overflowing
 * line with a scrollbar (screenshot). If the variant has no "\n" but clearly
 * contains multiple statements, re-insert breaks so highlight + pre-wrap show
 * readable lines. Real multi-line code is returned untouched.
 */
function normalizeCode(code: string): string {
  if (!code || code.includes("\n")) return code;
  // Only split when we see multiple imports/exports on one line — otherwise a
  // legitimate one-liner (e.g. "const x = 1") should stay as-is and just wrap via CSS.
  if (!/(import|export)/.test(code)) return code;
  let s = code;
  // Generic split before import/export when not already at line start — handles
  // "'use client' import" and "// comment) import" without mangling the comment's quotes.
  s = s.replace(/(?<!\n)\s+import\s+(?=\{|\*|["']|\w)/g, "\nimport ");
  s = s.replace(/(?<!\n)\s+export\s+/g, "\nexport ");
  // Don't mangle "} from" inside a single import — keep it together
  return s.trim();
}

/**
 * Renders a multi-file example (component-wise solution): a tab per file +
 * the active file highlighted, with one "Run Playground" that opens every file
 * in the Sandpack workspace (extra files show in the file explorer).
 */
export function MultiFileExample({
  label,
  files,
  template = "empty-react",
}: {
  label?: string;
  files: Record<string, string>;
  /** Sandpack template the "Run Playground" handoff opens (react/vue/angular…). */
  template?: string;
}) {
  // Show the entry file (App / app.component / index) first, then authored order.
  const entryRank = (p: string) =>
    /\/App\.\w+$/.test(p) || /app\.component\.ts$/.test(p) ? 0 : /\/index\.\w+$/.test(p) ? 1 : 2;
  const paths = useMemo(
    () => Object.keys(files).sort((a, b) => entryRank(a) - entryRank(b)),
    [files],
  );
  const [active, setActive] = useState(0);
  const path = paths[Math.min(active, paths.length - 1)];
  const highlighted = useMemo(
    () => highlight(normalizeCode((files[path] ?? "").trim()), hljsForPath(path)),
    [files, path],
  );

  const pathname = usePathname();
  const backFrom = pathname?.startsWith("/interview-question") ? pathname : undefined;

  const code = (files[path] ?? "").trim();
  const tech = templateTech(template);

  return (
    <div className={frame}>
      <div className={frameBar}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={badge}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: LANG_COLOR[tech] ?? "rgb(var(--c-subtle))" }} aria-hidden />
            {variantMeta(tech).label === "Code" ? tech : variantMeta(tech).label}
          </span>
          <span className={frameLabel}>{label || "Solution"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton text={code} />
          <a href={playgroundFilesHref(files, template, backFrom)} target="_blank" rel="noopener noreferrer" className={runBtn}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Open in playground
          </a>
        </div>
      </div>

      {/* Editor-style file tabs directly above the code. */}
      <div role="tablist" aria-label="Files" className="flex items-center gap-1 overflow-x-auto border-b border-border bg-bg/40 px-2 py-1.5 [scrollbar-width:none]">
        {paths.map((p, i) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 font-mono text-xs transition-colors motion-reduce:transition-none ${
              i === active ? "bg-elevated text-fg" : "text-subtle hover:bg-panel hover:text-fg"
            }`}
          >
            <FileCode className="h-3.5 w-3.5 opacity-70" aria-hidden />
            {p.replace(/^\//, "")}
          </button>
        ))}
      </div>

      <pre className={codeArea}>
        <code className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

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

  // Pass the current question URL so the playground can show a "Back" button.
  const pathname = usePathname();
  const backFrom = pathname?.startsWith("/interview-question") ? pathname : undefined;

  const highlighted = useMemo(
    () => highlight(normalizeCode(current.code.trim()), meta.hljs),
    [current.code, meta.hljs],
  );

  const hasDropdown = variants.length > 1;
  // Show "Run Playground" only when the variant isn't flagged non-runnable AND
  // its tech maps to a real playground template (e.g. SQL/unknown have none).
  const openable = current.runnable !== false && Boolean(meta.template);

  return (
    <div className={frame}>
      <div className={frameBar}>
        <div className="flex min-w-0 items-center gap-2.5">
          {hasDropdown ? (
            <label className="relative shrink-0">
              <span className="sr-only">Language or framework</span>
              <span
                className="pointer-events-none absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
                style={{ background: LANG_COLOR[current.tech] ?? "rgb(var(--c-subtle))" }}
                aria-hidden
              />
              <select
                value={active}
                onChange={(e) => setActive(Number(e.target.value))}
                className="h-7 cursor-pointer appearance-none rounded-md border border-border bg-panel pl-6 pr-7 text-xs font-medium text-fg transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
              >
                {variants.map((v, i) => (
                  <option key={i} value={i}>
                    {v.label || variantMeta(v.tech).label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" aria-hidden />
            </label>
          ) : meta.label !== "Code" ? (
            <span className={badge}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: LANG_COLOR[current.tech] ?? "rgb(var(--c-subtle))" }} aria-hidden />
              {meta.label}
            </span>
          ) : null}
          <span className={frameLabel}>{example.label || current.label || "Example"}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <CopyButton text={current.code.trim()} />
          {openable && (
            <a href={playgroundHref(current.code.trim(), meta.template, backFrom)} target="_blank" rel="noopener noreferrer" className={runBtn}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open in playground
            </a>
          )}
        </div>
      </div>

      <pre className={codeArea}>
        <code className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
