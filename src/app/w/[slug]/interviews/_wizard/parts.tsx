"use client";

/**
 * Building blocks for the interview wizard: selectable cards with an animated
 * check, the step heading, switches and small chips. Site tokens only;
 * indigo (secondary) is the hiring accent.
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
        <p className="text-[14px] text-muted mt-1 max-w-[620px]">{lead}</p>
      </div>
      {aside}
    </div>
  );
}

/** Round check that pops in when `on`. */
export function CheckDot({ on, size = 20, square = false }: { on: boolean; size?: number; square?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden
      className={`relative inline-flex items-center justify-center shrink-0 border transition-colors ${square ? "rounded-md" : "rounded-full"} ${
        on ? "border-secondary bg-secondary" : "border-border-strong bg-bg"
      }`}
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
            <Check className="text-bg" style={{ width: size * 0.62, height: size * 0.62 }} strokeWidth={3} />
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
  role = "radio",
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  role?: "radio" | "checkbox";
  label?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      role={role}
      aria-checked={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onSelect}
      whileHover={reduce || disabled ? undefined : { y: -2 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.985 }}
      transition={spring}
      className={`group relative text-left rounded-xl border bg-surface transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 disabled:opacity-45 disabled:cursor-not-allowed ${
        selected
          ? "border-secondary/70 bg-secondary/[0.07] shadow-[0_0_0_1px_rgb(var(--c-accent-2)/0.45),0_10px_30px_-14px_rgb(var(--c-accent-2)/0.55)]"
          : "border-border hover:border-border-strong hover:bg-panel/40"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="group flex items-start gap-3 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
    >
      <span className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-secondary" : "bg-border-strong"}`}>
        <motion.span layout transition={spring} className={`absolute top-0.5 h-4 w-4 rounded-full bg-bg shadow ${on ? "right-0.5" : "left-0.5"}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-fg">{label}</span>
        {hint && <span className="block text-[13px] text-muted mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "indigo" | "success" | "warning" }) {
  const t = {
    neutral: "bg-panel text-muted ring-border",
    indigo: "bg-secondary/15 text-secondary-soft ring-secondary/30",
    success: "bg-success/10 text-success ring-success/25",
    warning: "bg-warning/10 text-warning ring-warning/25",
  }[tone];
  return <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ring-1 ring-inset ${t}`}>{children}</span>;
}

/** Segmented pill control with a gliding highlight. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode; disabled?: boolean }[];
  id: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5 max-w-full overflow-x-auto">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
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

export const textareaCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20 resize-y";

export function fmtMinutes(n: number): string {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function fmtWhen(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return "No time yet";
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
