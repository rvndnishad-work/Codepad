"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Code, Link2, Heading2, Heading3, List, Table2, SquareCode, Eye, PenLine, Columns2,
} from "lucide-react";
import CodeMirrorField, { type CodeMirrorFieldHandle } from "./CodeMirrorField";
import MarkdownRenderer from "@/components/MarkdownRenderer";

type Mode = "write" | "split" | "preview";

const TABLE_TEMPLATE = `| Column | Column |
| --- | --- |
| Cell | Cell |
| Cell | Cell |`;

const CODE_BLOCK_TEMPLATE = "```javascript\n// code here\n```";

/** Debounce the preview so large answers don't re-render markdown per keystroke. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Markdown editor with a formatting toolbar, syntax highlighting and a live
 * preview rendered through the SAME MarkdownRenderer the public question page
 * uses (allowHtml on: answers embed hand-authored SVG diagrams), so what the
 * admin previews is exactly what candidates see.
 */
export default function MarkdownField({
  label,
  value,
  onChange,
  placeholder,
  minHeight = 160,
  maxHeight = 620,
  defaultMode = "write",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  defaultMode?: Mode;
  hint?: string;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const editorRef = useRef<CodeMirrorFieldHandle>(null);
  const previewValue = useDebounced(value, 250);

  const tools: { icon: React.ComponentType<{ className?: string }>; title: string; run: () => void }[] = [
    { icon: Bold, title: "Bold", run: () => editorRef.current?.wrap("**") },
    { icon: Italic, title: "Italic", run: () => editorRef.current?.wrap("*") },
    { icon: Code, title: "Inline code", run: () => editorRef.current?.wrap("`") },
    { icon: Link2, title: "Link", run: () => editorRef.current?.wrap("[", "](https://)") },
    { icon: Heading2, title: "Heading 2", run: () => editorRef.current?.insertBlock("## Heading") },
    { icon: Heading3, title: "Heading 3", run: () => editorRef.current?.insertBlock("### Heading") },
    { icon: List, title: "Bullet list", run: () => editorRef.current?.insertBlock("- item\n- item") },
    { icon: Table2, title: "Table", run: () => editorRef.current?.insertBlock(TABLE_TEMPLATE) },
    { icon: SquareCode, title: "Code block", run: () => editorRef.current?.insertBlock(CODE_BLOCK_TEMPLATE) },
  ];

  const modeBtn = (m: Mode, icon: React.ComponentType<{ className?: string }>, title: string) => {
    const Icon = icon;
    return (
      <button
        key={m}
        type="button"
        onClick={() => setMode(m)}
        title={title}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
          mode === m ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-elevated"
        }`}
      >
        <Icon className="w-3 h-3" /> <span className="hidden sm:inline">{title}</span>
      </button>
    );
  };

  const editorPane = (
    <CodeMirrorField
      ref={editorRef}
      value={value}
      onChange={onChange}
      language="markdown"
      placeholder={placeholder}
      minHeight={minHeight}
      maxHeight={maxHeight}
    />
  );

  const previewPane = (
    <div className="px-4 py-3 overflow-auto bg-bg/40" style={{ minHeight, maxHeight }}>
      {previewValue.trim() ? (
        <MarkdownRenderer content={previewValue} allowHtml className="prose-sm" />
      ) : (
        <p className="text-xs text-muted italic">Nothing to preview yet.</p>
      )}
    </div>
  );

  return (
    <div>
      <div className="rounded-xl border border-border overflow-hidden focus-within:border-accent/50 transition-colors">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border bg-bg/60">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted px-2 whitespace-nowrap">{label}</span>
            {mode !== "preview" && (
              <div className="flex items-center gap-0.5 border-l border-border pl-1.5 overflow-x-auto">
                {tools.map((tool) => (
                  <button
                    key={tool.title}
                    type="button"
                    onClick={tool.run}
                    title={tool.title}
                    className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated transition shrink-0"
                  >
                    <tool.icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {modeBtn("write", PenLine, "Write")}
            {modeBtn("split", Columns2, "Split")}
            {modeBtn("preview", Eye, "Preview")}
          </div>
        </div>

        {/* Panes */}
        {mode === "write" && editorPane}
        {mode === "preview" && previewPane}
        {mode === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="border-b lg:border-b-0 lg:border-r border-border">{editorPane}</div>
            {previewPane}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-1 px-1">
        <p className="text-[10px] text-muted">{hint ?? "Markdown — GFM tables, code fences and inline SVG supported."}</p>
        <span className="text-[10px] text-muted tabular-nums">{value.length.toLocaleString()} chars</span>
      </div>
    </div>
  );
}
