"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Monaco as MonacoApi } from "@monaco-editor/react";
import { FileCode, Lock, Pencil, Plus, X } from "lucide-react";

// Monaco is heavy and browser-only — load it lazily on the client.
const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ── Jest ambient types ────────────────────────────────────────────────────
// Authoring test files inside Monaco would otherwise show red squiggles on
// `test`, `expect`, `describe`, etc. — Monaco's TS service has no Jest
// types by default. We inject a compact `.d.ts` stub so the author sees a
// clean canvas. The actual Sandpack runner still uses the real Jest at
// test time; this is purely a syntax-highlighting / IntelliSense aid.
const JEST_AMBIENT_TYPES = `
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function beforeAll(fn: () => void | Promise<void>): void;
declare function afterAll(fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;

interface JestMatchers {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toStrictEqual(expected: any): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeInstanceOf(c: any): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toBeCloseTo(n: number, digits?: number): void;
  toContain(item: any): void;
  toContainEqual(item: any): void;
  toHaveLength(n: number): void;
  toMatch(re: RegExp | string): void;
  toMatchObject(o: any): void;
  toThrow(msg?: string | RegExp | Error): void;
  resolves: JestMatchers;
  rejects: JestMatchers;
  not: JestMatchers;
}

interface ExpectStatic {
  (actual: any): JestMatchers;
  any(constructor: any): any;
  anything(): any;
  arrayContaining(arr: any[]): any;
  objectContaining(o: any): any;
  stringContaining(s: string): any;
  stringMatching(s: string | RegExp): any;
}

declare const expect: ExpectStatic;
`;

// Once-per-page-load flag so multiple Monaco instances don't redundantly
// reconfigure the shared TS service.
let tsServiceConfigured = false;

function configureTsService(monaco: MonacoApi) {
  if (tsServiceConfigured) return;
  tsServiceConfigured = true;

  // Ignore module-resolution errors — the sibling file imports
  // (e.g. `import { solve } from './index'`) can't be resolved inside this
  // isolated editor, but they're real at test time inside Sandpack. We also
  // ignore "declared but never used" since author boilerplate often has
  // placeholders.
  const opts = {
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      2307, // Cannot find module 'X' or its corresponding type declarations.
      6133, // 'X' is declared but its value is never read.
      6196, // 'X' is declared but never used.
    ],
  };
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(opts);
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(opts);

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    JEST_AMBIENT_TYPES,
    "file:///node_modules/@types/jest-ambient/index.d.ts"
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    JEST_AMBIENT_TYPES,
    "file:///node_modules/@types/jest-ambient/index.d.ts"
  );
}

type Files = Record<string, string>;

const EXT_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  md: "markdown",
};

function langFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? "plaintext";
}

/**
 * Parses an incoming JSON string into a flat { path: code } map. Returns
 * an empty object for malformed input rather than throwing — the form has
 * its own validation that surfaces a friendlier error on save.
 */
function parseFiles(raw: string): Files {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Files = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string") out[k] = v;
      }
      return out;
    }
  } catch {
    // fall through
  }
  return {};
}

function stringifyFiles(files: Files): string {
  return JSON.stringify(files, null, 2);
}

/**
 * Multi-file Monaco-powered editor used in the challenge creator for
 * starter and test file groups. Same wire format as the old JSON textarea
 * (`{ "/path": "code" }`) so the API doesn't need to change.
 *
 * UX:
 *   - File tabs across the top; click to switch, X to remove.
 *   - Plus button opens a small dialog to add a new file (path required).
 *   - Pencil renames the active file.
 *   - Monaco editor below with language detection from the file extension.
 *
 * Sync model: parent passes `value` (JSON string). The editor parses it
 * once at mount and then owns its internal `files` state. If `value`
 * changes externally (e.g. the template picker injects a new file set),
 * we detect the mismatch against the last value we emitted and re-parse.
 */
export default function MonacoFileEditor({
  value,
  onChange,
  hidden = false,
  emptyHint,
  height = 280,
}: {
  value: string;
  onChange: (jsonString: string) => void;
  /** Renders a small "Hidden from participant" lock badge in the tab bar. */
  hidden?: boolean;
  /** Shown when no files exist yet. */
  emptyHint?: string;
  height?: number;
}) {
  const [files, setFiles] = useState<Files>(() => parseFiles(value));
  const [active, setActive] = useState<string>(() => Object.keys(parseFiles(value))[0] ?? "");
  const lastEmittedRef = useRef(value);

  // Sync external resets (e.g. template insert) — but not echoes of our own
  // emissions. We compare against the last value we sent up.
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    const next = parseFiles(value);
    setFiles(next);
    setActive((prev) => (next[prev] !== undefined ? prev : Object.keys(next)[0] ?? ""));
    lastEmittedRef.current = value;
  }, [value]);

  function commit(next: Files, nextActive?: string) {
    setFiles(next);
    if (nextActive !== undefined) setActive(nextActive);
    const json = stringifyFiles(next);
    lastEmittedRef.current = json;
    onChange(json);
  }

  function updateActiveContent(code: string | undefined) {
    if (!active) return;
    if (typeof code !== "string") return;
    if (files[active] === code) return;
    commit({ ...files, [active]: code });
  }

  function addFile() {
    const raw = prompt(
      "New file path — start with '/'\n(e.g. /helpers.ts or /index.test.ts)",
      "/new-file.ts"
    );
    if (!raw) return;
    const path = raw.trim();
    if (!path.startsWith("/")) {
      alert("Path must start with '/'");
      return;
    }
    if (files[path] !== undefined) {
      alert("A file with that path already exists.");
      return;
    }
    commit({ ...files, [path]: "" }, path);
  }

  function removeFile(path: string) {
    if (!confirm(`Remove ${path}?`)) return;
    const next = { ...files };
    delete next[path];
    const keys = Object.keys(next);
    commit(next, active === path ? keys[0] ?? "" : active);
  }

  function renameActive() {
    if (!active) return;
    const raw = prompt(`Rename ${active}`, active);
    if (!raw) return;
    const path = raw.trim();
    if (path === active) return;
    if (!path.startsWith("/")) {
      alert("Path must start with '/'");
      return;
    }
    if (files[path] !== undefined) {
      alert("Another file already uses that path.");
      return;
    }
    const next: Files = {};
    // Preserve insertion order — rename in place rather than appending.
    for (const [k, v] of Object.entries(files)) {
      next[k === active ? path : k] = v;
    }
    commit(next, path);
  }

  const tabKeys = Object.keys(files);
  const activeCode = active ? files[active] : "";
  const language = useMemo(() => (active ? langFor(active) : "plaintext"), [active]);

  return (
    <div className="rounded-lg border border-border bg-bg/40 overflow-hidden">
      <div className="flex items-stretch border-b border-border bg-surface min-h-[36px]">
        <div className="flex-1 flex items-stretch overflow-x-auto">
          {tabKeys.length === 0 && (
            <div className="px-3 py-2 text-[10px] text-muted/50 italic">
              {emptyHint ?? "No files yet."}
            </div>
          )}
          {tabKeys.map((p) => {
            const isActive = p === active;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setActive(p)}
                className={`group inline-flex items-center gap-1.5 px-3 text-[11px] font-mono whitespace-nowrap transition-colors border-r border-border ${
                  isActive
                    ? "bg-bg/60 text-fg"
                    : "text-muted hover:text-fg hover:bg-bg/30"
                }`}
              >
                <FileCode className="w-3 h-3 shrink-0" />
                <span>{p.replace(/^\//, "")}</span>
                <span
                  role="button"
                  aria-label={`Remove ${p}`}
                  className="w-4 h-4 ml-1 grid place-items-center rounded text-muted/60 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(p);
                  }}
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 px-1.5 shrink-0 border-l border-border">
          {hidden && (
            <span
              className="inline-flex items-center gap-1 px-1.5 text-[9px] font-black uppercase tracking-wider text-amber-500"
              title="Hidden from the participant"
            >
              <Lock className="w-2.5 h-2.5" />
              Hidden
            </span>
          )}
          {active && (
            <button
              type="button"
              onClick={renameActive}
              className="w-6 h-6 grid place-items-center rounded text-muted hover:text-fg hover:bg-bg/40 transition"
              title="Rename active file"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={addFile}
            className="w-6 h-6 grid place-items-center rounded text-muted hover:text-accent hover:bg-accent/10 transition"
            title="Add file"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div style={{ height }}>
        {active ? (
          <Monaco
            height="100%"
            language={language}
            theme="vs-dark"
            path={active}
            value={activeCode}
            onChange={updateActiveContent}
            beforeMount={configureTsService}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "var(--font-mono), 'Fira Code', monospace",
              fontLigatures: true,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: "on",
              lineNumbersMinChars: 3,
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: "line",
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              quickSuggestions: { other: true, comments: false, strings: true },
              suggestOnTriggerCharacters: true,
              formatOnPaste: false,
            }}
          />
        ) : (
          <div className="h-full grid place-items-center text-xs text-muted/50">
            Add a file to get started.
          </div>
        )}
      </div>
    </div>
  );
}
