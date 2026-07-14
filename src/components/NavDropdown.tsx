"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
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
  Bug,
  Store,
};

/**
 * Per-product icon-tile tints (static class strings — Tailwind JIT needs the
 * full literal). Each nav item gets its own color identity so the menu reads
 * as a product suite instead of a gray list.
 */
export const NAV_TINTS: Record<string, string> = {
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const FALLBACK_TINT = "bg-elevated/60 text-muted border-border";

// useLayoutEffect warns during SSR; this client component is still
// server-rendered by Next, so fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type IconKey = keyof typeof ICON_MAP;

export type NavDropdownItem = {
  href: string;
  label: string;
  description?: string;
  iconName: IconKey;
  /** Optional small accent shown next to the label, e.g. "New" or "Beta". */
  badge?: string;
  /** Color identity for the icon tile — a key of NAV_TINTS. */
  tint?: string;
  /** When set to "coming_soon", the item renders muted with a badge and is non-interactive. */
  status?: "visible" | "coming_soon";
};

type Props = {
  label: string;
  items: NavDropdownItem[];
  /** Micro section label rendered at the top of the panel, e.g. "Build & practice". */
  kicker?: string;
  /** href of the item to pull out of the list into a gradient spotlight card. */
  featuredHref?: string;
};

function Badge({ text }: { text: string }) {
  const toneClass =
    text === "Hidden"
      ? "bg-rose-500/10 text-rose-500 dark:text-rose-400"
      : text === "Coming Soon" || text === "Soon"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider font-black ${toneClass}`}>
      {text}
    </span>
  );
}

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
export default function NavDropdown({ label, items, kicker, featuredHref }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeTimerRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Hrefs that are generic redirects (not the item's true destination) should
  // never trigger active highlighting — e.g. unauthenticated recruiters land
  // on /pricing but that doesn't mean "Workspaces" is the active page.
  const GENERIC_REDIRECTS = ["/pricing", "/login", "/w/create"];
  const isRealDestination = (href: string) =>
    !GENERIC_REDIRECTS.some((r) => href === r || href.startsWith(`${r}?`));

  const isItemActive = (item: NavDropdownItem) =>
    item.status !== "coming_soon" &&
    isRealDestination(item.href) &&
    (item.href === pathname ||
      (item.href !== "/" && pathname.startsWith(`${item.href}/`)));

  // Whether one of the items in this group is currently the active route —
  // used to highlight the trigger button.
  const isGroupActive = items.some(isItemActive);

  // The spotlight card only claims an item that's actually clickable; if the
  // featured item is hidden or coming-soon it stays in the plain list.
  const featuredItem = featuredHref
    ? items.find((i) => i.href === featuredHref && i.status !== "coming_soon")
    : undefined;
  const listItems = featuredItem ? items.filter((i) => i !== featuredItem) : items;

  // Close on route change (Link click) — pathname change is the cleanest signal.
  // Syncing menu state to the router (an external system) is a valid effect use.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Keep the panel within the viewport. The trigger lives on the right side of
  // the header, so a left-aligned fixed-width panel would overflow off-screen
  // and get clipped. On open (and on resize) we measure the panel's natural
  // width against the available space, clamp the width, then shift it left so
  // its right edge never crosses the viewport edge.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const wrapper = wrapperRef.current;
      const panel = panelRef.current;
      if (!wrapper || !panel) return;
      const margin = 8; // breathing room from the viewport edge
      const vw = document.documentElement.clientWidth;
      // Clear any previous clamp so we read the panel's natural width.
      panel.style.maxWidth = "";
      const naturalWidth = panel.offsetWidth;
      const width = Math.min(naturalWidth, vw - margin * 2);
      const wrapperLeft = wrapper.getBoundingClientRect().left;
      // Left-align to the trigger by default, then pull left if we'd overflow.
      let left = 0;
      if (wrapperLeft + width > vw - margin) {
        left = vw - margin - width - wrapperLeft;
      }
      // Never push past the left viewport edge.
      const minLeft = margin - wrapperLeft;
      if (left < minLeft) left = minLeft;
      panel.style.maxWidth = `${width}px`;
      panel.style.left = `${left}px`;
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [open]);

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

  function renderItem(item: NavDropdownItem) {
    const Icon = ICON_MAP[item.iconName] ?? Code2;
    const isComingSoon = item.status === "coming_soon";
    const active = isItemActive(item);
    const tintClass = (item.tint && NAV_TINTS[item.tint]) || FALLBACK_TINT;

    const content = (
      <>
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/item:scale-105 ${
            isComingSoon ? "bg-amber-500/10 text-amber-400/60 border-amber-500/15" : tintClass
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{item.label}</span>
            {isComingSoon ? <Badge text="Coming Soon" /> : item.badge ? <Badge text={item.badge} /> : null}
          </div>
          {item.description && (
            <div className="text-[11.5px] text-muted/80 mt-0.5 leading-relaxed">
              {item.description}
            </div>
          )}
        </div>
        {!isComingSoon && (
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0 self-center text-muted opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200" />
        )}
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
        className={`group/item flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 ${
          active ? "bg-elevated text-fg" : "text-fg/85 hover:bg-elevated hover:text-fg"
        }`}
      >
        {content}
      </Link>
    );
  }

  const FeaturedIcon = featuredItem ? ICON_MAP[featuredItem.iconName] ?? Code2 : null;

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
        className={`flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-all duration-200 ${
          open
            ? "bg-elevated text-fg"
            : isGroupActive
              ? "text-fg hover:bg-elevated/60"
              : "text-fg/60 hover:text-fg hover:bg-elevated/60"
        }`}
      >
        {isGroupActive && <span className="w-1 h-1 rounded-full bg-accent" aria-hidden />}
        <span>{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          // `left` is set imperatively by the reposition effect; left-0 is the
          // pre-measure default so there's no flash before it runs.
          // The pt-2 is the invisible hover bridge between button and panel.
          className={`absolute top-full left-0 pt-2 z-50 ${
            featuredItem ? "w-[620px]" : listItems.length >= 4 ? "w-[640px]" : "min-w-[330px]"
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-border bg-surface shadow-2xl backdrop-blur-md overflow-hidden p-2"
          >
            {kicker && (
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted/70">
                {kicker}
              </div>
            )}

            <div className={featuredItem ? "flex gap-2" : ""}>
              {/* Item list — two columns only when long and there's no spotlight */}
              <div
                className={
                  featuredItem
                    ? "flex-1 min-w-0 flex flex-col gap-0.5"
                    : listItems.length >= 4
                      ? "grid grid-cols-2 gap-1"
                      : "flex flex-col gap-0.5"
                }
              >
                {listItems.map(renderItem)}
              </div>

              {/* Spotlight card — gradient tile promoting the featured item */}
              {featuredItem && FeaturedIcon && (
                <Link
                  href={featuredItem.href}
                  role="menuitem"
                  className="group/feat relative w-[220px] shrink-0 rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.14] via-accent/[0.05] to-transparent p-4 flex flex-col overflow-hidden transition-colors duration-200 hover:border-accent/40"
                >
                  <div
                    aria-hidden
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/20 blur-2xl opacity-60 group-hover/feat:opacity-100 transition-opacity duration-300"
                  />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl border border-accent/25 bg-accent/10 text-accent flex items-center justify-center group-hover/feat:scale-105 transition-transform duration-200">
                      <FeaturedIcon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className="text-sm font-bold text-fg">{featuredItem.label}</span>
                      {featuredItem.badge && <Badge text={featuredItem.badge} />}
                    </div>
                    {featuredItem.description && (
                      <p className="text-[11.5px] text-muted mt-1 leading-relaxed">
                        {featuredItem.description}
                      </p>
                    )}
                  </div>
                  <span className="relative mt-auto pt-4 inline-flex items-center gap-1 text-xs font-bold text-accent">
                    Explore
                    <ArrowRight className="w-3.5 h-3.5 group-hover/feat:translate-x-0.5 transition-transform duration-200" />
                  </span>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
