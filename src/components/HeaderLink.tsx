"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A top-level nav pill.
 *
 * WOW bar, not an editor tab strip: bare-text tabs belonged to the old
 * Runtime chrome. Items are rounded pills that tint on hover; the active
 * route gets a ring + glow. Colors ride the bar's --nav-* vars so pills
 * read white over the hero and themed once the bar condenses.
 */
export default function HeaderLink({
  href,
  label,
  badge,
  tone = "default",
  matchPrefix,
}: {
  href: string;
  label: string;
  /** Small mono marker, e.g. "New" or "Soon". Never a filled pill. */
  badge?: string;
  tone?: "default" | "muted" | "warn" | "danger";
  /** Path prefix that counts as active; defaults to `href`. */
  matchPrefix?: string;
}) {
  const pathname = usePathname() ?? "";
  const prefix = matchPrefix ?? href;
  const active = prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`));
  const toneClass = tone === "warn" ? "text-warning" : tone === "danger" ? "text-danger" : "";

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nav-pill group relative z-[1] flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium tracking-[-0.01em] transition-colors duration-200 ${
        active ? "nav-pill-active" : ""
      } ${toneClass}`}
    >
      {label}
      {badge && (
        <span
          className={`font-mono text-[10px] font-medium uppercase tracking-[0.08em] ${
            badge === "Soon"
              ? "text-warning"
              : badge === "Hidden"
                ? "text-danger"
                : "text-secondary-soft"
          }`}
          aria-hidden
        >
          {badge}
        </span>
      )}
      {active && (
        <span aria-hidden className="absolute -bottom-[1px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
      )}
    </Link>
  );
}
