"use client";

/**
 * Interviewer-only side panel: the guide (brief and questions with reference
 * answers), private notes and the scorecard. Nothing in here is ever sent
 * to the candidate's browser; the server leaves it out of their page.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, Eye, Loader2, NotebookPen, Star } from "lucide-react";
import type { RoomData } from "@/lib/interview/room-server";

type Tab = "guide" | "notes" | "score";

const CRITERIA = [
  { id: "ProblemSolving", label: "Problem solving" },
  { id: "CodeQuality", label: "Code or answer quality" },
  { id: "Communication", label: "Communication" },
] as const;

function useAutosave<T>(value: T, save: (v: T) => Promise<boolean>, delay = 800) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const t = setTimeout(async () => setState((await save(value)) ? "saved" : "error"), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);
  return state;
}

async function patch(id: string, body: object): Promise<boolean> {
  try {
    const r = await fetch(`/api/interview/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return r.ok;
  } catch {
    return false;
  }
}

function SaveState({ s }: { s: ReturnType<typeof useAutosave> }) {
  if (s === "idle") return null;
  return (
    <span className={`text-[12px] inline-flex items-center gap-1 ${s === "error" ? "text-danger" : "text-subtle"}`} role="status">
      {s === "saving" ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> : s === "saved" ? <Check className="w-3 h-3" aria-hidden /> : null}
      {s === "saving" ? "Saving" : s === "saved" ? "Saved" : "Not saved, will retry on next change"}
    </span>
  );
}

export default function InterviewerPanel({
  data,
  readOnly,
  onShowQuestion,
}: {
  data: RoomData;
  readOnly: boolean;
  onShowQuestion: (text: string) => void;
}) {
  const p = data.private!;
  const id = data.interview.id;
  const [tab, setTab] = useState<Tab>(p.guide.length || p.brief ? "guide" : "notes");
  const [notes, setNotes] = useState(p.notes ?? "");
  const notesState = useAutosave(notes, (v) => patch(id, { notes: v || null }));
  const [ratings, setRatings] = useState<Record<string, number>>(() => ({ ProblemSolving: 0, CodeQuality: 0, Communication: 0, ...(p.rubric ?? {}) }));
  const [scoreNotes, setScoreNotes] = useState(p.rubricNotes ?? "");
  const rated = Object.fromEntries(Object.entries(ratings).filter(([, v]) => v >= 1));
  const scoreState = useAutosave({ rated, scoreNotes }, (v) => (Object.keys(v.rated).length ? patch(id, { rubric: { ratings: v.rated, notes: v.scoreNotes || null } }) : Promise.resolve(true)));
  const [shown, setShown] = useState<number | null>(null);

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: "guide", label: "Guide", icon: BookOpen },
    { id: "notes", label: "Notes", icon: NotebookPen },
    { id: "score", label: "Scorecard", icon: Star },
  ];

  return (
    <aside aria-label="Interviewer panel" className="h-full min-h-0 flex flex-col bg-surface border-l border-border">
      <div role="tablist" aria-label="Interviewer panel" className="h-12 shrink-0 flex items-center gap-1 px-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative h-8 px-3 rounded-lg text-[13px] font-medium inline-flex items-center gap-1.5 ${tab === t.id ? "text-fg" : "text-muted hover:text-fg"}`}
          >
            {tab === t.id && <motion.span layoutId="ip-tab" className="absolute inset-0 rounded-lg bg-panel ring-1 ring-inset ring-border-strong" transition={{ type: "spring", stiffness: 520, damping: 38 }} />}
            <t.icon className="relative w-3.5 h-3.5" aria-hidden />
            <span className="relative">{t.label}</span>
          </button>
        ))}
        <span className="ml-auto pr-2 text-[11px] text-subtle">Only you</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {tab === "guide" && (
          <div className="grid gap-4">
            {p.brief && (
              <section>
                <h3 className="text-[12px] text-subtle">Brief</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed whitespace-pre-wrap">{p.brief}</p>
              </section>
            )}
            {p.guide.length > 0 ? (
              <section>
                <h3 className="text-[12px] text-subtle">{p.guideTitle ?? "Questions"}</h3>
                <ol className="mt-2 grid gap-2">
                  {p.guide.map((g, i) => (
                    <li key={i} className="rounded-xl border border-border bg-bg p-3">
                      <p className="text-[13.5px] font-medium leading-snug">
                        <span className="text-subtle tabular-nums mr-1.5">{i + 1}.</span>
                        {g.q}
                      </p>
                      {g.a && (
                        <details className="mt-2 text-[13px] text-muted">
                          <summary className="cursor-pointer select-none">Reference answer</summary>
                          <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{g.a}</p>
                        </details>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            onShowQuestion(g.q);
                            setShown(i);
                          }}
                          className="mt-2 h-7 px-2.5 rounded-md border border-border text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-panel"
                        >
                          {shown === i ? <Check className="w-3 h-3 text-success" aria-hidden /> : <Eye className="w-3 h-3 text-muted" aria-hidden />}
                          {shown === i ? "On the candidate's screen" : "Show to candidate"}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ) : (
              !p.brief && <p className="text-[13px] text-muted">No guide for this interview. Use Notes to keep track as you go.</p>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="h-full flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="ip-notes" className="text-[12px] text-subtle">
                Private notes
              </label>
              <SaveState s={notesState} />
            </div>
            <textarea
              id="ip-notes"
              value={notes}
              readOnly={readOnly}
              onChange={(e) => setNotes(e.target.value.slice(0, 4000))}
              placeholder="What stood out, follow-ups to ask, timestamps."
              className="flex-1 min-h-[240px] w-full resize-none rounded-xl border border-border bg-bg p-3 text-[13.5px] leading-relaxed focus:outline-none focus:border-secondary/60"
            />
          </div>
        )}

        {tab === "score" && (
          <div className="grid gap-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-subtle">Rate 1 to 5</p>
              <SaveState s={scoreState} />
            </div>
            {CRITERIA.map((c) => (
              <fieldset key={c.id} disabled={readOnly}>
                <legend className="text-[13.5px] font-medium">{c.label}</legend>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = ratings[c.id] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setRatings((r) => ({ ...r, [c.id]: n }))}
                        className={`h-9 rounded-lg text-[13px] font-semibold tabular-nums transition-colors ${on ? "bg-secondary text-bg" : "bg-bg border border-border text-muted hover:text-fg hover:border-border-strong"}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <div>
              <label htmlFor="ip-score-notes" className="text-[13.5px] font-medium">
                Summary
              </label>
              <textarea
                id="ip-score-notes"
                value={scoreNotes}
                readOnly={readOnly}
                onChange={(e) => setScoreNotes(e.target.value.slice(0, 5000))}
                placeholder="Strengths, concerns and your recommendation."
                className="mt-2 w-full min-h-[120px] resize-y rounded-xl border border-border bg-bg p-3 text-[13.5px] leading-relaxed focus:outline-none focus:border-secondary/60"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
