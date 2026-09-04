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
  const toneClass = tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-rose-400" : "";

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nav-pill group relative flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold tracking-[-0.005em] transition-all duration-200 ${
        active ? "nav-pill-active" : ""
      } ${toneClass}`}
    >
      {label}
      {badge && (
        <span
          className={`font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${
            badge === "Soon"
              ? "text-amber-500"
              : badge === "Hidden"
                ? "text-rose-400"
                : "text-[#8b93ff]"
          }`}
          aria-hidden
        >
          {badge}
        </span>
      )}
      {active && (
        <span aria-hidden className="absolute -bottom-[1px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3]" />
      )}
    </Link>
  );
}
