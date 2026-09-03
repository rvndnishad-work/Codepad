"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  Compass,
  Map,
  Video,
  ShieldCheck,
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
  Code2,
  Bug,
  Store,
  Compass,
  Map,
  Video,
  ShieldCheck,
};

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
  /** Grouping category (e.g. "Practice & Code", "Knowledge & Prep", "AI Skills"). */
  category?: string;
  /** Optional small mono marker next to the label, e.g. "New" or "Beta". */
  badge?: string;
  /** Retained for callers; the command panel no longer tints per item. */
  tint?: string;
  /** When set to "coming_soon", the item renders muted and is non-interactive. */
  status?: "visible" | "coming_soon";
};

type Props = {
  label: string;
  items: NavDropdownItem[];
  /** Vertical rail heading, e.g. "For practising". */
  railTitle?: string;
  /** One sentence of context under the rail heading. */
  railBlurb?: string;
  /** Optional destination pinned to the bottom of the rail. */
  railHref?: string;
  railHrefLabel?: string;
  tone?: "accent" | "secondary";
};

/**
 * A COMMAND PANEL, not a mega menu.
 *
 * The old version was the shape every AI-drafted nav lands on: a rounded,
 * blurred, shadowed sheet full of rounded tiles with coloured icon chips. This
 * is built the other way round —
 *
 *   • a square sheet with one hard edge and a single hard drop, so it reads as
 *     paper placed on the page rather than glass floating above it;
 *   • a LEFT RAIL that names the audience ("FOR PRACTISING") and gives it one
 *     sentence of context plus a single onward destination;
 *   • a RIGHT COLUMN of destinations separated by hairlines, with no card
 *     around any of them. Hover draws an accent rule down the left edge of the
 *     row instead of lighting up a rounded rectangle;
 *   • a FOOTER STRIP carrying the count as monospaced metadata.
 *
 * Interaction is unchanged: hover on desktop, click/Enter/Escape everywhere,
 * with a grace window so the pointer can cross from trigger to panel.
 */
export default function NavDropdown({
  label,
  items,
  railTitle,
  railBlurb,
  railHref,
  railHrefLabel,
  tone = "accent",
}: Props) {
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

  const isGroupActive = items.some(isItemActive);

  // Two columns once the list is long enough that a single column would run
  // past a laptop viewport. Below that, one column reads better.
  const twoUp = items.length >= 5;

  // Close on route change (Link click) — pathname change is the cleanest signal.
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

  const accentText = tone === "secondary" ? "ip-label-secondary" : "ip-label-accent";
  const markerBg = tone === "secondary" ? "bg-secondary" : "bg-accent";
  const rowTone = tone === "secondary" ? "ip-row-secondary" : "";

  // Distinct category groupings if specified on items
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean))
  ) as string[];
  const hasCategories = categories.length > 0;

  function renderCategorizedItem(item: NavDropdownItem, index: number) {
    const Icon = ICON_MAP[item.iconName] ?? Code2;
    const isComingSoon = item.status === "coming_soon";
    const active = isItemActive(item);

    const body = (
      <>
        <Icon
          className={`mt-[2px] h-4 w-4 shrink-0 transition-colors duration-150 ${
            active
              ? tone === "secondary"
                ? "text-secondary"
                : "text-accent"
              : "text-subtle group-hover/item:text-fg"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[13px] font-semibold leading-tight text-fg">
              {item.label}
            </span>
            {isComingSoon ? (
              <span className="ip-label ip-label-xs text-amber-600 dark:text-amber-400">Soon</span>
            ) : item.badge ? (
              <span
                className={`ip-label ip-label-xs ${
                  item.badge === "Hidden" ? "text-rose-600 dark:text-rose-400" : accentText
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </span>
          {item.description && (
            <span className="mt-0.5 block text-[11px] leading-snug text-subtle">
              {item.description}
            </span>
          )}
        </span>
        {!isComingSoon && (
          <ArrowRight className="ip-arrow mt-[2px] h-3.5 w-3.5 shrink-0 text-subtle opacity-0 transition-opacity duration-150 group-hover/item:opacity-100" />
        )}
      </>
    );

    if (isComingSoon) {
      return (
        <div
          key={item.label}
          className="flex select-none items-start gap-2.5 border-b border-border px-4 py-2.5 opacity-45 last:border-b-0"
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
        className={`ip-row ${rowTone} group/item flex items-start gap-2.5 border-b border-border px-4 py-2.5 last:border-b-0 ${
          active ? "bg-panel" : ""
        }`}
      >
        {active && (
          <span aria-hidden className={`absolute inset-y-[-1px] left-0 w-[2px] ${markerBg}`} />
        )}
        {body}
      </Link>
    );
  }

  function renderItem(item: NavDropdownItem, index: number) {
    const Icon = ICON_MAP[item.iconName] ?? Code2;
    const isComingSoon = item.status === "coming_soon";
    const active = isItemActive(item);
    // In two-column mode the second item of each pair carries the vertical
    // rule, so the grid is ruled rather than gapped.
    const colRule = twoUp && index % 2 === 1 ? "md:border-l md:border-border" : "";
    // The rows in the first band sit flush against the panel's own top edge —
    // their rule would double it up.
    const topRule = index < (twoUp ? 2 : 1) ? "border-t-0 md:border-t-0" : "";

    const body = (
      <>
        <Icon
          className={`mt-[3px] h-4 w-4 shrink-0 transition-colors duration-150 ${
            active ? (tone === "secondary" ? "text-secondary" : "text-accent") : "text-subtle"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold leading-tight text-fg">
              {item.label}
            </span>
            {isComingSoon ? (
              <span className="ip-label ip-label-xs text-amber-600 dark:text-amber-400">Soon</span>
            ) : item.badge ? (
              <span
                className={`ip-label ip-label-xs ${
                  item.badge === "Hidden" ? "text-rose-600 dark:text-rose-400" : accentText
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </span>
          {item.description && (
            <span className="mt-1 block text-[11.5px] leading-snug text-subtle">
              {item.description}
            </span>
          )}
        </span>
        {!isComingSoon && (
          <ArrowRight className="ip-arrow mt-[3px] h-3.5 w-3.5 shrink-0 text-subtle opacity-0 transition-opacity duration-150 group-hover/item:opacity-100" />
        )}
      </>
    );

    if (isComingSoon) {
      return (
        <div
          key={item.label}
          className={`flex select-none items-start gap-3 border-t border-border px-5 py-3.5 opacity-45 ${colRule} ${topRule}`}
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
        className={`ip-row ${rowTone} group/item flex items-start gap-3 px-5 py-3.5 ${colRule} ${topRule} ${
          active ? "bg-panel" : ""
        }`}
      >
        {active && (
          <span aria-hidden className={`absolute inset-y-[-1px] left-0 w-[2px] ${markerBg}`} />
        )}
        {body}
      </Link>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex h-full items-center"
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
        className={`group relative flex h-16 items-center gap-2 px-3.5 text-[13px] font-medium tracking-[-0.005em] transition-colors duration-150 ${
          open || isGroupActive ? "text-fg" : "text-muted hover:text-fg"
        }`}
      >
        <span>{label}</span>
        {/* A caret that rotates a quarter turn — a disclosure marker, not a
            chevron icon sitting inside a pill. */}
        <span
          aria-hidden
          className={`h-[5px] w-[5px] border-b border-r border-current transition-transform duration-200 ${
            open ? "-translate-y-px rotate-[225deg]" : "-translate-y-[2px] rotate-45"
          }`}
        />
        <span
          aria-hidden
          className={`absolute inset-x-2.5 -bottom-px h-px origin-left transition-transform duration-200 ease-out ${markerBg} ${
            open || isGroupActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
          }`}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className={`absolute left-0 top-full z-50 ${hasCategories || twoUp ? "w-[43rem]" : "w-[32rem]"}`}
        >
          {/* Flush-docked architectural command panel with corner ticks */}
          <div
            className={`ip-frame -mt-px shadow-panel animate-fade-in overflow-hidden ${
              tone === "secondary" ? "ip-ticks-secondary" : "ip-ticks"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-[12.5rem_1fr]">
              {/* ── The rail: who this menu is for ── */}
              <div className="flex flex-col justify-between gap-6 border-b border-border bg-panel/60 p-5 sm:border-b-0 sm:border-r">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 ${markerBg}`} aria-hidden />
                    <span className={`ip-label ${accentText}`}>{railTitle ?? label}</span>
                  </div>
                  {railBlurb && (
                    <p className="mt-3 text-[12px] leading-relaxed text-muted">{railBlurb}</p>
                  )}
                </div>
                {railHref && railHrefLabel && (
                  <Link
                    href={railHref}
                    role="menuitem"
                    className="ip-link self-start text-[12px] font-medium"
                  >
                    {railHrefLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {/* ── The destinations ── */}
              {hasCategories ? (
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  {categories.map((cat) => {
                    const catItems = items.filter((i) => i.category === cat);
                    return (
                      <div key={cat} className="flex flex-col">
                        <div className="flex items-center gap-2 border-b border-border bg-panel/40 px-4 py-2">
                          <span className={`h-1.5 w-1.5 ${markerBg}`} aria-hidden />
                          <span className="ip-label ip-label-xs text-subtle">{cat}</span>
                        </div>
                        <div className="flex flex-col">
                          {catItems.map((item, idx) => renderCategorizedItem(item, idx))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={twoUp ? "grid grid-cols-1 md:grid-cols-2" : "flex flex-col"}>
                  {items.map(renderItem)}
                </div>
              )}
            </div>

            {/* ── Footer strip: the panel states its own size, in mono ── */}
            <div className="flex items-center justify-between border-t border-border bg-surface px-5 py-2.5">
              <span className="ip-label ip-label-xs text-subtle">
                {String(items.length).padStart(2, "0")} destinations · {tone === "secondary" ? "Recruiter suite" : "Interview runtime"}
              </span>
              <span className="flex items-center gap-2" aria-hidden>
                <span className={`h-1.5 w-1.5 ${markerBg}`} />
                <span className="h-px w-6 bg-border" />
                <span className="h-1.5 w-1.5 border border-border-strong" />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
