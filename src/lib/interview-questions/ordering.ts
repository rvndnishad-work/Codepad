/**
 * The one order every technology track uses: easy → medium → hard, then the
 * curated `sortOrder` inside each band (unordered rows last), then
 * popularity. The list page, the Previous/Next buttons on a question, the
 * progress "up next" pick and the admin Order page all sort with this so a
 * learner sees the same sequence everywhere.
 */
export const DIFF_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

export type Orderable = {
  difficulty: string | null;
  sortOrder?: number | null;
  views?: number;
  title?: string;
};

export function compareTopicOrder(a: Orderable, b: Orderable): number {
  const rank = (DIFF_RANK[a.difficulty ?? "medium"] ?? 1) - (DIFF_RANK[b.difficulty ?? "medium"] ?? 1);
  if (rank !== 0) return rank;
  const ao = a.sortOrder ?? null;
  const bo = b.sortOrder ?? null;
  if (ao !== null && bo !== null && ao !== bo) return ao - bo;
  if (ao !== null && bo === null) return -1;
  if (ao === null && bo !== null) return 1;
  const views = (b.views ?? 0) - (a.views ?? 0);
  if (views !== 0) return views;
  return (a.title ?? "").localeCompare(b.title ?? "");
}

/** Sorts a copy of `rows` into track order. */
export function sortTopic<T extends Orderable>(rows: T[]): T[] {
  return [...rows].sort(compareTopicOrder);
}
