"use client";

/**
 * Monaco bound to a Y.Text, for the room's code editor. Local edits go into
 * the shared text, remote edits come back into the model, undo only undoes
 * your own typing, and the other side's cursor and selection show with
 * their name.
 */
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import type { Monaco } from "@monaco-editor/react";
import "@/lib/monaco-loader";
import { defineNanoBananaThemes, NBP_LIGHT } from "@/lib/monaco-themes";
import { DEFAULT_EDITOR_THEME_ID, editorThemeById } from "@/lib/editor-themes";
import { languageFor } from "@/lib/monaco-langs";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Monaco rejects its own pending work with a "Canceled" error when a model
// or widget goes away (switching files, remote edits). It is expected, so it
// should not surface as an unhandled rejection.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { name?: string; message?: string } | undefined;
    if (r && r.name === "Canceled" && r.message === "Canceled") e.preventDefault();
  });
}

/** Awareness field for Monaco cursors (CodeMirror uses "cursor"). */
const FIELD = "codeCursor";

type MonacoEditor = Parameters<NonNullable<React.ComponentProps<typeof import("@monaco-editor/react").default>["onMount"]>>[0];
type CursorState = { text: string; anchor: unknown; head: unknown };

function beforeMount(monaco: Monaco) {
  defineNanoBananaThemes(monaco);
  // Syntax only: the room editor has no project to type-check against, so
  // red squiggles for unresolved imports would only distract.
  const off = { noSemanticValidation: true, noSyntaxValidation: false };
  monaco.languages.typescript?.typescriptDefaults?.setDiagnosticsOptions(off);
  monaco.languages.typescript?.javascriptDefaults?.setDiagnosticsOptions(off);
  monaco.languages.typescript?.typescriptDefaults?.setCompilerOptions({ jsx: 4, allowJs: true, target: 99, module: 99, allowNonTsExtensions: true });
}

/** Binds an editor to a Y.Text. Returns the cleanup. */
function bind(editor: MonacoEditor, monaco: Monaco, ytext: Y.Text, textName: string, awareness: Awareness | null): () => void {
  const model = editor.getModel();
  const doc = ytext.doc;
  if (!model || !doc) return () => {};
  const origin = {};
  let applying = false;
  model.setEOL(monaco.editor.EndOfLineSequence.LF);
  if (model.getValue() !== ytext.toString()) {
    applying = true;
    model.setValue(ytext.toString());
    applying = false;
  }

  // Keep our own selection where it was when the other side types above it.
  let saved: { anchor: Y.RelativePosition; head: Y.RelativePosition; dir: number }[] | null = null;
  const beforeAll = () => {
    saved = (editor.getSelections() ?? []).map((sel) => ({
      anchor: Y.createRelativePositionFromTypeIndex(ytext, model.getOffsetAt(sel.getStartPosition())),
      head: Y.createRelativePositionFromTypeIndex(ytext, model.getOffsetAt(sel.getEndPosition())),
      dir: sel.getDirection(),
    }));
  };
  doc.on("beforeAllTransactions", beforeAll);

  const onY = (event: Y.YTextEvent, tx: Y.Transaction) => {
    if (tx.origin === origin) return;
    applying = true;
    let index = 0;
    for (const op of event.delta) {
      if (op.retain !== undefined) {
        index += op.retain;
      } else if (op.insert !== undefined) {
        const text = typeof op.insert === "string" ? op.insert : "";
        const pos = model.getPositionAt(index);
        model.applyEdits([{ range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column), text }]);
        index += text.length;
      } else if (op.delete !== undefined) {
        const a = model.getPositionAt(index);
        const b = model.getPositionAt(index + op.delete);
        model.applyEdits([{ range: new monaco.Range(a.lineNumber, a.column, b.lineNumber, b.column), text: "" }]);
      }
    }
    if (saved) {
      const sels = saved
        .map((s) => {
          const a = Y.createAbsolutePositionFromRelativePosition(s.anchor, doc);
          const h = Y.createAbsolutePositionFromRelativePosition(s.head, doc);
          if (!a || !h) return null;
          const p1 = model.getPositionAt(a.index);
          const p2 = model.getPositionAt(h.index);
          return monaco.Selection.createWithDirection(p1.lineNumber, p1.column, p2.lineNumber, p2.column, s.dir);
        })
        .filter((s): s is NonNullable<typeof s> => !!s);
      if (sels.length) editor.setSelections(sels);
    }
    applying = false;
  };
  ytext.observe(onY);

  const sub = model.onDidChangeContent((e) => {
    if (applying) return;
    doc.transact(() => {
      for (const c of [...e.changes].sort((x, y) => y.rangeOffset - x.rangeOffset)) {
        if (c.rangeLength) ytext.delete(c.rangeOffset, c.rangeLength);
        if (c.text) ytext.insert(c.rangeOffset, c.text);
      }
    }, origin);
  });

  // Undo and redo only our own edits.
  const undo = new Y.UndoManager(ytext, { trackedOrigins: new Set([origin]) });
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => undo.undo());
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => undo.redo());
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => undo.redo());

  // Cursors: ours out, theirs in.
  let decorations: string[] = [];
  const style = document.createElement("style");
  document.head.appendChild(style);
  const sendCursor = () => {
    if (!awareness) return;
    const sel = editor.getSelection();
    if (!sel || !editor.hasTextFocus()) return;
    const anchor = Y.createRelativePositionFromTypeIndex(ytext, model.getOffsetAt(sel.getStartPosition()));
    const head = Y.createRelativePositionFromTypeIndex(ytext, model.getOffsetAt(sel.getEndPosition()));
    awareness.setLocalStateField(FIELD, { text: textName, anchor: Y.relativePositionToJSON(anchor), head: Y.relativePositionToJSON(head) } satisfies CursorState);
  };
  const cursorSub = editor.onDidChangeCursorSelection(sendCursor);
  const focusSub = editor.onDidFocusEditorText(sendCursor);
  const drawCursors = () => {
    if (!awareness) return;
    const next: Parameters<typeof editor.deltaDecorations>[1] = [];
    const css: string[] = [];
    awareness.getStates().forEach((st, client) => {
      if (client === doc.clientID) return;
      const c = st[FIELD] as CursorState | undefined;
      if (!c || c.text !== textName) return;
      const a = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(c.anchor), doc);
      const h = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(c.head), doc);
      if (!a || !h || a.type !== ytext || h.type !== ytext) return;
      const user = (st.user ?? {}) as { name?: string; color?: string };
      const color = user.color ?? "rgb(var(--c-accent-4))";
      const name = (user.name ?? "Someone").replace(/["\\\n]/g, "");
      const p1 = model.getPositionAt(Math.min(a.index, h.index));
      const p2 = model.getPositionAt(Math.max(a.index, h.index));
      const head = model.getPositionAt(h.index);
      if (a.index !== h.index) {
        next.push({ range: new monaco.Range(p1.lineNumber, p1.column, p2.lineNumber, p2.column), options: { className: `ysel-${client}` } });
      }
      next.push({
        range: new monaco.Range(head.lineNumber, head.column, head.lineNumber, head.column),
        options: { beforeContentClassName: `ycur-${client}`, stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges },
      });
      css.push(
        `.ysel-${client}{background:${color};opacity:.28}`,
        `.ycur-${client}{position:relative;border-left:2px solid ${color};margin-left:-1px;height:100%}`,
        `.ycur-${client}::after{content:"${name}";position:absolute;left:-2px;top:-17px;padding:0 5px;border-radius:4px 4px 4px 0;background:${color};color:#fff;font-weight:600;font-size:11px;line-height:16px;font-family:var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif;white-space:nowrap;pointer-events:none;z-index:10}`,
      );
    });
    style.textContent = css.join("\n");
    decorations = editor.deltaDecorations(decorations, next);
  };
  awareness?.on("change", drawCursors);
  ytext.observe(drawCursors);
  drawCursors();

  return () => {
    doc.off("beforeAllTransactions", beforeAll);
    ytext.unobserve(onY);
    ytext.unobserve(drawCursors);
    awareness?.off("change", drawCursors);
    sub.dispose();
    cursorSub.dispose();
    focusSub.dispose();
    undo.destroy();
    style.remove();
    const mine = awareness?.getLocalState()?.[FIELD] as CursorState | undefined;
    if (mine?.text === textName) awareness?.setLocalStateField(FIELD, null);
  };
}

export default function SharedMonaco({
  text,
  textName,
  path,
  modelPath,
  awareness,
  dark,
  readOnly,
  label,
  onRun,
}: {
  text: Y.Text;
  /** Shared-document name of `text`, to match cursors to this file. */
  textName: string;
  /** File path, for the language. */
  path: string;
  /** Unique model URI, e.g. file:///room/react/App.js. */
  modelPath: string;
  awareness: Awareness | null;
  dark: boolean;
  readOnly: boolean;
  label: string;
  /** Ctrl or Cmd + Enter. */
  onRun?: () => void;
}) {
  const cleanup = useRef<(() => void) | null>(null);
  const runRef = useRef(onRun);
  runRef.current = onRun;
  useEffect(() => () => cleanup.current?.(), []);

  return (
    <Editor
      height="100%"
      path={modelPath}
      defaultLanguage={languageFor(path)}
      defaultValue={text.toString()}
      theme={dark ? editorThemeById(DEFAULT_EDITOR_THEME_ID).monaco : NBP_LIGHT}
      beforeMount={beforeMount}
      onMount={(editor, monaco) => {
        cleanup.current?.();
        cleanup.current = bind(editor, monaco, text, textName, awareness);
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
      }}
      loading={<span className="text-[13px] text-muted">Loading the editor</span>}
      options={{
        readOnly,
        domReadOnly: readOnly,
        ariaLabel: label,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "var(--font-geist-mono, ui-monospace), SFMono-Regular, Menlo, monospace",
        lineHeight: 22,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 14, bottom: 14 },
        tabSize: 2,
        renderLineHighlight: "line",
        smoothScrolling: true,
        fixedOverflowWidgets: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}
