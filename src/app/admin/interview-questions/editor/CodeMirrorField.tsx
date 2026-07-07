"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useTheme } from "next-themes";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { markdown } from "@codemirror/lang-markdown";
import { tags as t } from "@lezer/highlight";

/**
 * Theme-aware CodeMirror 6 field for the admin question editor. Shares the
 * pastel token palette with the public playground editor (CodeMirrorEditor)
 * so admin-authored code looks like it will on the question page, and adds
 * markdown-specific tags for the answer/description editors.
 */

export type CodeMirrorFieldHandle = {
  /** Wrap the current selection (or caret) with before/after markers. */
  wrap: (before: string, after?: string) => void;
  /** Insert a block of text on its own line(s) at the caret. */
  insertBlock: (text: string) => void;
  focus: () => void;
};

export type CodeLanguage = "markdown" | "json" | "javascript" | "typescript" | "python" | "sql";

const PALETTE = {
  light: {
    bg: "#f8fafc",
    base: "#1e293b",
    comment: "#64748b",
    keyword: "#be185d",
    string: "#15803d",
    number: "#c2410c",
    fn: "#0369a1",
    heading: "#0f172a",
    link: "#0369a1",
  },
  dark: {
    bg: "#0a0b10",
    base: "#e2e8f0",
    comment: "rgba(148, 163, 184, 0.6)",
    keyword: "#c084fc",
    string: "#6ee7b7",
    number: "#fbbf24",
    fn: "#60a5fa",
    heading: "#f8fafc",
    link: "#60a5fa",
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
    // Markdown-specific
    { tag: [t.heading], color: c.heading, fontWeight: "800" },
    { tag: [t.strong], color: c.heading, fontWeight: "700" },
    { tag: [t.emphasis], color: c.base, fontStyle: "italic" },
    { tag: [t.link, t.url], color: c.link, textDecoration: "underline" },
    { tag: [t.monospace], color: c.string },
    { tag: [t.quote], color: c.comment, fontStyle: "italic" },
    { tag: [t.strikethrough], textDecoration: "line-through" },
  ]);
}

function languageExtension(language: CodeLanguage): Extension {
  switch (language) {
    case "markdown":
      return markdown();
    case "python":
      return python();
    case "sql":
      return sql();
    case "typescript":
      return javascript({ typescript: true });
    case "json":
    case "javascript":
    default:
      return javascript();
  }
}

const CodeMirrorField = forwardRef<CodeMirrorFieldHandle, {
  value: string;
  onChange: (v: string) => void;
  language?: CodeLanguage;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
}>(function CodeMirrorField(
  { value, onChange, language = "markdown", placeholder, minHeight = 120, maxHeight = 560 },
  ref,
) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useImperativeHandle(ref, () => ({
    wrap(before: string, after: string = before) {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: `${before}${selected}${after}` },
        selection: { anchor: from + before.length, head: from + before.length + selected.length },
      });
      view.focus();
    },
    insertBlock(text: string) {
      const view = viewRef.current;
      if (!view) return;
      const { to } = view.state.selection.main;
      const line = view.state.doc.lineAt(to);
      const prefix = line.length === 0 ? "" : "\n\n";
      const insert = `${prefix}${text}\n`;
      view.dispatch({
        changes: { from: line.to, to: line.to, insert },
        selection: { anchor: line.to + insert.length - 1 },
      });
      view.focus();
    },
    focus() {
      viewRef.current?.focus();
    },
  }), []);

  useEffect(() => {
    if (!hostRef.current) return;
    const c = isDark ? PALETTE.dark : PALETTE.light;

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        languageExtension(language),
        syntaxHighlighting(highlightStyleFor(isDark)),
        EditorView.lineWrapping,
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
        EditorView.theme(
          {
            "&": {
              minHeight: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
              fontSize: "12.5px",
              backgroundColor: c.bg,
              color: c.base,
            },
            ".cm-scroller": {
              fontFamily: 'var(--font-mono), "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
              lineHeight: "1.65",
              overflow: "auto",
              padding: "14px 16px",
              minHeight: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
            },
            ".cm-content": { padding: "0", caretColor: c.fn },
            ".cm-line": { padding: "0" },
            "&.cm-focused": { outline: "none" },
            ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.fn },
            ".cm-placeholder": { color: c.comment, fontStyle: "italic" },
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
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [isDark, language, placeholder, minHeight, maxHeight]);

  // Sync external value changes (e.g. Format JSON) into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} className="rounded-xl overflow-hidden" />;
});

export default CodeMirrorField;
