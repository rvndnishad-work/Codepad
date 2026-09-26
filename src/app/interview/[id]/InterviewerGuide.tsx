"use client";

/**
 * Interviewer-only drawer in the live room: the brief from whoever set the
 * interview up and the question guide, with a tick per question asked.
 * The page only renders it for the host and panel, so none of this reaches
 * the candidate.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Check, ChevronDown, ListChecks, X } from "lucide-react";

export type GuideData = {
  sessionId: string;
  format: string | null;
  brief: string | null;
  title: string | null;
  items: { q: string; a?: string }[];
  /** Questions were handed to a teammate who has not picked them yet. */
  pending: boolean;
  pickHref: string | null;
};

export default function InterviewerGuide({ guide }: { guide: GuideData }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState<number[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const key = `interview-guide:${guide.sessionId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setAsked(JSON.parse(raw));
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(asked));
    } catch {}
  }, [asked, key]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const total = guide.items.length;
  const toggle = (i: number) => setAsked((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 h-11 pl-3.5 pr-4 rounded-full border border-border-strong bg-elevated text-fg text-[13px] font-medium shadow-lg shadow-black/30 hover:bg-panel transition"
        aria-haspopup="dialog"
      >
        <BookOpen className="w-4 h-4 text-secondary-soft" aria-hidden />
        Interviewer guide
        {total > 0 && (
          <span className="ml-1 text-xs text-muted tabular-nums">
            {asked.length}/{total}
          </span>
        )}
        {guide.pending && <span className="w-2 h-2 rounded-full bg-warning" aria-label="Questions not picked yet" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-bg/60 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-label="Interviewer guide"
              initial={reduce ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[440px] bg-surface border-l border-border-strong shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 px-5 h-14 border-b border-border">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-secondary-soft" aria-hidden />
                  <h2 className="text-[15px] font-semibold text-fg">Interviewer guide</h2>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
                <p className="text-xs text-subtle">Only interviewers see this panel.</p>
                {guide.pending && (
                  <div className="rounded-lg border border-warning/35 bg-warning/[0.06] px-3 py-2.5 text-[13px] text-fg">
                    The questions for this interview have not been picked yet.
                    {guide.pickHref && (
                      <a href={guide.pickHref} className="block mt-1 text-secondary-soft font-medium hover:underline">
                        Pick them now
                      </a>
                    )}
                  </div>
                )}
                {guide.brief && (
                  <section>
                    <h3 className="text-xs font-medium text-subtle mb-1.5">Brief</h3>
                    <p className="text-[13px] text-fg leading-relaxed whitespace-pre-wrap rounded-lg bg-panel/60 border border-border px-3 py-2.5">{guide.brief}</p>
                  </section>
                )}
                {total > 0 ? (
                  <section className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xs font-medium text-subtle">{guide.title ?? "Questions"}</h3>
                      <span className="text-xs text-subtle tabular-nums">
                        {asked.length} of {total} asked
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-panel overflow-hidden">
                      <motion.div className="h-full bg-success" animate={{ width: `${(asked.length / total) * 100}%` }} />
                    </div>
                    <ol className="flex flex-col gap-1.5 mt-1">
                      {guide.items.map((it, i) => {
                        const done = asked.includes(i);
                        return (
                          <li key={i} className={`rounded-lg border px-3 py-2.5 transition-colors ${done ? "border-success/30 bg-success/[0.05]" : "border-border bg-bg"}`}>
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                onClick={() => toggle(i)}
                                aria-pressed={done}
                                aria-label={done ? "Mark as not asked" : "Mark as asked"}
                                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${done ? "bg-success border-success text-bg" : "border-border-strong"}`}
                              >
                                {done && <Check className="w-3 h-3" strokeWidth={3} />}
                              </button>
                              <span className={`flex-1 text-[13px] leading-relaxed ${done ? "text-muted" : "text-fg"}`}>{it.q}</span>
                              {it.a && (
                                <button
                                  type="button"
                                  onClick={() => setShown(shown === i ? null : i)}
                                  aria-expanded={shown === i}
                                  aria-label="Show reference answer"
                                  className="w-6 h-6 rounded flex items-center justify-center text-subtle hover:text-fg"
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${shown === i ? "rotate-180" : ""}`} />
                                </button>
                              )}
                            </div>
                            <AnimatePresence initial={false}>
                              {it.a && shown === i && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden pl-7 pt-2"
                                >
                                  <p className="text-xs text-subtle mb-1">Reference answer</p>
                                  {/* Markdown without raw HTML: answers can come from the public bank. */}
                                  <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] text-muted prose-headings:text-fg prose-headings:text-[13px] prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1.5 prose-ul:my-1.5 prose-pre:text-xs">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{it.a}</ReactMarkdown>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ) : (
                  !guide.pending && <p className="text-[13px] text-muted">No question guide for this interview. Lead the conversation your way.</p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
