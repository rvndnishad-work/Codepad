"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, HelpCircle, LayoutGrid, Menu, Plus, Search, X } from "lucide-react";
import { LogoDynamicMark } from "@/components/LogoDynamic";
import NotificationBell from "@/components/NotificationBell";
import UserMenu from "@/components/UserMenu";

export type SwitcherWorkspace = { name: string; slug: string; planLabel: string };

type Props = {
  /** Omitted on the /w hub, which has no active workspace. */
  current?: SwitcherWorkspace;
  workspaces: SwitcherWorkspace[];
  user: { name?: string | null; email?: string | null; image?: string | null };
  isAdmin: boolean;
  /** Mobile only: the sidebar drawer toggle. */
  menuOpen?: boolean;
  onMenuToggle?: () => void;
};

export function WorkspaceInitial({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 flex items-center justify-center rounded-md bg-elevated border border-border-strong font-semibold text-fg ${
        size === "lg" ? "w-10 h-10 rounded-[10px] text-[15px]" : "w-6 h-6 text-xs"
      }`}
    >
      {name.trim().charAt(0).toUpperCase() || "W"}
    </span>
  );
}

function WorkspaceSwitcher({ current, workspaces }: { current: SwitcherWorkspace; workspaces: SwitcherWorkspace[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 h-9 pl-1.5 pr-2 rounded-lg border border-transparent hover:border-border hover:bg-panel transition-colors min-w-0"
      >
        <WorkspaceInitial name={current.name} />
        <span className="text-sm font-medium text-fg truncate max-w-[180px]">{current.name}</span>
        <span className="hidden sm:inline text-xs text-muted border border-border-strong rounded-full px-2 py-px">
          {current.planLabel}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-subtle shrink-0" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="ws-menu absolute left-0 top-[calc(100%+6px)] z-50 w-72 rounded-xl border border-border bg-surface shadow-panel p-1.5"
        >
          <div className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-subtle">Switch workspace</div>
          {workspaces.map((ws) => {
            const active = ws.slug === current.slug;
            return (
              <Link
                key={ws.slug}
                href={`/w/${ws.slug}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-2.5 h-10 rounded-lg hover:bg-panel transition-colors"
              >
                <WorkspaceInitial name={ws.name} />
                <span className="flex-1 min-w-0 text-sm text-fg truncate">{ws.name}</span>
                <span className="text-xs text-subtle">{ws.planLabel}</span>
                {active ? <Check className="w-4 h-4 text-secondary" aria-label="Current workspace" /> : <span className="w-4" />}
              </Link>
            );
          })}
          <div className="h-px bg-border my-1.5" />
          <Link
            href="/w"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-sm text-muted hover:text-fg hover:bg-panel transition-colors"
          >
            <LayoutGrid className="w-4 h-4" aria-hidden /> All workspaces
          </Link>
          <Link
            href="/w/create"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-sm text-muted hover:text-fg hover:bg-panel transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden /> Create workspace
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Candidate search. Submitting opens the candidates roster filtered by the
 * query; Ctrl K or Cmd K focuses the field from anywhere in the workspace.
 */
function WorkspaceSearch({ slug }: { slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(`/w/${slug}?section=candidates${query ? `&q=${encodeURIComponent(query)}` : ""}`);
      }}
      className="hidden lg:flex flex-1 justify-center min-w-0"
    >
      <label className="w-full max-w-[440px] h-9 flex items-center gap-2 px-2.5 rounded-lg border border-border bg-surface text-subtle focus-within:border-secondary/60 transition-colors">
        <Search className="w-4 h-4 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search candidates by name or email"
          aria-label="Search candidates"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-fg placeholder:text-subtle"
        />
        <kbd className="font-mono text-xs border border-border-strong rounded px-1.5 text-subtle">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </label>
    </form>
  );
}

/**
 * The workspace app bar. Replaces the marketing site header on /w and
 * /w/[slug]: brand mark, workspace switcher, search, help, notifications and
 * the account menu, in one 56px row.
 */
export default function WorkspaceAppBar({ current, workspaces, user, isAdmin, menuOpen, onMenuToggle }: Props) {
  return (
    <header className="h-14 shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 border-b border-border bg-bg relative z-40">
      {onMenuToggle && (
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={menuOpen ? "Close workspace menu" : "Open workspace menu"}
          aria-expanded={menuOpen}
          className="md:hidden w-10 h-10 -ml-1 rounded-lg border border-border bg-surface flex items-center justify-center text-fg"
        >
          {menuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
        </button>
      )}

      <Link href="/w" aria-label="Interviewpad workspaces" className="flex items-center gap-1.5 shrink-0 text-fg">
        <LogoDynamicMark className="w-8 h-8" />
        <span className={`text-[15px] font-semibold tracking-[-0.02em] ${current ? "hidden md:inline" : ""}`}>
          interview<span className="text-secondary-soft">pad</span>
        </span>
      </Link>

      {current && (
        <>
          <span aria-hidden className="hidden md:inline text-border-strong text-xl font-light select-none">/</span>
          <WorkspaceSwitcher current={current} workspaces={workspaces} />
          <WorkspaceSearch slug={current.slug} />
        </>
      )}
      {!current && <div className="flex-1" />}
      {current && <div className="flex-1 lg:hidden" />}

      <div className="flex items-center gap-1 shrink-0">
        <Link
          href="/docs"
          aria-label="Help and docs"
          className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center text-muted hover:text-fg hover:bg-panel transition-colors"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </Link>
        <NotificationBell />
        <UserMenu user={{ name: user.name, email: user.email, image: user.image }} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
