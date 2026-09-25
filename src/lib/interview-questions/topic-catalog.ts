/**
 * How the /interview-questions listings group and describe topics. Pure data
 * and helpers so the index, the topic pages and the tests share one source.
 */
import { TECHNOLOGIES } from "./shared";

export type TrackKey = "frontend" | "languages" | "coding" | "backend";

/** Topics grouped the way candidates prepare: by the kind of round. */
export const TRACKS: { key: TrackKey; label: string; topics: string[] }[] = [
  { key: "frontend", label: "Frontend", topics: ["reactjs", "nextjs", "angular", "vuejs", "machine-coding"] },
  { key: "languages", label: "Languages", topics: ["javascript", "typescript", "python", "sql"] },
  { key: "coding", label: "Coding rounds", topics: ["javascript-coding", "dsa"] },
  { key: "backend", label: "Backend and systems", topics: ["nodejs", "system-design", "ai-engineering"] },
];

/** Every topic in track order, so the index reads frontend first. */
export const TOPIC_ORDER: string[] = TRACKS.flatMap((t) => t.topics);

export function trackOf(slug: string): TrackKey | null {
  return TRACKS.find((t) => t.topics.includes(slug))?.key ?? null;
}

/** Card name and one-line description. Names are shorter than techLabel where the full one would not fit a card. */
const TOPIC_COPY: Record<string, { name: string; blurb: string }> = {
  reactjs: { name: "React.js", blurb: "Hooks, rendering and state" },
  nextjs: { name: "Next.js", blurb: "App Router, server components, caching" },
  angular: { name: "Angular", blurb: "Components, DI and RxJS" },
  vuejs: { name: "Vue.js", blurb: "Reactivity and the Composition API" },
  "machine-coding": { name: "Machine coding", blurb: "Build working frontend UI against the clock" },
  javascript: { name: "JavaScript", blurb: "Closures, async and the core language" },
  typescript: { name: "TypeScript", blurb: "Types, generics and inference" },
  python: { name: "Python", blurb: "Idioms, data model and internals" },
  sql: { name: "SQL", blurb: "Joins, indexes and query plans" },
  "javascript-coding": { name: "JavaScript coding", blurb: "Polyfills and data transforms" },
  dsa: { name: "DSA", blurb: "Data structures, algorithms and complexity" },
  nodejs: { name: "Node.js", blurb: "Event loop, streams and APIs" },
  "system-design": { name: "System design", blurb: "Scale, storage and trade-offs" },
  "ai-engineering": { name: "AI engineering", blurb: "Prompts, RAG, agents and evals" },
};

export function topicName(slug: string): string {
  return TOPIC_COPY[slug]?.name ?? TECHNOLOGIES.find((t) => t.slug === slug)?.label ?? slug;
}

export function topicBlurb(slug: string): string {
  return TOPIC_COPY[slug]?.blurb ?? "Interview questions with answers";
}

/** "1 question", "2 questions". */
export function plural(n: number, word: string): string {
  return `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
}

export const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;
export type DifficultyKey = (typeof DIFFICULTY_ORDER)[number];

/** Anything that is not easy or hard counts as medium, as the counts elsewhere do. */
export function difficultyKey(d: string | null | undefined): DifficultyKey {
  return d === "easy" || d === "hard" ? d : "medium";
}

/** Splits an ordered list into easy, medium and hard, keeping the order inside each. */
export function groupByDifficulty<T extends { difficulty: string | null }>(qs: T[]): Record<DifficultyKey, T[]> {
  const out: Record<DifficultyKey, T[]> = { easy: [], medium: [], hard: [] };
  for (const q of qs) out[difficultyKey(q.difficulty)].push(q);
  return out;
}

/** The first question in the list the reader has not solved yet. */
export function nextUnsolved<T extends { slug: string }>(ordered: T[], solved: ReadonlySet<string>): T | null {
  return ordered.find((q) => !solved.has(q.slug)) ?? null;
}
