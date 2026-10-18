/**
 * Snippet sets for the Monaco playground, per Monaco language id, in VS Code's
 * snippet-file format so they behave like the editor people already know.
 *
 * - javascript.json, typescript.json: VS Code's built-in snippets
 *   (microsoft/vscode, extensions/javascript + typescript-basics, MIT).
 * - go.json: the Go extension's snippets (golang/vscode-go, MIT).
 * - java.json, python.json, cpp.json, rust.json: written here, using the
 *   prefixes of the usual VS Code extensions for those languages (`sysout`,
 *   `fori`, `psvm`; `def`, `ifmain`; `cout`, `#include`; `println`, `tfn`).
 *
 * Copy upstream files verbatim when refreshing them; `flattenSnippetFile`
 * understands both flat files and Go's `{ ".source.go": { ... } }` nesting.
 */
import javascript from "./javascript.json";
import typescript from "./typescript.json";
import go from "./go.json";
import java from "./java.json";
import python from "./python.json";
import cpp from "./cpp.json";
import rust from "./rust.json";

export type EditorSnippet = {
  /** What the user types, e.g. `log`. */
  prefix: string;
  /** Monaco/VS Code snippet text (`$1`, `${2:name}`, `$0`). */
  body: string;
  /** Snippet name shown in the suggest list, e.g. "Log to the console". */
  name: string;
  description: string;
};

type RawSnippet = { prefix?: string | string[]; body: string | string[]; description?: string };

export function flattenSnippetFile(file: unknown): EditorSnippet[] {
  const out: EditorSnippet[] = [];
  const walk = (node: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(node)) {
      if (!value || typeof value !== "object") continue;
      if (!("body" in value)) {
        walk(value as Record<string, unknown>);
        continue;
      }
      const raw = value as RawSnippet;
      const body = Array.isArray(raw.body) ? raw.body.join("\n") : raw.body;
      const prefixes = raw.prefix === undefined ? [name] : Array.isArray(raw.prefix) ? raw.prefix : [raw.prefix];
      for (const prefix of prefixes) {
        out.push({ prefix, body, name, description: raw.description ?? name });
      }
    }
  };
  if (file && typeof file === "object") walk(file as Record<string, unknown>);
  return out;
}

const C_FAMILY = flattenSnippetFile(cpp);

/** Snippets keyed by Monaco language id (see lib/monaco-langs). */
export const EDITOR_SNIPPETS: Record<string, EditorSnippet[]> = {
  javascript: flattenSnippetFile(javascript),
  typescript: flattenSnippetFile(typescript),
  go: flattenSnippetFile(go),
  java: flattenSnippetFile(java),
  python: flattenSnippetFile(python),
  cpp: C_FAMILY,
  c: C_FAMILY,
  rust: flattenSnippetFile(rust),
};
