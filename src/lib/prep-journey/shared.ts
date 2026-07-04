/**
 * Shared constants + pure helpers for Prep Journeys (guided interview-prep
 * plans). No server-only imports — safe from client and server components.
 */

export const DAILY_BUDGETS = [15, 30, 45, 60] as const;

/** Selectable plan lengths (days) when no target date is given. */
export const JOURNEY_DURATIONS = [
  { days: 14, label: "2 weeks", tagline: "Crash course" },
  { days: 30, label: "1 month", tagline: "Balanced" },
  { days: 60, label: "2 months", tagline: "Deep prep" },
] as const;

/** Estimated minutes to work through one question, by difficulty. */
export const QUESTION_MINUTES: Record<string, number> = {
  easy: 5,
  medium: 8,
  hard: 12,
};

export type JourneyRole = "frontend" | "backend" | "fullstack" | "ai-ready" | "custom";

export interface JourneyRolePreset {
  slug: JourneyRole;
  label: string;
  tagline: string;
  /** Tech slugs preselected in the wizard. */
  defaultStack: string[];
  /** Tech slugs offered for this role (subset of TECHNOLOGIES). */
  stackOptions: string[];
}

const ALL_TECHS = [
  "javascript",
  "javascript-coding",
  "reactjs",
  "nextjs",
  "angular",
  "vuejs",
  "typescript",
  "machine-coding",
  "nodejs",
  "python",
  "sql",
  "dsa",
  "system-design",
  "ai-engineering",
];

export const JOURNEY_ROLES: JourneyRolePreset[] = [
  {
    slug: "frontend",
    label: "Frontend",
    tagline: "UI frameworks, browser internals & machine coding",
    defaultStack: ["javascript", "reactjs", "typescript", "machine-coding"],
    stackOptions: [
      "javascript",
      "javascript-coding",
      "reactjs",
      "nextjs",
      "angular",
      "vuejs",
      "typescript",
      "machine-coding",
      "dsa",
      "system-design",
    ],
  },
  {
    slug: "backend",
    label: "Backend",
    tagline: "APIs, databases, algorithms & system design",
    defaultStack: ["nodejs", "sql", "dsa", "system-design"],
    stackOptions: [
      "nodejs",
      "python",
      "sql",
      "typescript",
      "javascript",
      "dsa",
      "system-design",
    ],
  },
  {
    slug: "fullstack",
    label: "Full-stack",
    tagline: "End-to-end: UI, server, data & architecture",
    defaultStack: ["javascript", "reactjs", "nodejs", "sql", "system-design"],
    stackOptions: ALL_TECHS,
  },
  {
    slug: "ai-ready",
    label: "AI-Ready Developer",
    tagline: "LLMs, prompting, RAG, agents & prompt-engineering practice",
    defaultStack: ["ai-engineering"],
    stackOptions: [
      "ai-engineering",
      "python",
      "nodejs",
      "typescript",
      "javascript",
      "system-design",
      "dsa",
    ],
  },
  {
    slug: "custom",
    label: "Custom",
    tagline: "Pick exactly the techs you want to drill",
    defaultStack: [],
    stackOptions: ALL_TECHS,
  },
];

export function rolePreset(slug: string): JourneyRolePreset {
  return (
    JOURNEY_ROLES.find((r) => r.slug === slug) ??
    JOURNEY_ROLES.find((r) => r.slug === "custom") ??
    JOURNEY_ROLES[JOURNEY_ROLES.length - 1]
  );
}

/** The technology slug whose bank powers the AI-Ready journey. */
export const AI_ENGINEERING_TECH = "ai-engineering";

/**
 * Minimum Prompt Arena score that counts a scenario "cleared" for journey
 * credit — mirrors the "pass a challenge" bar for hands-on stages.
 */
export const PROMPT_PRACTICE_PASS_SCORE = 70;

/**
 * Prompt Arena scenarios grade on beginner/intermediate/advanced; the journey
 * tracker styles difficulty as easy/medium/hard. Map onto the shared scale so
 * scenario items render with the same badges as questions and challenges.
 */
export function scenarioDifficulty(difficulty: string | null | undefined): string {
  switch (difficulty) {
    case "beginner":
      return "easy";
    case "advanced":
      return "hard";
    default:
      return "medium";
  }
}

/**
 * Today's calendar date ("YYYY-MM-DD") in the given IANA timezone. Journeys
 * capture the user's timezone at creation so day boundaries and streaks follow
 * their clock, not the server's.
 */
export function localDateString(timezone: string, at: Date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/** The date string immediately before a "YYYY-MM-DD" (pure string arithmetic). */
export function previousDateString(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Current streak length given the set of active dates. A streak survives if
 * the last activity was today or yesterday (so it doesn't die while today's
 * session is still pending).
 */
export function computeStreak(activeDates: Set<string>, today: string): number {
  let cursor = activeDates.has(today) ? today : previousDateString(today);
  if (!activeDates.has(cursor)) return 0;
  let streak = 0;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = previousDateString(cursor);
  }
  return streak;
}
