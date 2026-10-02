/**
 * Field-level diff of an audit row's before/after JSON, for the expandable
 * detail on /admin/audit. Objects are flattened to dotted paths (three levels
 * deep); arrays and deeper values compare as JSON.
 */
export type DiffRow = { path: string; before: string; after: string; change: "added" | "removed" | "changed" | "same" };

const MAX_DEPTH = 3;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function flatten(v: unknown, prefix: string, depth: number, out: Map<string, unknown>) {
  if (isPlainObject(v) && depth < MAX_DEPTH && Object.keys(v).length > 0) {
    for (const [k, child] of Object.entries(v)) flatten(child, prefix ? `${prefix}.${k}` : k, depth + 1, out);
    return;
  }
  out.set(prefix, v);
}

export function show(v: unknown): string {
  if (v === undefined) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function jsonDiff(before: unknown, after: unknown, includeSame = false): DiffRow[] {
  const a = new Map<string, unknown>();
  const b = new Map<string, unknown>();
  if (before !== null && before !== undefined) flatten(before, "", 0, a);
  if (after !== null && after !== undefined) flatten(after, "", 0, b);
  const keys = [...new Set([...a.keys(), ...b.keys()])];
  const rows: DiffRow[] = [];
  for (const k of keys) {
    const inA = a.has(k);
    const inB = b.has(k);
    const sa = show(a.get(k));
    const sb = show(b.get(k));
    const change = !inA ? "added" : !inB ? "removed" : sa === sb ? "same" : "changed";
    if (change === "same" && !includeSame) continue;
    rows.push({ path: k || "(value)", before: inA ? sa : "", after: inB ? sb : "", change });
  }
  return rows;
}
