"use client";

/**
 * The pass mark control: the score a screening's candidates need to clear its
 * bar. Used in New screening and on a screening's page. It only changes how
 * results are labelled; passing someone stays a recruiter's decision.
 */
import { useState, useTransition } from "react";
import { Target } from "lucide-react";
import { fullyRightNeeded, PASS_MARK_MAX, PASS_MARK_MIN, SCREENING_PASS_THRESHOLD, verdictBands } from "@/lib/ai-interview/verdict";
import { Btn, Dialog } from "../../candidates/_components/ui";
import { updatePassMarkAction } from "../actions";

const PRESETS = [
  { value: 50, label: "Lenient" },
  { value: SCREENING_PASS_THRESHOLD, label: "Standard" },
  { value: 70, label: "Strict" },
  { value: 80, label: "Very strict" },
];

export function PassMarkField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const b = verdictBands(value);
  const needed = fullyRightNeeded(b.bar, 10);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Pass mark</legend>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-muted">Pass mark</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[28px] leading-none font-semibold tracking-tight text-fg tabular-nums" aria-live="polite">
              {b.bar}
            </span>
            <span className="text-[13px] text-subtle">of 100</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pass mark presets">
          {PRESETS.map((p) => {
            const on = p.value === b.bar;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange(p.value)}
                aria-pressed={on}
                className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${on ? "border-secondary bg-secondary/[0.1] text-fg" : "border-border text-muted hover:text-fg hover:border-border-strong"}`}
              >
                {p.label} <span className="text-subtle tabular-nums">{p.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          type="range"
          min={PASS_MARK_MIN}
          max={PASS_MARK_MAX}
          step={5}
          value={b.bar}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Pass mark"
          aria-valuetext={`${b.bar} of 100`}
          className="w-full accent-secondary cursor-pointer"
        />
        <BandStrip bar={b.bar} />
      </div>

      <p className="text-xs text-subtle leading-relaxed">
        Scores of {b.bar} or more read as a match, {b.borderline} to {b.bar - 1} as borderline. On 10 theory questions, {b.bar} is about {needed} fully right answers, or more
        answers that are partly right. This only labels results: you still decide who passes.
      </p>
    </fieldset>
  );
}

/** The 0 to 100 scale split into the bands the bar creates. */
export function BandStrip({ bar }: { bar: number }) {
  const b = verdictBands(bar);
  const bands = [
    { from: 0, to: b.borderline, cls: "bg-danger/60", label: "Weak" },
    { from: b.borderline, to: b.bar, cls: "bg-warning/70", label: "Borderline" },
    { from: b.bar, to: b.strong, cls: "bg-secondary", label: "Good" },
    { from: b.strong, to: 100, cls: "bg-success", label: "Strong" },
  ].filter((x) => x.to > x.from);
  return (
    <div aria-hidden>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        {bands.map((x) => (
          <div key={x.label} className={`${x.cls} transition-[flex-grow] duration-300 motion-reduce:transition-none`} style={{ flexGrow: x.to - x.from, flexBasis: 0 }} />
        ))}
      </div>
      <div className="flex text-[11px] text-subtle mt-1">
        {bands.map((x) => (
          <span key={x.label} className="min-w-0 truncate pr-1.5 transition-[flex-grow] duration-300 motion-reduce:transition-none" style={{ flexGrow: x.to - x.from, flexBasis: 0 }}>
            {x.to - x.from >= 12 ? x.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Pass mark 60" button on a screening's page, with a dialog to change it. */
export function PassMarkButton({
  slug,
  batchId,
  value,
  canManage,
  onSaved,
}: {
  slug: string;
  batchId: string;
  value: number;
  canManage: boolean;
  onSaved: (text: string, tone?: "error") => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updatePassMarkAction(slug, batchId, draft);
      if (!r.ok) return onSaved(r.error ?? "Could not change the pass mark.", "error");
      setOpen(false);
      onSaved(`Pass mark set to ${r.passMark}`);
    });
  }

  if (!canManage) {
    return (
      <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[13px] text-muted">
        <Target className="w-4 h-4" aria-hidden /> Pass mark {value}
      </span>
    );
  }
  return (
    <>
      <Btn
        icon={Target}
        onClick={() => {
          setDraft(value);
          setOpen(true);
        }}
      >
        Pass mark {value}
      </Btn>
      {open && (
        <Dialog
          title="Pass mark"
          onClose={() => setOpen(false)}
          width={520}
          footer={
            <>
              <Btn onClick={() => setOpen(false)}>Cancel</Btn>
              <Btn variant="primary" disabled={pending || draft === value} onClick={save}>
                {pending ? "Saving" : "Save"}
              </Btn>
            </>
          }
        >
          <p className="text-[13px] text-muted mb-4">
            Set the score candidates in this screening need to clear the bar. Finished results are relabelled straight away. Scores stay as graded, and nobody is passed or
            failed by this change.
          </p>
          <PassMarkField value={draft} onChange={setDraft} />
        </Dialog>
      )}
    </>
  );
}
