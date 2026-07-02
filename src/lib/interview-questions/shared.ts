/**
 * Shared constants + pure helpers for the Interview Questions module.
 * No server-only imports — safe to use from client and server components.
 */

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EXPERIENCE_LEVELS = [
  { slug: "fresher", label: "Fresher" },
  { slug: "mid", label: "Mid-level" },
  { slug: "senior", label: "Senior" },
] as const;

export const ROUNDS = [
  "Phone Screen",
  "DSA",
  "Frontend",
  "Machine Coding",
  "System Design",
  "Low-Level Design",
  "Behavioural",
  "HR",
] as const;

/** Technologies that get their own SEO landing page at /interview-questions/<slug>. */
export const TECHNOLOGIES = [
  { slug: "reactjs", label: "React.js" },
  { slug: "nodejs", label: "Node.js" },
  { slug: "nextjs", label: "Next.js" },
  { slug: "javascript", label: "JavaScript" },
  { slug: "javascript-coding", label: "JavaScript Coding" },
  { slug: "machine-coding", label: "Frontend Machine Coding" },
  { slug: "angular", label: "Angular" },
  { slug: "vuejs", label: "Vue.js" },
  { slug: "typescript", label: "TypeScript" },
  { slug: "dsa", label: "Data Structures & Algorithms" },
  { slug: "system-design", label: "System Design" },
  { slug: "python", label: "Python" },
  { slug: "sql", label: "SQL" },
] as const;

/** Reserved first-segment slugs that are NOT technologies (real sub-routes). */
export const RESERVED_TECH_SLUGS = new Set(["company", "saved", "share"]);

export function techLabel(slug: string): string {
  return TECHNOLOGIES.find((t) => t.slug === slug)?.label ?? slug;
}

export function difficultyClasses(d: string | null | undefined): string {
  switch (d) {
    case "easy":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    case "hard":
      return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    default:
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  }
}

export function resultClasses(r: string | null | undefined): string {
  switch (r) {
    case "selected":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    case "rejected":
      return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    default:
      return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
  }
}

export function parseJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Human-friendly compact number (1.2k, 3.4M). */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
