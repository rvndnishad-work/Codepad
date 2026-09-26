"use client";

/**
 * Question card: the interviewer puts one question or scenario in front of
 * the candidate. Only question text travels; reference answers never do.
 */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Send, Trash2 } from "lucide-react";
import type { ToolProps } from "../types";

export default function QuestionCard({ state, isInterviewer, readOnly, guideQuestions, run }: ToolProps) {
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState("");
  const q = state.question;
  const card = (
    <AnimatePresence mode="wait">
      {q ? (
        <motion.blockquote
          key={q.at}
          initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          className={`${isInterviewer ? "text-[18px]" : "text-[22px] md:text-[28px]"} leading-snug font-medium text-fg whitespace-pre-wrap tracking-tight`}
        >
          {q.text}
        </motion.blockquote>
      ) : (
        <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[15px] text-muted">
          {isInterviewer ? "Nothing on the card yet. Type a question below or pick one from your guide." : "Your interviewer will put a question here."}
        </motion.p>
      )}
    </AnimatePresence>
  );

  if (!isInterviewer) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-6 md:p-12" style={{ backgroundImage: "radial-gradient(600px 260px at 50% 0%, rgb(var(--c-accent-2) / 0.12), transparent 70%)" }}>
        <div className="max-w-[820px] w-full">{card}</div>
      </div>
    );
  }

  const send = (text: string) => {
    if (!text.trim()) return;
    void run({ type: "question", text });
    setDraft("");
  };
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] min-h-0">
      <div className="min-h-0 overflow-y-auto p-5 md:p-8 flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-bg/60 p-5 md:p-7 min-h-[160px]" style={{ backgroundImage: "radial-gradient(500px 200px at 0% 0%, rgb(var(--c-accent-2) / 0.10), transparent 70%)" }}>
          <p className="text-xs font-medium text-subtle mb-3">On the card now</p>
          {card}
          {q && !readOnly && (
            <button type="button" onClick={() => void run({ type: "question", text: null })} className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-fg">
              <Trash2 className="w-3.5 h-3.5" aria-hidden /> Clear the card
            </button>
          )}
        </div>
        {!readOnly && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="qc-draft" className="text-xs font-medium text-subtle">
              Write a question or a scenario
            </label>
            <textarea
              id="qc-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(draft);
              }}
              rows={3}
              placeholder="Tell me about a time you disagreed with your manager. What did you do?"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[14px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20 resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-subtle">Ctrl or Cmd + Enter to show</span>
              <button type="submit" disabled={!draft.trim()} className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40">
                <Send className="w-3.5 h-3.5" aria-hidden /> Show to candidate
              </button>
            </div>
          </form>
        )}
      </div>
      <aside className="min-h-0 overflow-y-auto border-t lg:border-t-0 lg:border-l border-border p-4 flex flex-col gap-2">
        <p className="text-xs font-medium text-subtle">From your guide</p>
        {guideQuestions.length === 0 ? (
          <p className="text-[13px] text-muted">This interview has no question guide. Write your own on the left.</p>
        ) : (
          guideQuestions.map((g, i) => {
            const onCard = q?.text === g.trim();
            return (
              <div key={i} className={`rounded-lg border px-3 py-2.5 flex items-start gap-2 ${onCard ? "border-secondary/50 bg-secondary/[0.06]" : "border-border bg-bg"}`}>
                <span className="flex-1 text-[13px] text-fg leading-relaxed">{g}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => send(g)}
                    disabled={onCard}
                    className="shrink-0 h-7 px-2 rounded-md text-[12px] font-medium text-secondary-soft hover:bg-secondary/10 disabled:text-subtle inline-flex items-center gap-1"
                  >
                    {onCard ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Send className="w-3.5 h-3.5" aria-hidden />}
                    {onCard ? "Showing" : "Show"}
                  </button>
                )}
              </div>
            );
          })
        )}
        <p className="text-xs text-subtle mt-1">Only the question goes on the card. Reference answers stay with you.</p>
      </aside>
    </div>
  );
}

