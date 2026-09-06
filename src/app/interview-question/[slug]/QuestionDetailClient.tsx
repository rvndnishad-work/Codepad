"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Eye,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Hash,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Calendar,
  Layers,
  Award,
  CheckCircle2,
  Lock,
  X,
  Keyboard,
} from "lucide-react";
import { isSolved, toggleSolved } from "@/lib/interview-questions/progress";
import { isSaved, toggleSaved } from "@/lib/interview-questions/saved";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CodeExample, { MultiFileExample, type ExampleData } from "./CodeExample";
import { CODE_VARIANTS } from "@/lib/interview-questions/code-variants";
import CommentSection, { type CommentNode } from "@/components/CommentSection";
import WowReveal from "@/components/wow/WowReveal";
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

gsap.registerPlugin(ScrollTrigger);

const OrbitScene3D = dynamic(() => import("./_wow/OrbitScene3D"), { ssr: false });

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

export interface TrackPosition {
  index: number;
  total: number;
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

const DIFF_DOT: Record<string, string> = {
  easy: "bg-emerald-400",
  medium: "bg-amber-400",
  hard: "bg-rose-400",
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["←", "→"], label: "Previous / next question in track" },
  { keys: ["E"], label: "Reveal / hide the solution" },
  { keys: ["M"], label: "Mark as solved" },
  { keys: ["S"], label: "Save to library" },
  { keys: ["?"], label: "Toggle this cheatsheet" },
  { keys: ["Esc"], label: "Close dialogs" },
];

export default function QuestionDetailClient({
  q,
  followUps,
  similar,
  prevQuestion,
  nextQuestion,
  track,
  initialComments,
  isAdmin,
  currentUserId,
}: {
  q: QuestionData;
  followUps: SuggestionItem[];
  similar: SuggestionItem[];
  prevQuestion: { slug: string; title: string } | null;
  nextQuestion: { slug: string; title: string } | null;
  track: TrackPosition | null;
  initialComments: CommentNode[];
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(true);
  const [lightboxSvg, setLightboxSvg] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [notice, setNotice] = useState("");
  // Park the sticky track dock once the page finale scrolls into view so it
  // never slides over the site footer.
  const [dockParked, setDockParked] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const cheatsheetCloseRef = useRef<HTMLButtonElement>(null);
  const [orbitPaused, setOrbitPaused] = useState(false);
  const [orbitScrolling, setOrbitScrolling] = useState(false);

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

  // SVG lightbox — click any iq-diagram to open pan/zoom modal (Phase 5)
  useEffect(() => {
    if (!isAnswerExpanded) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      const svg = target.closest("svg.iq-diagram") as SVGElement | null;
      if (svg) {
        e.preventDefault();
        setLightboxSvg(svg.outerHTML);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isAnswerExpanded]);

  // Freeze the orbit sculpture offscreen / while scrolling / on reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOrbitPaused(true);
      return;
    }
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setOrbitPaused(!e.isIntersecting), { threshold: 0.02 });
    obs.observe(el);
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setOrbitScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setOrbitScrolling(false), 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  // GSAP dossier entrance (skipped for reduced motion — content stays visible).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".qd-line", { yPercent: 115, duration: 1, stagger: 0.1 })
        .from(".qd-fade", { y: 22, opacity: 0, duration: 0.8, stagger: 0.07 }, "-=0.6")
        .from(".qd-orbit", { opacity: 0, scale: 0.92, duration: 1.2 }, "-=0.8");
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Focus the dialog close buttons when they open (a11y).
  useEffect(() => {
    if (lightboxSvg) lightboxCloseRef.current?.focus();
  }, [lightboxSvg]);
  useEffect(() => {
    if (showKeys) cheatsheetCloseRef.current?.focus();
  }, [showKeys]);

  // Watch the end-of-content sentinel: park the dock before the footer.
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setDockParked(e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  async function handleToggleSaved() {
    const nextSaved = !saved;
    setSaved(nextSaved);
    setNotice(nextSaved ? "Saved to your library." : "Removed from your saved library.");

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
    setNotice(nextSolved ? "Marked as solved. Nice work." : "Marked as unsolved.");

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

  // Global keyboard shortcuts — skipped while typing, and modifiers opt out
  // (so browser / playground shortcuts keep working). Rebound every render
  // so closures never go stale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        if (showKeys) setShowKeys(false);
        else if (lightboxSvg) setLightboxSvg(null);
        return;
      }
      if (e.key === "ArrowLeft" && prevQuestion) {
        e.preventDefault();
        router.push(`/interview-question/${prevQuestion.slug}`);
      } else if (e.key === "ArrowRight" && nextQuestion) {
        e.preventDefault();
        router.push(`/interview-question/${nextQuestion.slug}`);
      } else if ((e.key === "e" || e.key === "E") && hasAnswer) {
        setIsAnswerExpanded((v) => !v);
      } else if (e.key === "m" || e.key === "M") {
        void handleToggleSolved();
      } else if (e.key === "s" || e.key === "S") {
        void handleToggleSaved();
      } else if (e.key === "?") {
        setShowKeys((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="min-h-screen bg-[var(--wow-bg)] text-[var(--wow-fg)] transition-colors">
      {/* Skip link + polite announcements (a11y) */}
      {hasAnswer && (
        <a
          href="#solution"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
        >
          Skip to solution
        </a>
      )}
      <div aria-live="polite" role="status" className="sr-only">
        {notice}
      </div>

      {/* Reading progress bar */}
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 h-[3px] z-[60] origin-left"
        style={{ scaleX: progress, background: theme.hex }}
      />

      {/* ============ DOSSIER HERO — dark interrogation chamber ============ */}
      <header ref={heroRef} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-[#08080f] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-28 right-[12%] w-[420px] h-[420px] rounded-full blur-[130px]"
            style={{ background: tint(theme.hex, 16) }}
          />
          <div className="absolute -bottom-36 -left-24 w-[360px] h-[360px] rounded-full bg-[#8b93ff]/10 blur-[120px]" />
          {/* Grid dissolves before the hero edge so no cutoff line meets the body */}
          <div className="wow-grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black_55%,transparent_97%)]" />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--wow-bg)]" />
        {/* Soft landing: blurs any residual texture edge into the body */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[var(--wow-bg)]" />

        {/* Orbital sculpture — tech-tinted, xl screens only */}
        {q.technology && (
          <div aria-hidden className="qd-orbit pointer-events-none absolute -right-6 top-1/2 hidden h-[400px] w-[400px] -translate-y-1/2 opacity-80 xl:block">
            <OrbitScene3D paused={orbitPaused || orbitScrolling} hex={theme.hex} />
          </div>
        )}

        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-32">
          {/* Breadcrumb — prev/next lives in the sticky dock, shortcuts + finale */}
          <nav aria-label="Breadcrumb" className="qd-fade flex min-w-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
            <Link href="/interview-questions" className="shrink-0 transition-colors hover:text-white">
              Questionverse
            </Link>
            {q.technology && (
              <>
                <ChevronRight className="h-3 w-3 shrink-0 text-white/25" />
                <Link
                  href={`/interview-questions/${q.technology}`}
                  className="shrink-0 transition-colors hover:text-white"
                >
                  {techLabel(q.technology)}
                </Link>
              </>
            )}
            <ChevronRight className="hidden h-3 w-3 shrink-0 text-white/25 sm:block" />
            <span className="hidden truncate text-white/70 sm:block">{q.title}</span>
          </nav>

          {/* Meta chips */}
          <div className="qd-fade mt-7 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
              <span className={`h-1.5 w-1.5 rounded-full ${DIFF_DOT[q.difficulty] ?? "bg-white/60"}`} />
              {q.difficulty}
            </span>
            {solved && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Solved
              </span>
            )}
            {q.company && (
              <Link
                href={`/interview-questions/company/${q.company.slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/85 backdrop-blur-md transition hover:border-white/40 hover:text-white"
              >
                <Building2 className="h-3.5 w-3.5 text-white/50" />
                {q.company.name}
              </Link>
            )}
            {q.round && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/70 backdrop-blur-md">
                <Layers className="h-3.5 w-3.5 text-white/50" />
                {q.round}
              </span>
            )}
            {years.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/70 backdrop-blur-md">
                <Calendar className="h-3.5 w-3.5 text-white/50" />
                {years.slice(0, 3).join(" · ")}
              </span>
            )}
          </div>

          {/* Title — the star of the page */}
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] sm:text-[2.75rem]">
            <span className="block overflow-hidden pb-1"><span className="qd-line block">{q.title}</span></span>
          </h1>

          {/* Action deck */}
          <div className="qd-fade mt-7 flex flex-wrap items-center gap-2.5">
            <QuestionEngagement slug={q.slug} initialLikes={q.likes} tone="dark" />
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
              tone="dark"
            />
            <button
              onClick={handleToggleSolved}
              aria-pressed={solved}
              title="Shortcut: M"
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff] ${
                solved
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-white/25 bg-white/[0.07] text-white/85 hover:border-white/50 hover:text-white"
              }`}
            >
              <CheckCircle2 className={`h-4 w-4 ${solved ? "text-emerald-400" : "text-rose-400"}`} />
              {solved ? "Solved" : "Mark Solved"}
            </button>
            <button
              onClick={() => setShowKeys(true)}
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/[0.07] px-3 py-2 text-xs font-bold text-white/70 transition hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
            >
              <Keyboard className="h-4 w-4 text-[#8b93ff]" />
              <span className="hidden sm:inline">Shortcuts</span>
            </button>
            <span className="inline-flex items-center gap-1.5 pl-2 text-xs font-bold tabular-nums text-white/75">
              <Eye className="h-3.5 w-3.5 text-cyan-300" />
              {compactNumber(q.views)} views
            </span>
          </div>
        </div>
      </header>

      {/* ============ BODY — study flow on the numbered rail ============ */}
      <div className="mx-auto max-w-[1440px] px-4 pb-36 pt-10 sm:px-6 lg:px-8">
        {/* collapse toggle — visible on xl where sidebar would steal width from BOE tables */}
        <div className="mb-4 hidden justify-end xl:flex">
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-card)] px-3 py-1.5 text-xs font-bold text-muted backdrop-blur-sm transition hover:text-[var(--wow-fg)] hover:border-[#8b93ff]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
          >
            {sidebarCollapsed ? <><ChevronRight className="h-3.5 w-3.5" /> Show details</> : <>Hide details <ChevronRight className="h-3.5 w-3.5 rotate-180" /></>}
          </button>
        </div>
        <div className={`flex flex-col items-start gap-8 ${sidebarCollapsed ? "" : "xl:flex-row"}`}>
          {/* LEFT: guided study flow — grows to fill when sidebar hidden */}
          <div className="w-full min-w-0 flex-1">
            <div className="relative space-y-10 lg:pl-14">
              {/* Connecting rail line (desktop) */}
              <div aria-hidden className="absolute bottom-3 left-4 top-3 hidden w-px bg-[var(--wow-card-border)] lg:block" />

              {/* Step: understand the problem */}
              {hasProblem && (
                <StudyStep num={nextStep()} title="Understand the problem" hex={theme.hex}>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeInVariants}
                    className="rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-card)] p-6 shadow-sm backdrop-blur-sm sm:p-7"
                  >
                    {cleanDescription && (
                      <div className="prose max-w-none text-sm leading-relaxed text-[var(--wow-fg)]/90 dark:prose-invert">
                        <MarkdownRenderer content={cleanDescription} />
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className={`flex flex-wrap items-center gap-2 ${cleanDescription ? "mt-6 border-t border-black/[0.06] dark:border-white/[0.07] pt-5" : ""}`}>
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-stage)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted"
                          >
                            <Hash className="h-3 w-3 opacity-60" />
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
                <StudyStep num={nextStep()} title="Study the solution" hex={theme.hex} id="solution">
                  <div className="space-y-4">
                    {/* Framework selector — swaps the tutorial + solution (machine-coding). */}
                    {hasFrameworks && (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariants}
                        className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-card)] p-3 shadow-sm backdrop-blur-sm"
                      >
                        <span className="px-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                          Solve in
                        </span>
                        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Solution framework">
                          {frameworkKeys.map((fw) => (
                            <button
                              key={fw}
                              role="tab"
                              aria-selected={fw === activeFw}
                              onClick={() => selectFramework(fw)}
                              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff] ${
                                fw === activeFw
                                  ? "bg-white text-black shadow-sm"
                                  : "border border-black/[0.06] dark:border-white/[0.07] text-muted hover:border-[#8b93ff]/50 hover:text-[var(--wow-fg)]"
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
                        /* Spoiler gate — classified drawer, calm "peek when ready" */
                        <motion.div
                          key="answer-gate"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f16] text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,0.8)]"
                        >
                          <div
                            aria-hidden
                            className="pointer-events-none absolute -top-16 right-0 h-64 w-64 rounded-full blur-3xl"
                            style={{ background: tint(theme.hex, 14) }}
                          />
                          <div className="relative">
                            {/* Drawer handle */}
                            <div className="flex justify-center pt-3">
                              <div className="h-1.5 w-12 rounded-full bg-white/15" />
                            </div>
                            {/* Blurred preview of answer */}
                            {answerContent && (
                              <div className="relative max-h-24 overflow-hidden px-6 pb-2 pt-4">
                                <div className="prose prose-invert max-w-none text-sm leading-relaxed text-white/90 opacity-60 blur-[3px] select-none">
                                  <MarkdownRenderer content={answerContent.slice(0, 320)} allowHtml />
                                </div>
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0f16] via-[#0d0f16]/80 to-transparent" />
                              </div>
                            )}
                            <div className="flex flex-col items-center px-6 pb-6 text-center sm:pb-7">
                              <div
                                className="mb-3 grid h-10 w-10 place-items-center rounded-xl border"
                                style={{ background: tint(theme.hex, 12), borderColor: tint(theme.hex, 30) }}
                              >
                                <Lock className="h-4 w-4" style={{ color: theme.hex.startsWith("#") ? theme.hex : undefined }} />
                              </div>
                              <h3 className="text-base font-black tracking-tight text-white">Solution ready — 2 min read</h3>
                              <p className="mt-1 max-w-sm font-mono text-[11px] uppercase leading-relaxed tracking-[0.18em] text-white/45">
                                Classified // press E to declassify
                              </p>
                              <button
                                onClick={() => setIsAnswerExpanded(true)}
                                aria-expanded={false}
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg transition duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
                              >
                                Reveal the solution
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="answer-content"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-card)] shadow-md backdrop-blur-sm"
                        >
                          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.07] px-6 py-3">
                            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                              Declassified // solution
                            </span>
                            <button
                              onClick={() => setIsAnswerExpanded(false)}
                              aria-expanded={true}
                              className="rounded-full border border-black/[0.06] dark:border-white/[0.07] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted transition hover:border-[#8b93ff]/50 hover:text-[var(--wow-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
                            >
                              Seal it (E)
                            </button>
                          </div>
                          <div className="prose max-w-none p-6 text-sm leading-relaxed text-[var(--wow-fg)]/90 dark:prose-invert sm:p-7">
                            {/* allowHtml: answers are admin-curated and may embed
                                hand-authored inline SVG diagrams. */}
                            <MarkdownRenderer content={answerContent!} allowHtml />
                          </div>

                          {/* Post-read nudge: close the loop on progress */}
                          <div className="px-6 pb-6">
                            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3.5 sm:flex-row">
                              <p className="text-xs font-semibold text-muted">
                                {solved ? "Nice — this one's in your solved list." : "Understood it end to end? Log your progress."}
                              </p>
                              <button
                                onClick={handleToggleSolved}
                                aria-pressed={solved}
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff] ${
                                  solved
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-black/[0.06] dark:border-white/[0.07] text-muted hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400"
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {solved ? "Solved" : "Mark as solved (M)"}
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
                  className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-card)] shadow-sm backdrop-blur-sm"
                >
                  <button
                    onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
                    aria-expanded={isCommentsExpanded}
                    className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors duration-200 hover:bg-[var(--wow-stage)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#8b93ff]"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="h-5 w-5 text-muted" />
                      <span className="text-sm font-bold text-[var(--wow-fg)]">
                        Approaches, follow-ups & war stories from other candidates
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${
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
                        <div className="border-t border-black/[0.06] dark:border-white/[0.07] px-6 pb-6 pt-2">
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
          </div>

          {/* RIGHT: sticky companion sidebar — collapsible, narrower (340px) so tables/SVGs get ~72% */}
          <aside aria-label="Question details" className={`${sidebarCollapsed ? "hidden" : "w-full shrink-0 space-y-5 xl:w-[340px]"} xl:sticky xl:top-8`}>
            {/* Track card — where this question lives */}
            {q.technology && (
              <WowReveal>
                <Link
                  href={`/interview-questions/${q.technology}`}
                  className="group flex items-center gap-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-card)] p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8b93ff]/50"
                >
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border transition-colors"
                    style={{ background: tint(theme.hex, 10), borderColor: tint(theme.hex, 25) }}
                  >
                    <TechSvg tech={q.technology} className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Track</div>
                    <div className="truncate text-sm font-black tracking-tight text-[var(--wow-fg)] transition-colors group-hover:text-[#8b93ff]">
                      {techLabel(q.technology)} questions
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#8b93ff]" />
                </Link>
              </WowReveal>
            )}

            {/* At a glance */}
            <WowReveal delay={0.06}>
              <div className="space-y-3.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-card)] p-5 shadow-sm backdrop-blur-sm">
                <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8b93ff]" />
                  At a glance
                </h3>
                <div className="space-y-3 text-xs">
                  {q.company && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted">
                        <Building2 className="h-3.5 w-3.5 text-muted/50" /> Company
                      </span>
                      <Link
                        href={`/interview-questions/company/${q.company.slug}`}
                        className="truncate font-bold hover:text-[#8b93ff]"
                      >
                        {q.company.name}
                      </Link>
                    </div>
                  )}
                  {q.round && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted">
                        <Layers className="h-3.5 w-3.5 text-muted/50" /> Round
                      </span>
                      <span className="font-bold">{q.round}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Eye className="h-3.5 w-3.5 text-muted/50" /> Views
                    </span>
                    <span className="font-bold tabular-nums">{compactNumber(q.views)}</span>
                  </div>
                  {years.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-black/[0.06] dark:border-white/[0.07] pt-2.5">
                      <span className="flex items-center gap-1.5 text-muted">
                        <Calendar className="h-3.5 w-3.5 text-muted/50" /> Years asked
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {years.map((yr) => (
                          <span
                            key={yr}
                            className="rounded bg-[var(--wow-stage)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--wow-fg)]/80"
                          >
                            {yr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </WowReveal>

            {/* Related questions */}
            {(followUps.length > 0 || similar.length > 0) && (
              <div className="space-y-5">
                {followUps.length > 0 && (
                  <WowReveal delay={0.1}>
                    <RelatedList
                      title={q.company ? `Asked at ${q.company.name}` : "Follow-ups"}
                      items={followUps}
                    />
                  </WowReveal>
                )}
                {similar.length > 0 && (
                  <WowReveal delay={0.14}>
                    <RelatedList
                      title={`Similar ${q.technology ? techLabel(q.technology) : ""} questions`}
                      items={similar}
                    />
                  </WowReveal>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* ── Finale: end of dossier (fills the void above the site footer) ── */}
        <WowReveal>
          <EndCap
            nextQuestion={nextQuestion}
            track={track}
            techSlug={q.technology}
            techName={q.technology ? techLabel(q.technology) : null}
            solved={solved}
            onToggleSolved={handleToggleSolved}
            hex={theme.hex}
          />
        </WowReveal>
        {/* Sentinel: when this enters view the sticky dock parks itself. */}
        <div ref={endRef} aria-hidden className="h-px" />
      </div>

      {/* Sticky track navigator — prev/next without scrolling, with progress.
          Parks itself once the finale is on screen (never over the footer). */}
      <TrackNavigator
        techSlug={q.technology}
        techName={q.technology ? techLabel(q.technology) : null}
        track={track}
        prevQuestion={prevQuestion}
        nextQuestion={nextQuestion}
        visible={!dockParked}
      />

      {/* Keyboard cheatsheet */}
      <AnimatePresence>
        {showKeys && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowKeys(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Keyboard shortcuts"
              className="w-full max-w-sm rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[#0d0f16] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-white">
                  <Keyboard className="h-4 w-4 text-[#8b93ff]" /> Shortcuts
                </h2>
                <button
                  ref={cheatsheetCloseRef}
                  onClick={() => setShowKeys(false)}
                  aria-label="Close shortcuts"
                  className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-white/50 transition hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul className="space-y-2.5">
                {SHORTCUTS.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-white/60">{s.label}</span>
                    <span className="flex gap-1">
                      {s.keys.map((k) => (
                        <kbd key={k} className="rounded-md border border-white/15 bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SVG lightbox */}
      {lightboxSvg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setLightboxSvg(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Diagram viewer"
            className="relative max-h-[85vh] w-full max-w-4xl overflow-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[#0d0f16] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={lightboxCloseRef}
              onClick={() => setLightboxSvg(null)}
              aria-label="Close diagram viewer"
              className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="max-h-[70vh] overflow-auto p-2 pr-8" dangerouslySetInnerHTML={{ __html: lightboxSvg }} />
            <div className="mt-3 flex justify-center">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">Pan & zoom • Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sticky track navigator — the better prev/next. A glass dock pinned to the
 * viewport bottom: previous question, track position + progress, next
 * question. Always one tap away, no scrolling back up.
 */
function TrackNavigator({
  techSlug,
  techName,
  track,
  prevQuestion,
  nextQuestion,
  visible,
}: {
  techSlug: string | null;
  techName: string | null;
  track: TrackPosition | null;
  prevQuestion: { slug: string; title: string } | null;
  nextQuestion: { slug: string; title: string } | null;
  visible: boolean;
}) {
  if (!prevQuestion && !nextQuestion) return null;
  const pct = track && track.total > 0 ? ((track.index + 1) / track.total) * 100 : 0;
  return (
    <motion.nav
      aria-label="Track navigation"
      aria-hidden={!visible}
      inert={!visible}
      initial={{ y: 80, opacity: 0 }}
      animate={visible ? { y: 0, opacity: 1 } : { y: 80, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4 ${visible ? "" : "pointer-events-none"}`}
    >
      <div className="mx-auto flex max-w-6xl items-stretch gap-2 rounded-2xl border border-white/10 bg-[#0d0f16]/85 p-2 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {prevQuestion ? (
          <Link
            href={`/interview-question/${prevQuestion.slug}`}
            aria-label={`Previous question: ${prevQuestion.title}`}
            className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white/40 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:text-white" />
            <span className="min-w-0 text-left">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Prev</span>
              <span className="block truncate text-[13px] font-bold text-white/80 transition-colors group-hover:text-white">{prevQuestion.title}</span>
            </span>
          </Link>
        ) : (
          <span aria-disabled="true" className="flex min-w-0 flex-1 cursor-not-allowed select-none items-center gap-2.5 rounded-xl px-3 py-2 opacity-40">
            <ArrowLeft className="h-4 w-4 shrink-0 text-white/40" />
            <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Track start</span>
          </span>
        )}

        {track && track.total > 0 && (
          <div className="hidden w-44 shrink-0 flex-col justify-center gap-1.5 border-x border-white/10 px-4 sm:flex" aria-hidden>
            <div className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 tabular-nums">
              {track.index + 1} / {track.total}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3]" style={{ width: `${pct}%` }} />
            </div>
            {techSlug && (
              <div className="truncate text-center font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                {techName ?? techSlug}
              </div>
            )}
          </div>
        )}

        {nextQuestion ? (
          <Link
            href={`/interview-question/${nextQuestion.slug}`}
            aria-label={`Next question: ${nextQuestion.title}`}
            className="group flex min-w-0 flex-1 items-center justify-end gap-2.5 rounded-xl px-3 py-2 text-right transition hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
          >
            <span className="min-w-0">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Next →</span>
              <span className="block truncate text-[13px] font-bold text-white/80 transition-colors group-hover:text-white">{nextQuestion.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white" />
          </Link>
        ) : (
          <span aria-disabled="true" className="flex min-w-0 flex-1 cursor-not-allowed select-none items-center justify-end gap-2.5 rounded-xl px-3 py-2 opacity-40">
            <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Track complete</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
          </span>
        )}
      </div>
    </motion.nav>
  );
}

/**
 * Finale — end of dossier. Fills the void above the site footer with a lit
 * send-off: streak status, the next transmission spotlighted, and a way back
 * to the track. Doubles as the sentinel zone that parks the sticky dock.
 */
function EndCap({
  nextQuestion,
  track,
  techSlug,
  techName,
  solved,
  onToggleSolved,
  hex,
}: {
  nextQuestion: { slug: string; title: string } | null;
  track: TrackPosition | null;
  techSlug: string | null;
  techName: string | null;
  solved: boolean;
  onToggleSolved: () => void;
  hex: string;
}) {
  return (
    <section aria-label="Continue your streak" className="wow-noise relative mx-auto mt-16 max-w-6xl overflow-hidden rounded-[2rem] bg-[#0b0d16] px-6 py-12 text-white md:px-10 md:py-14">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 left-1/4 h-[300px] w-[480px] rounded-full blur-[110px]"
          style={{ background: tint(hex, 18) }}
        />
        <div className="absolute -bottom-28 right-[8%] h-[260px] w-[380px] rounded-full bg-[#8b93ff]/15 blur-[100px]" />
        <div className="wow-grid-bg absolute inset-0 opacity-70" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0b0d16]" />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/70 backdrop-blur-md">
            <span className={`h-1.5 w-1.5 rounded-full ${solved ? "bg-emerald-400" : "bg-[#ffe600]"}`} />
            Transmission complete // {solved ? "logged as solved" : "awaiting log"}
          </p>
          <h2 className="wow-font-display mt-4 text-4xl leading-[0.95] md:text-5xl">
            KEEP THE<br /><span className="wow-gradient-text">STREAK ALIVE.</span>
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
            {track && track.total > 0
              ? `Dossier ${track.index + 1} of ${track.total} decoded${techName ? ` in the ${techName} track` : ""}. One more won't hurt.`
              : "One dossier down. The track keeps going."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {!solved && (
              <button
                onClick={onToggleSolved}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-black shadow-lg transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Log as solved
              </button>
            )}
            {techSlug && (
              <Link
                href={`/interview-questions/${techSlug}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-white/80 backdrop-blur-md transition hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
              >
                Back to track
              </Link>
            )}
          </div>
        </div>

        <div>
          {nextQuestion ? (
            <Link
              href={`/interview-question/${nextQuestion.slug}`}
              className="group block overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#ffe600]/50 hover:shadow-[0_24px_70px_-24px_rgba(255,230,0,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#ffe600]">
                  Next up
                </span>
                <kbd className="rounded-md border border-white/15 bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] font-bold text-white/70">→</kbd>
              </div>
              <p className="mt-3 text-xl font-black leading-snug tracking-tight text-white transition-colors group-hover:text-[#ffe600] md:text-2xl">
                {nextQuestion.title}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-white/60 transition-colors group-hover:text-white">
                Continue <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-6 backdrop-blur-md">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
                Track complete
              </p>
              <p className="mt-3 text-xl font-black leading-snug tracking-tight text-white md:text-2xl">
                You decoded the whole {techName ?? "track"}. Legend.
              </p>
              <Link
                href="/interview-questions"
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-white/60 transition-colors hover:text-white"
              >
                Pick another arena <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
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
  id,
  children,
}: {
  num: string;
  title: string;
  sub?: string;
  hex: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative scroll-mt-24">
      <div
        className="absolute -left-14 top-0 hidden h-8 w-8 place-items-center rounded-full border bg-[var(--wow-bg)] text-[10px] font-black lg:grid"
        style={{ borderColor: tint(hex, 35), color: hex.startsWith("#") ? hex : undefined }}
      >
        {num}
      </div>
      <div className="mb-3.5 flex items-baseline gap-2">
        <span className="text-[11px] font-black lg:hidden" style={{ color: hex.startsWith("#") ? hex : undefined }}>
          {num}
        </span>
        <div>
          <h2 className="font-mono text-[13px] font-black uppercase tracking-[0.18em] text-[var(--wow-fg)]">{title}</h2>
          {sub && <p className="mt-1 text-xs leading-relaxed text-muted">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function RelatedList({ title, items }: { title: string; items: SuggestionItem[] }) {
  return (
    <div className="space-y-3 rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-[var(--wow-card)] p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
        <Award className="h-3.5 w-3.5 text-[#8b93ff]" />
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <Link
            key={it.slug}
            href={`/interview-question/${it.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-transparent p-3 text-xs font-semibold transition duration-200 hover:border-[#8b93ff]/30 hover:bg-[var(--wow-stage)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b93ff]"
          >
            <span className="w-5 shrink-0 text-right font-mono font-black tabular-nums text-muted/40 transition-colors group-hover:text-[#8b93ff]">
              {i + 1}
            </span>
            <span className="flex-1 truncate text-[var(--wow-fg)]/85 transition-colors group-hover:text-[var(--wow-fg)]">{it.title}</span>
            <span
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${difficultyClasses(
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
