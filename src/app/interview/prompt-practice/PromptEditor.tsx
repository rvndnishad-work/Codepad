"use client";

import { useEffect, useRef, useState } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { WrapText, AlignJustify } from "lucide-react";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Approximate visible rows. Translates to a min-height in em. */
  minRows?: number;
  /** Show line numbers. Defaults to false for the prompt editor (cleaner). */
  showLineNumbers?: boolean;
  /** Optional id for a11y label association. */
  id?: string;
}

/**
 * Markdown-aware prompt editor built on CodeMirror 6.
 *
 * Replaces the plain <textarea> used in v1 of Prompt Lab. Gives developers:
 *   - Markdown syntax highlighting (heading hierarchy, lists, code fences)
 *   - Soft-wrap toggle (off by default for code-heavy prompts; toggle ON
 *     when prompts get prose-y)
 *   - Real undo/redo history with Ctrl/Cmd-Z + Ctrl/Cmd-Shift-Z
 *   - Tab-to-indent inside the editor instead of leaving the focus
 *
 * Theme matches the rest of the app's dark surface (oneDark). All visual
 * controls are kept tight — this is meant to feel like an editor pane in a
 * dev tool, not a full IDE.
 */
export default function PromptEditor({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  minRows = 18,
  showLineNumbers = false,
  id,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Compartments let us swap configuration after the view is constructed
  // without rebuilding the state from scratch. We use one for wrap state
  // and one for the "disabled" / editable flag.
  const wrapCompartment = useRef(new Compartment());
  const editableCompartment = useRef(new Compartment());

  const [softWrap, setSoftWrap] = useState(true);

  // One-time mount: build the EditorState + view. All subsequent updates
  // happen via dispatched transactions in the dedicated effects below.
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        drawSelection(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        ...(showLineNumbers ? [lineNumbers()] : []),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        markdown(),
        oneDark,
        wrapCompartment.current.of(softWrap ? EditorView.lineWrapping : []),
        editableCompartment.current.of(EditorView.editable.of(!disabled)),
        EditorView.theme({
          // Slot the editor into the app's surface palette. CodeMirror
          // ships its own dark background which clashes with our --surface
          // token — override it here.
          "&": { backgroundColor: "var(--bg)", height: "100%", display: "flex", flexDirection: "column" },
          ".cm-scroller": {
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "12px",
            lineHeight: "1.6",
            minHeight: `${minRows * 1.6}em`,
            flex: 1,
            overflowY: "auto",
          },
          ".cm-gutters": {
            backgroundColor: "var(--bg)",
            borderRight: "1px solid var(--border)",
            color: "var(--muted)",
          },
          ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.02)" },
          ".cm-activeLineGutter": { backgroundColor: "transparent" },
          ".cm-content": { padding: "12px 14px" },
          ".cm-cursor": { borderLeftColor: "var(--accent)" },
          "&.cm-focused": { outline: "none" },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // Only emit onChange when the doc actually changed. Avoids
            // re-rendering the parent for selection-only updates.
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally empty deps — we want this to mount exactly once.
    // Subsequent prop changes are handled by the focused effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. "Use as starting point" loading a
  // prompt from an exemplar) into the editor. Guarded against echoing our
  // own change events back through.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  // Live-toggle soft wrap without rebuilding the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: wrapCompartment.current.reconfigure(
        softWrap ? EditorView.lineWrapping : [],
      ),
    });
  }, [softWrap]);

  // Live-toggle editable flag (used when submission is in flight).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editableCompartment.current.reconfigure(
        EditorView.editable.of(!disabled),
      ),
    });
  }, [disabled]);

  return (
    <div className="flex-1 flex flex-col h-full rounded-md border border-border bg-bg overflow-hidden focus-within:border-indigo-500 transition-colors">
      <div
        ref={hostRef}
        id={id}
        className="w-full flex-1 min-h-0 flex flex-col"
        // Placeholder behavior: CodeMirror has its own `placeholder()`
        // extension but it requires the doc to be empty AND focus-tracking.
        // For our minimal-chrome look, an absolutely-positioned overlay is
        // simpler and matches our other empty states. Skipped here to keep
        // the editor predictable; consumers can render their own hint above.
      />
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-panel/30 text-[11px] text-muted">
        <span className="font-mono text-muted/70">Markdown · ⌘Z undo</span>
        <button
          type="button"
          onClick={() => setSoftWrap((w) => !w)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-panel hover:text-fg transition-colors"
          title={softWrap ? "Wrap is on" : "Wrap is off"}
        >
          {softWrap ? <WrapText className="w-3 h-3" /> : <AlignJustify className="w-3 h-3" />}
          {softWrap ? "Wrap on" : "Wrap off"}
        </button>
      </div>
      {placeholder && value.length === 0 ? (
        <PlaceholderHint text={placeholder} />
      ) : null}
    </div>
  );
}

/**
 * Tiny overlay shown while the editor is empty. We render it as a sibling
 * (not via CodeMirror's placeholder extension) so it can use our app's
 * muted color token without bleeding into the EditorView styles.
 */
function PlaceholderHint({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute -mt-[calc(100%-32px)] px-3.5 py-3 text-xs text-muted/50 font-mono leading-relaxed">
      {text}
    </div>
  );
}
