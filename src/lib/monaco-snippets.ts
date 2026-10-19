/**
 * Registers the playground's snippet completions with Monaco: the VS Code
 * snippet sets in lib/editor-snippets for every language, plus the React
 * shortcuts in lib/snippets (`rafce`, `useState`, ...) for JS/TS.
 *
 * Items are snippet-kind, so with the editor's `tabCompletion: "on"` typing a
 * prefix and pressing Tab expands it (`log` → `console.log()`), the same as
 * VS Code, and Ctrl+Space lists them with the rest of IntelliSense.
 */
import type { Monaco } from "@monaco-editor/react";
import type * as MonacoApi from "monaco-editor";
import { EDITOR_SNIPPETS, type EditorSnippet } from "./editor-snippets";
import { customSnippets } from "./snippets";
import { isInJsxText } from "./emmet-abbreviation";

const REACT_SNIPPETS: EditorSnippet[] = customSnippets.map((s) => ({
  prefix: s.label,
  body: s.insertText,
  name: s.documentation,
  description: s.documentation,
}));

function snippetsFor(language: string): EditorSnippet[] {
  const base = EDITOR_SNIPPETS[language] ?? [];
  if (language !== "javascript" && language !== "typescript") return base;
  const taken = new Set(base.map((s) => s.prefix));
  return [...base, ...REACT_SNIPPETS.filter((s) => !taken.has(s.prefix))];
}

function inJsxText(model: MonacoApi.editor.ITextModel, position: MonacoApi.Position, wordStart: number): boolean {
  return isInJsxText(
    model.getValueInRange({
      startLineNumber: Math.max(1, position.lineNumber - 200),
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: wordStart,
    }),
  );
}

export function registerSnippets(monaco: Monaco): { dispose(): void } {
  const disposables = Object.keys(EDITOR_SNIPPETS).map((language) => {
    const snippets = snippetsFor(language);
    return monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems(model: MonacoApi.editor.ITextModel, position: MonacoApi.Position) {
        const word = model.getWordUntilPosition(position);
        if ((language === "javascript" || language === "typescript") && inJsxText(model, position, word.startColumn)) {
          return { suggestions: [] };
        }
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: snippets.map((s) => ({
            label: { label: s.prefix, description: s.name },
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.body,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: s.description,
            documentation: { value: "```\n" + s.body + "\n```" },
            range,
          })),
        };
      },
    });
  });
  return { dispose: () => disposables.forEach((d) => d.dispose()) };
}
