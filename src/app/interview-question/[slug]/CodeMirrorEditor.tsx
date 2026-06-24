"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { tags as t } from "@lezer/highlight";

/**
 * Editable CodeMirror 6 editor for the in-page JS playground. Its theme mirrors
 * the static `.iq-hl` highlight used by CodeExample on React/DSA questions (same
 * pastel token palette, mono font, size, spacing and surface) so a JavaScript
 * question's snippet looks identical to every other question's code block. The
 * editor is re-created when the light/dark theme changes.
 */

// Token palette copied verbatim from the `.iq-hl` rules in globals.css so the
// editor and the static highlighter render code with the exact same colours.
const PALETTE = {
  light: {
    bg: "#f8fafc", // slate-50
    base: "#1e293b", // slate-800
    comment: "#64748b",
    keyword: "#be185d",
    string: "#15803d",
    number: "#c2410c",
    fn: "#0369a1",
    variable: "#a21caf",
  },
  dark: {
    bg: "#0a0b10",
    base: "#e2e8f0", // slate-200
    comment: "rgba(148, 163, 184, 0.6)",
    keyword: "#c084fc",
    string: "#6ee7b7",
    number: "#fbbf24",
    fn: "#60a5fa",
    variable: "#f0abfc",
  },
} as const;

function highlightStyleFor(dark: boolean) {
  const c = dark ? PALETTE.dark : PALETTE.light;
  return HighlightStyle.define([
    { tag: [t.comment, t.lineComment, t.blockComment], color: c.comment, fontStyle: "italic" },
    {
      tag: [
        t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword,
        t.moduleKeyword, t.modifier, t.self, t.bool, t.null, t.atom,
      ],
      color: c.keyword,
    },
    { tag: [t.string, t.special(t.string), t.regexp], color: c.string },
    { tag: [t.number], color: c.number },
    {
      tag: [
        t.function(t.variableName), t.function(t.definition(t.variableName)),
        t.function(t.propertyName), t.definition(t.function(t.variableName)),
        t.className, t.typeName, t.namespace,
      ],
      color: c.fn,
    },
    { tag: [t.propertyName], color: c.fn },
    { tag: [t.variableName, t.definition(t.variableName), t.local(t.variableName)], color: c.base },
    { tag: [t.operator, t.punctuation, t.bracket, t.separator], color: c.base },
  ]);
}

export default function CodeMirrorEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!hostRef.current) return;
    const c = isDark ? PALETTE.dark : PALETTE.light;

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        javascript(),
        syntaxHighlighting(highlightStyleFor(isDark)),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
        // Match CodeExample's <pre className="iq-hl p-4 text-xs font-mono
        // leading-relaxed text-slate-800 dark:text-slate-200 bg-slate-50
        // dark:bg-[#0a0b10]"> exactly — no gutter, same font/size/spacing/surface.
        EditorView.theme(
          {
            "&": {
              maxHeight: "360px",
              fontSize: "12px",
              backgroundColor: c.bg,
              color: c.base,
            },
            ".cm-scroller": {
              fontFamily: 'var(--font-mono), "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
              lineHeight: "1.625",
              overflow: "auto",
              padding: "16px",
            },
            ".cm-content": { padding: "0", caretColor: c.fn },
            ".cm-line": { padding: "0" },
            "&.cm-focused": { outline: "none" },
            ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.fn },
            ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
              backgroundColor: isDark ? "rgba(96,165,250,0.22)" : "rgba(3,105,161,0.14)",
            },
          },
          { dark: isDark },
        ),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // Sync external value changes (e.g. Reset) into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} />;
}
