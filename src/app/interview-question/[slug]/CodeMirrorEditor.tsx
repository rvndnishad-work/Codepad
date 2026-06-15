"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

/**
 * Editable CodeMirror 6 editor with JavaScript syntax highlighting that follows
 * the app's light/dark theme (next-themes): one-dark in dark mode, the default
 * light highlight style in light mode. Reuses the app's existing @codemirror/*
 * packages. The editor is re-created when the theme changes so highlighting and
 * colours stay in sync.
 */
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
    const themeExt = isDark
      ? oneDark
      : syntaxHighlighting(defaultHighlightStyle, { fallback: true });

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        javascript(),
        themeExt,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
        EditorView.theme({
          "&": { maxHeight: "360px", fontSize: "12.5px", backgroundColor: "transparent" },
          ".cm-scroller": {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            overflow: "auto",
            padding: "4px 0",
          },
          ".cm-gutters": { backgroundColor: "transparent", border: "none", opacity: "0.6" },
          ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
          "&.cm-focused": { outline: "none" },
        }),
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
