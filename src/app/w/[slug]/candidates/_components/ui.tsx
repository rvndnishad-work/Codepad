"use client";

/**
 * Small building blocks shared by the Candidates list, board, quick view,
 * profile and batch pages. Site colour tokens only; indigo (secondary) is the
 * hiring accent.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { STAGE_LABELS, isPipelineStage } from "@/lib/crm/stages";
import { STAGE_SWATCH } from "@/lib/workspace/display";
import { initials } from "@/lib/crm/roster";
import type { NextStep } from "@/lib/crm/results";

export function stageLabel(stage: string): string {
  return isPipelineStage(stage) ? STAGE_LABELS[stage] : stage;
}

export function StageDot({ stage, className = "" }: { stage: string; className?: string }) {
  const sw = isPipelineStage(stage) ? STAGE_SWATCH[stage] : "bg-subtle";
  return <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-[2px] shrink-0 ${sw} ${className}`} />;
}

export function StageChip({ stage }: { stage: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-border bg-panel text-xs font-medium text-fg whitespace-nowrap">
      <StageDot stage={stage} />
      {stageLabel(stage)}
    </span>
  );
}

const AVATAR_TONES = [
  "bg-secondary/20 text-secondary-soft",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-elevated text-fg",
];

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full shrink-0 font-semibold ${AVATAR_TONES[h % AVATAR_TONES.length]}`}
      style={{ width: size, height: size, fontSize: size >= 48 ? 16 : size <= 28 ? 12 : 13 }}
    >
      {initials(name)}
    </span>
  );
}

export function scoreTone(v: number): string {
  return v >= 80 ? "bg-success" : v >= 65 ? "bg-secondary" : "bg-warning";
}

export function ScoreBar({ value, label, width = 120 }: { value: number | null; label?: string; width?: number }) {
  if (value == null) return <span className="text-[13px] text-subtle">No results yet</span>;
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-sm font-semibold tabular-nums text-fg">{value}</span>
        {label && <span className="text-xs text-subtle truncate">{label}</span>}
      </div>
      <div className="h-1 rounded-full bg-panel" style={{ width }}>
        <div
          className={`h-1 rounded-full origin-left animate-rule-in motion-reduce:animate-none ${scoreTone(value)}`}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

const NEXT_TONE: Record<NextStep["tone"], string> = {
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-secondary/15 text-secondary-soft",
  plain: "",
};

export function NextStepPill({ next, compact = false }: { next: NextStep; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0 items-start">
      {next.tone === "plain" ? (
        <span className={`text-[13px] ${compact ? "text-muted" : "text-fg"} truncate max-w-full`}>{next.label}</span>
      ) : (
        <span className={`inline-block max-w-full truncate leading-6 h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ${NEXT_TONE[next.tone]}`}>
          {next.label}
        </span>
      )}
      {!compact && next.detail && <span className="text-xs text-subtle truncate max-w-full">{next.detail}</span>}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md";
  icon?: typeof X;
  href?: string;
};

export function Btn({ variant = "ghost", size = "sm", icon: Icon, href, className = "", children, ...rest }: BtnProps) {
  const v = {
    primary: "bg-secondary text-bg hover:brightness-110",
    ghost: "border border-border bg-surface text-fg hover:bg-panel hover:border-border-strong",
    danger: "border border-danger/40 bg-transparent text-danger hover:bg-danger/10",
    quiet: "text-muted hover:text-fg hover:bg-panel",
  }[variant];
  const s = size === "md" ? "h-9 px-3.5" : "h-8 px-3";
  const cls = `inline-flex items-center justify-center gap-1.5 ${s} rounded-lg text-[13px] font-medium whitespace-nowrap transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${v} ${className}`;
  const inner = (
    <>
      {Icon && <Icon className={`w-3.5 h-3.5 ${variant === "ghost" ? "text-muted" : ""}`} strokeWidth={variant === "primary" ? 2.25 : 1.75} aria-hidden />}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {inner}
    </button>
  );
}

/** Click-to-open menu. Closes on outside click and Escape. */
export function Menu({
  trigger,
  children,
  align = "left",
  width = 220,
  label,
}: {
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={`absolute z-40 top-full mt-1.5 ${align === "right" ? "right-0" : "left-0"} rounded-xl border border-border-strong bg-elevated p-1 shadow-xl shadow-black/30 max-h-80 overflow-auto animate-[menuIn_140ms_ease-out] motion-reduce:animate-none`}
          style={{ width }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  active,
  danger,
  disabled,
  href,
}: {
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  href?: string;
}) {
  const cls = `w-full flex items-center gap-2 h-9 px-2.5 rounded-lg text-left text-[13px] transition ${
    danger ? "text-danger hover:bg-danger/10" : active ? "bg-panel text-fg" : "text-fg hover:bg-panel"
  } disabled:opacity-50`;
  if (href) {
    return (
      <Link role="menuitem" href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pt-2 pb-1 text-xs font-medium text-subtle">{children}</div>;
}

/** Modal dialog with a labelled title, Escape to close and focus on open. */
export function Dialog({
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const first = ref.current?.querySelector<HTMLElement>("input, textarea, select, button[data-autofocus]");
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto">
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="relative w-full rounded-2xl border border-border-strong bg-surface shadow-2xl shadow-black/40 animate-[dialogIn_180ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
          <h2 id={id} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">{footer}</div>}
      </div>
    </div>
  );
}

export type Toast = { id: number; text: string; tone: "ok" | "error"; undo?: () => void };

/** A tiny toast stack. Returns [node, push]. */
export function useToasts(): [ReactNode, (text: string, tone?: Toast["tone"], undo?: () => void) => void] {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (text: string, tone: Toast["tone"] = "ok", undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undo ? 7000 : 4500);
  };
  const node = (
    <div aria-live="polite" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[13px] shadow-lg shadow-black/30 animate-[toastIn_200ms_ease-out] motion-reduce:animate-none ${
            t.tone === "error" ? "border-danger/40 bg-elevated text-danger" : "border-border-strong bg-elevated text-fg"
          }`}
        >
          {t.text}
          {t.undo && (
            <button
              type="button"
              className="font-medium text-secondary-soft hover:underline"
              onClick={() => {
                t.undo?.();
                setToasts((all) => all.filter((x) => x.id !== t.id));
              }}
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
  return [node, push];
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs font-medium text-subtle">{label}</span>
      {children}
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-9 w-full rounded-lg border border-border bg-bg px-3 text-[13px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20";

export function fmtDate(iso: string | null | undefined, withYear = false): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}
