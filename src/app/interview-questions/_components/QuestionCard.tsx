import Link from "next/link";
import { Eye, Heart, Calendar, Building2, ArrowUpRight } from "lucide-react";
import TechSvg from "@/components/TechSvg";
import { difficultyClasses, techLabel, parseJsonArray, compactNumber } from "@/lib/interview-questions/shared";

export type QuestionCardData = {
  title: string;
  slug: string;
  difficulty: string;
  technology: string | null;
  round: string | null;
  views: number;
  likes: number;
  yearsAsked: string;
  company?: { name: string; slug: string } | null;
};

interface CardTheme {
  bg: string;
  border: string;
  leftBorder: string;
  hoverBg: string;
  hoverBorder: string;
  hoverShadow: string;
  textAccent: string;
  tag: string;
  /** Tinted icon-tile surface (bg + border + icon color inherits from TechSvg). */
  tile: string;
}

const CARD_THEMES: Record<string, CardTheme> = {
  reactjs: {
    bg: "bg-gradient-to-br from-cyan-500/[0.04] to-surface/40 dark:from-cyan-500/[0.02] dark:to-surface/5",
    border: "border-cyan-500/20 dark:border-cyan-500/15",
    leftBorder: "border-l-cyan-500",
    hoverBg: "hover:from-cyan-500/[0.08] dark:hover:from-cyan-500/[0.05]",
    hoverBorder: "hover:border-cyan-500/40 dark:hover:border-cyan-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(6,182,212,0.08)]",
    textAccent: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
    tag: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    tile: "bg-cyan-500/10 border-cyan-500/20 group-hover:border-cyan-500/40",
  },
  nodejs: {
    bg: "bg-gradient-to-br from-green-500/[0.04] to-surface/40 dark:from-green-500/[0.02] dark:to-surface/5",
    border: "border-green-500/20 dark:border-green-500/15",
    leftBorder: "border-l-green-500",
    hoverBg: "hover:from-green-500/[0.08] dark:hover:from-green-500/[0.05]",
    hoverBorder: "hover:border-green-500/40 dark:hover:border-green-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(34,197,94,0.08)]",
    textAccent: "group-hover:text-green-600 dark:group-hover:text-green-400",
    tag: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    tile: "bg-green-500/10 border-green-500/20 group-hover:border-green-500/40",
  },
  javascript: {
    bg: "bg-gradient-to-br from-yellow-500/[0.04] to-surface/40 dark:from-yellow-500/[0.02] dark:to-surface/5",
    border: "border-yellow-500/20 dark:border-yellow-500/15",
    leftBorder: "border-l-yellow-500",
    hoverBg: "hover:from-yellow-500/[0.08] dark:hover:from-yellow-500/[0.05]",
    hoverBorder: "hover:border-yellow-500/40 dark:hover:border-yellow-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(234,179,8,0.08)]",
    textAccent: "group-hover:text-amber-500 dark:group-hover:text-yellow-400",
    tag: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    tile: "bg-yellow-500/10 border-yellow-500/20 group-hover:border-yellow-500/40",
  },
  angular: {
    bg: "bg-gradient-to-br from-red-500/[0.04] to-surface/40 dark:from-red-500/[0.02] dark:to-surface/5",
    border: "border-red-500/20 dark:border-red-500/15",
    leftBorder: "border-l-red-500",
    hoverBg: "hover:from-red-500/[0.08] dark:hover:from-red-500/[0.05]",
    hoverBorder: "hover:border-red-500/40 dark:hover:border-red-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(239,68,68,0.08)]",
    textAccent: "group-hover:text-red-600 dark:group-hover:text-red-400",
    tag: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    tile: "bg-red-500/10 border-red-500/20 group-hover:border-red-500/40",
  },
  vuejs: {
    bg: "bg-gradient-to-br from-emerald-500/[0.04] to-surface/40 dark:from-emerald-500/[0.02] dark:to-surface/5",
    border: "border-emerald-500/20 dark:border-emerald-500/15",
    leftBorder: "border-l-emerald-500",
    hoverBg: "hover:from-emerald-500/[0.08] dark:hover:from-emerald-500/[0.05]",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)]",
    textAccent: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    tile: "bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40",
  },
  typescript: {
    bg: "bg-gradient-to-br from-blue-500/[0.04] to-surface/40 dark:from-blue-500/[0.02] dark:to-surface/5",
    border: "border-blue-500/20 dark:border-blue-500/15",
    leftBorder: "border-l-blue-500",
    hoverBg: "hover:from-blue-500/[0.08] dark:hover:from-blue-500/[0.05]",
    hoverBorder: "hover:border-blue-500/40 dark:hover:border-blue-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(59,130,246,0.08)]",
    textAccent: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
    tag: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    tile: "bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500/40",
  },
  dsa: {
    bg: "bg-gradient-to-br from-purple-500/[0.04] to-surface/40 dark:from-purple-500/[0.02] dark:to-surface/5",
    border: "border-purple-500/20 dark:border-purple-500/15",
    leftBorder: "border-l-purple-500",
    hoverBg: "hover:from-purple-500/[0.08] dark:hover:from-purple-500/[0.05]",
    hoverBorder: "hover:border-purple-500/40 dark:hover:border-purple-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(168,85,247,0.08)]",
    textAccent: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
    tag: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    tile: "bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500/40",
  },
  "system-design": {
    bg: "bg-gradient-to-br from-orange-500/[0.04] to-surface/40 dark:from-orange-500/[0.02] dark:to-surface/5",
    border: "border-orange-500/20 dark:border-orange-500/15",
    leftBorder: "border-l-orange-500",
    hoverBg: "hover:from-orange-500/[0.08] dark:hover:from-orange-500/[0.05]",
    hoverBorder: "hover:border-orange-500/40 dark:hover:border-orange-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(249,115,22,0.08)]",
    textAccent: "group-hover:text-orange-600 dark:group-hover:text-orange-400",
    tag: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    tile: "bg-orange-500/10 border-orange-500/20 group-hover:border-orange-500/40",
  },
  python: {
    bg: "bg-gradient-to-br from-emerald-500/[0.04] to-surface/40 dark:from-emerald-500/[0.02] dark:to-surface/5",
    border: "border-emerald-500/20 dark:border-emerald-500/15",
    leftBorder: "border-l-emerald-500",
    hoverBg: "hover:from-emerald-500/[0.08] dark:hover:from-emerald-500/[0.05]",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)]",
    textAccent: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    tile: "bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40",
  },
  sql: {
    bg: "bg-gradient-to-br from-sky-500/[0.04] to-surface/40 dark:from-sky-500/[0.02] dark:to-surface/5",
    border: "border-sky-500/20 dark:border-sky-500/15",
    leftBorder: "border-l-sky-500",
    hoverBg: "hover:from-sky-500/[0.08] dark:hover:from-sky-500/[0.05]",
    hoverBorder: "hover:border-sky-500/40 dark:hover:border-sky-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(56,189,248,0.08)]",
    textAccent: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
    tag: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    tile: "bg-sky-500/10 border-sky-500/20 group-hover:border-sky-500/40",
  },
  "machine-coding": {
    bg: "bg-gradient-to-br from-indigo-500/[0.04] to-surface/40 dark:from-indigo-500/[0.02] dark:to-surface/5",
    border: "border-indigo-500/20 dark:border-indigo-500/15",
    leftBorder: "border-l-indigo-500",
    hoverBg: "hover:from-indigo-500/[0.08] dark:hover:from-indigo-500/[0.05]",
    hoverBorder: "hover:border-indigo-500/40 dark:hover:border-indigo-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(99,102,241,0.10)]",
    textAccent: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    tag: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    tile: "bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500/40",
  },
};

const FALLBACK_THEME: CardTheme = {
  bg: "bg-gradient-to-br from-accent/[0.04] to-surface/40 dark:from-accent/[0.02] dark:to-surface/5",
  border: "border-border",
  leftBorder: "border-l-accent",
  hoverBg: "hover:from-accent/[0.08] dark:hover:from-accent/[0.05]",
  hoverBorder: "hover:border-accent/40 dark:hover:border-accent/30",
  hoverShadow: "hover:shadow-[0_8px_30px_var(--accent-glow)]",
  textAccent: "group-hover:text-accent",
  tag: "bg-accent/10 text-accent border-accent/20",
  tile: "bg-accent/10 border-accent/20 group-hover:border-accent/40",
};

/**
 * Compact, horizontal question card: a tech-tinted icon tile anchors the left,
 * meta + title + inline stats fill the middle, and the difficulty pill + a
 * hover affordance sit on the right. Optional bits (company / round / years)
 * render inline only when present, so cards never show empty footer space.
 */
export default function QuestionCard({ q, showCompany = true }: { q: QuestionCardData; showCompany?: boolean }) {
  const years = parseJsonArray<number>(q.yearsAsked).sort((a, b) => b - a);
  const theme = CARD_THEMES[q.technology ?? ""] ?? FALLBACK_THEME;

  return (
    <Link
      href={`/interview-question/${q.slug}`}
      className={`group relative flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-y border-r ${theme.border} border-l-[4px] ${theme.leftBorder} ${theme.bg} backdrop-blur-sm ${theme.hoverBg} hover:-translate-y-0.5 transition-all duration-300 ${theme.hoverBorder} ${theme.hoverShadow}`}
    >
      {/* Icon tile — visual anchor tinted to the technology */}
      <div
        className={`shrink-0 grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border ${theme.tile} transition-colors duration-300`}
      >
        <TechSvg tech={q.technology ?? ""} className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {/* Meta chips — render only what exists */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold tracking-wide text-muted">
          {q.technology && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border ${theme.tag} transition-colors duration-200`}>
              {techLabel(q.technology)}
            </span>
          )}
          {showCompany && q.company && (
            <span className="inline-flex items-center gap-1.5 bg-surface border border-border px-2 py-0.5 rounded-md font-semibold text-fg/70">
              <Building2 className="w-3.5 h-3.5 text-muted/50" />
              {q.company.name}
            </span>
          )}
          {q.round && <span className="text-muted/65 font-medium">· {q.round}</span>}
          {years.length > 0 && (
            <span className="inline-flex items-center gap-1 text-muted/60 font-medium">
              <Calendar className="w-3.5 h-3.5 text-muted/40" />
              {years.slice(0, 3).join(", ")}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={`mt-1.5 font-black text-[15px] sm:text-[17px] tracking-tight leading-snug text-fg/90 ${theme.textAccent} transition-colors duration-200 line-clamp-2`}
        >
          {q.title}
        </h3>

        {/* Inline engagement stats */}
        <div className="mt-2 flex items-center gap-3.5 text-[11px] font-semibold text-muted/55 group-hover:text-muted/80 transition-colors duration-300">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-muted/40" />
            {compactNumber(q.views)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-muted/40 group-hover:text-rose-500/70 transition-colors" />
            {compactNumber(q.likes)}
          </span>
        </div>
      </div>

      {/* Right rail — difficulty + hover affordance */}
      <div className="shrink-0 self-stretch flex flex-col items-end justify-between">
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border dark:bg-black/20 ${difficultyClasses(
            q.difficulty,
          )}`}
        >
          {q.difficulty}
        </span>
        <ArrowUpRight className="w-4 h-4 text-muted/30 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
      </div>
    </Link>
  );
}
