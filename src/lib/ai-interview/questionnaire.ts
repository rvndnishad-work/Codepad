/**
 * A questionnaire is the question list of a conversation round. It lives in
 * `AIInterviewTemplate.testsCode`, which only the AI interviewer and grader
 * read, never the candidate.
 *
 * Two stored shapes:
 * - one question per line (the original format), and
 * - JSON `{ "v": 1, "items": [...] }` once any question carries a reference
 *   answer or came from the public question bank.
 * Pure, so client components can use it.
 */

export type QuestionItem = {
  /** The question the interviewer asks. */
  q: string;
  /** Reference answer for the grader and the interviewer. Never sent to the candidate. */
  a?: string;
  /** Slug of the public bank question it was copied from. */
  src?: string;
  /** Technology slug of that bank question, e.g. "reactjs". */
  tech?: string;
  difficulty?: string;
};

export const MAX_QUESTIONS = 40;
export const MAX_QUESTION_CHARS = 600;
export const MAX_ANSWER_CHARS = 4000;

export function parseQuestionnaire(raw: string | null | undefined): QuestionItem[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as { items?: unknown };
      if (Array.isArray(parsed.items)) {
        return parsed.items.flatMap((it): QuestionItem[] => {
          if (!it || typeof it !== "object") return [];
          const o = it as Record<string, unknown>;
          const q = typeof o.q === "string" ? o.q.trim() : "";
          if (!q) return [];
          const item: QuestionItem = { q };
          if (typeof o.a === "string" && o.a.trim()) item.a = o.a.trim();
          if (typeof o.src === "string" && o.src) item.src = o.src;
          if (typeof o.tech === "string" && o.tech) item.tech = o.tech;
          if (typeof o.difficulty === "string" && o.difficulty) item.difficulty = o.difficulty;
          return [item];
        });
      }
    } catch {
      // Not our JSON; fall through and treat it as lines.
    }
  }
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((q) => ({ q }));
}

/** Plain lines when nothing but question text is stored, so old readers keep working. */
export function serializeQuestionnaire(items: QuestionItem[]): string {
  const clean = items.map((i) => ({ ...i, q: i.q.replace(/\s+/g, " ").trim() })).filter((i) => i.q);
  if (clean.every((i) => !i.a && !i.src && !i.tech && !i.difficulty)) return clean.map((i) => i.q).join("\n");
  return JSON.stringify({ v: 1, items: clean });
}

export function questionTexts(raw: string | null | undefined): string[] {
  return parseQuestionnaire(raw).map((i) => i.q);
}

/**
 * Apply an edit made as plain lines (one question per line) while keeping the
 * reference answer and source of every question whose text did not change.
 */
export function mergeEditedLines(lines: string, previous: QuestionItem[]): QuestionItem[] {
  const byText = new Map(previous.map((p) => [p.q, p]));
  return lines
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((q) => ({ ...(byText.get(q) ?? {}), q }));
}

/** Validate and normalise for storage. Throws a user-facing message. */
export function validateQuestionnaire(items: QuestionItem[]): QuestionItem[] {
  const clean = items
    .map((i) => ({ ...i, q: (i.q ?? "").replace(/\s+/g, " ").trim(), a: i.a?.trim() || undefined }))
    .filter((i) => i.q);
  if (!clean.length) throw new Error("Add at least one question.");
  if (clean.length > MAX_QUESTIONS) throw new Error(`Keep it to ${MAX_QUESTIONS} questions or fewer.`);
  for (const i of clean) {
    if (i.q.length > MAX_QUESTION_CHARS) throw new Error(`Questions are limited to ${MAX_QUESTION_CHARS} characters.`);
    if (i.a && i.a.length > MAX_ANSWER_CHARS) i.a = i.a.slice(0, MAX_ANSWER_CHARS);
  }
  return clean;
}

/** Numbered list for the interviewer prompt. Reference answers stay out of it. */
export function interviewerQuestionList(raw: string | null | undefined): string {
  return questionTexts(raw)
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");
}

/** Numbered list for the grader, with reference answers where the recruiter gave one. */
export function graderQuestionList(items: QuestionItem[]): string {
  return items
    .map((it, i) => {
      const ref = it.a ? `\n   Reference answer (a guide, not a script): ${it.a.replace(/\s+/g, " ").slice(0, 900)}` : "";
      return `${i + 1}. ${it.q}${ref}`;
    })
    .join("\n");
}
