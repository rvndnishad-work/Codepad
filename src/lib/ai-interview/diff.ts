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

/** Per-file LCS line diff between two file maps. */
export function diffFiles(
  starter: Record<string, string>,
  submitted: Record<string, string>
): FileDiff[] {
  const paths = new Set([...Object.keys(starter), ...Object.keys(submitted)]);
  const diffs: FileDiff[] = [];

  for (const path of [...paths].sort()) {
    const before = starter[path];
    const after = submitted[path];

    if (before === undefined) {
      // Candidate-created file — every non-empty line counts as added.
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

    const a = splitLines(before);
    const b = splitLines(after);
    const { added, removed, unchanged } = lcsDiff(a, b);
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
