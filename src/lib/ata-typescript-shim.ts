/**
 * Minimal stand-in for the TypeScript compiler API, for `@typescript/ata`.
 *
 * WHY
 * ---
 * TypeScript 7 is the native (Go) port. Its npm package no longer ships the JS
 * compiler API — `require("typescript")` now exposes exactly two things,
 * `version` and `versionMajorMinor`. `ts.preProcessFile` is gone, so
 * `@typescript/ata@0.9.x` throws
 *
 *     TypeError: ts.preProcessFile is not a function
 *
 * on every keystroke-debounced type-acquisition pass in MonacoEditor.
 *
 * Happily, ata touches only two members of the object you hand it:
 *   - `ts.preProcessFile(code)` → `{ referencedFiles, importedFiles,
 *      libReferenceDirectives }`, used purely to list module specifiers
 *   - `ts.libMap` (optional; it falls back to an empty Map)
 *
 * So we implement those directly. This also drops the whole `typescript`
 * package out of the client bundle — it was being imported at runtime from a
 * devDependency, which was never right.
 *
 * Monaco's own IntelliSense is unaffected: `monaco-editor` bundles its own
 * TypeScript worker and never consulted this package.
 */

/** Mirrors `ts.FileReference` for the fields ata reads. */
export interface FileReference {
  fileName: string;
  pos: number;
  end: number;
}

export interface PreProcessedFileInfo {
  referencedFiles: FileReference[];
  typeReferenceDirectives: FileReference[];
  libReferenceDirectives: FileReference[];
  importedFiles: FileReference[];
  ambientExternalModules: string[];
  isLibFile: boolean;
}

/**
 * Each pattern captures a module specifier. The capture group index says which
 * group holds the specifier, since some patterns need a back-referenced quote.
 */
const IMPORT_PATTERNS: Array<{ re: RegExp; group: number }> = [
  // Static import/export declarations are only legal at statement position, so
  // anchor them to the start of a line (or just after `;`/`}`). Without that,
  // an `import x from "y"` written *inside a string literal* gets picked up.
  //
  // import x from "m" / import { a, b } from "m" / import * as m from "m".
  // `[^;'"]` keeps the match inside one statement while still spanning the
  // newlines of a multi-line named-import list.
  { re: /(?:^|[;}])\s*import\b[^;'"]*?\bfrom\s*(['"])([^'"]+)\1/gm, group: 2 },
  // export { a } from "m" / export * from "m"
  { re: /(?:^|[;}])\s*export\b[^;'"]*?\bfrom\s*(['"])([^'"]+)\1/gm, group: 2 },
  // side-effect import: import "m"
  { re: /(?:^|[;}])\s*import\s*(['"])([^'"]+)\1/gm, group: 2 },
  // Dynamic forms are expressions and legitimately appear mid-statement, so
  // these stay unanchored.
  { re: /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g, group: 2 },
  { re: /\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g, group: 2 },
];

/// <reference types="m" /> | path="m" | lib="m"
const TRIPLE_SLASH =
  /\/\/\/\s*<reference\s+(types|path|lib)\s*=\s*(['"])([^'"]+)\2\s*\/>/g;

function collect(
  code: string,
  pattern: RegExp,
  group: number,
  into: FileReference[],
  seen: Set<string>
): void {
  // Patterns are module-level and stateful (`g`), so reset before each use.
  pattern.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(code)) !== null) {
    const fileName = m[group];
    if (!fileName || seen.has(fileName)) continue;
    seen.add(fileName);
    into.push({
      fileName,
      pos: m.index,
      // `end` lands just past the closing quote. ata slices from here to the
      // end of the line looking for a `// types: <version>` pragma.
      end: m.index + m[0].length,
    });
  }
}

/**
 * Extracts the module specifiers ata needs. This is a scanner, not a parser —
 * a specifier inside a comment or string literal can slip through. That is
 * harmless here: the worst case is one extra "package" lookup that 404s and is
 * skipped, never a wrong or missing type for real code.
 */
export function preProcessFile(code: string): PreProcessedFileInfo {
  const importedFiles: FileReference[] = [];
  const referencedFiles: FileReference[] = [];
  const libReferenceDirectives: FileReference[] = [];
  const typeReferenceDirectives: FileReference[] = [];
  const seen = new Set<string>();

  for (const { re, group } of IMPORT_PATTERNS) {
    collect(code, re, group, importedFiles, seen);
  }

  TRIPLE_SLASH.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRIPLE_SLASH.exec(code)) !== null) {
    const ref: FileReference = {
      fileName: m[3],
      pos: m.index,
      end: m.index + m[0].length,
    };
    if (m[1] === "lib") libReferenceDirectives.push(ref);
    else if (m[1] === "types") typeReferenceDirectives.push(ref);
    else referencedFiles.push(ref);
  }

  return {
    referencedFiles,
    typeReferenceDirectives,
    libReferenceDirectives,
    importedFiles,
    ambientExternalModules: [],
    isLibFile: false,
  };
}

/**
 * The object handed to `setupTypeAcquisition({ typescript })`. Carries
 * `version`/`versionMajorMinor` so it still structurally resembles the real
 * module, plus the two members ata actually calls.
 */
export const ataTypeScript = {
  version: "7.0.0",
  versionMajorMinor: "7.0",
  preProcessFile,
  libMap: new Map<string, string>(),
};
