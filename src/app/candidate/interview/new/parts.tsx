"use client";

/**
 * Building blocks for the mock interview setup: selectable cards with an
 * animated check, the step heading and a segmented control. Same shapes as
 * the hiring interview wizard, in the developer site's yellow accent.
 */
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

export const spring = { type: "spring" as const, stiffness: 520, damping: 34, mass: 0.7 };

export function StepHeading({ title, lead, aside }: { title: string; lead: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[22px] font-semibold tracking-tight text-fg">{title}</h2>
        <p className="text-[14px] text-muted mt-1 max-w-[640px]">{lead}</p>
      </div>
      {aside}
    </div>
  );
}

/** Round check that pops in when `on`. */
export function CheckDot({ on, size = 20 }: { on: boolean; size?: number }) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full border transition-colors ${on ? "border-accent bg-accent" : "border-border-strong bg-bg"}`}
      style={{ width: size, height: size }}
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.span
            key="c"
            initial={reduce ? false : { scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? undefined : { scale: 0.3, opacity: 0 }}
            transition={spring}
            className="flex"
          >
            <Check className="text-accent-ink" style={{ width: size * 0.62, height: size * 0.62 }} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** A big selectable card. Lifts on hover, rings when chosen. */
export function ChoiceCard({
  selected,
  onSelect,
  disabled,
  children,
  className = "",
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onSelect}
      whileHover={reduce || disabled ? undefined : { y: -2 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.985 }}
      transition={spring}
      className={`group relative text-left rounded-xl border bg-surface transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-45 disabled:cursor-not-allowed ${
        selected
          ? "border-accent/70 bg-accent/[0.06] shadow-[0_0_0_1px_rgb(var(--c-accent-fill)/0.45),0_10px_30px_-14px_rgb(var(--c-accent-fill)/0.5)]"
          : "border-border hover:border-border-strong hover:bg-panel/40"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** Segmented pill control with a gliding highlight. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  id,
  size = "md",
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode; disabled?: boolean }[];
  id: string;
  size?: "sm" | "md";
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5 max-w-full overflow-x-auto">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.id)}
            className={`relative inline-flex items-center gap-1.5 ${size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]"} rounded-[7px] font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${
              on ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {on && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-[7px] bg-elevated ring-1 ring-inset ring-border-strong" />}
            <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" }) {
  const t = {
    neutral: "bg-panel text-muted ring-border",
    accent: "bg-accent/15 text-accent ring-accent/30",
    success: "bg-success/10 text-success ring-success/25",
  }[tone];
  return <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ring-1 ring-inset ${t}`}>{children}</span>;
}

export const inputCls =
  "w-full h-9 rounded-lg border border-border bg-bg px-3 text-[13px] text-fg placeholder:text-subtle focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20";

export const textareaCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-fg placeholder:text-subtle focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 resize-y";

export function fmtMinutes(n: number): string {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const DIFF_DOT: Record<string, string> = { easy: "bg-success", medium: "bg-warning", hard: "bg-danger" };

export function DiffDot({ d }: { d: string }) {
  return <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${DIFF_DOT[d] ?? "bg-subtle"}`} />;
}

export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
