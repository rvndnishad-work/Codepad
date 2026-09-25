/**
 * Pure helpers for the Question library screens: questionnaire stats, the
 * list's search and sort, pacing advice for the editor, and turning a pasted
 * block of text into questions. Safe to import from client components.
 */
import { MAX_QUESTION_CHARS, type QuestionItem } from "@/lib/ai-interview/questionnaire";

/** Rough time a spoken answer takes, used for pacing advice and new questionnaires. */
export const MINUTES_PER_QUESTION = 4;

export type QuestionnaireLike = {
  title: string;
  brief: string;
  roleArea: string | null;
  minutes: number;
  items: QuestionItem[];
  updatedAt: string;
  uses: number;
};

export type QuestionnaireStats = {
  count: number;
  answered: number;
  /** 0 to 100. */
  coverage: number;
  techs: string[];
  fromBank: number;
};

export function questionnaireStats(items: QuestionItem[]): QuestionnaireStats {
  const filled = items.filter((i) => i.q.trim());
  const answered = filled.filter((i) => i.a?.trim()).length;
  const counts = new Map<string, number>();
  for (const i of filled) if (i.tech) counts.set(i.tech, (counts.get(i.tech) ?? 0) + 1);
  return {
    count: filled.length,
    answered,
    coverage: filled.length ? Math.round((answered / filled.length) * 100) : 0,
    techs: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t),
    fromBank: filled.filter((i) => i.src).length,
  };
}

export type Pace = { tone: "ok" | "tight" | "loose"; perQuestion: number; text: string };

/** Advice on whether the time set fits the number of questions. */
export function pace(count: number, minutes: number): Pace | null {
  if (!count || !minutes) return null;
  const perQuestion = Math.round((minutes / count) * 10) / 10;
  if (perQuestion < 2.5) {
    const need = Math.ceil((count * 3) / 5) * 5;
    return { tone: "tight", perQuestion, text: `About ${perQuestion} min a question. Candidates may run out of time; ${need} min fits better.` };
  }
  if (perQuestion > 10) return { tone: "loose", perQuestion, text: `About ${perQuestion} min a question. You could add questions or shorten the time.` };
  return { tone: "ok", perQuestion, text: `About ${perQuestion} min a question.` };
}

export type ListSort = "updated" | "used" | "name";

/** Search by name, brief, role area or question text, then sort. */
export function filterQuestionnaires<T extends QuestionnaireLike>(list: T[], opts: { q?: string; area?: string | null; sort?: ListSort }): T[] {
  const q = opts.q?.trim().toLowerCase() ?? "";
  const out = list.filter((x) => {
    if (opts.area && (x.roleArea ?? "") !== opts.area) return false;
    if (!q) return true;
    return (
      x.title.toLowerCase().includes(q) ||
      x.brief.toLowerCase().includes(q) ||
      (x.roleArea ?? "").toLowerCase().includes(q) ||
      x.items.some((i) => i.q.toLowerCase().includes(q))
    );
  });
  const sort = opts.sort ?? "updated";
  return [...out].sort((a, b) => {
    if (sort === "name") return a.title.localeCompare(b.title);
    if (sort === "used" && b.uses !== a.uses) return b.uses - a.uses;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/** Role areas in use, most common first, for the filter chips. */
export function roleAreas(list: QuestionnaireLike[]): { area: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const x of list) if (x.roleArea) counts.set(x.roleArea, (counts.get(x.roleArea) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([area, count]) => ({ area, count }));
}

/**
 * Split pasted text into questions: one per line, with list markers such as
 * "1.", "2)", "-", "*", "Q3:" removed. Blank lines and repeats are dropped.
 */
export function parsePastedQuestions(text: string, existing: string[] = []): string[] {
  const seen = new Set(existing.map((q) => q.trim().toLowerCase()));
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const q = raw
      .replace(/^\s*[-*•]\s*/, "")
      .replace(/^(?:\d+[.)]|q\d+[:.)]?|question\s*\d+[:.)]?)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_QUESTION_CHARS);
    if (!q) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/** "React fundamentals (copy)", then "(copy 2)" and so on, within 80 characters. */
export function copyTitle(title: string, taken: string[]): string {
  const base = title.replace(/\s*\(copy(?: \d+)?\)$/, "").trim();
  const names = new Set(taken.map((t) => t.toLowerCase()));
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? " (copy)" : ` (copy ${n})`;
    const name = base.slice(0, 80 - suffix.length) + suffix;
    if (!names.has(name.toLowerCase())) return name;
  }
}
