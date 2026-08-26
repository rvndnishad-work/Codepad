/**
 * Starter-vs-submitted code diffing.
 *
 * Why: grading used to run against the RAW submitted files — so a candidate
 * who typed nothing was scored on the scaffold's own signals ("uses useState"
 * ✓ because the STARTER had useState). Every grader now consumes the DIFF,
 * and the recruiter review UI renders the same diff so humans can see exactly
 * what the candidate authored.
 *
 * Dependency-free LCS line diff — screening files are small (KBs), O(n·m) is
 * plenty.
 */

export type FileDiff = {
  path: string;
  /** Lines the candidate added (excluding starter content). */
  added: string[];
  /** Starter lines the candidate removed. */
  removed: string[];
  /** Lines present in both versions. */
  unchangedCount: number;
  /** File exists only in the submission (candidate-created). */
  isNew: boolean;
  /** Starter file the candidate deleted. */
  isDeleted: boolean;
};

/**
 * Sandpack base template boilerplate that is auto-injected by <SandpackProvider template="react">
 * but never part of the AI-interview scaffold's starterFiles map. When a candidate
 * submits without editing, these files appear in `submitted` but not in `starter`,
 * producing phantom `NEW FILE` diffs (+44 lines). They must be ignored for grading
 * and for the recruiter "DIFF VS STARTER" view — only files the developer actually
 * wrote should appear.
 */
const SANDBOX_BOILERPLATE: Record<string, string> = {
  "/index.js": `import React, { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./styles.css";\n\nimport App from "./App";\n\nconst root = createRoot(document.getElementById("root"));\nroot.render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);`,
  "/public/index.html": `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>`,
  "/styles.css": `body {\n  font-family: sans-serif;\n  -webkit-font-smoothing: auto;\n  -moz-font-smoothing: auto;\n  -moz-osx-font-smoothing: grayscale;\n  font-smoothing: auto;\n  text-rendering: optimizeLegibility;\n  font-smooth: always;\n  -webkit-tap-highlight-color: transparent;\n  -webkit-touch-callout: none;\n}\n\nh1 {\n  font-size: 1.5rem;\n}`,
};

function normalizeForCompare(s: string): string {
  return s.replace(/\r\n/g, "\n").trim().replace(/\s+/g, " ");
}

function isSandboxBoilerplate(path: string, content: string | undefined): boolean {
  if (!content) return false;
  const boiler = SANDBOX_BOILERPLATE[path];
  if (boiler === undefined) return false;
  if (path === "/package.json") {
    try {
      const a = JSON.parse(content);
      const b = JSON.parse(boiler);
      // package.json boilerplate is identified by react deps; any package.json
      // that exactly matches the sandbox default should be treated as boilerplate.
      // For grading we parse both and compare deps/main.
      return JSON.stringify(a.dependencies) === JSON.stringify(b.dependencies) && a.main === b.main;
    } catch {
      return normalizeForCompare(content) === normalizeForCompare(boiler);
    }
  }
  return normalizeForCompare(content) === normalizeForCompare(boiler);
}

function isJsonEqual(a: string, b: string): boolean {
  try {
    const pa = JSON.parse(a);
    const pb = JSON.parse(b);
    return JSON.stringify(pa) === JSON.stringify(pb);
  } catch {
    return false;
  }
}

// Package.json boilerplate is JSON-stringified without pretty-print in some sandpack versions.
// Add explicit entry for detection via parsed compare above; keep raw string for completeness.
SANDBOX_BOILERPLATE["/package.json"] = JSON.stringify({
  dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", "react-scripts": "^5.0.0" },
  main: "/index.js",
});

/**
 * Files that are never candidate-authored and should never affect score or DIFF.
 * `package.json` is auto-pretty-printed / injected with `devDependencies:{}`
 * on load, causing phantom +9/-1 diffs. Only code files matter for hiring signal.
 */
const IGNORED_FOR_SCORING = new Set([
  "/package.json",
  "/package-lock.json",
  "/yarn.lock",
  "/pnpm-lock.yaml",
  "/bun.lockb",
]);

/** Per-file LCS line diff between two file maps. */
export function diffFiles(
  starter: Record<string, string>,
  submitted: Record<string, string>
): FileDiff[] {
  const paths = new Set([...Object.keys(starter), ...Object.keys(submitted)]);
  const diffs: FileDiff[] = [];

  for (const path of [...paths].sort()) {
    // User explicitly requested: ignore package.json entirely for scoring.
    // Auto-format + injected devDependencies should not inflate score or DIFF.
    if (IGNORED_FOR_SCORING.has(path) || path.endsWith("/package.json")) continue;
    const before = starter[path];
    const after = submitted[path];

    if (before === undefined) {
      // Candidate-created file — but ignore pure Sandpack boilerplate that the
      // client injects (template="react" base files). Those are not candidate-authored.
      if (isSandboxBoilerplate(path, after)) continue;
      diffs.push({
        path,
        added: splitLines(after),
        removed: [],
        unchangedCount: 0,
        isNew: true,
        isDeleted: false,
      });
      continue;
    }
    if (after === undefined) {
      diffs.push({
        path,
        added: [],
        removed: splitLines(before),
        unchangedCount: 0,
        isNew: false,
        isDeleted: true,
      });
      continue;
    }

    // Both exist — if submitted is pure boilerplate that differs from a custom
    // scaffold starter (e.g. /styles.css glassmorphic vs base sans-serif), it's
    // the same phantom injection in reverse (starter had custom, submitted got
    // base). Hide it: treat as no candidate edit.
    if (isSandboxBoilerplate(path, after) && !isSandboxBoilerplate(path, before)) {
      // Only hide if after is boilerplate and before is not — meaning the candidate
      // didn't write boilerplate; the runtime injected it.
      continue;
    }

    // Formatting-only change: package.json (and any .json) pretty-printed on load
    // (`{"dependencies":{"react":...` → pretty `{ "dependencies": { "react": ... }`).
    // Treat as no edit so auto-format doesn't inflate score (your 9/-1 case).
    if (path.endsWith(".json") && isJsonEqual(before, after)) {
      continue;
    }

    const a = splitLines(before);
    const b = splitLines(after);
    const { added, removed, unchanged } = lcsDiff(a, b);
    if (added.length === 0 && removed.length === 0) continue;
    // After LCS, if the only diff is whitespace/formatting for JSON, the isJsonEqual
    // above already handled it; for other files, guard against pure reformatting
    // noise: if normalized forms are equal, skip.
    if (path.endsWith(".json") && added.length === 0 && removed.length === 0) continue;
    diffs.push({ path, added, removed, unchangedCount: unchanged, isNew: false, isDeleted: false });
  }

  return diffs;
}

export type DiffStats = {
  filesChanged: number;
  filesAdded: number;
  addedLines: number;
  removedLines: number;
};

export function diffStats(diffs: FileDiff[]): DiffStats {
  let filesChanged = 0;
  let filesAdded = 0;
  let addedLines = 0;
  let removedLines = 0;
  for (const d of diffs) {
    if (d.added.length > 0 || d.removed.length > 0) filesChanged++;
    if (d.isNew && d.added.length > 0) filesAdded++;
    addedLines += d.added.length;
    removedLines += d.removed.length;
  }
  return { filesChanged, filesAdded, addedLines, removedLines };
}

/**
 * Human-readable change summary for grading prompts / recruiter chips.
 * Empty string when nothing changed.
 */
export function describeChanges(diffs: FileDiff[]): string {
  const s = diffStats(diffs);
  if (s.filesChanged === 0) return "";
  const parts = [`${s.filesChanged} file${s.filesChanged === 1 ? "" : "s"} modified`];
  if (s.filesAdded > 0) parts.push(`${s.filesAdded} new file${s.filesAdded === 1 ? "" : "s"} created`);
  parts.push(`${s.addedLines} lines added, ${s.removedLines} removed`);
  return parts.join(" · ");
}

/**
 * Unified-diff-style block fed to the Gemini grader: only what the candidate
 * actually wrote. Empty when the submission matches the starter exactly.
 */
export function renderDiffForPrompt(diffs: FileDiff[], maxChars = 8000): string {
  const blocks: string[] = [];
  for (const d of diffs) {
    if (d.isNew) {
      blocks.push(`--- NEW FILE: ${d.path} (written by the candidate) ---\n${d.added.join("\n")}`);
      continue;
    }
    if (d.isDeleted) {
      blocks.push(`--- DELETED FILE: ${d.path} ---`);
      continue;
    }
    if (d.added.length === 0 && d.removed.length === 0) continue;
    const lines = [
      `--- FILE: ${d.path} ---`,
      ...d.removed.map((l) => `- ${l}`),
      ...d.added.map((l) => `+ ${l}`),
    ];
    blocks.push(lines.join("\n"));
  }
  const out = blocks.join("\n\n");
  return out.length > maxChars ? out.slice(0, maxChars) + "\n…[diff truncated]" : out;
}

function splitLines(src: string | undefined): string[] {
  if (!src) return [];
  return src.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
}

/**
 * Classic LCS table over trimmed lines. Whitespace-only differences count as
 * unchanged (candidates reformatting shouldn't inflate their diff).
 */
function lcsDiff(a: string[], b: string[]): { added: string[]; removed: string[]; unchanged: number } {
  const norm = (s: string) => s.trim();
  const n = a.length;
  const m = b.length;

  // Guard runaway sizes (pathological pastes) — fall back to set comparison.
  if (n * m > 4_000_000) {
    const setA = new Set(a.map(norm));
    const setB = new Set(b.map(norm));
    return {
      added: b.filter((l) => !setA.has(norm(l))),
      removed: a.filter((l) => !setB.has(norm(l))),
      unchanged: Math.min(n, m),
    };
  }

  // dp[i][j] = LCS length of a[i..] vs b[j..]
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const added: string[] = [];
  const removed: string[] = [];
  let unchanged = 0;
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (norm(a[i]) === norm(b[j])) {
      unchanged++;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      removed.push(a[i++]);
    } else {
      added.push(b[j++]);
    }
  }
  while (i < n) removed.push(a[i++]);
  while (j < m) added.push(b[j++]);

  return { added, removed, unchanged };
}
