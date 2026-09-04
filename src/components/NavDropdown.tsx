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
 * A WOW MENU — glass panel, icon tiles, pill trigger.
 *
 * Same interaction contract as before (hover/click/Enter/Escape, grace
 * window, viewport clamping, route-change close), reskinned: the trigger is
 * a pill riding the bar's --nav-* vars, the panel is a rounded glass sheet
 * with gradient icon tiles instead of hairline rows.
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

  const accentText = tone === "secondary" ? "text-[#8b93ff]" : "text-[#ff2fb3]";
  const tileGradient =
    tone === "secondary"
      ? "from-[#6366f1]/25 to-[#22d3ee]/15 text-[#a5b4fc]"
      : "from-[#ff2fb3]/25 to-[#8b93ff]/20 text-[#ff8ac2]";

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
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tileGradient}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[13px] font-semibold leading-tight text-fg">
              {item.label}
            </span>
            {isComingSoon ? (
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500">Soon</span>
            ) : item.badge ? (
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
                  item.badge === "Hidden" ? "text-rose-400" : accentText
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </span>
          {item.description && (
            <span className="mt-0.5 block text-[12px] leading-snug text-subtle">
              {item.description}
            </span>
          )}
        </span>
        {!isComingSoon && (
          <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-subtle opacity-0 transition-all duration-150 group-hover/item:translate-x-0.5 group-hover/item:opacity-100" />
        )}
      </>
    );

    if (isComingSoon) {
      return (
        <div
          key={item.label}
          className="flex select-none items-start gap-3 rounded-xl px-3 py-2.5 opacity-45"
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
        className={`nav-tile group/item flex items-start gap-3 rounded-xl px-3 py-2.5 ${
          active ? "bg-panel ring-1 ring-inset ring-border" : ""
        }`}
      >
        {body}
      </Link>
    );
  }

  function renderItem(item: NavDropdownItem, index: number) {
    const Icon = ICON_MAP[item.iconName] ?? Code2;
    const isComingSoon = item.status === "coming_soon";
    const active = isItemActive(item);

    const body = (
      <>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tileGradient}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold leading-tight text-fg">
              {item.label}
            </span>
            {isComingSoon ? (
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500">Soon</span>
            ) : item.badge ? (
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
                  item.badge === "Hidden" ? "text-rose-400" : accentText
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </span>
          {item.description && (
            <span className="mt-1 block text-[12px] leading-snug text-subtle">
              {item.description}
            </span>
          )}
        </span>
        {!isComingSoon && (
          <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-subtle opacity-0 transition-all duration-150 group-hover/item:translate-x-0.5 group-hover/item:opacity-100" />
        )}
      </>
    );

    if (isComingSoon) {
      return (
        <div
          key={item.label}
          className="flex select-none items-start gap-3 rounded-xl px-3 py-3 opacity-45"
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
        className={`nav-tile group/item flex items-start gap-3 rounded-xl px-3 py-3 ${
          active ? "bg-panel ring-1 ring-inset ring-border" : ""
        }`}
      >
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
        className={`nav-pill group flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold tracking-[-0.005em] transition-all duration-200 ${
          open || isGroupActive ? "nav-pill-active" : ""
        }`}
      >
        <span>{label}</span>
        <span
          aria-hidden
          className={`h-[5px] w-[5px] border-b border-r border-current transition-transform duration-200 ${
            open ? "-translate-y-px rotate-[225deg]" : "-translate-y-[2px] rotate-45"
          }`}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className={`absolute left-0 top-[calc(100%+10px)] z-50 ${hasCategories || twoUp ? "w-[43rem]" : "w-[32rem]"}`}
        >
          {/* Glass-free command panel — fully opaque in every theme */}
          <div className="animate-fade-in overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-[12.5rem_1fr]">
              {/* ── The rail: who this menu is for ── */}
              <div className="flex flex-col justify-between gap-6 rounded-xl bg-panel/60 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${tone === "secondary" ? "from-[#6366f1] to-[#22d3ee]" : "from-[#ff2fb3] to-[#8b93ff]"}`} />
                    <span className={`font-mono text-[11px] font-bold uppercase tracking-[0.18em] ${accentText}`}>{railTitle ?? label}</span>
                  </div>
                  {railBlurb && (
                    <p className="mt-3 text-[12px] leading-relaxed text-muted">{railBlurb}</p>
                  )}
                </div>
                {railHref && railHrefLabel && (
                  <Link
                    href={railHref}
                    role="menuitem"
                    className="group/rail inline-flex items-center gap-1.5 self-start text-[12px] font-semibold text-fg"
                  >
                    <span className="underline decoration-[#8b93ff] decoration-2 underline-offset-4">{railHrefLabel}</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover/rail:translate-x-0.5" />
                  </Link>
                )}
              </div>

              {/* ── The destinations ── */}
              {hasCategories ? (
                <div className="grid grid-cols-1 gap-4 p-1 md:grid-cols-2 md:gap-2">
                  {categories.map((cat) => {
                    const catItems = items.filter((i) => i.category === cat);
                    return (
                      <div key={cat} className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2 px-3 pb-1 pt-1">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">{cat}</span>
                        </div>
                        <div className="flex flex-col">
                          {catItems.map((item, idx) => renderCategorizedItem(item, idx))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={twoUp ? "grid grid-cols-1 gap-1 p-1 md:grid-cols-2" : "flex flex-col gap-1 p-1"}>
                  {items.map(renderItem)}
                </div>
              )}
            </div>

            {/* ── Footer strip: the panel states its own size, in mono ── */}
            <div className="flex items-center justify-between border-t border-border bg-surface/60 px-5 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
                {String(items.length).padStart(2, "0")} destinations · {tone === "secondary" ? "Recruiter suite" : "Interview runtime"}
              </span>
              <span className="flex items-center gap-2" aria-hidden>
                <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${tone === "secondary" ? "from-[#6366f1] to-[#22d3ee]" : "from-[#ff2fb3] to-[#8b93ff]"}`} />
                <span className="h-px w-6 bg-border" />
                <span className="h-1.5 w-1.5 rounded-full border border-border-strong" />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
