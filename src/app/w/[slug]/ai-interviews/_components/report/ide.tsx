"use client";

/**
 * Editor chrome shared by the Code changes and Run the code tabs, in the
 * Playground's look: a file list, Monaco with the house theme, and a status
 * bar. Everything here is read only.
 */
import type { ReactNode } from "react";
import type { Monaco } from "@monaco-editor/react";
import "@/lib/monaco-loader";
import { Eye, FileCode2 } from "lucide-react";
import { defineNanoBananaThemes } from "@/lib/monaco-themes";
import { DEFAULT_EDITOR_THEME_ID, editorThemeById } from "@/lib/editor-themes";
import { extColorFor } from "@/lib/monaco-langs";

export const EDITOR_THEME = editorThemeById(DEFAULT_EDITOR_THEME_ID).monaco;

export function beforeMount(monaco: Monaco) {
  defineNanoBananaThemes(monaco);
}

export const READ_ONLY_OPTIONS = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  fontSize: 13,
  fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  lineHeight: 20,
  scrollBeyondLastLine: false,
  renderLineHighlight: "none" as const,
  automaticLayout: true,
  padding: { top: 10 },
  wordWrap: "on" as const,
};

/** Display path without the leading slash. */
export function shortPath(p: string): string {
  return p.replace(/^\//, "");
}

export function IdeFrame({ toolbar, children, status, height = 620 }: { toolbar: ReactNode; children: ReactNode; status: ReactNode; height?: number }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-surface flex flex-col" style={{ height }}>
      <div className="flex flex-wrap items-center gap-2 min-h-11 px-2 py-1 border-b border-border bg-surface">{toolbar}</div>
      <div className="flex flex-1 min-h-0">{children}</div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-h-7 px-3 py-1 border-t border-border bg-surface text-xs text-subtle">{status}</div>
    </div>
  );
}

export function FileTab({ path }: { path: string }) {
  return (
    <span className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-bg text-[13px] text-fg border-t-2 border-[#ffe600]">
      <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: extColorFor(path) }} />
      <span className="font-mono">{shortPath(path)}</span>
    </span>
  );
}

export function ReadOnlyTag() {
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-border-strong text-xs text-muted">
      <Eye className="w-3 h-3" aria-hidden /> Read only
    </span>
  );
}

export type FileEntry = { path: string; badge?: ReactNode };

export function FilesPane({
  groups,
  active,
  onPick,
  width = 210,
}: {
  groups: { label?: string; files: FileEntry[] }[];
  active: string;
  onPick: (path: string) => void;
  width?: number;
}) {
  return (
    <nav aria-label="Files" className="hidden sm:flex flex-col shrink-0 border-r border-border bg-surface overflow-y-auto py-2" style={{ width }}>
      {groups.map((g, gi) =>
        g.files.length ? (
          <div key={gi} className="flex flex-col">
            {g.label && <span className={`px-3 pb-1 text-[11px] text-subtle ${gi ? "pt-3" : "pt-1"}`}>{g.label}</span>}
            {g.files.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => onPick(f.path)}
                aria-current={f.path === active ? "true" : undefined}
                className={`flex items-center gap-2 mx-1.5 px-2 h-8 rounded-md text-left text-[13px] font-mono transition ${
                  f.path === active ? "bg-elevated text-fg" : "text-muted hover:text-fg hover:bg-panel"
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" style={{ color: extColorFor(f.path) }} aria-hidden />
                <span className="flex-1 truncate">{shortPath(f.path)}</span>
                {f.badge}
              </button>
            ))}
          </div>
        ) : null,
      )}
    </nav>
  );
}

/** Phone fallback for the file list. */
export function FileSelect({ files, active, onPick }: { files: string[]; active: string; onPick: (p: string) => void }) {
  return (
    <select
      aria-label="File"
      value={active}
      onChange={(e) => onPick(e.target.value)}
      className="sm:hidden h-8 max-w-[160px] rounded-md border border-border bg-bg px-2 text-[13px] text-fg font-mono"
    >
      {files.map((p) => (
        <option key={p} value={p}>
          {shortPath(p)}
        </option>
      ))}
    </select>
  );
}

export function Seg<T extends string>({ items, value, onChange, label }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-[3px] rounded-lg border border-border-strong gap-0.5">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="radio"
          aria-checked={it.id === value}
          onClick={() => onChange(it.id)}
          className={`h-7 px-3 rounded-md text-[13px] transition ${it.id === value ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
