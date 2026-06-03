"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Shield,
  BookOpen,
  CreditCard,
  Code2,
  Box,
  Target,
  Briefcase,
  Building2,
  Sparkles,
} from "lucide-react";
import { LogoMark } from "./Logo";

/** Icon names are passed across the RSC boundary as strings. See NavDropdown for rationale. */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Box,
  Target,
  Briefcase,
  Building2,
  Sparkles,
  BookOpen,
  CreditCard,
};

export type MobileNavItem = {
  href: string;
  label: string;
  description?: string;
  iconName: string;
  badge?: string;
};

type Props = {
  signedIn: boolean;
  isAdmin: boolean;
  developerItems: MobileNavItem[];
  recruiterItems: MobileNavItem[];
};

export default function MobileNav({
  signedIn,
  isAdmin,
  developerItems,
  recruiterItems,
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
        className="md:hidden flex items-center gap-2.5 group rounded-lg -m-1 p-1 hover:bg-elevated/60 transition-colors"
      >
        <LogoMark size={32} className="drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.35)]" />
        <span className="font-extrabold text-lg tracking-tight text-fg leading-none">
          Interview<span className="text-accent font-medium">pad</span>
          <span className="text-fg/30 font-normal text-sm">.in</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="md:hidden absolute left-0 right-0 top-full mt-px bg-surface border-b border-border shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            <MobileGroup
              title="For Developers"
              items={developerItems}
              expanded={openGroup === "devs"}
              onToggle={() => setOpenGroup((g) => (g === "devs" ? null : "devs"))}
              pathname={pathname}
            />
            <MobileGroup
              title="For Recruiters"
              items={recruiterItems}
              expanded={openGroup === "recruiters"}
              onToggle={() =>
                setOpenGroup((g) => (g === "recruiters" ? null : "recruiters"))
              }
              pathname={pathname}
            />

            {/* Flat items below — audience-neutral */}
            <FlatLink
              href="/blog"
              label="Blog"
              icon={BookOpen}
              active={pathname.startsWith("/blog")}
            />
            <FlatLink
              href="/pricing"
              label="Pricing"
              icon={CreditCard}
              active={pathname.startsWith("/pricing")}
            />
            {isAdmin && (
              <FlatLink
                href="/admin"
                label="Admin"
                icon={Shield}
                active={pathname.startsWith("/admin")}
                tone="accent"
              />
            )}

            {/* Auth nudge for visitors so they don't get stuck. */}
            {!signedIn && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center px-3 py-3 rounded-xl bg-fg text-bg text-sm font-bold transition-colors hover:bg-fg/90"
              >
                Sign in
              </Link>
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
}: {
  title: string;
  items: MobileNavItem[];
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const groupActive = items.some((i) => matchesActive(pathname, i.href));
  return (
    <div className="rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-colors ${
          expanded || groupActive
            ? "bg-elevated text-fg"
            : "text-fg/70 hover:bg-elevated hover:text-fg"
        }`}
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="pl-2 pr-1 pt-1 pb-2 flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = ICON_MAP[item.iconName] ?? Code2;
            const active = matchesActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-fg/80 hover:bg-elevated hover:text-fg"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    active ? "bg-accent/15 text-accent" : "bg-elevated/60 text-muted"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <div className="text-[10px] text-muted/80 mt-0.5 leading-snug">
                      {item.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
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
  tone,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  tone?: "accent";
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        active
          ? tone === "accent"
            ? "bg-accent/10 text-accent"
            : "bg-elevated text-fg"
          : "text-fg/70 hover:bg-elevated hover:text-fg"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

function matchesActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
