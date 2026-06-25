"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  ArrowLeft,
  Building2,
  Hash,
  ChevronDown,
  BookOpen,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  Layers,
  Award,
} from "lucide-react";
// ExternalLink removed: per-example "Open in Playground" now lives in CodeExample.
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

const TECH_THEMES: Record<string, { bg: string; border: string; hoverBorder: string; text: string; bgGlow: string }> = {
  reactjs: {
    bg: "bg-gradient-to-br from-cyan-500/5 via-surface to-surface dark:from-cyan-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-cyan-500/15 dark:border-cyan-500/10",
    hoverBorder: "hover:border-cyan-500/40 dark:hover:border-cyan-500/30",
    text: "text-cyan-600 dark:text-cyan-400",
    bgGlow: "bg-cyan-500/5"
  },
  nodejs: {
    bg: "bg-gradient-to-br from-green-500/5 via-surface to-surface dark:from-green-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-green-500/15 dark:border-green-500/10",
    hoverBorder: "hover:border-green-500/40 dark:hover:border-green-500/30",
    text: "text-green-600 dark:text-green-400",
    bgGlow: "bg-green-500/5"
  },
  javascript: {
    bg: "bg-gradient-to-br from-yellow-500/5 via-surface to-surface dark:from-yellow-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-yellow-500/15 dark:border-yellow-500/10",
    hoverBorder: "hover:border-yellow-500/40 dark:hover:border-yellow-500/30",
    text: "text-amber-500 dark:text-yellow-400",
    bgGlow: "bg-yellow-500/5"
  },
  "javascript-coding": {
    bg: "bg-gradient-to-br from-amber-500/5 via-surface to-surface dark:from-amber-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-amber-500/15 dark:border-amber-500/10",
    hoverBorder: "hover:border-amber-500/40 dark:hover:border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    bgGlow: "bg-amber-500/5"
  },
  angular: {
    bg: "bg-gradient-to-br from-red-500/5 via-surface to-surface dark:from-red-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-red-500/15 dark:border-red-500/10",
    hoverBorder: "hover:border-red-500/40 dark:hover:border-red-500/30",
    text: "text-red-600 dark:text-red-400",
    bgGlow: "bg-red-500/5"
  },
  vuejs: {
    bg: "bg-gradient-to-br from-emerald-500/5 via-surface to-surface dark:from-emerald-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-emerald-500/15 dark:border-emerald-500/10",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    bgGlow: "bg-emerald-500/5"
  },
  typescript: {
    bg: "bg-gradient-to-br from-blue-500/5 via-surface to-surface dark:from-blue-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-blue-500/15 dark:border-blue-500/10",
    hoverBorder: "hover:border-blue-500/40 dark:hover:border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    bgGlow: "bg-blue-500/5"
  },
  dsa: {
    bg: "bg-gradient-to-br from-purple-500/5 via-surface to-surface dark:from-purple-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-purple-500/15 dark:border-purple-500/10",
    hoverBorder: "hover:border-purple-500/40 dark:hover:border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    bgGlow: "bg-purple-500/5"
  },
  "system-design": {
    bg: "bg-gradient-to-br from-orange-500/5 via-surface to-surface dark:from-orange-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-orange-500/15 dark:border-orange-500/10",
    hoverBorder: "hover:border-orange-500/40 dark:hover:border-orange-500/30",
    text: "text-orange-600 dark:text-orange-400",
    bgGlow: "bg-orange-500/5"
  },
  python: {
    bg: "bg-gradient-to-br from-emerald-500/5 via-surface to-surface dark:from-emerald-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-emerald-500/15 dark:border-emerald-500/10",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    bgGlow: "bg-emerald-500/5"
  },
  sql: {
    bg: "bg-gradient-to-br from-sky-500/5 via-surface to-surface dark:from-sky-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-sky-500/15 dark:border-sky-500/10",
    hoverBorder: "hover:border-sky-500/40 dark:hover:border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
    bgGlow: "bg-sky-500/5"
  },
  "machine-coding": {
    bg: "bg-gradient-to-br from-indigo-500/5 via-surface to-surface dark:from-indigo-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-indigo-500/15 dark:border-indigo-500/10",
    hoverBorder: "hover:border-indigo-500/40 dark:hover:border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    bgGlow: "bg-indigo-500/5"
  },
};

const FALLBACK_THEME = {
  bg: "bg-gradient-to-br from-accent/5 via-surface to-surface dark:from-accent/5 dark:via-surface/10 dark:to-surface/5",
  border: "border-accent/15 dark:border-accent/10",
  hoverBorder: "hover:border-accent/50",
  text: "text-accent",
  bgGlow: "bg-accent/5",
};

export default function QuestionDetailClient({
  q,
  followUps,
  similar,
  initialComments,
  isAdmin,
  currentUserId,
}: {
  q: QuestionData;
  followUps: SuggestionItem[];
  similar: SuggestionItem[];
  initialComments: CommentNode[];
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(true);

  const tags = parseJsonArray(q.tags);
  const years = parseJsonArray<number>(q.yearsAsked).sort((a, b) => b - a);
  
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

  const isRunnable = q.technology === "javascript" || q.technology === "javascript-coding";
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
    setTimeout(() => {
      setFramework(nextFw);
    }, 0);
  }, [hasFrameworks, frameworkKeys]);

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

  // Animation variants
  const fadeInVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Sleek back arrow link with hover slide. Returns to the question's
            technology set (e.g. /interview-questions/javascript), not the whole
            library — falls back to the library when there's no technology. */}
        <Link
          href={q.technology ? `/interview-questions/${q.technology}` : "/interview-questions"}
          className="group inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-fg transition-colors duration-200 mb-8"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform duration-200" />
          <span>{q.technology ? `Back to ${techLabel(q.technology)} questions` : "Back to Prep Library"}</span>
        </Link>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Main content (Question, Hint, Collapsible Answer, Playgrounds, Comments) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Question Prompt Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInVariants}
              className="p-6 sm:p-8 rounded-3xl border border-border bg-surface/85 dark:bg-surface/25 backdrop-blur-sm relative overflow-hidden shadow-sm"
            >
              {/* Top banner tag */}
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-bg border border-border text-muted">
                  <HelpCircle className="w-3.5 h-3.5 text-accent" />
                  Interview Question
                </span>
                
                {/* Difficulty tag */}
                <span
                  className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border dark:bg-black/20 ${difficultyClasses(
                    q.difficulty
                  )}`}
                >
                  {q.difficulty}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mt-5 text-fg">
                {q.title}
              </h1>

              {/* Description body */}
              {q.description && (
                <div className="mt-6 pt-5 border-t border-border prose dark:prose-invert max-w-none text-sm text-fg/90 leading-relaxed">
                  <MarkdownRenderer content={q.description} />
                </div>
              )}

              {/* Tags list */}
              {tags.length > 0 && (
                <div className="flex items-center flex-wrap gap-2 mt-6">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border bg-bg/40 text-[10px] font-black tracking-wider uppercase text-muted"
                    >
                      <Hash className="w-3 h-3 text-accent" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* 2. AI Hint Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInVariants}
              className="rounded-3xl border border-amber-500/35 dark:border-amber-500/20 bg-amber-500/[0.06] dark:bg-amber-500/[0.03] p-5 flex items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Stuck? AI Nudge Available
                </h3>
                <p className="text-xs text-muted max-w-md">
                  Get a conceptual hint to guide your logic without spoiling the final implementation.
                </p>
              </div>
              <div className="shrink-0">
                <HintBox slug={q.slug} />
              </div>
            </motion.div>

            {/* Framework selector — swaps the tutorial + solution (machine-coding). */}
            {hasFrameworks && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInVariants}
                className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-border bg-surface/85 dark:bg-surface/25 shadow-sm"
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

            {/* 3. Collapsible Answer & Explanation Card */}
            {answerContent && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInVariants}
                className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
                  isAnswerExpanded
                    ? `${theme.border} ${theme.bg} shadow-md`
                    : "border-border bg-surface/85 dark:bg-surface/25 shadow-sm"
                }`}
              >
                {/* Header Toggle */}
                <button
                  onClick={() => setIsAnswerExpanded(!isAnswerExpanded)}
                  className="flex items-center justify-between w-full p-6 text-left hover:bg-surface/50 transition-colors duration-200 focus:outline-none"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className={`w-5 h-5 ${isAnswerExpanded ? theme.text : "text-muted"}`} />
                    <h2 className="text-sm font-black uppercase tracking-wider text-fg">
                      Detailed Solution & Approach
                    </h2>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-muted transition-transform duration-300 ${
                      isAnswerExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Collapsible content area */}
                <AnimatePresence initial={false}>
                  {isAnswerExpanded ? (
                    <motion.div
                      key="answer-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2 border-t border-border prose dark:prose-invert max-w-none text-sm text-fg/90 leading-relaxed">
                        {/* allowHtml: answers are admin-curated and may embed
                            hand-authored inline SVG diagrams. */}
                        <MarkdownRenderer content={answerContent} allowHtml />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="answer-teaser"
                      className="relative px-6 pb-6 pt-1 text-center bg-gradient-to-b from-transparent to-surface/40"
                    >
                      {/* Blurred placeholder code list */}
                      <div className="absolute inset-0 bg-gradient-to-t from-bg/90 to-transparent pointer-events-none z-10" />
                      <div className="blur-sm opacity-15 select-none text-left font-mono text-xs space-y-1.5 p-2 border border-border rounded-xl mb-4">
                        <p>function solveChallenges(inputs) &#123;</p>
                        <p className="pl-4">{"// Optimized algorithmic steps"}</p>
                        <p className="pl-4">const cache = new Map();</p>
                        <p className="pl-4">return inputs.filter(item =&gt; cache.has(item));</p>
                        <p>&#125;</p>
                      </div>
                      
                      <button
                        onClick={() => setIsAnswerExpanded(true)}
                        className="relative z-20 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft shadow-lg transition duration-200"
                      >
                        Reveal Complete Explanation
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 4. Runnable Code Playgrounds / Examples */}
            {displayExamples.length > 0 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInVariants}
                className="p-6 rounded-3xl border border-border bg-surface/85 dark:bg-surface/25 backdrop-blur-sm space-y-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-accent" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-fg">
                    {activeFw
                      ? `${CODE_VARIANTS[activeFw]?.label ?? activeFw} Solution`
                      : displayExamples.some((e) => isRunnable && e.runnable !== false)
                      ? "Executable Playgrounds"
                      : isReact && displayExamples.some((e) => e.runnable !== false)
                      ? "React Playground Snippets"
                      : "Code Snippets"}
                  </h2>
                </div>

                <div className="space-y-4">
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
                    // In-page runner for plain JavaScript single-variant examples.
                    if (isRunnable && ex.runnable !== false && !ex.variants) {
                      return <JsPlayground key={i} code={ex.code ?? ""} label={ex.label} title={q.title} description={q.description ?? undefined} backFrom={`/interview-question/${q.slug}`} />;
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
                </div>
              </motion.div>
            )}

            {/* 5. Collapsible Discussion Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInVariants}
              className="rounded-3xl border border-border bg-surface/85 dark:bg-surface/25 backdrop-blur-sm overflow-hidden shadow-sm"
            >
              {/* Discussion Header */}
              <button
                onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
                className="flex items-center justify-between w-full p-6 text-left hover:bg-surface/50 transition-colors duration-200 focus:outline-none"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-muted" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-fg">
                    Community discussion
                  </h2>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted transition-transform duration-300 ${
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

          </div>

          {/* RIGHT COLUMN: Sidebar (glowing Tech banner, details specs grid, related lists) */}
          <div className="lg:col-span-4 space-y-6 sticky top-6">
            
            {/* 1. Technology Specs & Engagement Banner */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInVariants}
              className={`p-6 rounded-3xl border ${theme.border} ${theme.bg} backdrop-blur-sm relative overflow-hidden flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all duration-300 ${theme.hoverBorder} ${theme.bgGlow}`}
            >
              {/* Glowing SVG Header */}
              <div className="p-4 rounded-full bg-bg/60 border border-border backdrop-blur-lg flex items-center justify-center relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] group">
                <div className="absolute inset-0 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 bg-current" style={{ color: "inherit" }} />
                {q.technology ? (
                  <TechSvg tech={q.technology} className="w-16 h-16 group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-accent/10 border border-accent/20 text-accent font-black">
                    IQ
                  </div>
                )}
              </div>

              {q.technology && (
                <Link
                  href={`/interview-questions/${q.technology}`}
                  className="font-black text-base mt-4 hover:text-accent transition duration-200 tracking-tight"
                >
                  {techLabel(q.technology)}
                </Link>
              )}

              {/* Engagement Controls */}
              <div className="flex items-center gap-3 mt-5 w-full justify-center">
                <QuestionEngagement slug={q.slug} initialLikes={q.likes} />
                <SaveButton
                  question={{
                    slug: q.slug,
                    title: q.title,
                    difficulty: q.difficulty,
                    technology: q.technology,
                    company: q.company?.name ?? null,
                  }}
                />
              </div>
            </motion.div>

            {/* 2. Specs List Grid */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInVariants}
              className="p-6 rounded-3xl border border-border bg-surface/85 dark:bg-surface/25 backdrop-blur-sm space-y-4 shadow-sm"
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-muted">Specifications</h3>
              <div className="space-y-3.5 text-xs">
                
                {/* Company Row */}
                {q.company && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted/50" /> Company
                    </span>
                    <Link
                      href={`/interview-questions/company/${q.company.slug}`}
                      className="font-bold hover:text-accent"
                    >
                      {q.company.name}
                    </Link>
                  </div>
                )}

                {/* Round Row */}
                {q.round && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-muted/50" /> Interview Round
                    </span>
                    <span className="font-bold">{q.round}</span>
                  </div>
                )}

                {/* Views Row */}
                <div className="flex items-center justify-between">
                  <span className="text-muted flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-muted/50" /> Views
                  </span>
                  <span className="font-bold">{compactNumber(q.views)}</span>
                </div>

                {/* Asked Years Row */}
                {years.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2.5 border-t border-border">
                    <span className="text-muted flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted/50" /> Asked in Campaigns
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

            {/* 3. Related Questions Lists */}
            {(followUps.length > 0 || similar.length > 0) && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInVariants}
                className="space-y-4"
              >
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

          </div>

        </div>

      </div>
    </div>
  );
}

function RelatedList({ title, items }: { title: string; items: SuggestionItem[] }) {
  return (
    <div className="p-6 rounded-3xl border border-border bg-surface/85 dark:bg-surface/25 backdrop-blur-sm space-y-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted">
        <Award className="w-3.5 h-3.5 text-accent" />
        {title}
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/interview-question/${it.slug}`}
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-bg/30 hover:border-accent/40 hover:bg-surface/50 transition duration-200 text-xs font-semibold"
          >
            <span className="truncate text-fg/85 hover:text-accent">{it.title}</span>
            <span
              className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${difficultyClasses(
                it.difficulty
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
