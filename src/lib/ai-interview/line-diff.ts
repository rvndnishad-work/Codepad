/**
 * Display diff for the recruiter's Code changes tab, shaped like GitHub's
 * "Files changed" view: exact line diff with old/new line numbers, hunks with
 * three lines of context, collapsed gaps between hunks, and word-level ranges
 * for lines that were edited rather than replaced.
 *
 * Grading uses `diff.ts` (trimmed, blank lines dropped). This one keeps every
 * line so the numbers match the files the candidate saw.
 */

export type DiffLine =
  | { kind: "context"; oldNo: number; newNo: number; text: string }
  | { kind: "del"; oldNo: number; text: string; words?: Range[] }
  | { kind: "add"; newNo: number; text: string; words?: Range[] };

/** [start, end) character offsets into a line's text. */
export type Range = [number, number];

export type DiffRow =
  | { type: "hunk"; header: string; hidden: DiffLine[] }
  | { type: "line"; line: DiffLine };

export type FileView = { rows: DiffRow[]; added: number; removed: number };

const CONTEXT = 3;

export function splitFileLines(src: string | undefined): string[] {
  if (src == null || src === "") return [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

type Op = { op: "eq" | "del" | "add"; a?: number; b?: number };

/** LCS over lines, ignoring trailing whitespace. */
function lineOps(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const key = (s: string) => s.trimEnd();
  // Trim the common prefix and suffix first; most edits are local.
  let pre = 0;
  while (pre < n && pre < m && key(a[pre]) === key(b[pre])) pre++;
  let suf = 0;
  while (suf < n - pre && suf < m - pre && key(a[n - 1 - suf]) === key(b[m - 1 - suf])) suf++;
  const A = a.slice(pre, n - suf);
  const B = b.slice(pre, m - suf);
  const ops: Op[] = [];
  for (let i = 0; i < pre; i++) ops.push({ op: "eq", a: i, b: i });

  if (A.length * B.length > 4_000_000) {
    A.forEach((_, i) => ops.push({ op: "del", a: pre + i }));
    B.forEach((_, j) => ops.push({ op: "add", b: pre + j }));
  } else {
    const dp: Uint32Array[] = Array.from({ length: A.length + 1 }, () => new Uint32Array(B.length + 1));
    for (let i = A.length - 1; i >= 0; i--)
      for (let j = B.length - 1; j >= 0; j--)
        dp[i][j] = key(A[i]) === key(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0;
    let j = 0;
    while (i < A.length && j < B.length) {
      if (key(A[i]) === key(B[j])) ops.push({ op: "eq", a: pre + i++, b: pre + j++ });
      else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ op: "del", a: pre + i++ });
      else ops.push({ op: "add", b: pre + j++ });
    }
    while (i < A.length) ops.push({ op: "del", a: pre + i++ });
    while (j < B.length) ops.push({ op: "add", b: pre + j++ });
  }

  for (let k = 0; k < suf; k++) ops.push({ op: "eq", a: n - suf + k, b: m - suf + k });
  return ops;
}

const TOKEN = /\w+|\s+|[^\w\s]/g;

/**
 * Changed character ranges between an old and new version of one line, or
 * null when the lines share too little for word highlights to help.
 */
export function wordRanges(oldText: string, newText: string): { del: Range[]; add: Range[] } | null {
  const ta = oldText.match(TOKEN) ?? [];
  const tb = newText.match(TOKEN) ?? [];
  if (ta.length * tb.length > 250_000) return null;
  const dp: Uint32Array[] = Array.from({ length: ta.length + 1 }, () => new Uint32Array(tb.length + 1));
  for (let i = ta.length - 1; i >= 0; i--)
    for (let j = tb.length - 1; j >= 0; j--)
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const del: Range[] = [];
  const add: Range[] = [];
  const push = (list: Range[], s: number, e: number) => {
    const last = list[list.length - 1];
    if (last && last[1] === s) last[1] = e;
    else list.push([s, e]);
  };
  let i = 0;
  let j = 0;
  let pa = 0;
  let pb = 0;
  let same = 0;
  while (i < ta.length || j < tb.length) {
    if (i < ta.length && j < tb.length && ta[i] === tb[j]) {
      if (ta[i].trim()) same += ta[i].length;
      pa += ta[i++].length;
      pb += tb[j++].length;
    } else if (j >= tb.length || (i < ta.length && dp[i + 1][j] >= dp[i][j + 1])) {
      push(del, pa, pa + ta[i].length);
      pa += ta[i++].length;
    } else {
      push(add, pb, pb + tb[j].length);
      pb += tb[j++].length;
    }
  }
  const longest = Math.max(oldText.trim().length, newText.trim().length);
  if (!longest || same / longest < 0.4) return null;
  return { del, add };
}

/** Build the GitHub-style row list for one file. */
export function buildFileView(before: string | undefined, after: string | undefined): FileView {
  const a = splitFileLines(before);
  const b = splitFileLines(after);
  const ops = lineOps(a, b);

  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  for (let k = 0; k < ops.length; ) {
    if (ops[k].op === "eq") {
      const o = ops[k++];
      lines.push({ kind: "context", oldNo: o.a! + 1, newNo: o.b! + 1, text: b[o.b!] });
      continue;
    }
    // One change block: its deletions, then its additions, as GitHub orders them.
    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (k < ops.length && ops[k].op !== "eq") {
      const o = ops[k++];
      if (o.op === "del") dels.push({ kind: "del", oldNo: o.a! + 1, text: a[o.a!] });
      else adds.push({ kind: "add", newNo: o.b! + 1, text: b[o.b!] });
    }
    for (let p = 0; p < Math.min(dels.length, adds.length); p++) {
      const w = wordRanges(dels[p].text, adds[p].text);
      if (w) {
        (dels[p] as { words?: Range[] }).words = w.del;
        (adds[p] as { words?: Range[] }).words = w.add;
      }
    }
    removed += dels.length;
    added += adds.length;
    lines.push(...dels, ...adds);
  }

  // Keep changed lines plus CONTEXT around them; everything else folds into
  // the hunk row that precedes the next visible stretch.
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (l.kind === "context") return;
    for (let d = Math.max(0, i - CONTEXT); d <= Math.min(lines.length - 1, i + CONTEXT); d++) keep[d] = true;
  });

  const rows: DiffRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const hidden: DiffLine[] = [];
    while (i < lines.length && !keep[i]) hidden.push(lines[i++]);
    if (i >= lines.length) {
      if (hidden.length) rows.push({ type: "hunk", header: "", hidden });
      break;
    }
    let end = i;
    while (end < lines.length && keep[end]) end++;
    rows.push({ type: "hunk", header: hunkHeader(lines.slice(i, end)), hidden });
    for (; i < end; i++) rows.push({ type: "line", line: lines[i] });
  }
  return { rows, added, removed };
}

function hunkHeader(lines: DiffLine[]): string {
  const olds = lines.filter((l) => l.kind !== "add") as { oldNo: number }[];
  const news = lines.filter((l) => l.kind !== "del") as { newNo: number }[];
  const oStart = olds[0]?.oldNo ?? 0;
  const nStart = news[0]?.newNo ?? 0;
  return `@@ -${oStart},${olds.length} +${nStart},${news.length} @@`;
}

/**
 * Split-view pairing: context lines sit on both sides; within a change block
 * the n-th deletion faces the n-th addition and the longer side leaves blanks.
 */
export type SplitRow =
  | { type: "hunk"; index: number; header: string; hidden: number }
  | { type: "pair"; left: DiffLine | null; right: DiffLine | null };

export function toSplitRows(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = [];
  let k = 0;
  while (k < rows.length) {
    const r = rows[k];
    if (r.type === "hunk") {
      out.push({ type: "hunk", index: k, header: r.header, hidden: r.hidden.length });
      k++;
      continue;
    }
    if (r.line.kind === "context") {
      out.push({ type: "pair", left: r.line, right: r.line });
      k++;
      continue;
    }
    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (k < rows.length && rows[k].type === "line" && (rows[k] as { line: DiffLine }).line.kind === "del") dels.push((rows[k++] as { line: DiffLine }).line);
    while (k < rows.length && rows[k].type === "line" && (rows[k] as { line: DiffLine }).line.kind === "add") adds.push((rows[k++] as { line: DiffLine }).line);
    for (let p = 0; p < Math.max(dels.length, adds.length); p++) out.push({ type: "pair", left: dels[p] ?? null, right: adds[p] ?? null });
  }
  return out;
}

/**
 * Wrap character ranges of a line in `<span class=cls>` inside already
 * highlighted HTML. Ranges count decoded characters, so an entity such as
 * `&lt;` is one character. Each wrap stays inside one text run, so the
 * highlighter's own spans stay balanced.
 */
export function markRanges(html: string, ranges: Range[] | undefined, cls: string): string {
  if (!ranges?.length) return html;
  const inRange = (pos: number) => ranges.some(([s, e]) => pos >= s && pos < e);
  let out = "";
  let pos = 0;
  let open = false;
  const parts = html.split(/(<[^>]+>)/);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("<")) {
      if (open) {
        out += "</span>";
        open = false;
      }
      out += part;
      continue;
    }
    const chars = part.match(/&[#\w]+;|[\s\S]/g) ?? [];
    for (const ch of chars) {
      const want = inRange(pos);
      if (want && !open) {
        out += `<span class="${cls}">`;
        open = true;
      } else if (!want && open) {
        out += "</span>";
        open = false;
      }
      out += ch;
      pos++;
    }
    if (open) {
      out += "</span>";
      open = false;
    }
  }
  return out;
}
