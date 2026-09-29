"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";
import { Hash } from "lucide-react";
import { isSolved, toggleSolved } from "@/lib/interview-questions/progress";
import { isSaved, toggleSaved } from "@/lib/interview-questions/saved";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CodeExample, { MultiFileExample, type ExampleData } from "./CodeExample";
import { CODE_VARIANTS } from "@/lib/interview-questions/code-variants";
import CommentSection, { type CommentNode } from "@/components/CommentSection";
import { techLabel, parseJsonArray } from "@/lib/interview-questions/shared";
import { extractHeadings, readingMinutes } from "@/lib/interview-questions/reading";
import { topicName } from "@/lib/interview-questions/topic-catalog";
import { topicColor } from "@/app/interview-questions/_components/TopicLogo";
import HintBox from "./HintBox";
import JsPlayground from "./JsPlayground";
import SqlPlayground from "./SqlPlayground";
import QuestionHero from "./_components/QuestionHero";
import StudyBar from "./_components/StudyBar";
import PhoneDock from "./_components/PhoneDock";
import Section from "./_components/Section";
import SolutionPanel from "./_components/SolutionPanel";
import EndCap from "./_components/EndCap";
import { Contents, DetailsCard, RelatedCard, TopicCard } from "./_components/SidePanel";
import { DiagramDialog, ShortcutsDialog } from "./_components/Dialogs";
import type { NavQuestion, StudySection, SuggestionItem, TrackPosition } from "./_components/types";

export type { TrackPosition } from "./_components/types";

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

/**
 * One interview question: a dark hero, then the study flow (problem, attempt,
 * solution, code, discussion) in a reading column with a sidebar, a section
 * bar that follows you on md and up, and a dock on phones.
 */
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
  prevQuestion: NavQuestion | null;
  nextQuestion: NavQuestion | null;
  track: TrackPosition | null;
  initialComments: CommentNode[];
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(false);
  const [lightboxSvg, setLightboxSvg] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [notice, setNotice] = useState("");
  // The phone dock tucks away once the end card scrolls into view.
  const [dockParked, setDockParked] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Reading progress: a thin bar along the top edge in the topic colour.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  const tags = parseJsonArray(q.tags);
  const years = parseJsonArray<number>(q.yearsAsked).sort((a, b) => b - a);
  const techName = q.technology ? topicName(q.technology) : null;
  const techFull = q.technology ? techLabel(q.technology) : null;
  const color = topicColor(q.technology);

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

  // Diagrams in the open answer open larger on click.
  useEffect(() => {
    if (!isAnswerExpanded) return;
    const handler = (e: MouseEvent) => {
      const svg = (e.target as Element).closest?.("svg.iq-diagram") as SVGElement | null;
      if (svg) {
        e.preventDefault();
        setLightboxSvg(svg.outerHTML);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isAnswerExpanded]);

  // Watch the end card: tuck the phone dock away before the footer.
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    // A scroll check rather than an observer, so a jump straight to the footer still parks it.
    let raf = 0;
    const check = () => {
      raf = 0;
      setDockParked(el.getBoundingClientRect().top < window.innerHeight);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

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


  const answerMarkdown = answerContent ?? "";
  const minutes = readingMinutes(answerMarkdown);
  const headings = useMemo(() => extractHeadings(answerMarkdown), [answerMarkdown]);

  const hasProblem = Boolean(cleanDescription) || tags.length > 0;
  const hasAnswer = Boolean(answerContent);
  const hasExamples = displayExamples.length > 0;
  const canRun = displayExamples.some((e) => e.runnable !== false);
  const codeTitle = activeFw
    ? `${CODE_VARIANTS[activeFw]?.label ?? activeFw} solution`
    : (isRunnable || isSql) && canRun
      ? "Run the code"
      : isReact && canRun
        ? "Try it in the playground"
        : "Read the code";
  const codeSub = activeFw
    ? "Every file of the working solution. Open it in the playground to run and change it."
    : isSql && canRun
      ? "Edit the query and run it against the tables for this question."
      : isRunnable && canRun
        ? "Edit the code and run it here. Each console line with an expected value becomes a test."
        : isReact && canRun
          ? "Open any example in the playground to run and change it."
          : undefined;

  const sections: StudySection[] = [
    ...(hasProblem ? [{ id: "problem", label: "Problem" }] : []),
    { id: "attempt", label: "Attempt" },
    ...(hasAnswer ? [{ id: "solution", label: "Solution" }] : []),
    ...(hasExamples ? [{ id: "code", label: "Code" }] : []),
    { id: "discussion", label: "Discussion" },
  ];
  const num = (id: string) => sections.findIndex((s) => s.id === id) + 1;

  function openSolution() {
    setIsAnswerExpanded(true);
    requestAnimationFrame(() => {
      const el = document.getElementById("solution");
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
    });
  }

  // Global keyboard shortcuts — skipped while typing, and modifiers opt out
  // (so browser / playground shortcuts keep working). Rebound every render
  // so closures never go stale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (t?.closest?.(".cm-editor")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        if (showKeys) setShowKeys(false);
        else if (lightboxSvg) setLightboxSvg(null);
        return;
      }
      if (showKeys || lightboxSvg) return;
      if (e.key === "ArrowLeft" && prevQuestion) {
        e.preventDefault();
        router.push(`/interview-question/${prevQuestion.slug}`);
      } else if (e.key === "ArrowRight" && nextQuestion) {
        e.preventDefault();
        router.push(`/interview-question/${nextQuestion.slug}`);
      } else if ((e.key === "e" || e.key === "E") && hasAnswer) {
        if (isAnswerExpanded) setIsAnswerExpanded(false);
        else openSolution();
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
    <div className="min-h-screen bg-bg text-fg">
      {hasAnswer && (
        <a
          href="#solution"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bg"
        >
          Skip to the solution
        </a>
      )}
      <div aria-live="polite" role="status" className="sr-only">
        {notice}
      </div>

      <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left" style={{ scaleX: progress, background: color }} />

      <QuestionHero
        question={q}
        techName={techFull}
        color={color}
        years={years}
        minutes={minutes}
        track={track}
        saved={saved}
        solved={solved}
        onToggleSaved={handleToggleSaved}
        onToggleSolved={handleToggleSolved}
        onShowKeys={() => setShowKeys(true)}
      />

      <StudyBar
        sections={sections}
        prev={prevQuestion}
        next={nextQuestion}
        track={track}
        solved={solved}
        onToggleSolved={handleToggleSolved}
      />

      <div className="mx-auto grid max-w-[1180px] gap-12 px-4 pb-16 pt-8 md:px-6 md:pt-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <div className="min-w-0 space-y-14 md:space-y-16">
          {hasProblem && (
            <Section id="problem" num={num("problem")} title="The problem">
              <div className="rounded-2xl border border-border bg-surface p-5 md:p-7">
                {cleanDescription && (
                  <div className="qa-doc">
                    <MarkdownRenderer content={cleanDescription} docs />
                  </div>
                )}
                {tags.length > 0 && (
                  <ul aria-label="Topics" className={`flex flex-wrap gap-2 ${cleanDescription ? "mt-6 border-t border-border pt-5" : ""}`}>
                    {tags.map((t) => (
                      <li key={t} className="inline-flex h-7 items-center gap-1 rounded-lg bg-panel px-2.5 text-[13px] text-muted">
                        <Hash className="h-3 w-3 text-subtle" aria-hidden />
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          )}

          <Section
            id="attempt"
            num={num("attempt")}
            title="Try it yourself"
            sub="Sketch your approach before you read the solution. That is what the interview tests."
          >
            <HintBox slug={q.slug} />
          </Section>

          {hasAnswer && (
            <Section
              id="solution"
              num={num("solution")}
              title="Solution"
              aside={
                hasFrameworks ? (
                  <div role="tablist" aria-label="Solution framework" className="flex rounded-xl border border-border bg-surface p-1">
                    {frameworkKeys.map((fw) => (
                      <button
                        key={fw}
                        type="button"
                        role="tab"
                        aria-selected={fw === activeFw}
                        onClick={() => selectFramework(fw)}
                        className={`h-8 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${fw === activeFw ? "bg-elevated text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]" : "text-subtle hover:text-fg"
                          }`}
                      >
                        {CODE_VARIANTS[fw]?.label ?? fw}
                      </button>
                    ))}
                  </div>
                ) : undefined
              }
            >
              <SolutionPanel
                key={activeFw ?? "answer"}
                content={answerMarkdown}
                minutes={minutes}
                sections={headings.length}
                open={isAnswerExpanded}
                onOpen={openSolution}
                onClose={() => setIsAnswerExpanded(false)}
                solved={solved}
                onToggleSolved={handleToggleSolved}
              />
            </Section>
          )}

          {hasExamples && (
            <Section id="code" num={num("code")} title={codeTitle} sub={codeSub}>
              <div className="space-y-5">
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
              </div>
            </Section>
          )}

          <Section
            id="discussion"
            num={num("discussion")}
            title="Discussion"
            sub="Other approaches, follow-ups and how it went in real interviews."
          >
            <CommentSection
              postId={q.id}
              initialComments={initialComments}
              signedIn={!!currentUserId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              postUrl={`/api/interview-questions/${q.slug}/comments`}
              deleteUrlBase="/api/interview-questions/comments"
              placeholder="Share your approach, another answer, or a follow-up you were asked…"
              bare
              emptyText="No comments yet. Share how you would answer it."
            />
          </Section>
        </div>

        <aside aria-label="About this question" className="flex flex-col gap-4">
          {q.technology && techFull && <TopicCard tech={q.technology} techName={techFull} color={color} track={track} />}
          <DetailsCard difficulty={q.difficulty} round={q.round} company={q.company} years={years} views={q.views} />
          {followUps.length > 0 && q.company && (
            <RelatedCard
              title={`More from ${q.company.name}`}
              items={followUps}
              more={{ href: `/interview-questions/company/${q.company.slug}`, label: `All ${q.company.name} questions` }}
            />
          )}
          {similar.length > 0 && (
            <RelatedCard
              title={`Similar ${techName ?? ""} questions`}
              items={similar}
              more={q.technology ? { href: `/interview-questions/${q.technology}`, label: `All ${techName} questions` } : undefined}
            />
          )}
          {isAnswerExpanded && headings.length >= 3 && (
            <div className="sticky top-[164px] hidden rounded-2xl border border-border bg-surface p-5 lg:block">
              <Contents headings={headings} />
            </div>
          )}
        </aside>
      </div>

      <div ref={endRef}>
        <EndCap
          next={nextQuestion}
          track={track}
          tech={q.technology}
          techName={techName}
          color={color}
          solved={solved}
          onToggleSolved={handleToggleSolved}
        />
      </div>
      {/* Room under the end card so the phone dock never covers it. */}
      <div aria-hidden className="h-24 md:h-20" />

      <PhoneDock
        prev={prevQuestion}
        next={nextQuestion}
        track={track}
        techName={techName}
        color={color}
        solved={solved}
        onToggleSolved={handleToggleSolved}
        visible={!dockParked}
      />

      {showKeys && <ShortcutsDialog onClose={() => setShowKeys(false)} />}
      {lightboxSvg && <DiagramDialog svg={lightboxSvg} onClose={() => setLightboxSvg(null)} />}
    </div>
  );
}
