"use client";

/**
 * CodeMirror bound to a Y.Text, used by the code pad and shared notes.
 * Remote cursors show when the direct peer link is up.
 */
import { useEffect, useRef } from "react";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import type { CodeLang } from "@/lib/interview/tools";

function lang(l: CodeLang | "markdown"): Extension {
  switch (l) {
    case "javascript":
      return javascript({ jsx: true });
    case "typescript":
      return javascript({ jsx: true, typescript: true });
    case "python":
      return python();
    case "sql":
      return sql();
    case "html":
      return html();
    case "css":
      return css();
    case "markdown":
      return markdown();
    default:
      return [];
  }
}

const baseTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent", color: "rgb(var(--c-fg))", fontSize: "14px" },
  ".cm-scroller": { fontFamily: "var(--font-geist-mono, ui-monospace), monospace", lineHeight: "1.65" },
  ".cm-content": { padding: "16px 0", caretColor: "rgb(var(--c-fg))" },
  ".cm-line": { padding: "0 18px" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "rgb(var(--c-subtle))" },
  ".cm-activeLine": { backgroundColor: "rgb(var(--c-panel) / 0.55)" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor": { borderLeftColor: "rgb(var(--c-fg))" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "rgb(var(--c-accent-2) / 0.28) !important" },
  ".cm-placeholder": { color: "rgb(var(--c-subtle))" },
  ".cm-ySelectionInfo": { fontFamily: "var(--font-geist-sans, ui-sans-serif)", fontSize: "11px", padding: "1px 4px", borderRadius: "4px", opacity: "1" },
});

const proseTheme = EditorView.theme({
  ".cm-scroller": { fontFamily: "var(--font-geist-sans, ui-sans-serif), sans-serif", lineHeight: "1.7" },
  ".cm-content": { maxWidth: "760px", margin: "0 auto", padding: "24px 0" },
  ".cm-line": { padding: "0 24px" },
});

export default function SharedEditor({
  text,
  awareness,
  language,
  prose = false,
  dark,
  readOnly,
  placeholder,
  label,
}: {
  text: Y.Text;
  awareness: Awareness | null;
  language: CodeLang | "markdown";
  prose?: boolean;
  dark: boolean;
  readOnly: boolean;
  placeholder: string;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: text.toString(),
        extensions: [
          prose ? [EditorView.lineWrapping, proseTheme] : [lineNumbers(), bracketMatching(), closeBrackets(), indentOnInput()],
          baseTheme,
          drawSelection(),
          highlightActiveLine(),
          syntaxHighlighting(dark ? oneDarkHighlightStyle : defaultHighlightStyle, { fallback: true }),
          lang(language),
          keymap.of([...yUndoManagerKeymap, indentWithTab, ...defaultKeymap]),
          cmPlaceholder(placeholder),
          EditorState.readOnly.of(readOnly),
          EditorView.contentAttributes.of({ "aria-label": label }),
          yCollab(text, awareness),
        ],
      }),
    });
    return () => view.destroy();
  }, [text, awareness, language, prose, dark, readOnly, placeholder, label]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
}
