/**
 * Single source of truth for tech theming — replaces duplicated
 * META in TechCards.tsx and TECH_THEMES in [tech]/page.tsx (~500 lines).
 * Keep hiring cohesion: interview-questions uses secondary indigo (#818cf8)
 * in recruiter context, not candidate yellow.
 */

export type TechTheme = {
  // Card
  bg: string;
  border: string;
  hoverBg: string;
  hoverBorder: string;
  hoverShadow: string;
  iconBg: string;
  glowColor: string;
  // Page banner
  glow: string;
  text: string;
  bgGlow: string;
  tagline: string;
  hex: string; // for Spotlight / CountUp tint
};

const THEME_MAP: Record<string, TechTheme> = {
  reactjs: {
    bg: "bg-gradient-to-br from-cyan-500/5 via-surface to-surface dark:from-cyan-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-cyan-500/15 dark:border-cyan-500/10",
    hoverBg: "hover:from-cyan-500/10 dark:hover:from-cyan-950/25",
    hoverBorder: "hover:border-cyan-500/40 dark:hover:border-cyan-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(6,182,212,0.06)]",
    iconBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    glowColor: "bg-cyan-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(6,182,212,0.06)]",
    text: "text-cyan-800 dark:text-cyan-400",
    bgGlow: "bg-cyan-500/5",
    tagline: "Hooks, rendering & state",
    hex: "#06b6d4",
  },
  nodejs: {
    bg: "bg-gradient-to-br from-green-500/5 via-surface to-surface dark:from-green-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-green-500/15 dark:border-green-500/10",
    hoverBg: "hover:from-green-500/10 dark:hover:from-green-950/25",
    hoverBorder: "hover:border-green-500/40 dark:hover:border-green-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(34,197,94,0.06)]",
    iconBg: "bg-green-500/10 dark:bg-green-500/20",
    glowColor: "bg-green-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(34,197,94,0.06)]",
    text: "text-green-800 dark:text-green-400",
    bgGlow: "bg-green-500/5",
    tagline: "Event loop, streams & APIs",
    hex: "#22c55e",
  },
  nextjs: {
    bg: "bg-gradient-to-br from-zinc-500/5 via-surface to-surface dark:from-zinc-800/20 dark:via-surface/10 dark:to-surface/5",
    border: "border-zinc-500/15 dark:border-zinc-400/10",
    hoverBg: "hover:from-zinc-500/10 dark:hover:from-zinc-800/30",
    hoverBorder: "hover:border-zinc-500/40 dark:hover:border-zinc-400/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(113,113,122,0.08)]",
    iconBg: "bg-zinc-500/10 dark:bg-zinc-400/20",
    glowColor: "bg-zinc-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(113,113,122,0.06)]",
    text: "text-zinc-700 dark:text-zinc-300",
    bgGlow: "bg-zinc-500/5",
    tagline: "App Router, RSC & rendering",
    hex: "#71717a",
  },
  "ai-engineering": {
    bg: "bg-gradient-to-br from-fuchsia-500/5 via-surface to-surface dark:from-fuchsia-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-fuchsia-500/15 dark:border-fuchsia-500/10",
    hoverBg: "hover:from-fuchsia-500/10 dark:hover:from-fuchsia-950/25",
    hoverBorder: "hover:border-fuchsia-500/40 dark:hover:border-fuchsia-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(217,70,239,0.06)]",
    iconBg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/20",
    glowColor: "bg-fuchsia-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(217,70,239,0.06)]",
    text: "text-fuchsia-800 dark:text-fuchsia-400",
    bgGlow: "bg-fuchsia-500/5",
    tagline: "Prompts, RAG, agents & evals",
    hex: "#d946ef",
  },
  javascript: {
    bg: "bg-gradient-to-br from-yellow-500/5 via-surface to-surface dark:from-yellow-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-yellow-500/15 dark:border-yellow-500/10",
    hoverBg: "hover:from-yellow-500/10 dark:hover:from-yellow-950/25",
    hoverBorder: "hover:border-yellow-500/40 dark:hover:border-yellow-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(234,179,8,0.06)]",
    iconBg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    glowColor: "bg-yellow-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(234,179,8,0.06)]",
    text: "text-amber-800 dark:text-amber-400 dark:text-yellow-400",
    bgGlow: "bg-yellow-500/5",
    tagline: "Closures, async & the core",
    hex: "#eab308",
  },
  "javascript-coding": {
    bg: "bg-gradient-to-br from-amber-500/5 via-surface to-surface dark:from-amber-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-amber-500/15 dark:border-amber-500/10",
    hoverBg: "hover:from-amber-500/10 dark:hover:from-amber-950/25",
    hoverBorder: "hover:border-amber-500/40 dark:hover:border-amber-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(245,158,11,0.06)]",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    glowColor: "bg-amber-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(245,158,11,0.06)]",
    text: "text-amber-800 dark:text-amber-400",
    bgGlow: "bg-amber-500/5",
    tagline: "Polyfills & data transforms",
    hex: "#f59e0b",
  },
  angular: {
    bg: "bg-gradient-to-br from-red-500/5 via-surface to-surface dark:from-red-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-red-500/15 dark:border-red-500/10",
    hoverBg: "hover:from-red-500/10 dark:hover:from-red-950/25",
    hoverBorder: "hover:border-red-500/40 dark:hover:border-red-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(239,68,68,0.06)]",
    iconBg: "bg-red-500/10 dark:bg-red-500/20",
    glowColor: "bg-red-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(239,68,68,0.06)]",
    text: "text-red-700 dark:text-red-400",
    bgGlow: "bg-red-500/5",
    tagline: "Components, DI & RxJS",
    hex: "#ef4444",
  },
  vuejs: {
    bg: "bg-gradient-to-br from-emerald-500/5 via-surface to-surface dark:from-emerald-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-emerald-500/15 dark:border-emerald-500/10",
    hoverBg: "hover:from-emerald-500/10 dark:hover:from-emerald-950/25",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    glowColor: "bg-emerald-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]",
    text: "text-emerald-800 dark:text-emerald-400",
    bgGlow: "bg-emerald-500/5",
    tagline: "Reactivity & composition API",
    hex: "#10b981",
  },
  typescript: {
    bg: "bg-gradient-to-br from-blue-500/5 via-surface to-surface dark:from-blue-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-blue-500/15 dark:border-blue-500/10",
    hoverBg: "hover:from-blue-500/10 dark:hover:from-blue-950/25",
    hoverBorder: "hover:border-blue-500/40 dark:hover:border-blue-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)]",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    glowColor: "bg-blue-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)]",
    text: "text-blue-800 dark:text-blue-400",
    bgGlow: "bg-blue-500/5",
    tagline: "Types, generics & inference",
    hex: "#3b82f6",
  },
  dsa: {
    bg: "bg-gradient-to-br from-purple-500/5 via-surface to-surface dark:from-purple-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-purple-500/15 dark:border-purple-500/10",
    hoverBg: "hover:from-purple-500/10 dark:hover:from-purple-950/25",
    hoverBorder: "hover:border-purple-500/40 dark:hover:border-purple-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)]",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
    glowColor: "bg-purple-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)]",
    text: "text-purple-800 dark:text-purple-400",
    bgGlow: "bg-purple-500/5",
    tagline: "Algorithms & data structures",
    hex: "#a855f7",
  },
  "system-design": {
    bg: "bg-gradient-to-br from-orange-500/5 via-surface to-surface dark:from-orange-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-orange-500/15 dark:border-orange-500/10",
    hoverBg: "hover:from-orange-500/10 dark:hover:from-orange-950/25",
    hoverBorder: "hover:border-orange-500/40 dark:hover:border-orange-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(249,115,22,0.06)]",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
    glowColor: "bg-orange-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(249,115,22,0.06)]",
    text: "text-orange-800 dark:text-orange-400",
    bgGlow: "bg-orange-500/5",
    tagline: "Scale, storage & trade-offs",
    hex: "#f97316",
  },
  python: {
    bg: "bg-gradient-to-br from-emerald-500/5 via-surface to-surface dark:from-emerald-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-emerald-500/15 dark:border-emerald-500/10",
    hoverBg: "hover:from-emerald-500/10 dark:hover:from-emerald-950/25",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    glowColor: "bg-emerald-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]",
    text: "text-emerald-800 dark:text-emerald-400",
    bgGlow: "bg-emerald-500/5",
    tagline: "Idioms, data & internals",
    hex: "#10b981",
  },
  sql: {
    bg: "bg-gradient-to-br from-sky-500/5 via-surface to-surface dark:from-sky-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-sky-500/15 dark:border-sky-500/10",
    hoverBg: "hover:from-sky-500/10 dark:hover:from-sky-950/25",
    hoverBorder: "hover:border-sky-500/40 dark:hover:border-sky-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(56,189,248,0.06)]",
    iconBg: "bg-sky-500/10 dark:bg-sky-500/20",
    glowColor: "bg-sky-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(56,189,248,0.06)]",
    text: "text-sky-800 dark:text-sky-400",
    bgGlow: "bg-sky-500/5",
    tagline: "Joins, indexes & queries",
    hex: "#0ea5e9",
  },
  "machine-coding": {
    bg: "bg-gradient-to-br from-indigo-500/5 via-surface to-surface dark:from-indigo-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-indigo-500/15 dark:border-indigo-500/10",
    hoverBg: "hover:from-indigo-500/10 dark:hover:from-indigo-950/25",
    hoverBorder: "hover:border-indigo-500/40 dark:hover:border-indigo-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)]",
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    glowColor: "bg-indigo-500/5",
    glow: "hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)]",
    text: "text-indigo-800 dark:text-indigo-400",
    bgGlow: "bg-indigo-500/5",
    tagline: "Build live UI components",
    hex: "#6366f1",
  },
};

const FALLBACK: TechTheme = {
  bg: "bg-gradient-to-br from-accent/5 via-surface to-surface dark:from-accent/5 dark:via-surface/10 dark:to-surface/5",
  border: "border-accent/15 dark:border-accent/10",
  hoverBg: "hover:from-accent/10 dark:hover:from-accent/15",
  hoverBorder: "hover:border-accent/50",
  hoverShadow: "hover:shadow-[0_8px_30px_var(--accent-glow)]",
  iconBg: "bg-accent/10 dark:bg-accent/20",
  glowColor: "bg-accent/5",
  glow: "hover:shadow-[0_8px_30px_var(--accent-glow)]",
  text: "text-accent",
  bgGlow: "bg-accent/5",
  tagline: "Interview questions",
  hex: "#FFE600",
};

export function getTechTheme(slug: string): TechTheme {
  return THEME_MAP[slug] ?? FALLBACK;
}

export function getTechMeta(slug: string) {
  const t = getTechTheme(slug);
  return {
    bg: t.bg,
    border: t.border,
    hoverBg: t.hoverBg,
    hoverBorder: t.hoverBorder,
    hoverShadow: t.hoverShadow,
    iconBg: t.iconBg,
    glowColor: t.glowColor,
    tagline: t.tagline,
    concepts: conceptsFor(slug),
  };
}

function conceptsFor(slug: string): string[] {
  const map: Record<string, string[]> = {
    reactjs: ["Hooks", "JSX", "Context", "Suspense"],
    nodejs: ["Event Loop", "Streams", "V8 Engine", "Buffers"],
    nextjs: ["App Router", "RSC", "SSR/ISR", "Server Actions"],
    "ai-engineering": ["Prompting", "RAG", "Agents", "Evals"],
    javascript: ["Closures", "Async/Await", "Promises", "ES6+"],
    "machine-coding": ["Components", "State", "Events", "Live Build"],
    angular: ["Directives", "Services", "RxJS", "Routing"],
    vuejs: ["Reactivity", "Pinia", "Components", "Composition"],
    typescript: ["Generics", "Interfaces", "Union Types", "Inference"],
    dsa: ["Trees", "Graphs", "DP", "Sorting"],
    "system-design": ["Load Balancer", "Caching", "Sharding", "Pub-Sub"],
    python: ["Decorators", "GIL", "Generators", "Asyncio"],
    sql: ["Joins", "Indexes", "Subqueries", "ACID"],
    "javascript-coding": ["Polyfills", "Data Transforms", "Closures", "Async"],
  };
  return map[slug] ?? ["Concepts", "Problems", "Rounds"];
}
