// Shared types + presentation metadata for the "Review the AI's code" arena.

export type ReviewCategory =
  | "hallucinated-api"
  | "logic-bug"
  | "security"
  | "performance"
  | "edge-case";

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  language: string;
  difficulty: string;
  code: string;
  estimatedMinutes: number;
  timeLimitSec: number;
  findingCount: number;
}

/** A user's mark on the code: a line + the category they think applies. */
export interface Mark {
  line: number;
  category: ReviewCategory;
}

/** One planted finding, revealed after submission with the user's outcome. */
export interface RevealFinding {
  id: string;
  lineStart: number;
  lineEnd: number;
  category: ReviewCategory;
  title: string;
  explanation: string;
  points: number;
  status: "hit" | "partial" | "missed";
  markedLine: number | null;
  markedCategory: string | null;
  earned: number;
}

export interface GradeResponse {
  attemptId: string | null;
  score: number;
  foundCount: number;
  partialCount: number;
  missedCount: number;
  totalFindings: number;
  falsePositives: number;
  falsePositiveMarks: { line: number; category: string }[];
  reveal: RevealFinding[];
}

export interface AttemptSummary {
  challengeId: string;
  best: number;
  count: number;
}

export interface LeaderboardRow {
  rank: number;
  attemptId: string;
  name: string;
  image: string | null;
  score: number;
  foundCount: number;
  totalFindings: number;
  durationSec: number | null;
}

export const CATEGORY_META: Record<
  ReviewCategory,
  { label: string; short: string; emoji: string; className: string }
> = {
  "hallucinated-api": {
    label: "Hallucinated API",
    short: "Hallucination",
    emoji: "👻",
    className:
      "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
  },
  "logic-bug": {
    label: "Logic bug",
    short: "Logic bug",
    emoji: "🐞",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  security: {
    label: "Security hole",
    short: "Security",
    emoji: "🔓",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  performance: {
    label: "Performance",
    short: "Perf",
    emoji: "🐌",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  "edge-case": {
    label: "Edge case",
    short: "Edge case",
    emoji: "🧩",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
};

export const CATEGORY_ORDER: ReviewCategory[] = [
  "hallucinated-api",
  "logic-bug",
  "security",
  "performance",
  "edge-case",
];

export const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  advanced: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

/** Map a challenge's stored language to a highlight.js language id. */
export function hljsLang(language: string): string {
  switch (language) {
    case "typescript":
      return "typescript";
    case "python":
      return "python";
    case "sql":
      return "sql";
    default:
      return "javascript";
  }
}

export const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  sql: "SQL",
};
