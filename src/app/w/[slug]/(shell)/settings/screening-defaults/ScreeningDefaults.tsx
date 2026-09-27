"use client";

/**
 * Settings > Screening defaults. Starting values for new take-homes, AI
 * screenings and interviews. Each composer starts from these and can still
 * change them per send; things already sent keep their own values.
 */
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { SaveBar, Segmented, Select, SettingRow, SettingsCard, Toggle, inputCls, useSettingsForm } from "../_components/form";
import {
  AI_MINUTES_CHOICES,
  INTERVIEWER_LANGUAGES,
  INTERVIEW_MINUTES_CHOICES,
  INTERVIEW_PASS_MARK_PRESETS,
  INVITE_EXPIRY_CHOICES,
  PASS_MARK_PRESETS,
  SCORECARD_REMINDER_CHOICES,
  SCORE_PASS_MARK_MAX,
  SCORE_PASS_MARK_MIN,
} from "@/lib/workspace/settings";
import { PASS_MARK_MAX as INTERVIEW_MAX, PASS_MARK_MIN as INTERVIEW_MIN, PASS_MARK_STEP as INTERVIEW_STEP } from "@/lib/interview/scorecard";
import { DEFAULT_LAST_CALL_HOURS, DEFAULT_START_REMINDER_HOURS } from "@/lib/take-home/reminders";
import { DEFAULT_REMINDER_DAYS } from "@/lib/ai-interview/console";
import { presetFor } from "@/lib/workspace/screening-defaults";

type Values = {
  defaultTakeHomePassMark: number;
  defaultAiPassMark: number;
  defaultInterviewPassMark: number;
  inviteExpiryDays: number;
  remindNotStarted: boolean;
  remindBeforeDeadline: boolean;
  aiDefaultMinutes: number;
  keepVoiceAnswers: boolean;
  interviewerLanguage: string;
  interviewDefaultMinutes: number;
  scorecardFirst: boolean;
  scorecardReminderHours: number | null;
};

const fmtMark = (n: number) => (Number.isInteger(n * 2) ? n.toFixed(1) : String(n));
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
const hours = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;

export default function ScreeningDefaults({ slug, canEdit, initial }: { slug: string; canEdit: boolean; initial: Values }) {
  const form = useSettingsForm<Values>({ slug, group: "screening-defaults", initial, canEdit });
  const { values: v, set, errors, disabled } = form;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2.5 rounded-xl border border-secondary/25 bg-secondary/10 px-4 py-3 text-sm text-secondary-soft">
        <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
        <p>
          New take-homes, AI screenings and interviews start with these. Anyone sending one can still change them for that send, and the
          ones already sent keep their own.
        </p>
      </div>

      <SettingsCard
        title="Pass marks"
        description="A pass mark only labels results, such as Good match or Borderline. Nobody is passed or turned down automatically: a recruiter decides."
      >
        <SettingRow
          label="Take-home"
          help="Scores at or above this read Good match. Up to 10 points below read Borderline."
          error={errors.defaultTakeHomePassMark}
        >
          <PassMarkControl
            id="pm-take-home"
            label="Take-home pass mark"
            presets={PASS_MARK_PRESETS}
            value={v.defaultTakeHomePassMark}
            onChange={(n) => set("defaultTakeHomePassMark", n)}
            min={SCORE_PASS_MARK_MIN}
            max={SCORE_PASS_MARK_MAX}
            step={1}
            unit="out of 100"
            disabled={disabled}
          />
        </SettingRow>
        <SettingRow
          label="AI screening"
          help="Scores at or above this clear the bar. Up to 20 points below read Borderline."
          error={errors.defaultAiPassMark}
        >
          <PassMarkControl
            id="pm-ai"
            label="AI screening pass mark"
            presets={PASS_MARK_PRESETS}
            value={v.defaultAiPassMark}
            onChange={(n) => set("defaultAiPassMark", n)}
            min={SCORE_PASS_MARK_MIN}
            max={SCORE_PASS_MARK_MAX}
            step={1}
            unit="out of 100"
            disabled={disabled}
          />
        </SettingRow>
        <SettingRow
          label="Interview"
          help="On the 1 to 4 scorecard scale. A panel average at or above this reads At or above the pass mark."
          error={errors.defaultInterviewPassMark}
        >
          <PassMarkControl
            id="pm-interview"
            label="Interview pass mark"
            presets={INTERVIEW_PASS_MARK_PRESETS}
            value={v.defaultInterviewPassMark}
            onChange={(n) => set("defaultInterviewPassMark", n)}
            min={INTERVIEW_MIN}
            max={INTERVIEW_MAX}
            step={INTERVIEW_STEP}
            unit="out of 4"
            format={fmtMark}
            disabled={disabled}
          />
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Invites and reminders" description="For take-homes and AI screenings.">
        <SettingRow label="Invite links stay open for" help="Candidates can start until the link closes." error={errors.inviteExpiryDays}>
          <Segmented
            label="Invite links stay open for"
            value={v.inviteExpiryDays}
            onChange={(n) => set("inviteExpiryDays", n)}
            options={INVITE_EXPIRY_CHOICES.map((d) => ({ value: d, label: days(d) }))}
            disabled={disabled}
          />
        </SettingRow>
        <SettingRow label="Reminder emails" help="Only to candidates who have not submitted yet." error={errors.remindNotStarted ?? errors.remindBeforeDeadline}>
          <div className="flex flex-col gap-3">
            <ToggleLine
              label="Remind if not started"
              detail={`${hours(DEFAULT_START_REMINDER_HOURS)} after a take-home invite, ${days(DEFAULT_REMINDER_DAYS)} after an AI screening invite. One email.`}
              checked={v.remindNotStarted}
              onChange={(b) => set("remindNotStarted", b)}
              disabled={disabled}
            />
            <ToggleLine
              label="Remind before the link closes"
              detail={`One last email ${hours(DEFAULT_LAST_CALL_HOURS)} before a take-home link closes.`}
              checked={v.remindBeforeDeadline}
              onChange={(b) => set("remindBeforeDeadline", b)}
              disabled={disabled}
            />
          </div>
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="AI screenings">
        <SettingRow label="Coding round length" help="How long each coding round runs. Theory rounds set their own length from their questions." error={errors.aiDefaultMinutes}>
          <Segmented
            label="Coding round length"
            value={v.aiDefaultMinutes}
            onChange={(n) => set("aiDefaultMinutes", n)}
            options={AI_MINUTES_CHOICES.map((m) => ({ value: m, label: `${m} min` }))}
            disabled={disabled}
          />
        </SettingRow>
        <SettingRow
          label="Keep voice answers"
          help="Keep a recording of spoken answers in theory rounds so your team can replay them. Candidates are told before they start."
          error={errors.keepVoiceAnswers}
        >
          <ToggleState label="Keep voice answers" checked={v.keepVoiceAnswers} onChange={(b) => set("keepVoiceAnswers", b)} disabled={disabled} />
        </SettingRow>
        <SettingRow
          label="Interviewer language"
          help="The language the AI interviewer speaks and listens in during theory rounds. Write your questionnaire in the same language."
          error={errors.interviewerLanguage}
          htmlFor="ai-language"
        >
          <Select
            id="ai-language"
            label="Interviewer language"
            value={v.interviewerLanguage}
            onChange={(id) => set("interviewerLanguage", id)}
            options={INTERVIEWER_LANGUAGES.map((l) => ({ value: l.id, label: l.label }))}
            disabled={disabled}
          />
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Interviews">
        <SettingRow
          label="Interview length"
          help="Coding rounds start at this length. Other formats move by the same amount, so an intro chat stays 30 minutes shorter."
          error={errors.interviewDefaultMinutes}
        >
          <Segmented
            label="Interview length"
            value={v.interviewDefaultMinutes}
            onChange={(n) => set("interviewDefaultMinutes", n)}
            options={INTERVIEW_MINUTES_CHOICES.map((m) => ({ value: m, label: `${m} min` }))}
            disabled={disabled}
          />
        </SettingRow>
        <SettingRow
          label="Scorecard before seeing others"
          help="Interviewers see the other scorecards only after submitting their own, so nobody anchors on a colleague's score."
          error={errors.scorecardFirst}
        >
          <ToggleState label="Scorecard before seeing others" checked={v.scorecardFirst} onChange={(b) => set("scorecardFirst", b)} disabled={disabled} />
        </SettingRow>
        <SettingRow
          label="Scorecard reminder"
          help="Email the interviewers who still owe a scorecard this long after the interview ends."
          error={errors.scorecardReminderHours}
        >
          <Segmented<number | null>
            label="Scorecard reminder"
            value={v.scorecardReminderHours}
            onChange={(n) => set("scorecardReminderHours", n)}
            options={[{ value: null, label: "Off" }, ...SCORECARD_REMINDER_CHOICES.map((h) => ({ value: h, label: `${hours(h)} after` }))]}
            disabled={disabled}
          />
        </SettingRow>
      </SettingsCard>

      <SaveBar form={form} />
    </div>
  );
}

type ToggleProps = { label: string; checked: boolean; onChange: (next: boolean) => void; disabled: boolean };

/** A switch with its On or Off state written beside it. */
function ToggleState(props: ToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <Toggle {...props} />
      <span className="text-[13px] text-muted">{props.checked ? "On" : "Off"}</span>
    </div>
  );
}

/** A switch with its own name and a one-line detail, for several switches in one row. */
function ToggleLine({ detail, ...props }: ToggleProps & { detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <Toggle {...props} />
      <div className="flex flex-col min-w-0 pt-0.5">
        <span className="text-sm text-fg">{props.label}</span>
        <span className="text-[13px] text-muted">{detail}</span>
      </div>
    </div>
  );
}

/**
 * Preset buttons plus Custom, which opens a number field. The field sends
 * every edit up; the save checks the range and shows any error under the row.
 */
function PassMarkControl({
  id,
  label,
  presets,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  format = String,
  disabled,
}: {
  id: string;
  label: string;
  presets: readonly number[];
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  format?: (n: number) => string;
  disabled: boolean;
}) {
  const [custom, setCustom] = useState(() => presetFor(presets, value) === "custom");
  const [draft, setDraft] = useState(String(value));

  // Follow outside changes (Discard, a save) without fighting the typing.
  useEffect(() => {
    setDraft((d) => (Number(d) === value && d.trim() !== "" ? d : String(value)));
    if (presetFor(presets, value) === "custom") setCustom(true);
  }, [value, presets]);

  const on = custom ? "custom" : presetFor(presets, value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented<number | string>
        label={label}
        value={on}
        disabled={disabled}
        onChange={(next) => {
          if (next === "custom") {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(Number(next));
        }}
        options={[...presets.map((p) => ({ value: p as number | string, label: format(p) })), { value: "custom", label: "Custom" }]}
      />
      {on === "custom" && (
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input
            id={id}
            aria-label={`${label}, custom value`}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft}
            disabled={disabled}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(n);
            }}
            className={`${inputCls} w-24 tabular-nums`}
          />
          {unit}
        </label>
      )}
    </div>
  );
}
