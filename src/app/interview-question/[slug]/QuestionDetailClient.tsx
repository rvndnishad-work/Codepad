"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import {
  Eye,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Hash,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Calendar,
  Layers,
  Award,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { isSolved, toggleSolved } from "@/lib/interview-questions/progress";
import { isSaved, toggleSaved } from "@/lib/interview-questions/saved";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CodeExample, { MultiFileExample, type ExampleData } from "./CodeExample";
import { CODE_VARIANTS } from "@/lib/interview-questions/code-variants";
import CommentSection, { type CommentNode } from "@/components/CommentSection";
import {
  difficultyClasses,
  techLabel,
  parseJsonArray,
  compactNumber,
} from "@/lib/interview-questions/shared";
import QuestionEngagement from "./QuestionEngagement";
import SaveButton from "./SaveButton";
import HintBox from "./HintBox";
import JsPlayground from "./JsPlayground";
import SqlPlayground from "./SqlPlayground";
import TechSvg from "@/components/TechSvg";

interface QuestionData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  answer: string | null;
  companyId: string | null;
  technology: string | null;
  role: string | null;
  difficulty: string;
  round: string | null;
  experienceLevel: string | null;
  tags: string;
  yearsAsked: string;
  views: number;
  likes: number;
  examplesData: string | null;
  frameworksData: string | null;
  company: { name: string; slug: string } | null;
}

interface SuggestionItem {
  title: string;
  slug: string;
  difficulty: string;
}

/**
 * Per-technology accent: `hex` drives the reading-progress bar and ambient
 * glows (inline styles, so it also works with the `var(--accent)` fallback);
 * the class strings tint the expanded-answer card and text accents.
 */
interface TechTheme {
  hex: string;
  text: string;
  border: string;
  bg: string;
}

const TECH_THEMES: Record<string, TechTheme> = {
  reactjs: {
    hex: "#06b6d4",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20 dark:border-cyan-500/15",
    bg: "bg-gradient-to-br from-cyan-500/5 via-surface to-surface dark:from-cyan-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  nodejs: {
    hex: "#22c55e",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/20 dark:border-green-500/15",
    bg: "bg-gradient-to-br from-green-500/5 via-surface to-surface dark:from-green-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  nextjs: {
    hex: "#71717a",
    text: "text-zinc-700 dark:text-zinc-300",
    border: "border-zinc-500/20 dark:border-zinc-400/15",
    bg: "bg-gradient-to-br from-zinc-500/5 via-surface to-surface dark:from-zinc-800/20 dark:via-surface/10 dark:to-surface/5",
  },
  "ai-engineering": {
    hex: "#d946ef",
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    border: "border-fuchsia-500/20 dark:border-fuchsia-500/15",
    bg: "bg-gradient-to-br from-fuchsia-500/5 via-surface to-surface dark:from-fuchsia-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  javascript: {
    hex: "#eab308",
    text: "text-amber-500 dark:text-yellow-400",
    border: "border-yellow-500/20 dark:border-yellow-500/15",
    bg: "bg-gradient-to-br from-yellow-500/5 via-surface to-surface dark:from-yellow-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  "javascript-coding": {
    hex: "#f59e0b",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20 dark:border-amber-500/15",
    bg: "bg-gradient-to-br from-amber-500/5 via-surface to-surface dark:from-amber-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  angular: {
    hex: "#ef4444",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20 dark:border-red-500/15",
    bg: "bg-gradient-to-br from-red-500/5 via-surface to-surface dark:from-red-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  vuejs: {
    hex: "#10b981",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20 dark:border-emerald-500/15",
    bg: "bg-gradient-to-br from-emerald-500/5 via-surface to-surface dark:from-emerald-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  typescript: {
    hex: "#3b82f6",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20 dark:border-blue-500/15",
    bg: "bg-gradient-to-br from-blue-500/5 via-surface to-surface dark:from-blue-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  dsa: {
    hex: "#a855f7",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20 dark:border-purple-500/15",
    bg: "bg-gradient-to-br from-purple-500/5 via-surface to-surface dark:from-purple-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  "system-design": {
    hex: "#f97316",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20 dark:border-orange-500/15",
    bg: "bg-gradient-to-br from-orange-500/5 via-surface to-surface dark:from-orange-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  python: {
    hex: "#10b981",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20 dark:border-emerald-500/15",
    bg: "bg-gradient-to-br from-emerald-500/5 via-surface to-surface dark:from-emerald-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  sql: {
    hex: "#38bdf8",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20 dark:border-sky-500/15",
    bg: "bg-gradient-to-br from-sky-500/5 via-surface to-surface dark:from-sky-950/15 dark:via-surface/10 dark:to-surface/5",
  },
  "machine-coding": {
    hex: "#6366f1",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20 dark:border-indigo-500/15",
    bg: "bg-gradient-to-br from-indigo-500/5 via-surface to-surface dark:from-indigo-950/15 dark:via-surface/10 dark:to-surface/5",
  },
};

const FALLBACK_THEME: TechTheme = {
  hex: "var(--accent)",
  text: "text-accent",
  border: "border-accent/20 dark:border-accent/15",
  bg: "bg-gradient-to-br from-accent/5 via-surface to-surface dark:from-accent/5 dark:via-surface/10 dark:to-surface/5",
};

/** Translucent tint helpers so ambient glows work for any theme hex (or var). */
const tint = (hex: string, pct: number) => `color-mix(in srgb, ${hex} ${pct}%, transparent)`;

const fadeInVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function QuestionDetailClient({
  q,
  followUps,
  similar,
  prevQuestion,
  nextQuestion,
  initialComments,
  isAdmin,
  currentUserId,
}: {
  q: QuestionData;
  followUps: SuggestionItem[];
  similar: SuggestionItem[];
  prevQuestion: { slug: string; title: string } | null;
  nextQuestion: { slug: string; title: string } | null;
  initialComments: CommentNode[];
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(true);

  // Reading progress — thin bar under the top edge, tinted to the technology.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  const tags = parseJsonArray(q.tags);
  const years = parseJsonArray<number>(q.yearsAsked).sort((a, b) => b - a);

  const cleanDescription = useMemo(() => {
    if (!q.description) return "";
    return q.description
      .replace(/(?:Here is the schema for our [a-zA-Z0-9`_\-\s,()]+ table[s]?:)?\s*```sql[\s\S]*?```/gi, "")
      .trim();
  }, [q.description]);

  // Parse examples. An example is either single-code or multi-variant (with a
  // language/framework dropdown), so keep any entry that has runnable code OR
  // at least one variant. CodeExample handles highlighting per variant.
  const rawExamples = parseJsonArray<ExampleData>(q.examplesData).filter(
    (e) =>
      e &&
      ((typeof e.code === "string" && e.code.trim()) ||
        (Array.isArray(e.variants) && e.variants.length > 0) ||
        (e.files && Object.keys(e.files).length > 0)),
  );

  const isRunnable = q.technology === "javascript" || q.technology === "javascript-coding" || q.technology === "typescript" || q.technology === "python";
  const isSql = q.technology === "sql";
  // Machine-coding solutions are React components — render examples the same way
  // (highlighted code + "Open in Playground" into the empty-react template).
  const isReact = q.technology === "reactjs" || q.technology === "machine-coding";

  // Per-framework tutorial bundles (machine-coding): a selector swaps BOTH the
  // tutorial answer and the runnable solution between React / Vue / Angular.
  const frameworks = useMemo<Record<string, { answer: string; files: Record<string, string> }>>(() => {
    if (!q.frameworksData) return {};
    try {
      const o = JSON.parse(q.frameworksData);
      return o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }, [q.frameworksData]);
  const frameworkKeys = useMemo(() => Object.keys(frameworks), [frameworks]);
  const hasFrameworks = frameworkKeys.length > 0;

  const [framework, setFramework] = useState<string>("react");
  // Restore the saved preference once mounted (kept in sync with the listing).
  useEffect(() => {
    if (!hasFrameworks) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem("mc-framework") : null;
    const nextFw = saved && frameworkKeys.includes(saved)
      ? saved
      : frameworkKeys.includes("react")
        ? "react"
        : frameworkKeys[0];
    setFramework(nextFw);
  }, [hasFrameworks, frameworkKeys]);

  const [saved, setSaved] = useState(false);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    async function initAndSync() {
      if (currentUserId) {
        // 1. Sync guest history if it exists
        const localSaved = typeof window !== "undefined" ? localStorage.getItem("iq-saved-questions") : null;
        const localSolved = typeof window !== "undefined" ? localStorage.getItem("iq-solved-questions") : null;

        let savedSlugs: string[] = [];
        let solvedSlugs: string[] = [];

        try {
          if (localSaved) {
            const arr = JSON.parse(localSaved);
            if (Array.isArray(arr)) savedSlugs = arr.map((item: any) => item.slug);
          }
          if (localSolved) {
            const arr = JSON.parse(localSolved);
            if (Array.isArray(arr)) solvedSlugs = arr.map((item: any) => item.slug);
          }
        } catch (e) {
          console.error("Failed to parse local storage items for sync", e);
        }

        if (savedSlugs.length > 0 || solvedSlugs.length > 0) {
          try {
            const response = await fetch("/api/interview-questions/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ savedSlugs, solvedSlugs }),
            });
            if (response.ok) {
              localStorage.removeItem("iq-saved-questions");
              localStorage.removeItem("iq-solved-questions");
              window.dispatchEvent(new Event("iq-saved-changed"));
              window.dispatchEvent(new Event("iq-solved-changed"));
            }
          } catch (e) {
            console.error("Failed to sync local data to database", e);
          }
        }

        // 2. Fetch the state from the DB for this question
        try {
          const res = await fetch(`/api/interview-questions/${q.slug}/state`);
          if (res.ok) {
            const data = await res.json();
            setSaved(data.saved);
            setSolved(data.solved);
            return;
          }
        } catch (e) {
          console.error("Failed to fetch database state, falling back to local storage", e);
        }
      }

      // Guest fallback / DB fetch fail fallback
      setSaved(isSaved(q.slug));
      setSolved(isSolved(q.slug));
    }

    initAndSync();

    const refreshSaved = () => {
      if (!currentUserId) setSaved(isSaved(q.slug));
    };
    const refreshSolved = () => {
      if (!currentUserId) setSolved(isSolved(q.slug));
    };

    window.addEventListener("iq-saved-changed", refreshSaved);
    window.addEventListener("iq-solved-changed", refreshSolved);
    return () => {
      window.removeEventListener("iq-saved-changed", refreshSaved);
      window.removeEventListener("iq-solved-changed", refreshSolved);
    };
  }, [q.slug, currentUserId]);

  async function handleToggleSaved() {
    const nextSaved = !saved;
    setSaved(nextSaved);

    if (currentUserId) {
      try {
        const response = await fetch(`/api/interview-questions/${q.slug}/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "saved", active: nextSaved }),
        });
        if (!response.ok) {
          setSaved(saved);
        }
      } catch (e) {
        console.error(e);
        setSaved(saved);
      }
    } else {
      const questionData = {
        slug: q.slug,
        title: q.title,
        difficulty: q.difficulty,
        technology: q.technology,
        company: q.company?.name ?? null,
      };
      const check = toggleSaved(questionData);
      setSaved(check);
    }
  }

  async function handleToggleSolved() {
    const nextSolved = !solved;
    setSolved(nextSolved);

    if (currentUserId) {
      try {
        const response = await fetch(`/api/interview-questions/${q.slug}/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "solved", active: nextSolved }),
        });
        if (!response.ok) {
          setSolved(solved);
        }
      } catch (e) {
        console.error(e);
        setSolved(solved);
      }
    } else {
      const check = toggleSolved(q.slug, q.technology);
      setSolved(check);
    }
  }

  function selectFramework(fw: string) {
    setFramework(fw);
    try {
      localStorage.setItem("mc-framework", fw);
    } catch {
      /* ignore */
    }
  }

  const activeFw = hasFrameworks ? (frameworks[framework] ? framework : frameworkKeys[0]) : null;
  const fwBundle = activeFw ? frameworks[activeFw] : null;
  const fwTemplate = activeFw ? CODE_VARIANTS[activeFw]?.template || "empty-react" : "empty-react";

  // What actually renders: the framework bundle wins when present.
  const answerContent = fwBundle ? fwBundle.answer : q.answer;
  const displayExamples: ExampleData[] = fwBundle
    ? [{ label: "Complete solution", files: fwBundle.files }]
    : rawExamples;

  const theme = TECH_THEMES[q.technology ?? ""] ?? FALLBACK_THEME;

  const hasProblem = Boolean(cleanDescription) || tags.length > 0;
  const hasAnswer = Boolean(answerContent);
  const hasExamples = displayExamples.length > 0;

  // Study-flow step numbering: only sections that actually render get a number,
  // so the rail always reads 01, 02, 03… without gaps.
  let stepCount = 0;
  const nextStep = () => String(++stepCount).padStart(2, "0");

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Reading progress bar */}
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 h-[3px] z-[60] origin-left"
        style={{ scaleX: progress, background: theme.hex }}
      />

      {/* ============ HERO — full-bleed, tech-tinted ============ */}
      <header className="relative overflow-hidden border-b border-border">
        {/* Ambient glows + faint dividing gradient */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-28 -right-20 w-[420px] h-[420px] rounded-full blur-3xl"
            style={{ background: tint(theme.hex, 12) }}
          />
          <div
            className="absolute -bottom-36 -left-24 w-[360px] h-[360px] rounded-full blur-3xl"
            style={{ background: tint(theme.hex, 7) }}
          />
        </div>

        {/* Giant watermark icon drifting off the right edge */}
        {q.technology && (
          <div aria-hidden className="absolute -right-8 -bottom-10 opacity-[0.06] dark:opacity-[0.05] pointer-events-none rotate-6">
            <TechSvg tech={q.technology} className="w-56 h-56 sm:w-72 sm:h-72" />
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-6 pt-6 pb-9">
          {/* Breadcrumb + track navigation */}
          <div className="flex items-center justify-between gap-4">
            <nav className="flex items-center gap-1.5 text-xs font-bold text-muted min-w-0">
              <Link href="/interview-questions" className="hover:text-fg transition-colors shrink-0">
                Prep Library
              </Link>
              {q.technology && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted/50 shrink-0" />
                  <Link
                    href={`/interview-questions/${q.technology}`}
                    className={`${theme.text} hover:opacity-80 transition-opacity shrink-0`}
                  >
                    {techLabel(q.technology)}
                  </Link>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-muted/50 shrink-0 hidden sm:block" />
              <span className="truncate text-muted/60 hidden sm:block">{q.title}</span>
            </nav>

            {(prevQuestion || nextQuestion) && (
              <div className="flex items-center gap-2 shrink-0">
                {prevQuestion ? (
                  <Link
                    href={`/interview-question/${prevQuestion.slug}`}
                    title={prevQuestion.title}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-muted hover:text-fg border border-border hover:border-accent/40 bg-surface/60 transition-colors duration-200"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
                    <span className="hidden sm:inline">Previous</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-muted/40 border border-border/60 cursor-not-allowed select-none">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                  </span>
                )}
                {nextQuestion ? (
                  <Link
                    href={`/interview-question/${nextQuestion.slug}`}
                    title={nextQuestion.title}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-muted hover:text-fg border border-border hover:border-accent/40 bg-surface/60 transition-colors duration-200"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-muted/40 border border-border/60 cursor-not-allowed select-none">
                    <span className="hidden sm:inline">Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Meta chips */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInVariants}
            className="flex items-center flex-wrap gap-2 mt-7"
          >
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border dark:bg-black/20 ${difficultyClasses(q.difficulty)}`}
            >
              {q.difficulty}
            </span>
            {solved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Solved
              </span>
            )}
            {q.company && (
              <Link
                href={`/interview-questions/company/${q.company.slug}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-border bg-surface/70 text-fg/85 hover:border-accent/40 hover:text-accent transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-muted" />
                {q.company.name}
              </Link>
            )}
            {q.round && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-border bg-surface/70 text-muted">
                <Layers className="w-3.5 h-3.5 text-muted/60" />
                {q.round}
              </span>
            )}
            {years.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-border bg-surface/70 text-muted">
                <Calendar className="w-3.5 h-3.5 text-muted/60" />
                {years.slice(0, 3).join(" · ")}
              </span>
            )}
          </motion.div>

          {/* Title — the star of the page */}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeInVariants}
            className="mt-4 max-w-3xl text-3xl sm:text-[2.75rem] font-black tracking-tight leading-[1.12] text-fg"
          >
            {q.title}
          </motion.h1>

          {/* Action row: engage + track progress, right where the reading starts */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInVariants}
            className="mt-7 flex items-center flex-wrap gap-2.5"
          >
            <QuestionEngagement slug={q.slug} initialLikes={q.likes} />
            <SaveButton
              question={{
                slug: q.slug,
                title: q.title,
                difficulty: q.difficulty,
                technology: q.technology,
                company: q.company?.name ?? null,
              }}
              saved={saved}
              onClick={handleToggleSaved}
            />
            <button
              onClick={handleToggleSolved}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition duration-200 ${
                solved
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border text-muted hover:text-fg hover:border-fg/30"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {solved ? "Solved" : "Mark Solved"}
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted pl-2">
              <Eye className="w-3.5 h-3.5" />
              {compactNumber(q.views)} views
            </span>
          </motion.div>
        </div>
      </header>

      {/* ============ BODY ============ */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: guided study flow on a numbered rail */}
          <div className="lg:col-span-8">
            <div className="relative lg:pl-14 space-y-10">
              {/* Connecting rail line (desktop) */}
              <div aria-hidden className="hidden lg:block absolute left-4 top-3 bottom-3 w-px bg-border" />

              {/* Step: understand the problem */}
              {hasProblem && (
                <StudyStep num={nextStep()} title="Understand the problem" hex={theme.hex}>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeInVariants}
                    className="rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm p-6 sm:p-7 shadow-sm"
                  >
                    {cleanDescription && (
                      <div className="prose dark:prose-invert max-w-none text-sm text-fg/90 leading-relaxed">
                        <MarkdownRenderer content={cleanDescription} />
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className={`flex items-center flex-wrap gap-2 ${cleanDescription ? "mt-6 pt-5 border-t border-border" : ""}`}>
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-bg/40 text-[10px] font-black tracking-wider uppercase text-muted"
                          >
                            <Hash className={`w-3 h-3 ${theme.text}`} />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </StudyStep>
              )}

              {/* Step: try it, with an AI nudge if stuck */}
              <StudyStep
                num={nextStep()}
                title="Attempt it yourself"
                sub="Sketch your approach before reading the solution — that's what interviews test."
                hex={theme.hex}
              >
                <HintBox slug={q.slug} />
              </StudyStep>

              {/* Step: the solution */}
              {hasAnswer && (
                <StudyStep num={nextStep()} title="Study the solution" hex={theme.hex}>
                  <div className="space-y-4">
                    {/* Framework selector — swaps the tutorial + solution (machine-coding). */}
                    {hasFrameworks && (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariants}
                        className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 shadow-sm"
                      >
                        <span className="text-[11px] font-black uppercase tracking-wider text-muted px-1.5">
                          Solve in
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {frameworkKeys.map((fw) => (
                            <button
                              key={fw}
                              onClick={() => selectFramework(fw)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                                fw === activeFw
                                  ? "bg-accent text-bg border-accent shadow-sm"
                                  : "bg-bg border-border text-muted hover:text-fg hover:border-accent/40"
                              }`}
                            >
                              {CODE_VARIANTS[fw]?.label ?? fw}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence initial={false} mode="wait">
                      {!isAnswerExpanded ? (
                        /* Spoiler gate — an honest, calm "peek when ready" panel */
                        <motion.div
                          key="answer-gate"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="relative rounded-2xl border border-border overflow-hidden bg-surface/70 dark:bg-surface/20"
                        >
                          <div
                            aria-hidden
                            className="absolute -top-16 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                            style={{ background: tint(theme.hex, 10) }}
                          />
                          <div className="relative px-6 py-12 sm:py-14 flex flex-col items-center text-center">
                            <div
                              className="grid place-items-center w-12 h-12 rounded-2xl border mb-4"
                              style={{ background: tint(theme.hex, 10), borderColor: tint(theme.hex, 25) }}
                            >
                              <Lock className={`w-5 h-5 ${theme.text}`} />
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-fg">The solution is waiting</h3>
                            <p className="text-sm text-muted mt-1.5 max-w-sm leading-relaxed">
                              Give it an honest attempt first — then compare your thinking with the full walkthrough.
                            </p>
                            <button
                              onClick={() => setIsAnswerExpanded(true)}
                              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft shadow-lg transition duration-200"
                            >
                              Reveal the solution
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="answer-content"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className={`rounded-2xl border ${theme.border} ${theme.bg} shadow-md overflow-hidden`}
                        >
                          <div className="p-6 sm:p-7 prose dark:prose-invert max-w-none text-sm text-fg/90 leading-relaxed">
                            {/* allowHtml: answers are admin-curated and may embed
                                hand-authored inline SVG diagrams. */}
                            <MarkdownRenderer content={answerContent!} allowHtml />
                          </div>

                          {/* Post-read nudge: close the loop on progress */}
                          <div className="px-6 pb-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3.5">
                              <p className="text-xs font-semibold text-muted">
                                {solved ? "Nice — this one's in your solved list." : "Understood it end to end? Log your progress."}
                              </p>
                              <button
                                onClick={handleToggleSolved}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition duration-200 ${
                                  solved
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-border bg-bg/50 text-muted hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40"
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {solved ? "Solved" : "Mark as solved"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </StudyStep>
              )}

              {/* Step: run the code */}
              {hasExamples && (
                <StudyStep
                  num={nextStep()}
                  title={
                    activeFw
                      ? `${CODE_VARIANTS[activeFw]?.label ?? activeFw} solution`
                      : (isRunnable || isSql) && displayExamples.some((e) => e.runnable !== false)
                      ? "Run the code"
                      : isReact && displayExamples.some((e) => e.runnable !== false)
                      ? "Explore the playground snippets"
                      : "Read the code"
                  }
                  hex={theme.hex}
                >
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeInVariants}
                    className="space-y-4"
                  >
                    {displayExamples.map((ex, i) => {
                      // Multi-file (component-wise) solution: file tabs + a single
                      // "Run Playground" that opens every file in the workspace.
                      if (ex.files && Object.keys(ex.files).length > 0) {
                        return (
                          <MultiFileExample
                            key={`${activeFw ?? "f"}-${i}`}
                            label={ex.label}
                            files={ex.files}
                            template={fwTemplate}
                          />
                        );
                      }
                      // In-page runner for JS/TS/Python single-variant examples.
                      if (isRunnable && ex.runnable !== false && !ex.variants) {
                        return <JsPlayground key={i} code={ex.code ?? ""} label={ex.label} title={q.title} description={q.description ?? undefined} backFrom={`/interview-question/${q.slug}`} technology={q.technology ?? "javascript"} />;
                      }
                      // In-page runner for SQL examples.
                      if (isSql && ex.runnable !== false && !ex.variants) {
                        return <SqlPlayground key={i} code={ex.code ?? ""} label={ex.label} title={q.title} description={q.description ?? undefined} />;
                      }
                      // Highlighted block with an optional language/framework
                      // dropdown + per-variant "Open in Playground". React
                      // single-variant examples default to the react template.
                      return (
                        <CodeExample
                          key={i}
                          example={ex}
                          defaultTech={isReact ? "react" : undefined}
                        />
                      );
                    })}
                  </motion.div>
                </StudyStep>
              )}

              {/* Step: discuss */}
              <StudyStep num={nextStep()} title="Join the discussion" hex={theme.hex}>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={fadeInVariants}
                  className="rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
                    className="flex items-center justify-between w-full px-6 py-5 text-left hover:bg-surface/50 transition-colors duration-200 focus:outline-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-5 h-5 text-muted" />
                      <span className="text-sm font-bold text-fg">
                        Approaches, follow-ups & war stories from other candidates
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-muted transition-transform duration-300 shrink-0 ${
                        isCommentsExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isCommentsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-border">
                          <CommentSection
                            postId={q.id}
                            initialComments={initialComments}
                            signedIn={!!currentUserId}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            postUrl={`/api/interview-questions/${q.slug}/comments`}
                            deleteUrlBase="/api/interview-questions/comments"
                            heading="Discussion"
                            placeholder="Share your approach, an alternative answer, or a follow-up…"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </StudyStep>
            </div>

            {/* Bottom Previous / Next question navigation — continue the track
                without scrolling back up. Same order as the top nav / list page. */}
            {(prevQuestion || nextQuestion) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10">
                {prevQuestion ? (
                  <Link
                    href={`/interview-question/${prevQuestion.slug}`}
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-accent/40 bg-surface/60 hover:bg-surface transition-colors duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 text-muted group-hover:text-accent group-hover:-translate-x-0.5 transition-all duration-200 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted/70">Previous</div>
                      <div className="text-sm font-bold text-fg truncate group-hover:text-accent transition-colors duration-200">{prevQuestion.title}</div>
                    </div>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
                {nextQuestion ? (
                  <Link
                    href={`/interview-question/${nextQuestion.slug}`}
                    className="group flex items-center justify-end gap-3 p-4 rounded-2xl border border-border hover:border-accent/40 bg-surface/60 hover:bg-surface transition-colors duration-200 text-right"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted/70">Next</div>
                      <div className="text-sm font-bold text-fg truncate group-hover:text-accent transition-colors duration-200">{nextQuestion.title}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            )}
          </div>

          {/* RIGHT: sticky companion sidebar */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
            {/* Track card — where this question lives */}
            {q.technology && (
              <motion.div initial="hidden" animate="visible" variants={fadeInVariants}>
                <Link
                  href={`/interview-questions/${q.technology}`}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border ${theme.border} ${theme.bg} backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300`}
                >
                  <div
                    className="shrink-0 grid place-items-center w-12 h-12 rounded-xl border transition-colors"
                    style={{ background: tint(theme.hex, 10), borderColor: tint(theme.hex, 25) }}
                  >
                    <TechSvg tech={q.technology} className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted/70">Track</div>
                    <div className="text-sm font-black tracking-tight text-fg group-hover:text-accent transition-colors truncate">
                      {techLabel(q.technology)} questions
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
                </Link>
              </motion.div>
            )}

            {/* At a glance */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInVariants}
              className="p-5 rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm space-y-3.5 shadow-sm"
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-muted">At a glance</h3>
              <div className="space-y-3 text-xs">
                {q.company && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted/50" /> Company
                    </span>
                    <Link
                      href={`/interview-questions/company/${q.company.slug}`}
                      className="font-bold hover:text-accent truncate"
                    >
                      {q.company.name}
                    </Link>
                  </div>
                )}
                {q.round && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-muted/50" /> Round
                    </span>
                    <span className="font-bold">{q.round}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-muted/50" /> Views
                  </span>
                  <span className="font-bold">{compactNumber(q.views)}</span>
                </div>
                {years.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2.5 border-t border-border">
                    <span className="text-muted flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted/50" /> Years asked
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {years.map((yr) => (
                        <span
                          key={yr}
                          className="px-2 py-0.5 rounded bg-bg border border-border font-bold text-[10px] text-fg/80"
                        >
                          {yr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Related questions */}
            {(followUps.length > 0 || similar.length > 0) && (
              <motion.div initial="hidden" animate="visible" variants={fadeInVariants} className="space-y-5">
                {followUps.length > 0 && (
                  <RelatedList
                    title={q.company ? `Asked at ${q.company.name}` : "Follow-ups"}
                    items={followUps}
                  />
                )}
                {similar.length > 0 && (
                  <RelatedList
                    title={`Similar ${q.technology ? techLabel(q.technology) : ""} questions`}
                    items={similar}
                  />
                )}
              </motion.div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * One stop on the study-flow rail: a numbered marker (desktop) hanging on the
 * connecting line, a compact heading, then the section content.
 */
function StudyStep({
  num,
  title,
  sub,
  hex,
  children,
}: {
  num: string;
  title: string;
  sub?: string;
  hex: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative">
      <div
        className="hidden lg:grid absolute -left-14 top-0 place-items-center w-8 h-8 rounded-full border bg-bg text-[10px] font-black"
        style={{ borderColor: tint(hex, 35), color: hex }}
      >
        {num}
      </div>
      <div className="mb-3.5 flex items-baseline gap-2">
        <span className="lg:hidden text-[11px] font-black" style={{ color: hex }}>
          {num}
        </span>
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.15em] text-fg">{title}</h2>
          {sub && <p className="text-xs text-muted mt-1 leading-relaxed">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function RelatedList({ title, items }: { title: string; items: SuggestionItem[] }) {
  return (
    <div className="p-5 rounded-2xl border border-border bg-surface/70 dark:bg-surface/20 backdrop-blur-sm space-y-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted">
        <Award className="w-3.5 h-3.5 text-accent" />
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <Link
            key={it.slug}
            href={`/interview-question/${it.slug}`}
            className="group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-accent/30 hover:bg-surface/60 transition duration-200 text-xs font-semibold"
          >
            <span className="shrink-0 w-5 text-right font-black text-muted/40 group-hover:text-accent/70 transition-colors tabular-nums">
              {i + 1}
            </span>
            <span className="truncate flex-1 text-fg/85 group-hover:text-accent transition-colors">{it.title}</span>
            <span
              className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${difficultyClasses(
                it.difficulty,
              )}`}
            >
              {it.difficulty}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
