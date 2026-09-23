"use client";

import { Fragment, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Columns2,
  ExternalLink,
  GitFork,
  Keyboard,
  Link as LinkIcon,
  LogOut,
  Minus,
  MoreHorizontal,
  Palette,
  PanelLeft,
  Pause,
  Pin,
  Play,
  Plus,
  RotateCcw,
  Rows2,
  Save,
  Share2,
  ShieldAlert,
  Timer,
  Wand2,
  Zap,
} from "lucide-react";
import { TemplateLogo } from "@/lib/icons";
import { EDITOR_THEMES, editorThemeById, type EditorThemeDef } from "@/lib/editor-themes";
import { readBoolPref, readPref, writeBoolPref, writePref, PREF_KEYS } from "@/lib/prefs";
import LogoDynamic from "./LogoDynamic";
import { useChallengeTimer, type ChallengeTimerController } from "./ChallengeTimer";
import { RUN_SHORTCUT } from "./playground/Consoles";
import { usePlayground, type ViewMode } from "./playground/PlaygroundContext";

type Icon = ComponentType<{ className?: string }>;

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
/** Quiet icon button used across the bar. */
const GHOST = `grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-panel hover:text-fg ${FOCUS}`;
const MENU_ROW = `flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-panel hover:text-fg ${FOCUS}`;
const POPOVER = "rounded-lg border border-border-strong bg-surface shadow-[var(--shadow-panel)]";

/** Closes a popover on outside press and Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return ref;
}

/* ── View layout ─────────────────────────────────────────────────────── */

function ViewLayoutControl({
  value,
  onChange,
  showDirection,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  showDirection: boolean;
}) {
  // Console remembers its last split direction (rows vs columns) so the
  // Console button returns to it instead of always resetting to rows.
  const [lastSplit, setLastSplit] = useState<"both" | "columns">("both");
  useEffect(() => {
    if (value === "both" || value === "columns") setLastSplit(value);
  }, [value]);
  const split = value === "both" || value === "columns";
  const seg = (active: boolean) =>
    `flex h-6 items-center gap-1.5 whitespace-nowrap rounded px-2.5 text-[13px] transition-colors ${FOCUS} ${
      active ? "bg-elevated text-fg" : "text-subtle hover:text-fg"
    }`;
  const dir = (active: boolean) =>
    `grid h-6 w-6 place-items-center rounded transition-colors ${FOCUS} ${
      active ? "bg-elevated text-fg" : "text-subtle hover:text-fg"
    }`;
  const dirOpen = split && showDirection;
  return (
    <div className="flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-border bg-bg p-0.5">
      <div role="radiogroup" aria-label="Output view" className="flex items-center gap-0.5">
        <button
          type="button"
          role="radio"
          aria-checked={value === "preview"}
          data-active={value === "preview"}
          onClick={() => onChange("preview")}
          title="Preview only"
          className={seg(value === "preview")}
        >
          Preview
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={split}
          data-active={split}
          onClick={() => onChange(lastSplit)}
          title="Split: preview + console"
          className={seg(split)}
        >
          Console
        </button>
      </div>
      {/* Always mounted at a fixed width so the tabs never shift when the
          direction toggles slide in. */}
      <div
        data-open={dirOpen}
        aria-hidden={!dirOpen}
        className={`flex w-[58px] shrink-0 items-center gap-0.5 overflow-hidden pl-1 transition-[opacity,transform] duration-200 ${
          dirOpen ? "translate-x-0 opacity-100" : "invisible translate-x-2 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => onChange("both")}
          title="Stacked: preview above console"
          aria-label="Stack console below preview"
          aria-pressed={value === "both"}
          data-active={value === "both"}
          tabIndex={dirOpen ? 0 : -1}
          className={dir(value === "both")}
        >
          <Rows2 className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onChange("columns")}
          title="Side by side"
          aria-label="Console beside preview"
          aria-pressed={value === "columns"}
          data-active={value === "columns"}
          tabIndex={dirOpen ? 0 : -1}
          className={dir(value === "columns")}
        >
          <Columns2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ── Editor theme ────────────────────────────────────────────────────── */

function ThemeSwatch({ theme }: { theme: EditorThemeDef }) {
  return (
    <span className="flex shrink-0 overflow-hidden rounded-full border border-border-strong" aria-hidden>
      {theme.swatch.map((c) => (
        <span key={c} style={{ background: c }} className="h-4 w-2" />
      ))}
    </span>
  );
}

function ThemeOptionsList({ activeId, onPick }: { activeId: string; onPick: (id: string) => void }) {
  return (
    <>
      {EDITOR_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="option"
          aria-selected={t.id === activeId}
          onClick={() => onPick(t.id)}
          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-panel ${FOCUS}`}
        >
          <ThemeSwatch theme={t} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-fg">{t.label}</span>
            <span className="block truncate text-[12px] text-subtle">{t.blurb}</span>
          </span>
          {t.id === activeId && <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />}
        </button>
      ))}
    </>
  );
}

function EditorThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const active = editorThemeById(value);
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Editor theme"
        className={`flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-panel hover:text-fg ${FOCUS}`}
      >
        <ThemeSwatch theme={active} />
        <span className="hidden xl:inline">{active.label}</span>
      </button>
      {open && (
        <div role="listbox" aria-label="Editor theme" className={`pg-menu absolute right-0 top-full z-[100] mt-2 w-64 p-1 ${POPOVER}`}>
          <ThemeOptionsList
            activeId={active.id}
            onPick={(id) => {
              onChange(id);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Timer ───────────────────────────────────────────────────────────── */

function TimerChip({ t }: { t: ChallengeTimerController }) {
  const frac = t.total > 0 ? Math.max(0, Math.min(1, t.timeLeft / t.total)) : 0;
  const R = 8;
  const C = 2 * Math.PI * R;
  const urgent = t.isCritical && t.isRunning;
  const tone = t.isFinished ? "text-success" : urgent ? "text-danger" : t.isRunning ? "text-accent" : "text-muted";
  const idle = !t.isRunning && !t.isFinished;
  const small = `grid h-6 w-6 place-items-center rounded text-subtle transition-colors hover:bg-panel hover:text-fg disabled:opacity-40 ${FOCUS}`;
  return (
    <div
      role="group"
      aria-label="Challenge timer"
      className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-bg pl-1.5 pr-0.5"
    >
      <svg viewBox="0 0 20 20" className={`h-4 w-4 -rotate-90 ${tone}`} aria-hidden>
        <circle cx="10" cy="10" r={R} fill="none" stroke="var(--border-strong)" strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className={`min-w-[38px] text-center font-mono text-[13px] tabular-nums ${tone}`} aria-live="off">
        {t.minutes}:{t.seconds.toString().padStart(2, "0")}
      </span>
      {idle && (
        <>
          <button type="button" onClick={() => t.adjust(-60)} className={small} title="One minute less" aria-label="One minute less">
            <Minus className="h-3 w-3" aria-hidden />
          </button>
          <button type="button" onClick={() => t.adjust(60)} className={small} title="One minute more" aria-label="One minute more">
            <Plus className="h-3 w-3" aria-hidden />
          </button>
        </>
      )}
      {!t.isFinished && (
        <button
          type="button"
          onClick={t.toggle}
          className={small}
          title={t.isRunning ? "Pause timer" : "Start timer"}
          aria-label={t.isRunning ? "Pause timer" : "Start timer"}
        >
          {t.isRunning ? <Pause className="h-3 w-3" aria-hidden /> : <Play className="h-3 w-3" aria-hidden />}
        </button>
      )}
      <button
        type="button"
        onClick={t.reset}
        disabled={idle && t.timeLeft === t.total}
        className={small}
        title="Reset timer"
        aria-label="Reset timer"
      >
        <RotateCcw className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

/* ── Menu pieces ─────────────────────────────────────────────────────── */

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-elevated"}`}
    >
      <span
        className={`absolute top-0.5 h-3 w-3 rounded-full transition-[left] ${on ? "left-[14px] bg-accent-ink" : "left-0.5 bg-muted"}`}
      />
    </span>
  );
}

function ToggleRow({ icon: I, label, on, onToggle }: { icon: Icon; label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} className={MENU_ROW}>
      <I className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <span className="flex-1">{label}</span>
      <Switch on={on} />
    </button>
  );
}

function ActionRow({
  icon: I,
  label,
  onClick,
  hint,
}: {
  icon: Icon;
  label: string;
  onClick: () => void;
  hint?: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={MENU_ROW}>
      <I className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[12px] text-subtle">{hint}</span>}
    </button>
  );
}

function MenuSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="border-b border-border p-1 last:border-b-0">
      {label && <p className="px-2.5 pb-1 pt-1.5 text-[12px] text-subtle">{label}</p>}
      {children}
    </div>
  );
}

function FontStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn = `grid h-7 w-7 place-items-center rounded text-muted transition-colors hover:bg-panel hover:text-fg disabled:opacity-40 ${FOCUS}`;
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5">
      <span className="text-[13px] text-muted">Font size</span>
      <div className="flex items-center gap-1" role="group" aria-label="Editor font size">
        <button type="button" onClick={() => onChange(Math.max(10, value - 1))} disabled={value <= 10} className={btn} aria-label="Smaller font">
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="w-10 text-center font-mono text-[13px] tabular-nums text-fg">{value}px</span>
        <button type="button" onClick={() => onChange(Math.min(32, value + 1))} disabled={value >= 32} className={btn} aria-label="Larger font">
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ── Save ────────────────────────────────────────────────────────────── */

function SaveNameDialog({
  initial,
  saving,
  onCancel,
  onConfirm,
}: {
  initial: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  const confirm = () => {
    const n = name.trim();
    if (n && !saving) onConfirm(n);
  };
  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-bg/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Save playground" className={`pg-menu w-full max-w-sm p-5 ${POPOVER}`}>
        <h2 className="text-[15px] font-semibold text-fg">Save playground</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-subtle">
          It will show up on your dashboard under this name.
        </p>
        <label htmlFor="tb-save-name" className="mt-4 block text-[13px] text-muted">
          Playground name
        </label>
        <input
          id="tb-save-name"
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
          }}
          placeholder="Untitled playground"
          maxLength={80}
          autoComplete="off"
          className="mt-1.5 w-full rounded-md border border-border bg-bg px-3 py-2 text-[14px] text-fg outline-none placeholder:text-subtle focus:border-accent/70"
        />
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`h-8 rounded-md px-3 text-[13px] text-muted transition-colors hover:bg-panel hover:text-fg ${FOCUS}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!name.trim() || saving}
            className={`h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
          >
            {saving ? "Saving…" : "Save playground"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Toolbar ─────────────────────────────────────────────────────────── */

/** Persisted opt-in pins for toolbar extras. Default: nothing pinned. */
function usePin(which: "timer" | "ai" | "theme") {
  const key = PREF_KEYS.toolbarPin(which);
  const [on, setOn] = useState(() => readPref(key) === "1");
  const toggle = () =>
    setOn((v) => {
      writePref(key, v ? "0" : "1");
      return !v;
    });
  return [on, toggle] as const;
}

export default function PlaygroundToolbar() {
  const pg = usePlayground();
  const { doc, prefs } = pg;
  const compact = pg.isMobile;

  const [menuOpen, setMenuOpen] = useState(false);
  // Drill-in sub-view inside the More menu. Resets to root whenever the menu
  // closes so it always reopens at the top level.
  const [menuView, setMenuView] = useState<"root" | "theme">("root");
  const closeMenu = () => {
    setMenuOpen(false);
    setMenuView("root");
  };
  const menuRef = useDismiss(menuOpen, closeMenu);

  // First-save naming: a playground lands on the dashboard only when saved
  // explicitly, and that moment asks for its name. Re-saves skip the dialog.
  const [naming, setNaming] = useState(false);
  const requestSave = () => {
    if (doc.snippetId) void doc.handleSave();
    else setNaming(true);
  };

  const [showTimer, toggleTimer] = usePin("timer");
  const [showAi, toggleAi] = usePin("ai");
  const [showTheme, toggleTheme] = usePin("theme");
  // Delete confirmation (default on). Shares its pref with the explorer's
  // "Do not ask me again" checkbox, which is the off-ramp back here.
  const [confirmDelete, setConfirmDelete] = useState(() => !readBoolPref(PREF_KEYS.skipDeleteConfirm, false));
  const toggleConfirmDelete = () =>
    setConfirmDelete((v) => {
      writeBoolPref(PREF_KEYS.skipDeleteConfirm, v);
      return !v;
    });
  // One countdown for the chip and the menu, so closing a menu never stops it.
  const timer = useChallengeTimer();

  const canSave = pg.editable && pg.signedIn;
  const saveState = doc.saving ? "saving" : !doc.snippetId || doc.dirty ? "dirty" : "saved";
  const showView = pg.templateMode !== "console";
  const act = (fn: () => void) => () => {
    fn();
    closeMenu();
  };

  const exitLink = (
    <Link
      href="/playgrounds"
      onClick={(e) => {
        if (doc.dirty && !window.confirm("Unsaved changes will be lost. Exit anyway?")) e.preventDefault();
      }}
      aria-label="Exit to playgrounds"
      title="Exit to playgrounds"
      className={
        compact
          ? MENU_ROW
          : `flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-panel hover:text-fg ${FOCUS}`
      }
    >
      <LogOut className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <span className={compact ? "flex-1" : "hidden lg:inline"}>Exit</span>
    </Link>
  );

  const saveButton = canSave && (
    <button
      type="button"
      onClick={requestSave}
      disabled={doc.saving}
      data-state={saveState}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors disabled:cursor-default ${FOCUS} ${
        saveState === "saved"
          ? "border-transparent text-subtle hover:bg-panel hover:text-fg"
          : "border-border-strong text-fg hover:bg-panel"
      }`}
      title={
        doc.saving
          ? "Saving…"
          : !doc.snippetId
            ? "Save playground to your dashboard"
            : doc.dirty
              ? "Save (Ctrl+S) — unsaved changes"
              : "Saved — nothing to save"
      }
    >
      {doc.saving ? (
        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border-strong border-t-fg" aria-hidden />
      ) : saveState === "saved" ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
      ) : (
        <Save className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span>{doc.saving ? "Saving" : saveState === "saved" ? "Saved" : "Save"}</span>
    </button>
  );

  const menu = (
    <>
      {compact && showView && (
        <MenuSection label="Output">
          <div role="radiogroup" aria-label="Output view">
          {(
            [
              ["preview", "Preview only"],
              ["both", "Preview and console"],
            ] as const
          ).map(([v, label]) => {
            const active = v === "preview" ? pg.view === "preview" : pg.view !== "preview";
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={act(() => pg.setView(v))}
                className={MENU_ROW}
              >
                <span className="flex-1">{label}</span>
                {active && <Check className="h-4 w-4 text-accent" aria-hidden />}
              </button>
            );
          })}
          </div>
        </MenuSection>
      )}
      {compact && (canSave || pg.signedIn) && (
        <MenuSection>
          {canSave && (
            <ActionRow
              icon={saveState === "saved" ? Check : Save}
              label={doc.saving ? "Saving…" : saveState === "saved" ? "Saved" : "Save playground"}
              onClick={act(requestSave)}
            />
          )}
          {pg.signedIn && <ActionRow icon={Bot} label="Open AI assist" onClick={act(pg.togglePrompt)} />}
        </MenuSection>
      )}
      <MenuSection label="Editor">
        {!compact && <ToggleRow icon={Timer} label="Timer" on={showTimer} onToggle={toggleTimer} />}
        {!compact &&
          (pg.signedIn ? (
            <ToggleRow icon={Bot} label="AI Assist" on={showAi} onToggle={toggleAi} />
          ) : (
            <Link href="/login" className={MENU_ROW}>
              <Bot className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <span className="flex-1">AI Assist</span>
              <span className="text-[12px] text-subtle">Sign in</span>
            </Link>
          ))}
        <button type="button" onClick={() => setMenuView("theme")} className={MENU_ROW}>
          <Palette className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
          <span className="flex-1">Editor theme</span>
          <span className="text-[12px] text-subtle">{editorThemeById(prefs.editorThemeId).label}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
        </button>
        {!pg.isBackend && <ToggleRow icon={Zap} label="Auto-run" on={prefs.autoRun} onToggle={() => prefs.setAutoRun(!prefs.autoRun)} />}
        <ToggleRow icon={Wand2} label="Format on save" on={prefs.formatOnSave} onToggle={() => prefs.setFormatOnSave(!prefs.formatOnSave)} />
        <ToggleRow icon={ShieldAlert} label="Confirm before delete" on={confirmDelete} onToggle={toggleConfirmDelete} />
        <FontStepper value={prefs.fontSize} onChange={prefs.setFontSize} />
      </MenuSection>
      <MenuSection label="Share">
        <ActionRow icon={Share2} label="Copy link with code" onClick={act(pg.copyCodeLink)} />
        <ActionRow icon={LinkIcon} label="Copy public link" onClick={act(() => void doc.handleShare())} />
        <ActionRow icon={Code2} label="Copy embed code" onClick={act(() => void doc.handleCopyEmbed())} />
        {!pg.isBackend && <ActionRow icon={ExternalLink} label="Pop out preview" onClick={act(doc.handlePopout)} />}
        <ActionRow icon={GitFork} label="Fork" onClick={act(() => void doc.handleFork())} />
      </MenuSection>
      <MenuSection>
        {!compact && <ActionRow icon={Keyboard} label="Keyboard shortcuts" hint="?" onClick={act(pg.openShortcuts)} />}
        {compact && exitLink}
      </MenuSection>
    </>
  );

  return (
    <>
      <header className="relative z-50 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:px-3">
        {/* Identity: brand, optional way back, title. */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <Link
            href="/"
            className={`flex shrink-0 items-center rounded-md p-1 transition-colors hover:bg-panel ${FOCUS}`}
            title="Interviewpad home"
            aria-label="Interviewpad home"
          >
            <span className="hidden md:block [&_.ld-word]:text-[15px] [&_svg]:h-7 [&_svg]:w-7">
              <LogoDynamic tone="accent" showSub={false} />
            </span>
            <span className="md:hidden [&_svg]:h-7 [&_svg]:w-7">
              <LogoDynamic tone="accent" compact />
            </span>
          </Link>
          <span className="hidden h-5 w-px shrink-0 bg-border md:block" aria-hidden />
          {compact && (
            <button type="button" onClick={pg.toggleFiles} className={GHOST} title="Files" aria-label="Files">
              <PanelLeft className="h-4 w-4" aria-hidden />
            </button>
          )}
          {pg.backHref && (
            <Link href={pg.backHref} className={GHOST} title="Back to question" aria-label="Back to question">
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
          )}
          <div className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors focus-within:bg-panel hover:bg-panel">
            <TemplateLogo id={pg.templateId} size={16} />
            <input
              value={doc.title}
              onChange={(e) => {
                doc.setTitle(e.target.value);
                doc.setDirty(true);
              }}
              disabled={!pg.editable}
              aria-label="Playground title"
              placeholder="Untitled playground"
              className="w-full min-w-0 max-w-[220px] truncate bg-transparent text-[14px] font-medium text-fg outline-none placeholder:text-subtle disabled:cursor-default"
            />
            {doc.dirty && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" title="Unsaved changes" aria-label="Unsaved changes" role="img" />
            )}
          </div>
        </div>

        {showView && !compact && (
          <ViewLayoutControl value={pg.view} onChange={pg.setView} showDirection={!pg.isMobile} />
        )}

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-1.5">
          {!compact && showTimer && <TimerChip t={timer} />}
          {/* AI Assist is login-only (the assist route 401s anonymous calls). */}
          {!compact && showAi && pg.signedIn && (
            <button
              type="button"
              onClick={pg.togglePrompt}
              title="AI Assist"
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-panel hover:text-fg ${FOCUS}`}
            >
              <Bot className="h-4 w-4 text-secondary" aria-hidden />
              <span className="hidden lg:inline">AI Assist</span>
            </button>
          )}
          {!compact && showTheme && <EditorThemePicker value={prefs.editorThemeId} onChange={prefs.setEditorThemeId} />}
          {!compact && saveButton}

          <button
            type="button"
            onClick={pg.run}
            disabled={pg.running}
            aria-busy={pg.running}
            aria-label={pg.running ? "Running" : "Run"}
            title={`Run (${RUN_SHORTCUT})`}
            className={`flex h-8 shrink-0 items-center gap-2 rounded-md bg-accent pl-2.5 pr-3 text-[13px] font-medium text-accent-ink transition-[background-color,transform] hover:bg-accent/90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 ${FOCUS}`}
          >
            {pg.running ? (
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden />
            )}
            <span aria-hidden>{pg.running ? "Running" : "Run"}</span>
            <kbd aria-hidden className="hidden font-sans text-[12px] opacity-60 lg:inline">
              {RUN_SHORTCUT}
            </kbd>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              title="More options"
              aria-label="More options"
              className={`${GHOST} ${menuOpen ? "bg-panel text-fg" : ""}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
            {menuOpen && (
              <>
                {compact && <div className="fixed inset-0 z-[99] bg-bg/60" aria-hidden onMouseDown={closeMenu} />}
                <div
                  role="dialog"
                  aria-label="More options"
                  className={
                    compact
                      ? `pg-sheet-up fixed inset-x-0 bottom-0 z-[100] max-h-[85dvh] overflow-hidden rounded-b-none rounded-t-xl pb-[env(safe-area-inset-bottom)] ${POPOVER}`
                      : `pg-menu absolute right-0 top-full z-[100] mt-2 w-72 overflow-hidden ${POPOVER}`
                  }
                >
                  <div className="overflow-y-auto" style={compact ? { maxHeight: "85dvh" } : { maxHeight: "calc(100dvh - 5rem)" }}>
                    {compact && <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong" aria-hidden />}
                    {menu}
                  </div>
                  {/* Theme drill-in slides over the root menu. */}
                  {menuView === "theme" && (
                    <div className="pg-sheet-right absolute inset-0 flex flex-col bg-surface">
                      <div className="flex shrink-0 items-center gap-1 border-b border-border px-1.5 py-1.5">
                        <button
                          type="button"
                          onClick={() => setMenuView("root")}
                          aria-label="Back to options"
                          title="Back"
                          className={GHOST}
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                        </button>
                        <span className="flex-1 truncate text-[13px] font-medium text-fg">Editor theme</span>
                        {!compact && (
                          <button
                            type="button"
                            onClick={toggleTheme}
                            aria-pressed={showTheme}
                            title={showTheme ? "Shown in the toolbar" : "Show in the toolbar"}
                            className={`flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] transition-colors ${FOCUS} ${
                              showTheme ? "bg-panel text-fg" : "text-subtle hover:bg-panel hover:text-fg"
                            }`}
                          >
                            <Pin className="h-3 w-3" aria-hidden />
                            {showTheme ? "Pinned" : "Pin"}
                          </button>
                        )}
                      </div>
                      <div role="listbox" aria-label="Editor theme" className="min-h-0 flex-1 overflow-y-auto p-1">
                        <ThemeOptionsList activeId={editorThemeById(prefs.editorThemeId).id} onPick={prefs.setEditorThemeId} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {!compact && (
            <Fragment>
              <span className="mx-0.5 hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />
              {exitLink}
            </Fragment>
          )}
        </div>
      </header>
      {naming && (
        <SaveNameDialog
          initial={doc.title}
          saving={doc.saving}
          onCancel={() => setNaming(false)}
          onConfirm={(name) => {
            setNaming(false);
            void doc.handleSave({ title: name });
          }}
        />
      )}
    </>
  );
}
