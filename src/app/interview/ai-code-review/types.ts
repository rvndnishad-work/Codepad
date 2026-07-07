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

/** One planted finding as served by the premium "Show Solution" endpoint
 *  (no attempt/grading context — pure study material). */
export interface SolutionFinding {
  id: string;
  lineStart: number;
  lineEnd: number;
  category: ReviewCategory;
  title: string;
  explanation: string;
  points: number;
}

export interface SolutionResponse {
  isPremium: true;
  findings: SolutionFinding[];
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

/** Preferred display order for the technology picker. */
export const LANGUAGE_ORDER = ["javascript", "typescript", "python", "sql"];

/** Per-language presentation for the technology-picker cards. */
export const LANGUAGE_META: Record<
  string,
  {
    label: string;
    monogram: string;
    blurb: string;
    /** The logo-style icon tile (bg + text color). */
    tileClass: string;
    /** Soft corner-glow color wash inside the card. */
    glowClass: string;
    /** Card hover border + shadow tint. */
    hoverClass: string;
    /** Accent text color for the card's CTA row. */
    accentText: string;
  }
> = {
  javascript: {
    label: "JavaScript",
    monogram: "JS",
    blurb: "Async traps, DOM APIs & closure bugs",
    tileClass: "bg-[#f7df1e] text-black",
    glowClass: "bg-amber-400/25",
    hoverClass: "hover:border-amber-400/50 hover:shadow-amber-500/15",
    accentText: "text-amber-500 dark:text-amber-400",
  },
  typescript: {
    label: "TypeScript",
    monogram: "TS",
    blurb: "Types, generics & React patterns",
    tileClass: "bg-[#3178c6] text-white",
    glowClass: "bg-sky-500/25",
    hoverClass: "hover:border-sky-400/50 hover:shadow-sky-500/15",
    accentText: "text-sky-500 dark:text-sky-400",
  },
  python: {
    label: "Python",
    monogram: "Py",
    blurb: "Data wrangling, files & concurrency",
    tileClass: "bg-gradient-to-br from-teal-400 to-emerald-600 text-white",
    glowClass: "bg-emerald-500/25",
    hoverClass: "hover:border-emerald-400/50 hover:shadow-emerald-500/15",
    accentText: "text-emerald-500 dark:text-emerald-400",
  },
  sql: {
    label: "SQL",
    monogram: "SQL",
    blurb: "Joins, aggregates & index killers",
    tileClass: "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white",
    glowClass: "bg-violet-500/25",
    hoverClass: "hover:border-violet-400/50 hover:shadow-violet-500/15",
    accentText: "text-violet-500 dark:text-violet-400",
  },
};

/** Beginner → advanced ordering used to sort challenge cards. */
export const DIFFICULTY_ORDER: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
