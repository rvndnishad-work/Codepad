"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Box,
  Target,
  Briefcase,
  Building2,
  Sparkles,
  BookOpen,
  CreditCard,
  Code2,
} from "lucide-react";

/**
 * Icon name → component map. Server (Header.tsx) passes icon as a string key
 * because React function components can't cross the RSC server → client
 * boundary as props. Add a new icon here when you introduce one in nav data.
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Box,
  Target,
  Briefcase,
  Building2,
  Sparkles,
  BookOpen,
  CreditCard,
};

export type IconKey = keyof typeof ICON_MAP;

export type NavDropdownItem = {
  href: string;
  label: string;
  description?: string;
  iconName: IconKey;
  /** Optional small accent shown next to the label, e.g. "New" or "Beta". */
  badge?: string;
  /** When set to "coming_soon", the item renders muted with a badge and is non-interactive. */
  status?: "visible" | "coming_soon";
};

type Props = {
  label: string;
  items: NavDropdownItem[];
};

/**
 * Hover-on-desktop, click-on-touch dropdown for navbar groupings.
 *
 * Why both interactions: hover-only menus are inaccessible to keyboard users
 * and touch devices. We open on `mouseenter` for fast desktop discovery, and
 * also bind click + Enter/Space + Escape for everyone else. Outside-click
 * closes via a document-level listener that's only attached while open.
 *
 * The popover is positioned absolutely below the trigger and uses a small
 * invisible "hover bridge" so the user can swipe from button to panel without
 * the menu snapping shut mid-traverse.
 */
export default function NavDropdown({ label, items }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeTimerRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Hrefs that are generic redirects (not the item's true destination) should
  // never trigger active highlighting — e.g. unauthenticated recruiters land
  // on /pricing but that doesn't mean "Workspaces" is the active page.
  const GENERIC_REDIRECTS = ["/pricing", "/login", "/w/create"];
  const isRealDestination = (href: string) =>
    !GENERIC_REDIRECTS.some((r) => href === r || href.startsWith(`${r}?`));

  // Whether one of the items in this group is currently the active route —
  // used to highlight the trigger button.
  const isGroupActive = items.some(
    (item) =>
      isRealDestination(item.href) &&
      (item.href === pathname ||
        (item.href !== "/" && pathname.startsWith(`${item.href}/`)))
  );

  // Close on route change (Link click) — pathname change is the cleanest signal.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapperRef.current?.contains(e.target as Node)) return;
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

  // Small grace window when crossing from button to panel so the menu doesn't
  // snap shut if the pointer briefly leaves the bounding box.
  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative h-full flex items-center"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 h-full px-1 text-sm font-medium transition-colors ${
          isGroupActive || open ? "text-fg" : "text-fg/50 hover:text-fg"
        }`}
      >
        <span>{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 pt-2 z-50 min-w-[280px]"
          // The wrapper pads itself above so there's no dead gap between the
          // button and the panel — hover bridge.
        >
          <div className="rounded-2xl border border-border bg-surface shadow-2xl backdrop-blur-md overflow-hidden p-1.5">
            {items.map((item) => {
              const Icon = ICON_MAP[item.iconName] ?? Code2;
              const isComingSoon = item.status === "coming_soon";
              const active =
                !isComingSoon &&
                isRealDestination(item.href) &&
                (item.href === pathname ||
                  (item.href !== "/" && pathname.startsWith(`${item.href}/`)));

              const content = (
                <>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isComingSoon
                        ? "bg-amber-500/10 text-amber-400/60"
                        : active
                          ? "bg-accent/15 text-accent"
                          : "bg-elevated/50 text-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{item.label}</span>
                      {isComingSoon ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Coming Soon
                        </span>
                      ) : item.badge ? (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-black border ${
                          item.badge === "Hidden"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    {item.description && (
                      <div className="text-[11px] text-muted/80 mt-0.5 leading-snug">
                        {item.description}
                      </div>
                    )}
                  </div>
                </>
              );

              if (isComingSoon) {
                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl opacity-50 cursor-not-allowed select-none"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    active
                      ? "bg-elevated text-fg"
                      : "text-fg/80 hover:bg-elevated hover:text-fg"
                  }`}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
