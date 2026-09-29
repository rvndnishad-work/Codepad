"use client";

/**
 * The questions step when questions are picked now, across the full width:
 * sources on the left (coding problems, questionnaires, public questions),
 * and what this interview holds on the right (the running order and the
 * interviewer's questions, per candidate when they differ).
 */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Code2, Globe2, Library } from "lucide-react";
import type { GuideOption, PublicCategory, RoundOption } from "@/lib/interview/wizard-server";
import { candidateKey, usesOwnSets, type FormatDef, type QuestionSet, type WizardState } from "@/lib/interview/wizard";
import { inputCls } from "../../candidates/_components/ui";
import { ALL, GuideSets, LibraryList, PublicList, currentSet, targetLabel, writeSet, type GuideTarget } from "./GuideQuestions";
import { RoundsLibrary, RunningOrder } from "./RoundsBuilder";
import { Segmented } from "./parts";

type Patch = (p: Partial<WizardState>) => void;
type Source = "coding" | "library" | "public";

const SOURCE_TEXT: Record<Source, { label: string; short: string; lead: string }> = {
  coding: { label: "Coding problems", short: "Coding", lead: "Practical. The candidate solves these in the shared editor, in the running order." },
  library: { label: "Questionnaires", short: "Theory", lead: "Theory. Spoken questions from your Question library, with reference answers only interviewers see." },
  public: { label: "Public questions", short: "Public", lead: "From the public interview questions bank, up to 30 for each candidate." },
};
const SOURCE_ICON = { coding: Code2, library: Library, public: Globe2 } as const;

export default function QuestionBuilder({
  slug,
  format,
  state,
  patch,
  roundOptions,
  guides,
  categories,
  target,
  onTarget,
}: {
  slug: string;
  format: FormatDef;
  state: WizardState;
  patch: Patch;
  roundOptions: RoundOption[];
  guides: GuideOption[];
  categories: PublicCategory[];
  target: GuideTarget;
  onTarget: (t: GuideTarget) => void;
}) {
  const reduce = useReducedMotion();
  const sources: Source[] = format.coding ? ["coding", "library", "public"] : ["library", "public"];
  const [source, setSource] = useState<Source>(sources[0]);
  const own = usesOwnSets(state);
  const set = currentSet(state, target);
  const write = (next: QuestionSet) => writeSet(state, patch, own ? target : ALL, next);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
      {/* Where questions come from */}
      <section aria-label="Add questions" className="min-w-0 rounded-xl border border-border bg-surface flex flex-col lg:sticky lg:top-4">
        <div className="p-3 flex flex-col gap-2.5 border-b border-border">
          <Segmented
            id="q-source"
            value={source}
            onChange={setSource}
            options={sources.map((s) => {
              const Icon = SOURCE_ICON[s];
              return {
                id: s,
                label: (
                  <>
                    <Icon className="w-3.5 h-3.5" aria-hidden />
                    <span className="hidden sm:inline">{SOURCE_TEXT[s].label}</span>
                    <span className="sm:hidden">{SOURCE_TEXT[s].short}</span>
                  </>
                ),
              };
            })}
          />
          <p className="text-[13px] text-muted px-0.5">{SOURCE_TEXT[source].lead}</p>
          {source !== "coding" && (
            <div className="flex items-center gap-2 text-[13px] px-0.5">
              <span className="text-subtle shrink-0">Adding to</span>
              {own ? (
                <select value={target} onChange={(e) => onTarget(e.target.value)} aria-label="Adding to" className={`${inputCls} h-8 max-w-[260px]`}>
                  {state.candidates.map((c) => (
                    <option key={candidateKey(c)} value={candidateKey(c)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-medium text-fg truncate">{targetLabel(state, target)}</span>
              )}
            </div>
          )}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={source}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col min-h-0"
          >
            {source === "coding" ? (
              <RoundsLibrary options={roundOptions} rounds={state.rounds} onChange={(rounds) => patch({ rounds })} listClass="max-h-[520px]" />
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {source === "library" ? (
                  <LibraryList slug={slug} guides={guides} value={set.guideId} onChange={(guideId) => write({ ...set, guideId })} />
                ) : (
                  <PublicList slug={slug} categories={categories} picked={set.bank} onChange={(bank) => write({ ...set, bank })} />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* What this interview holds */}
      <div className="min-w-0 flex flex-col gap-5">
        {format.coding && (
          <div className="flex flex-col gap-2">
            <div>
              <h3 className="text-[15px] font-semibold text-fg">Coding rounds</h3>
              <p className="text-[13px] text-muted">What the candidate works on in the shared editor.</p>
            </div>
            <RunningOrder rounds={state.rounds} onChange={(rounds) => patch({ rounds })} />
          </div>
        )}
        <GuideSets
          state={state}
          patch={patch}
          guides={guides}
          target={target}
          onTarget={(t) => {
            onTarget(t);
            if (source === "coding") setSource("library");
          }}
          optional={format.coding}
        />
      </div>
    </div>
  );
}
