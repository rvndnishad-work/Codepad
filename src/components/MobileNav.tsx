"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  BookOpen,
  CreditCard,
  Code2,
  Box,
  Target,
  Briefcase,
  Building2,
  Sparkles,
  Bug,
  Store,
  Compass,
  Map,
  Video,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import LogoDynamic from "./LogoDynamic";
import type { NavStatus } from "@/lib/settings-constants";

/** Icon names are passed across the RSC boundary as strings. See NavDropdown for rationale. */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Box,
  Target,
  Briefcase,
  Building2,
  Sparkles,
  BookOpen,
  CreditCard,
  Code2,
  Bug,
  Store,
  Compass,
  Map,
  Video,
  ShieldCheck,
};

export type MobileNavItem = {
  href: string;
  label: string;
  description?: string;
  iconName: string;
  category?: string;
  badge?: string;
  /** Retained for callers; the sheet no longer tints per item. */
  tint?: string;
  /** When set to "coming_soon", the item renders muted and is non-interactive. */
  status?: "visible" | "coming_soon";
};

type Props = {
  signedIn: boolean;
  isAdmin: boolean;
  developerItems: MobileNavItem[];
  recruiterItems: MobileNavItem[];
  blogStatus?: NavStatus;
  devsMenuStatus?: NavStatus;
  recruitersMenuStatus?: NavStatus;
};

/**
 * The mobile sheet is the command panel folded onto one column: full-bleed,
 * square, hairline-ruled. Group headers are the same monospaced rail labels
 * used on desktop, so the two navigations read as one system rather than two
 * designs that happen to link to the same places.
 */
export default function MobileNav({
  signedIn,
  isAdmin,
  developerItems,
  recruiterItems,
  blogStatus,
  devsMenuStatus,
  recruitersMenuStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<"devs" | "recruiters" | null>(null);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Outside-click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-expand the group containing the active route so a user landing on
  // /playgrounds sees Developer items already open.
  useEffect(() => {
    if (!open) return;
    if (developerItems.some((i) => matchesActive(pathname, i.href))) {
      setOpenGroup("devs");
    } else if (recruiterItems.some((i) => matchesActive(pathname, i.href))) {
      setOpenGroup("recruiters");
    }
  }, [open, pathname, developerItems, recruiterItems]);

  const isRecruiterRoute = pathname?.startsWith("/hire") || pathname?.startsWith("/w");

  return (
    <>
      <div className="flex items-center gap-2.5 md:hidden">
        {/* Dedicated architectural hamburger toggle */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="mobile-menu-btn flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-fg transition-all hover:bg-panel focus-visible:outline-none"
        >
          {open ? (
            <X className="h-4 w-4" />
          ) : (
            <div className="flex flex-col gap-1 w-3.5" aria-hidden>
              <span className="h-0.5 w-full bg-current" />
              <span className="h-0.5 w-2/3 bg-current" />
            </div>
          )}
        </button>

        {/* Logo links directly to home */}
        <Link
          href={isAdmin ? "/admin" : "/"}
          className="flex items-center group shrink-0"
        >
          <LogoDynamic
            compact
            tone={isRecruiterRoute ? "secondary" : "accent"}
          />
        </Link>
      </div>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="animate-fade-in absolute left-3 right-3 top-[calc(100%+8px)] z-50 overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)] md:hidden max-h-[calc(100vh-5rem)] overflow-y-auto"
        >
          <nav className="mx-auto max-w-7xl p-2">
            {(devsMenuStatus !== "hidden" || isAdmin) && (developerItems.length > 0 || isAdmin) && (
              <MobileGroup
                title={devsMenuStatus === "hidden" && isAdmin ? "For practising (Hidden)" : "For practising"}
                items={developerItems}
                expanded={openGroup === "devs"}
                onToggle={() => setOpenGroup((g) => (g === "devs" ? null : "devs"))}
                pathname={pathname}
              />
            )}
            {(recruitersMenuStatus !== "hidden" || isAdmin) && (recruiterItems.length > 0 || isAdmin) && (
              <MobileGroup
                title={recruitersMenuStatus === "hidden" && isAdmin ? "For hiring (Hidden)" : "For hiring"}
                items={recruiterItems}
                expanded={openGroup === "recruiters"}
                onToggle={() => setOpenGroup((g) => (g === "recruiters" ? null : "recruiters"))}
                pathname={pathname}
                tone="secondary"
              />
            )}

            {/* Flat items below — audience-neutral */}
            {blogStatus !== "hidden" && (
              <FlatLink
                href={blogStatus === "coming_soon" ? "/coming-soon?feature=Blog" : "/blog"}
                label="Blog"
                active={pathname.startsWith("/blog")}
                status={blogStatus}
              />
            )}
            {isAdmin && (
              <FlatLink
                href="/admin"
                label="Admin"
                icon={Shield}
                active={pathname.startsWith("/admin")}
              />
            )}

            {/* Auth nudge for visitors so they don't get stuck. */}
            {!signedIn && (
              <div className="p-2 pt-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-gradient-to-r from-[#8b93ff] via-[#ff2fb3] to-[#22d3ee] bg-[length:180%_100%] bg-left px-5 py-3 text-center text-sm font-bold text-white transition-all duration-300 hover:bg-right active:translate-y-px"
                >
                  Sign in
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

function MobileGroup({
  title,
  items,
  expanded,
  onToggle,
  pathname,
  tone = "accent",
}: {
  title: string;
  items: MobileNavItem[];
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
  tone?: "accent" | "secondary";
}) {
  const groupActive = items.some((i) => matchesActive(pathname, i.href));
  const labelTone = tone === "secondary" ? "ip-label-secondary" : "ip-label-accent";
  const markerBg = tone === "secondary" ? "bg-secondary" : "bg-accent";

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean))
  ) as string[];

  function renderMobileItem(item: MobileNavItem) {
    const Icon = ICON_MAP[item.iconName] ?? Code2;
    const isComingSoon = item.status === "coming_soon";
    const active = !isComingSoon && matchesActive(pathname, item.href);

    const body = (
      <>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tone === "secondary" ? "from-[#6366f1]/25 to-[#22d3ee]/15 text-[#a5b4fc]" : "from-[#ff2fb3]/25 to-[#8b93ff]/20 text-[#ff8ac2]"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold text-fg">{item.label}</span>
            {isComingSoon ? (
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500">Soon</span>
            ) : item.badge ? (
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
                  item.badge === "Hidden" ? "text-rose-400" : labelTone
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </span>
          {item.description && (
            <span className="mt-0.5 block truncate text-[12px] leading-snug text-subtle">
              {item.description}
            </span>
          )}
        </span>
      </>
    );

    if (isComingSoon) {
      return (
        <div
          key={item.label}
          className="flex select-none items-center gap-3 rounded-2xl px-3 py-2.5 opacity-45"
        >
          {body}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        role="menuitem"
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-panel ${
          active ? "bg-panel ring-1 ring-inset ring-border" : ""
        }`}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-panel ${
          expanded ? "bg-panel/60" : ""
        }`}
      >
        <span className={`font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${expanded || groupActive ? labelTone : "text-muted"}`}>{title}</span>
        <span
          aria-hidden
          className={`grid h-6 w-6 place-items-center rounded-full border border-border text-muted transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <span className="block h-[5px] w-[5px] -translate-y-[1px] rotate-45 border-b border-r border-current" />
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-0.5 px-1 pb-2">
          {categories.length > 0
            ? categories.map((cat) => (
                <div key={cat} className="flex flex-col">
                  <div className="flex items-center gap-2 px-3 pb-1 pt-2">
                    <span className={`h-1 w-1 rounded-full ${markerBg}`} aria-hidden />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">{cat}</span>
                  </div>
                  {items.filter((i) => i.category === cat).map(renderMobileItem)}
                </div>
              ))
            : items.map(renderMobileItem)}
        </div>
      )}
    </div>
  );
}

function FlatLink({
  href,
  label,
  icon: Icon,
  active,
  status,
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active: boolean;
  status?: NavStatus;
}) {
  const isComingSoon = status === "coming_soon";
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-[13.5px] font-semibold transition-colors hover:bg-panel ${
        active ? "bg-panel ring-1 ring-inset ring-border" : isComingSoon ? "text-subtle" : "text-fg"
      }`}
    >
      <span className="flex items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 text-subtle" />}
        {label}
      </span>
      {isComingSoon && (
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500">Soon</span>
      )}
    </Link>
  );
}

function matchesActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
