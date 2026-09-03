"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A top-level nav item.
 *
 * The header is an editor tab bar, not a row of pills: items are bare text on
 * the full header height, and the only state indicator is a 1px rule that
 * meets the header's own bottom border. Hover draws it in from the left;
 * active leaves it drawn. No container, no fill, no radius — so the nav
 * carries no visual weight until you interact with it.
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

  const textTone =
    tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "danger"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "muted"
          ? "text-subtle hover:text-fg"
          : active
            ? "text-fg"
            : "text-muted hover:text-fg";

  const badgeTone =
    badge === "Soon"
      ? "text-amber-600 dark:text-amber-400"
      : badge === "Hidden"
        ? "text-rose-600 dark:text-rose-400"
        : "ip-label-accent";

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex h-16 items-center gap-2 px-3.5 text-[13px] font-medium tracking-[-0.005em] transition-colors duration-150 ${textTone}`}
    >
      {label}
      {badge && (
        <span className={`ip-label ip-label-xs ${badgeTone}`} aria-hidden>
          {badge}
        </span>
      )}
      <span
        aria-hidden
        className={`absolute inset-x-2.5 -bottom-px h-px origin-left bg-accent transition-transform duration-200 ease-out ${
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
        }`}
      />
    </Link>
  );
}
