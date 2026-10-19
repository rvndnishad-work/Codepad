/**
 * Emmet for Monaco, the way VS Code does it: `div` → `<div>|</div>`,
 * `ul>li*3`, `.card`, `!` in HTML, and `m10` → `margin: 10px;` in CSS/SCSS.
 * Works in HTML files and inside JSX in .js/.jsx/.ts/.tsx files.
 *
 * Two entry points, both driven by lib/emmet-abbreviation:
 * - `registerEmmet` adds a completion provider, so the expansion shows up
 *   (preselected) in the suggest list while typing and on Ctrl+Space.
 * - `attachEmmetTab` binds Tab to expand the abbreviation before the cursor
 *   when the suggest list is closed (otherwise Tab accepts the suggestion).
 */
import type { Monaco } from "@monaco-editor/react";
import type * as MonacoApi from "monaco-editor";
import { emmetExpansionAt, emmetSuggestionsAt, type EmmetExpansion } from "./emmet-abbreviation";

const LANGUAGES = ["html", "javascript", "typescript", "css", "scss", "less"];

function textBeforeCursor(model: MonacoApi.editor.ITextModel, position: MonacoApi.IPosition): string {
  return model.getValueInRange({
    startLineNumber: Math.max(1, position.lineNumber - 200),
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
}

function expansionAt(model: MonacoApi.editor.ITextModel, position: MonacoApi.IPosition): EmmetExpansion | null {
  const language = model.getLanguageId();
  if (!LANGUAGES.includes(language)) return null;
  return emmetExpansionAt(textBeforeCursor(model, position), language);
}

export function registerEmmet(monaco: Monaco): { dispose(): void } {
  return monaco.languages.registerCompletionItemProvider(LANGUAGES, {
    // Re-ask as the abbreviation grows past emmet operators (`ul>li`, `.a`, `li*3`, `!`).
    triggerCharacters: ["!", ">", ".", "#", "*", "+", "^", "]", ")", "}", ":", "-"],
    provideCompletionItems(model: MonacoApi.editor.ITextModel, position: MonacoApi.Position) {
      const language = model.getLanguageId();
      const hits = LANGUAGES.includes(language) ? emmetSuggestionsAt(textBeforeCursor(model, position), language) : [];
      // `incomplete` makes Monaco ask again on every keystroke: `d` and `df`
      // are different abbreviations, not a filter over the same list.
      return {
        incomplete: true,
        suggestions: hits.map((hit, i) => ({
          label: { label: hit.label, description: "Emmet" },
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: hit.snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: { value: "```\n" + hit.snippet.replace(/\$\{\d+(?::([^}]*))?\}/g, "$1") + "\n```" },
          filterText: hit.label,
          // Sort ahead of other snippets and word suggestions so Tab picks it.
          sortText: i === 0 ? "\u0000" : `\u0001${hit.label}`,
          preselect: i === 0,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column - hit.abbreviation.length,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
        })),
      };
    },
  });
}

type SnippetController = {
  insert(template: string, opts?: { overwriteBefore?: number }): void;
};

export function attachEmmetTab(editor: MonacoApi.editor.IStandaloneCodeEditor, monaco: Monaco): void {
  const canExpand = editor.createContextKey<boolean>("emmetAbbreviationAtCursor", false);
  const update = () => {
    const model = editor.getModel();
    const selection = editor.getSelection();
    canExpand.set(!!model && !!selection && selection.isEmpty() && !!expansionAt(model, selection.getPosition()));
  };
  editor.onDidChangeCursorPosition(update);
  editor.onDidChangeModel(update);
  editor.onDidChangeModelLanguage(update);

  editor.addCommand(
    monaco.KeyCode.Tab,
    () => {
      const model = editor.getModel();
      const position = editor.getPosition();
      const hit = model && position ? expansionAt(model, position) : null;
      if (!hit) {
        editor.trigger("emmet", "tab", null); // stale context key: behave like a normal Tab
        return;
      }
      const snippets = editor.getContribution<SnippetController & MonacoApi.editor.IEditorContribution>("snippetController2");
      snippets?.insert(hit.snippet, { overwriteBefore: hit.abbreviation.length });
    },
    "emmetAbbreviationAtCursor && editorTextFocus && !editorReadonly && !suggestWidgetVisible && !inSnippetMode && !editorTabMovesFocus",
  );
}
