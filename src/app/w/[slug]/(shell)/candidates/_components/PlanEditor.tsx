"use client";

/**
 * Interview plan editing, shared by the batch Rounds tab and Settings,
 * Screening defaults.
 *
 *   TemplatePicker  - start a plan from a template (filtered by the
 *                     workspace hiring type), with optional early rounds.
 *   PlanEditor      - the rounds of one plan: name, format, length, pass
 *                     mark, required, order. Saves the whole plan at once.
 *   BatchRounds     - the batch tab: no plan yet (pick a template or an
 *                     existing plan), or the editor for the batch plan.
 *
 * Saving a plan brings every candidate on it in step: rounds not yet held
 * change, rounds already held keep their history (see plans-server).
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Bot,
  Code2,
  FileText,
  Layers,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Btn, inputCls, Menu, MenuItem, MenuLabel } from "./ui";
import { Toggle } from "../../settings/_components/form";
import { createPlanAction, deletePlanAction, savePlanAction, setBatchPlanAction } from "../plan-actions";
import type { PlanView } from "@/lib/interview/plans-server";
import {
  defaultDuration,
  formatLabel,
  formatsFor,
  INVITE_DAYS,
  kindName,
  LIVE_MINUTES,
  LIVE_PASS,
  PLAN_NAME_MAX,
  PLAN_ROUNDS_MAX,
  ROLE_TYPE_LABELS,
  roleTypesFor,
  ROUND_NAME_MAX,
  roundsFromTemplate,
  SCORE_PASS,
  templateByKey,
  templatesFor,
  type HiringType,
  type PlanInput,
  type PlanRoundKind,
  type PlanTemplate,
  type RoleType,
} from "@/lib/interview/rounds";

/* ── Draft ───────────────────────────────────────────────────────────── */

type DraftRound = {
  key: string;
  id: string | null;
  kind: PlanRoundKind;
  name: string;
  format: string | null;
  durationMin: string;
  passMark: string;
  required: boolean;
};

type Draft = { name: string; roleType: RoleType; continuesInAts: boolean; rounds: DraftRound[] };

let seq = 0;
const newKey = () => `r${++seq}`;

function draftFromPlan(p: PlanView): Draft {
  return {
    name: p.name,
    roleType: p.roleType,
    continuesInAts: p.continuesInAts,
    rounds: p.rounds.map((r) => ({
      key: r.id,
      id: r.id,
      kind: r.kind,
      name: r.name,
      format: r.format ?? null,
      durationMin: r.durationMin != null ? String(r.durationMin) : "",
      passMark: r.passMark != null ? String(r.passMark) : "",
      required: r.required,
    })),
  };
}

function draftFromTemplate(t: PlanTemplate | null, role: RoleType, name: string, early: PlanRoundKind[]): Draft {
  const rows = t ? roundsFromTemplate(t, early) : [];
  return {
    name,
    roleType: t?.roleType ?? role,
    continuesInAts: t?.continuesInAts ?? false,
    rounds: rows.map((r) => ({
      key: newKey(),
      id: null,
      kind: r.kind,
      name: r.name,
      format: r.format ?? null,
      durationMin: r.durationMin != null ? String(r.durationMin) : "",
      passMark: "",
      required: r.required,
    })),
  };
}

function toInput(d: Draft): PlanInput {
  return {
    name: d.name,
    roleType: d.roleType,
    continuesInAts: d.continuesInAts,
    rounds: d.rounds.map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      format: r.kind === "interview" ? r.format : null,
      durationMin: r.durationMin.trim() === "" ? null : Number(r.durationMin),
      passMark: r.passMark.trim() === "" ? null : Number(r.passMark),
      required: r.required,
    })),
  };
}

/* ── Round tiles ─────────────────────────────────────────────────────── */

// Muted tile colours, as in the approved lobby look: solid, never neon.
const TILES: Record<string, { icon: LucideIcon; bg: string }> = {
  ai_interview: { icon: Bot, bg: "#5a64a8" },
  take_home: { icon: FileText, bg: "#a07c3f" },
  intro: { icon: MessageCircle, bg: "#3f7f86" },
  coding: { icon: Code2, bg: "#4c8363" },
  mixed: { icon: Layers, bg: "#4c8363" },
  discussion: { icon: MessagesSquare, bg: "#9a5a74" },
  behavioural: { icon: Users, bg: "#a4524f" },
};

export function RoundTile({ kind, format, size = 32 }: { kind: string; format?: string | null; size?: number }) {
  const t = (kind === "interview" ? TILES[format ?? ""] : TILES[kind]) ?? { icon: MessageCircle, bg: "#6b7280" };
  const Icon = t.icon;
  return (
    <span aria-hidden className="inline-flex items-center justify-center rounded-lg shrink-0 text-white" style={{ width: size, height: size, background: t.bg }}>
      <Icon className="w-4 h-4" strokeWidth={1.9} />
    </span>
  );
}

/* ── Template picker ─────────────────────────────────────────────────── */

export function TemplatePicker({
  hiringType,
  onPick,
  busy,
}: {
  hiringType: HiringType;
  onPick: (t: PlanTemplate | null, role: RoleType, early: PlanRoundKind[]) => void;
  busy?: boolean;
}) {
  const [early, setEarly] = useState<PlanRoundKind[]>([]);
  const roles = roleTypesFor(hiringType);
  const [role, setRole] = useState<RoleType>(roles[0]);
  const templates = templatesFor(hiringType).filter((t) => t.roleType === role);
  const toggle = (k: PlanRoundKind) => setEarly((e) => (e.includes(k) ? e.filter((x) => x !== k) : [...e, k]));

  return (
    <div className="flex flex-col gap-4">
      {roles.length > 1 && (
        <div role="radiogroup" aria-label="Kind of role" className="inline-flex w-fit rounded-lg border border-border bg-bg p-0.5 gap-0.5">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`h-8 px-3 rounded-md text-[13px] font-medium ${role === r ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg"}`}
            >
              {ROLE_TYPE_LABELS[r]} role
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
        <span className="text-subtle">Start with</span>
        {(["ai_interview", "take_home"] as const).map((k) => (
          <label key={k} className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-secondary" checked={early.includes(k)} onChange={() => toggle(k)} />
            {k === "ai_interview" ? "an AI interview" : role === "non_technical" ? "a written task" : "a take-home"}
          </label>
        ))}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={busy}
            onClick={() => onPick(t, role, early)}
            className="text-left rounded-xl border border-border bg-surface px-4 py-3.5 hover:border-border-strong hover:bg-panel transition disabled:opacity-50"
          >
            <div className="flex items-center gap-1.5 mb-2" aria-hidden>
              {roundsFromTemplate(t, early).map((r, i) => (
                <RoundTile key={i} kind={r.kind} format={r.format} size={22} />
              ))}
            </div>
            <div className="text-sm font-medium text-fg">{t.name}</div>
            <div className="text-xs text-muted mt-0.5">{roundsFromTemplate(t, early).map((r) => r.name).join(", ")}</div>
            {t.continuesInAts && <div className="text-xs text-subtle mt-1">Later rounds in your ATS</div>}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => onPick(null, role, [])}
          className="text-left rounded-xl border border-dashed border-border px-4 py-3.5 hover:border-border-strong hover:bg-panel transition disabled:opacity-50"
        >
          <div className="text-sm font-medium text-fg">Blank</div>
          <div className="text-xs text-muted mt-0.5">Start with no rounds and add your own</div>
        </button>
      </div>
    </div>
  );
}

/* ── Editor ──────────────────────────────────────────────────────────── */

export function PlanEditor({
  slug,
  plan,
  initial,
  hiringType,
  templateKey,
  batchId,
  canEdit,
  onSaved,
  onCancel,
  headerExtra,
  makeDefault,
}: {
  slug: string;
  /** The saved plan, or null for a new one. */
  plan: PlanView | null;
  /** Starting draft for a new plan. */
  initial?: Draft;
  hiringType: HiringType;
  templateKey?: string | null;
  batchId?: string | null;
  canEdit: boolean;
  onSaved: (plan: PlanView, created: boolean) => void;
  onCancel?: () => void;
  headerExtra?: React.ReactNode;
  makeDefault?: boolean;
}) {
  const start = useMemo(() => (plan ? draftFromPlan(plan) : initial!), [plan, initial]);
  const [draft, setDraft] = useState<Draft>(start);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = !plan || JSON.stringify(toInput(draft)) !== JSON.stringify(toInput(start));
  const roles = roleTypesFor(hiringType);
  const formats = formatsFor(draft.roleType);
  const disabled = !canEdit || pending;

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setRound = (key: string, patch: Partial<DraftRound>) => setDraft((d) => ({ ...d, rounds: d.rounds.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));
  const move = (i: number, by: number) =>
    setDraft((d) => {
      const j = i + by;
      if (j < 0 || j >= d.rounds.length) return d;
      const rounds = [...d.rounds];
      [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
      return { ...d, rounds };
    });
  const remove = (key: string) => setDraft((d) => ({ ...d, rounds: d.rounds.filter((r) => r.key !== key) }));
  const add = (kind: PlanRoundKind) =>
    setDraft((d) => {
      const format = kind === "interview" ? (d.roleType === "technical" ? "coding" : "discussion") : null;
      const round: DraftRound = {
        key: newKey(),
        id: null,
        kind,
        name: kind === "interview" ? formatLabel(format, d.roleType) : kindName(kind, d.roleType),
        format,
        durationMin: String(defaultDuration(kind, format)),
        passMark: "",
        required: true,
      };
      // AI interviews and take-homes usually come first; live interviews go last.
      const lastEarly = d.rounds.reduce((at, r, i) => (r.kind !== "interview" ? i : at), -1);
      const rounds = [...d.rounds];
      if (kind === "interview") rounds.push(round);
      else rounds.splice(lastEarly + 1, 0, round);
      return { ...d, rounds };
    });

  function save() {
    setError(null);
    startTransition(async () => {
      const input = toInput(draft);
      const res = plan ? await savePlanAction(slug, plan.id, input) : await createPlanAction(slug, { plan: input, templateKey, batchId, makeDefault });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved(res.plan, !plan);
    });
  }

  const usedBy = plan?.candidateCount ?? 0;
  const origin = templateByKey(plan?.templateKey ?? templateKey)?.name;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 border-b border-border">
        <div className="min-w-0 flex-1 basis-[260px]">
          <label className="sr-only" htmlFor={`plan-name-${plan?.id ?? "new"}`}>
            Plan name
          </label>
          <input
            id={`plan-name-${plan?.id ?? "new"}`}
            value={draft.name}
            maxLength={PLAN_NAME_MAX}
            disabled={disabled}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Plan name"
            className="w-full max-w-md bg-transparent text-[15px] font-semibold text-fg rounded-md px-1 -mx-1 py-0.5 hover:bg-panel focus:bg-bg focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:hover:bg-transparent"
          />
          <p className="text-xs text-subtle mt-1">
            {[
              plan ? (usedBy ? `Used by ${usedBy} ${usedBy === 1 ? "candidate" : "candidates"}` : "No candidates on it yet") : "Not saved yet",
              origin && `started from ${origin}`,
              `${draft.rounds.length} ${draft.rounds.length === 1 ? "round" : "rounds"}`,
              plan && plan.batches.length > 1 && `shared by ${plan.batches.length} batches`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {roles.length > 1 && (
            <div role="radiogroup" aria-label="Kind of role" className="inline-flex rounded-lg border border-border bg-bg p-0.5 gap-0.5">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={draft.roleType === r}
                  disabled={disabled}
                  onClick={() => set({ roleType: r })}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium ${draft.roleType === r ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg"}`}
                >
                  {ROLE_TYPE_LABELS[r]}
                </button>
              ))}
            </div>
          )}
          {headerExtra}
        </div>
      </div>

      {draft.rounds.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No rounds yet. Add the first one below.</p>
      ) : (
        <ol aria-label="Rounds" className="divide-y divide-border">
          {draft.rounds.map((r, i) => (
            <RoundRow
              key={r.key}
              n={i + 1}
              total={draft.rounds.length}
              round={r}
              role={draft.roleType}
              formats={formats}
              disabled={disabled}
              onChange={(patch) => setRound(r.key, patch)}
              onMove={(by) => move(i, by)}
              onRemove={() => remove(r.key)}
            />
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 border-t border-border">
        <span className="shrink-0" aria-hidden>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </span>
        <div className="min-w-0 flex-1 basis-[240px]">
          <div className="text-sm font-medium text-fg">Later rounds happen in your ATS</div>
          <div className="text-xs text-muted mt-0.5">
            {draft.continuesInAts ? "The plan ends here. Passing a candidate hands them back with their round results." : "Off: every round of the process is tracked here."}
          </div>
        </div>
        <Toggle checked={draft.continuesInAts} onChange={(v) => set({ continuesInAts: v })} label="Later rounds happen in your ATS" disabled={disabled} />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3.5 border-t border-border">
        {canEdit && (
          <>
            <Btn icon={Plus} onClick={() => add("interview")} disabled={disabled || draft.rounds.length >= PLAN_ROUNDS_MAX}>
              Add live interview
            </Btn>
            <Btn icon={Plus} onClick={() => add("ai_interview")} disabled={disabled || draft.rounds.length >= PLAN_ROUNDS_MAX}>
              Add AI interview
            </Btn>
            <Btn icon={Plus} onClick={() => add("take_home")} disabled={disabled || draft.rounds.length >= PLAN_ROUNDS_MAX}>
              {draft.roleType === "non_technical" ? "Add written task" : "Add take home"}
            </Btn>
          </>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {canEdit && dirty && (
            <>
              <Btn variant="quiet" disabled={pending} onClick={() => (plan ? setDraft(start) : onCancel?.())}>
                {plan ? "Discard changes" : "Cancel"}
              </Btn>
              <Btn variant="primary" disabled={pending} onClick={save}>
                {pending ? "Saving" : plan ? "Save plan" : "Create plan"}
              </Btn>
            </>
          )}
        </div>
      </div>
      {(error || (plan && dirty && usedBy > 0)) && (
        <div className="px-4 pb-3.5 -mt-1 text-xs" role={error ? "alert" : undefined}>
          {error ? <span className="text-danger">{error}</span> : <span className="text-subtle">Saving updates the {usedBy} {usedBy === 1 ? "candidate" : "candidates"} on this plan. Rounds they already had keep their results.</span>}
        </div>
      )}
    </div>
  );
}

function RoundRow({
  n,
  total,
  round: r,
  role,
  formats,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  n: number;
  total: number;
  round: DraftRound;
  role: RoleType;
  formats: string[];
  disabled: boolean;
  onChange: (patch: Partial<DraftRound>) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}) {
  const live = r.kind === "interview";
  const lengthRange = live ? LIVE_MINUTES : INVITE_DAYS;
  const passRange = live ? LIVE_PASS : SCORE_PASS;
  const badFormat = live && (!r.format || !formats.includes(r.format));
  const id = `round-${r.key}`;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3" aria-label={`Round ${n}: ${r.name || "unnamed"}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1 basis-[240px]">
        <span className="w-5 text-xs tabular-nums text-subtle text-right shrink-0">{n}</span>
        <RoundTile kind={r.kind} format={r.format} />
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-name`} className="sr-only">
            Round {n} name
          </label>
          <input
            id={`${id}-name`}
            value={r.name}
            maxLength={ROUND_NAME_MAX}
            disabled={disabled}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full bg-transparent text-sm font-medium text-fg rounded-md px-1 -mx-1 py-0.5 hover:bg-panel focus:bg-bg focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:hover:bg-transparent"
          />
          <div className="flex items-center gap-2 mt-0.5 min-w-0">
            {live ? (
              <>
                <label htmlFor={`${id}-format`} className="sr-only">
                  Round {n} format
                </label>
                <select
                  id={`${id}-format`}
                  value={r.format ?? ""}
                  disabled={disabled}
                  onChange={(e) => onChange({ format: e.target.value })}
                  className={`h-7 max-w-full rounded-md border bg-bg px-2 text-xs ${badFormat ? "border-danger/60 text-danger" : "border-border text-muted"}`}
                >
                  {badFormat && <option value={r.format ?? ""}>{r.format === "coding" || r.format === "mixed" ? "Coding (not in non-technical plans)" : "Pick a format"}</option>}
                  {formats.map((f) => (
                    <option key={f} value={f}>
                      {formatLabel(f, role)}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <span className="text-xs text-muted truncate">
                {r.kind === "ai_interview" ? "Automated. You pick the questions when you send it." : "Sent as a link. You pick the task when you send it."}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 ml-8 sm:ml-0">
        <NumberField
          id={`${id}-length`}
          label={live ? "Length" : "Invite open"}
          value={r.durationMin}
          placeholder={String(defaultDuration(r.kind, r.format))}
          unit={live ? "min" : "days"}
          min={lengthRange.min}
          max={lengthRange.max}
          disabled={disabled}
          onChange={(v) => onChange({ durationMin: v })}
        />
        <NumberField
          id={`${id}-pass`}
          label="Pass mark"
          value={r.passMark}
          placeholder="Default"
          unit={live ? "of 4" : "%"}
          min={passRange.min}
          max={passRange.max}
          step={live ? LIVE_PASS.step : 1}
          disabled={disabled}
          onChange={(v) => onChange({ passMark: v })}
        />
        <label className="inline-flex items-center gap-2 text-xs text-muted w-[104px]">
          <Toggle checked={r.required} onChange={(v) => onChange({ required: v })} label={`Round ${n} required`} disabled={disabled} />
          {r.required ? "Required" : "Optional"}
        </label>
        <div className="flex items-center gap-0.5">
          <IconBtn label={`Move round ${n} up`} icon={ArrowUp} disabled={disabled || n === 1} onClick={() => onMove(-1)} />
          <IconBtn label={`Move round ${n} down`} icon={ArrowDown} disabled={disabled || n === total} onClick={() => onMove(1)} />
          <IconBtn label={`Remove round ${n}`} icon={Trash2} disabled={disabled} onClick={onRemove} />
        </div>
      </div>
    </li>
  );
}

function NumberField({
  id,
  label,
  value,
  placeholder,
  unit,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="text-[11px] text-subtle">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} !h-8 !w-[84px] !px-2 tabular-nums`}
        />
        <span className="text-xs text-subtle w-8">{unit}</span>
      </div>
    </div>
  );
}

function IconBtn({ label, icon: Icon, onClick, disabled }: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-fg hover:bg-panel disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );
}

/* ── Batch tab ───────────────────────────────────────────────────────── */

export function BatchRounds({
  slug,
  batch,
  plans,
  hiringType,
  canEdit,
  toast,
}: {
  slug: string;
  batch: { id: string; name: string; planId: string | null; candidates: number };
  plans: PlanView[];
  hiringType: HiringType;
  canEdit: boolean;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<{ draft: Draft; templateKey: string | null } | null>(null);
  const roles = roleTypesFor(hiringType);
  const usable = plans.filter((p) => roles.includes(p.roleType));
  const plan = plans.find((p) => p.id === batch.planId) ?? null;
  const others = usable.filter((p) => p.id !== plan?.id);

  function applyPlan(planId: string | null) {
    startTransition(async () => {
      const res = await setBatchPlanAction(slug, batch.id, planId);
      if (!res.ok) return toast(res.error, "error");
      toast(planId ? "Plan set. Candidates in this batch now follow it." : "Plan removed from this batch.");
      router.refresh();
    });
  }

  function remove(p: PlanView) {
    if (!window.confirm(`Delete "${p.name}"? Rounds candidates already had stay on their profiles.`)) return;
    startTransition(async () => {
      const res = await deletePlanAction(slug, p.id);
      if (!res.ok) return toast(res.error, "error");
      toast("Plan deleted.");
      router.refresh();
    });
  }

  const planMenu = (p: PlanView | null) =>
    canEdit && (
      <Menu
        align="right"
        width={260}
        label="Plan options"
        trigger={(props) => (
          <button {...props} type="button" aria-label="Plan options" className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-surface text-muted hover:text-fg hover:bg-panel">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      >
        {(close) => (
          <>
            {others.length > 0 && <MenuLabel>Use another plan</MenuLabel>}
            {others.map((o) => (
              <MenuItem
                key={o.id}
                disabled={pending}
                onClick={() => {
                  close();
                  applyPlan(o.id);
                }}
              >
                <span className="truncate">{o.name}</span>
                <span className="ml-auto text-xs text-subtle">{o.rounds.length} rounds</span>
              </MenuItem>
            ))}
            {p && (
              <>
                <MenuLabel>This plan</MenuLabel>
                <MenuItem
                  disabled={pending}
                  onClick={() => {
                    close();
                    applyPlan(null);
                  }}
                >
                  Remove from this batch
                </MenuItem>
                {p.batches.length <= 1 && !p.isDefault && (
                  <MenuItem
                    danger
                    disabled={pending}
                    onClick={() => {
                      close();
                      remove(p);
                    }}
                  >
                    Delete plan
                  </MenuItem>
                )}
              </>
            )}
          </>
        )}
      </Menu>
    );

  if (plan) {
    return (
      <div className="flex flex-col gap-3">
        <PlanEditor
          key={`${plan.id}-${plan.updatedAt}`}
          slug={slug}
          plan={plan}
          hiringType={hiringType}
          canEdit={canEdit}
          headerExtra={planMenu(plan)}
          onSaved={() => {
            toast("Plan saved. Candidates who have not had these rounds yet now follow it.");
            router.refresh();
          }}
        />
        <Explainer />
      </div>
    );
  }

  if (draft) {
    return (
      <div className="flex flex-col gap-3">
        <PlanEditor
          slug={slug}
          plan={null}
          initial={draft.draft}
          templateKey={draft.templateKey}
          batchId={batch.id}
          hiringType={hiringType}
          canEdit={canEdit}
          onCancel={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            toast(batch.candidates ? "Plan created. Candidates still in screening now follow it." : "Plan created.");
            router.refresh();
          }}
        />
        <Explainer />
      </div>
    );
  }

  const defaults = usable.filter((p) => p.isDefault);
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-5 flex flex-col gap-5">
      <div>
        <h2 className="text-[15px] font-semibold text-fg">This batch has no interview plan yet</h2>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          A plan lists the rounds everyone in this batch goes through, in order. Each candidate gets a copy, so you can still skip or add a round for one person.
          {hiringType !== "both" && defaults.length > 0 && " Until you pick one, they follow the workspace default."}
        </p>
      </div>
      {usable.length > 0 && canEdit && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-subtle">Use a plan you already have</div>
          <div className="flex flex-wrap gap-2">
            {usable.map((p) => (
              <Btn key={p.id} disabled={pending} onClick={() => applyPlan(p.id)}>
                {p.name}
                <span className="text-subtle font-normal">
                  {p.rounds.length} rounds{p.isDefault ? " · default" : ""}
                </span>
              </Btn>
            ))}
          </div>
        </div>
      )}
      {canEdit ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-subtle">{usable.length ? "Or start from a template" : "Start from a template"}</div>
          <TemplatePicker
            hiringType={hiringType}
            busy={pending}
            onPick={(t, role, early) => setDraft({ draft: draftFromTemplate(t, role, batch.name, early), templateKey: t?.key ?? null })}
          />
        </div>
      ) : (
        <p className="text-sm text-subtle">Ask someone who can edit candidates to set one up.</p>
      )}
    </div>
  );
}

function Explainer() {
  return (
    <p className="text-xs text-subtle px-1 max-w-3xl">
      Pass marks only label results: a round below its mark waits for your next step, and only a recruiter passes a candidate. Empty pass marks use the defaults in Settings, Screening defaults.
    </p>
  );
}

export { draftFromTemplate };
export type { Draft };
