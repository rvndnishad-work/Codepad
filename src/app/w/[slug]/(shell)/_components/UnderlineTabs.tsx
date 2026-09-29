import Link from "next/link";

export type UnderlineTab = {
  id: string;
  label: string;
  href: string;
  /** Small number after the label, such as how many people or invites. */
  count?: number;
};

/**
 * The one tab bar for workspace pages (Members, Billing and usage, Settings).
 * The active tab is marked by a 2px accent line drawn inside the tab, so it
 * spans the whole label and sits right on the bar's bottom border instead of
 * being clipped by it.
 */
export default function UnderlineTabs({
  tabs,
  active,
  label,
  scroll,
}: {
  tabs: UnderlineTab[];
  active: string;
  /** Screen-reader name for the nav, e.g. "Settings sections". */
  label: string;
  /** Passed to next/link; false keeps the scroll position when switching tabs. */
  scroll?: boolean;
}) {
  return (
    <nav
      aria-label={label}
      className="flex gap-6 border-b border-border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <Link
            key={t.id}
            href={t.href}
            scroll={scroll}
            aria-current={on ? "page" : undefined}
            className={`group flex shrink-0 items-center gap-2 h-10 text-sm whitespace-nowrap transition-[color,box-shadow] duration-150 focus-visible:outline-none focus-visible:text-fg ${
              on
                ? "text-fg font-medium shadow-[inset_0_-2px_0_rgb(var(--c-accent-2))]"
                : "text-muted hover:text-fg hover:shadow-[inset_0_-2px_0_rgb(var(--c-border-strong))] focus-visible:shadow-[inset_0_-2px_0_rgb(var(--c-border-strong))]"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-medium tabular-nums flex items-center justify-center transition-colors ${
                  on ? "bg-secondary/15 text-secondary-soft" : "bg-panel text-subtle group-hover:text-muted"
                }`}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
