"use client";

/**
 * Take-home pass mark and automatic reminders: the two fields in New take
 * home, the "how results read" preview beside them, and the card on a
 * take-home's report that changes both later. A pass mark only labels
 * results; passing someone stays a recruiter's decision.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BORDERLINE_BAND,
  PASS_MARK_MAX,
  PASS_MARK_MIN,
  sampleScores,
  TAKE_HOME_PASS_PRESETS,
  takeHomePassMarkOf,
  takeHomeVerdict,
} from "@/lib/take-home/pass-mark";
import {
  DEFAULT_LAST_CALL_HOURS,
  DEFAULT_START_REMINDER_HOURS,
  describeReminderPlan,
  hoursLabel,
  LAST_CALL_CHOICES,
  remindersActive,
  START_REMINDER_CHOICES,
  type ReminderPlan,
} from "@/lib/take-home/reminders";
import { Btn, Dialog, inputCls } from "../../candidates/_components/ui";
import { updateTakeHomePassMarkAction, updateTakeHomeRemindersAction } from "../actions";
import { ToneChip } from "./kit";

const selectCls = `${inputCls.replace("w-full", "")} w-auto`;

export function PassMarkField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const mark = takeHomePassMarkOf(value);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Pass mark</legend>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold text-fg">Pass mark</span>
        <span className="text-[28px] leading-none font-semibold tracking-tight text-secondary-soft tabular-nums" aria-live="polite">
          {mark}%
        </span>
      </div>
      <p className="text-[13px] text-muted leading-relaxed">
        Results at or above this read Good match. Below it, passing needs a confirmed manual override. Nobody is passed automatically.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pass mark presets">
        {TAKE_HOME_PASS_PRESETS.map((p) => {
          const on = p === mark;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-pressed={on}
              className={`h-9 min-w-[56px] px-3 rounded-lg border text-sm font-medium tabular-nums transition-colors ${
                on ? "border-secondary bg-secondary text-bg" : "border-border bg-surface text-fg hover:border-border-strong"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={PASS_MARK_MIN}
          max={PASS_MARK_MAX}
          step={1}
          value={mark}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Pass mark"
          aria-valuetext={`${mark} percent`}
          className="w-full accent-secondary cursor-pointer"
        />
        <div className="flex justify-between text-[13px] text-subtle font-mono" aria-hidden>
          <span>{PASS_MARK_MIN}</span>
          <span>{PASS_MARK_MAX}</span>
        </div>
      </div>
      <p className="text-[13px] text-muted">
        Scores from {Math.max(0, mark - BORDERLINE_BAND)} to {mark - 1} read Borderline. You can change the mark later. Each change is written to the audit log and
        relabels existing results.
      </p>
    </fieldset>
  );
}

/** "How results read with a 70% mark": three sample scores and their labels. */
export function PassMarkPreview({ passMark }: { passMark: number }) {
  const mark = takeHomePassMarkOf(passMark);
  return (
    <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3">
      <h3 className="text-[13px] font-semibold text-muted">How results read with a {mark}% mark</h3>
      <ul className="flex flex-col gap-2.5">
        {sampleScores(mark).map((s) => {
          const v = takeHomeVerdict(s, mark)!;
          return (
            <li key={s} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">A score of {s}%</span>
              <ToneChip tone={v.tone}>{v.label}</ToneChip>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReminderRow({
  id,
  label,
  checked,
  onToggle,
  value,
  choices,
  format,
  onPick,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: (on: boolean) => void;
  value: number;
  choices: readonly number[];
  format: (h: number) => string;
  onPick: (h: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 text-sm ${disabled ? "opacity-50" : ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-[18px] h-[18px] accent-secondary cursor-pointer"
      />
      <label htmlFor={id} className="flex-1 min-w-[180px] text-fg cursor-pointer">
        {label}
      </label>
      <select
        aria-label={label}
        value={value}
        disabled={disabled || !checked}
        onChange={(e) => onPick(Number(e.target.value))}
        className={selectCls}
      >
        {choices.map((h) => (
          <option key={h} value={h}>
            {format(h)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The two automatic reminders, each with its own switch and timing. */
export function RemindersField({ value, onChange, idPrefix = "rem" }: { value: ReminderPlan; onChange: (v: ReminderPlan) => void; idPrefix?: string }) {
  // Remember the picked timing while a reminder is switched off.
  const [startHours, setStartHours] = useState(value.startAfterHours ?? DEFAULT_START_REMINDER_HOURS);
  const [lastHours, setLastHours] = useState(value.beforeDeadlineHours ?? DEFAULT_LAST_CALL_HOURS);
  return (
    <div className="flex flex-col gap-3">
      <ReminderRow
        id={`${idPrefix}-start`}
        label="If not started, remind after"
        checked={value.startAfterHours != null}
        onToggle={(on) => onChange({ ...value, startAfterHours: on ? startHours : null })}
        value={startHours}
        choices={START_REMINDER_CHOICES}
        format={hoursLabel}
        onPick={(h) => {
          setStartHours(h);
          onChange({ ...value, startAfterHours: h });
        }}
        disabled={value.off}
      />
      <ReminderRow
        id={`${idPrefix}-last`}
        label="Last call before the invite expires"
        checked={value.beforeDeadlineHours != null}
        onToggle={(on) => onChange({ ...value, beforeDeadlineHours: on ? lastHours : null })}
        value={lastHours}
        choices={LAST_CALL_CHOICES}
        format={(h) => `${hoursLabel(h)} before`}
        onPick={(h) => {
          setLastHours(h);
          onChange({ ...value, beforeDeadlineHours: h });
        }}
        disabled={value.off}
      />
      <p className="text-[13px] text-subtle">
        Reminders go to candidates who have not submitted, one email each. A reminder you send by hand counts as the last call.
      </p>
    </div>
  );
}

/**
 * Pass mark and reminders on a take-home's report, with dialogs to change
 * them. A change applies to every take-home sent in the same run.
 */
export function SettingsCard({
  slug,
  id,
  passMark,
  groupSize,
  reminders,
  open,
  canCreate,
  onSaved,
}: {
  slug: string;
  id: string;
  passMark: number;
  groupSize: number;
  reminders: ReminderPlan;
  /** Reminders only matter while the candidate can still start or submit. */
  open: boolean;
  canCreate: boolean;
  onSaved: (text: string, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<"mark" | "reminders" | null>(null);
  const [draftMark, setDraftMark] = useState(passMark);
  const [draftPlan, setDraftPlan] = useState<ReminderPlan>(reminders);
  const [pending, start] = useTransition();
  const scope = groupSize > 1 ? `all ${groupSize} take-homes sent together` : "this take-home";
  const active = remindersActive(reminders);

  function saveMark() {
    start(async () => {
      const r = await updateTakeHomePassMarkAction(slug, id, draftMark);
      if (!r.ok) return onSaved(r.error, "error");
      setEditing(null);
      onSaved(`Pass mark set to ${r.passMark}${r.count > 1 ? ` on ${r.count} take-homes` : ""}`);
      router.refresh();
    });
  }
  function savePlan(plan: ReminderPlan) {
    start(async () => {
      const r = await updateTakeHomeRemindersAction(slug, id, plan);
      if (!r.ok) return onSaved(r.error, "error");
      setEditing(null);
      onSaved(r.reminders.off ? "Automatic reminders turned off" : "Reminders updated");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold text-fg">Pass mark and reminders</h3>
      <dl className="flex flex-col gap-2 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Pass mark</dt>
          <dd className="flex items-center gap-2">
            <span className="text-fg font-medium tabular-nums">{passMark}%</span>
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setDraftMark(passMark);
                  setEditing("mark");
                }}
                className="text-secondary-soft hover:underline"
              >
                Change
              </button>
            )}
          </dd>
        </div>
        {open && (
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted shrink-0">Reminders</dt>
            <dd className="flex flex-col items-end gap-1 text-right">
              <span className="text-fg">{describeReminderPlan(reminders)}</span>
              {canCreate && (
                <span className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPlan({ ...reminders, off: false });
                      setEditing("reminders");
                    }}
                    className="text-secondary-soft hover:underline"
                  >
                    Change
                  </button>
                  {active && (
                    <button type="button" disabled={pending} onClick={() => savePlan({ ...reminders, off: true })} className="text-muted hover:text-fg hover:underline">
                      Turn off
                    </button>
                  )}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
      {groupSize > 1 && <p className="text-xs text-subtle">Sent with {groupSize - 1} other{groupSize === 2 ? "" : "s"}. Changes apply to all of them.</p>}

      {editing === "mark" && (
        <Dialog
          title="Pass mark"
          onClose={() => setEditing(null)}
          width={520}
          footer={
            <>
              <Btn onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn variant="primary" disabled={pending || draftMark === passMark} onClick={saveMark}>
                {pending ? "Saving" : "Save"}
              </Btn>
            </>
          }
        >
          <p className="text-[13px] text-muted mb-4">
            This changes the mark for {scope}. Finished results are relabelled straight away. Scores stay as graded, and nobody is passed or failed by this change.
          </p>
          <PassMarkField value={draftMark} onChange={setDraftMark} />
        </Dialog>
      )}
      {editing === "reminders" && (
        <Dialog
          title="Automatic reminders"
          onClose={() => setEditing(null)}
          width={520}
          footer={
            <>
              <Btn onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn variant="primary" disabled={pending} onClick={() => savePlan(draftPlan)}>
                {pending ? "Saving" : "Save"}
              </Btn>
            </>
          }
        >
          <p className="text-[13px] text-muted mb-4">This changes the reminders for {scope}. Reminders already sent are not sent again.</p>
          <RemindersField value={draftPlan} onChange={setDraftPlan} idPrefix="rem-edit" />
        </Dialog>
      )}
    </section>
  );
}
