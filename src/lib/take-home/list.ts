/**
 * Searching, filtering and paging the take-home list. Pure, so the Review
 * and All take-homes pages share it and the tests can run it directly.
 */
import { matchesFilter, type Decision, type TakeHomeFilter, type TakeHomeState } from "./status";

export const PAGE_SIZE = 20;

type Listable = {
  title: string;
  templateId: string | null;
  candidate: { name: string; email: string | null };
  state: TakeHomeState;
  decision: Decision;
  needsReview: boolean;
  submittedAt: string | null;
};

export function matchesSearch(row: Listable, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [row.candidate.name, row.candidate.email ?? "", row.title].some((v) => v.toLowerCase().includes(needle));
}

export type ReviewView = "review" | "decided";

export function parseReviewView(v: unknown): ReviewView {
  return v === "decided" ? "decided" : "review";
}

/**
 * The review queue: submissions waiting on a decision, oldest first so
 * nobody waits longest; or decided ones, newest first.
 */
export function reviewRows<R extends Listable>(rows: R[], view: ReviewView, q: string, template: string): R[] {
  const picked = rows.filter(
    (r) =>
      (view === "review" ? r.needsReview : r.state === "submitted" && !!r.decision) &&
      matchesSearch(r, q) &&
      (template === "all" || r.templateId === template),
  );
  const at = (r: R) => r.submittedAt ?? "";
  return picked.sort((a, b) => (view === "review" ? at(a).localeCompare(at(b)) : at(b).localeCompare(at(a))));
}

export function filterRows<R extends Listable>(rows: R[], filter: TakeHomeFilter, q: string): R[] {
  return rows.filter((r) => matchesFilter(filter, r.state, r.decision) && matchesSearch(r, q));
}

export function paginate<R>(rows: R[], page: number, size = PAGE_SIZE): { rows: R[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pages, total: rows.length };
}

/** Counts per filter chip on the All take-homes page. */
export function filterCounts(rows: Listable[], filters: TakeHomeFilter[]): Record<TakeHomeFilter, number> {
  const out = {} as Record<TakeHomeFilter, number>;
  for (const f of filters) out[f] = rows.filter((r) => matchesFilter(f, r.state, r.decision)).length;
  return out;
}

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/** "Ana Silva <ana@x.io>", "ana@x.io" and lists of either. */
export function parsePeople(raw: string): { name: string; email: string }[] {
  const out: { name: string; email: string }[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const t = part.trim();
    if (!t) continue;
    const m = t.match(/^(.*?)\s*<([^>]+)>$/);
    const email = (m ? m[2] : t).trim().toLowerCase();
    if (!EMAIL.test(email)) continue;
    const name = (m?.[1] ?? "").replace(/^["']|["']$/g, "").trim() || email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    out.push({ name, email });
  }
  return out;
}
