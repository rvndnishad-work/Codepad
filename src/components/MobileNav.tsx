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
import { LogoLockup } from "./Logo";
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
  pricingStatus?: NavStatus;
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
  pricingStatus,
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
          className="flex h-9 w-9 items-center justify-center border border-border bg-surface text-fg transition-colors hover:bg-panel focus-visible:outline-none"
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
          <LogoLockup
            height={38}
            tone={isRecruiterRoute ? "secondary" : "accent"}
          />
        </Link>
      </div>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="animate-fade-in absolute left-0 right-0 top-full mt-px border-b border-border-strong bg-surface ip-panel-float md:hidden max-h-[calc(100vh-4.5rem)] overflow-y-auto"
        >
          <nav className="mx-auto max-w-7xl">
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
            {pricingStatus !== "hidden" && (
              <FlatLink
                href={pricingStatus === "coming_soon" ? "/coming-soon?feature=Pricing" : "/pricing"}
                label="Pricing"
                active={pathname.startsWith("/pricing")}
                status={pricingStatus}
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
              <div className="border-t border-border p-4">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="ip-btn ip-btn-primary w-full"
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
        <Icon
          className={`mt-[3px] h-4 w-4 shrink-0 ${
            active ? (tone === "secondary" ? "text-secondary" : "text-accent") : "text-subtle"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold text-fg">{item.label}</span>
            {isComingSoon ? (
              <span className="ip-label ip-label-xs text-amber-600 dark:text-amber-400">Soon</span>
            ) : item.badge ? (
              <span
                className={`ip-label ip-label-xs ${
                  item.badge === "Hidden" ? "text-rose-600 dark:text-rose-400" : labelTone
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </span>
          {item.description && (
            <span className="mt-0.5 block text-[11.5px] leading-snug text-subtle">
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
          className="flex select-none items-start gap-3 border-t border-border px-4 py-3 pl-6 opacity-45"
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
        className="relative flex items-start gap-3 border-t border-border px-4 py-3 pl-6"
      >
        {active && (
          <span aria-hidden className={`absolute inset-y-0 left-0 w-[2px] ${markerBg}`} />
        )}
        {body}
      </Link>
    );
  }

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <span className={`ip-label ${expanded || groupActive ? labelTone : ""}`}>{title}</span>
        <span
          aria-hidden
          className={`h-[5px] w-[5px] border-b border-r border-muted transition-transform duration-200 ${
            expanded ? "-translate-y-px rotate-[225deg]" : "-translate-y-[2px] rotate-45"
          }`}
        />
      </button>

      {expanded && (
        <div className="flex flex-col bg-panel/50">
          {categories.length > 0
            ? categories.map((cat) => (
                <div key={cat} className="flex flex-col">
                  <div className="flex items-center gap-2 border-t border-border bg-panel/75 px-4 py-1.5 pl-6">
                    <span className={`h-1 w-1 ${markerBg}`} aria-hidden />
                    <span className="ip-label ip-label-xs text-subtle">{cat}</span>
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
      className={`relative flex items-center justify-between border-t border-border px-4 py-4 text-[13.5px] font-semibold ${
        isComingSoon ? "text-subtle" : "text-fg"
      }`}
    >
      {active && <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-accent" />}
      <span className="flex items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 text-subtle" />}
        {label}
      </span>
      {isComingSoon && (
        <span className="ip-label ip-label-xs text-amber-600 dark:text-amber-400">Soon</span>
      )}
    </Link>
  );
}

function matchesActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
