"use client";

/**
 * Shared building blocks for every Settings tab, so they all look the same:
 *
 *   <SettingsCard title="Pass marks" description="...">
 *     <SettingRow label="Take home" help="..." error={errors.defaultTakeHomePassMark}>
 *       <Segmented ... />
 *     </SettingRow>
 *   </SettingsCard>
 *   <SaveBar form={form} />
 *
 * useSettingsForm keeps the edited values, tracks what changed, and saves
 * through saveWorkspaceSettingsAction (one audit entry per changed field).
 */
import { useCallback, useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Btn, inputCls, useToasts } from "../../candidates/_components/ui";
import { saveWorkspaceSettingsAction } from "../actions";
import type { SettingsGroup } from "@/lib/workspace/settings";

export { inputCls };

/* ── Layout ─────────────────────────────────────────────────────────────── */

/** A titled card holding a group of rows. `aside` sits at the right of the heading (a badge or a button). */
export function SettingsCard({
  title,
  description,
  aside,
  children,
  id,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-xl border border-border bg-surface shadow-sm shadow-black/5">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3.5">
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
          {description && <p className="text-[13px] text-muted max-w-2xl">{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      <div className="divide-y divide-border border-t border-border">{children}</div>
    </section>
  );
}

/**
 * One setting: label and help on the left, the control on the right. On
 * phones the two stack. `htmlFor` ties the label to a text input.
 */
export function SettingRow({
  label,
  help,
  error,
  htmlFor,
  badge,
  children,
}: {
  label: string;
  help?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  /** Small tag after the label, such as "Growth" or "Owners only". */
  badge?: string;
  children: ReactNode;
}) {
  const Label = htmlFor ? "label" : "div";
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] gap-x-8 gap-y-2.5 px-5 py-[18px]">
      <div className="flex flex-col gap-1 min-w-0">
        <Label {...(htmlFor ? { htmlFor } : {})} className="flex items-center gap-2 text-sm font-medium text-fg">
          {label}
          {badge && <span className="rounded-full bg-panel border border-border text-xs font-medium text-muted px-2 leading-5">{badge}</span>}
        </Label>
        {help && <p className="text-[13px] text-muted">{help}</p>}
      </div>
      <div className="flex flex-col gap-1.5 min-w-0 md:items-start">
        {children}
        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** A short "Coming soon" card for tabs that are not built yet. */
export function ComingSoonCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-surface px-5 py-8 flex flex-col items-center text-center gap-1.5">
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      <p className="text-[13px] text-muted max-w-md">{children ?? "Coming soon."}</p>
    </section>
  );
}

/* ── Controls ───────────────────────────────────────────────────────────── */

/** On/off switch. `label` is read by screen readers. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 disabled:opacity-50 disabled:pointer-events-none ${
        checked ? "bg-secondary border-secondary" : "bg-border-strong border-border-strong hover:brightness-125"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-4 w-4 rounded-full shadow transition-transform motion-reduce:transition-none ${
          checked ? "translate-x-[18px] bg-bg" : "translate-x-[3px] bg-fg"
        }`}
      />
    </button>
  );
}

export type SegmentOption<T extends string | number | null> = { value: T; label: string };

/** A row of mutually exclusive choices, like 50 / 60 / 70 / 80 / Custom. */
export function Segmented<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-border bg-bg p-0.5 gap-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`h-8 px-3 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 disabled:opacity-50 disabled:pointer-events-none ${
              on ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Plain text input styled like the rest of the workspace. */
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} max-w-md ${props.className ?? ""}`} />;
}

/** Native select styled like the rest of the workspace. */
export function Select({
  value,
  onChange,
  options,
  label,
  disabled,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} max-w-md disabled:opacity-50`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ── Form state and saving ──────────────────────────────────────────────── */

type Values = Record<string, unknown>;

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date || b instanceof Date || Array.isArray(a) || Array.isArray(b)
    ? JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
    : a === b;

export type SettingsForm<V extends Values> = {
  values: V;
  set: <K extends keyof V>(field: K, value: V[K]) => void;
  /** Fields that differ from what is saved. */
  dirty: (keyof V)[];
  errors: Partial<Record<keyof V & string, string>>;
  saving: boolean;
  save: () => void;
  discard: () => void;
  disabled: boolean;
  /** Toast outlet: render it once, SaveBar already does. */
  toastNode: ReactNode;
};

/**
 * Edit state for one tab. `initial` holds the saved values of the fields the
 * tab edits (keys are SETTINGS_FIELDS names). Saving sends only the changed
 * fields, shows field errors in place, and refreshes the page data.
 */
export function useSettingsForm<V extends Values>({
  slug,
  group,
  initial,
  canEdit,
  onSaved,
}: {
  slug: string;
  group: SettingsGroup;
  initial: V;
  canEdit: boolean;
  onSaved?: (result: { changed: string[]; newSlug: string | null }) => void;
}): SettingsForm<V> {
  const router = useRouter();
  const [saved, setSaved] = useState<V>(initial);
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof V & string, string>>>({});
  const [saving, startSaving] = useTransition();
  const [toastNode, toast] = useToasts();

  const dirty = useMemo(
    () => (Object.keys(values) as (keyof V)[]).filter((k) => !sameValue(values[k], saved[k])),
    [values, saved],
  );

  const set = useCallback(<K extends keyof V>(field: K, value: V[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => {
      if (!(field in e)) return e;
      const next = { ...e };
      delete next[field as keyof V & string];
      return next;
    });
  }, []);

  const discard = useCallback(() => {
    setValues(saved);
    setErrors({});
  }, [saved]);

  const save = useCallback(() => {
    if (!canEdit || !dirty.length) return;
    const patch: Values = {};
    for (const k of dirty) patch[k as string] = values[k];
    startSaving(async () => {
      const res = await saveWorkspaceSettingsAction(slug, group, patch).catch(() => null);
      if (!res) {
        toast("Could not save. Try again.", "error");
        return;
      }
      if (!res.ok) {
        setErrors(res.fieldErrors as Partial<Record<keyof V & string, string>>);
        toast(res.error, "error");
        return;
      }
      setSaved(values);
      setErrors({});
      toast(res.changed.length ? "Saved" : "Nothing changed");
      onSaved?.({ changed: res.changed, newSlug: res.newSlug });
      if (res.newSlug && res.newSlug !== slug) {
        router.replace(window.location.pathname.replace(`/w/${slug}/`, `/w/${res.newSlug}/`));
      } else {
        router.refresh();
      }
    });
  }, [canEdit, dirty, values, slug, group, toast, onSaved, router]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty.length) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty.length]);

  return { values, set, dirty, errors, saving, save, discard, disabled: !canEdit || saving, toastNode };
}

/**
 * Sticky bar at the bottom of the page while there are unsaved changes.
 * Also renders the form's toasts, so place it once per tab.
 */
export function SaveBar<V extends Values>({ form }: { form: SettingsForm<V> }) {
  const n = form.dirty.length;
  const statusId = useId();
  return (
    <>
      {form.toastNode}
      {n > 0 && (
        <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
          <div
            role="region"
            aria-labelledby={statusId}
            className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-border-strong bg-elevated px-4 py-2.5 shadow-xl shadow-black/30"
          >
            <span id={statusId} className="text-[13px] text-fg">
              {n === 1 ? "1 unsaved change" : `${n} unsaved changes`}
            </span>
            <Btn variant="quiet" onClick={form.discard} disabled={form.saving}>
              Discard
            </Btn>
            <Btn variant="primary" onClick={form.save} disabled={form.saving || form.disabled}>
              {form.saving ? "Saving" : "Save changes"}
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}
