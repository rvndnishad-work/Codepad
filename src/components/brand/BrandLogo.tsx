import { BRANDS, type BrandKey } from "@/lib/brand";

/**
 * Brand artwork, served as the SVG files in public/brand/ (drawn to match the
 * brand boards; regenerate with the scripts next to the boards). Each brand
 * has an icon (square mark), a wordmark with tagline, and a lockup (mark +
 * wordmark), the last two in light and dark versions.
 */
const FILES = {
  devprep: { icon: "/brand/devprep-icon.svg", lockup: "/brand/devprep-lockup.svg", lockupDark: "/brand/devprep-lockup-dark.svg" },
  intervutree: { icon: "/brand/intervutree-icon.svg", lockup: "/brand/intervutree-lockup.svg", lockupDark: "/brand/intervutree-lockup-dark.svg" },
} as const;

/* eslint-disable @next/next/no-img-element */

/** The square mark alone. */
export function BrandIcon({ brand, className }: { brand: BrandKey; className?: string }) {
  return <img src={FILES[brand].icon} alt={BRANDS[brand].name} className={className} draggable={false} />;
}

/** Mark + wordmark + tagline, switching to the dark-theme file under `.dark`. */
function LockupImage({ brand, height, className }: { brand: BrandKey; height: number; className?: string }) {
  const f = FILES[brand];
  const name = BRANDS[brand].name;
  const style = { height, width: "auto" } as const;
  return (
    <span className={`inline-flex shrink-0 ${className ?? ""}`}>
      <img src={f.lockup} alt={name} style={style} className="dark:hidden" draggable={false} />
      <img src={f.lockupDark} alt={name} style={style} className="hidden dark:block" draggable={false} />
    </span>
  );
}

/** The header logo: the lockup, or just the mark when compact. */
export function BrandLogo({ brand, compact = false, className }: { brand: BrandKey; compact?: boolean; showSub?: boolean; className?: string }) {
  if (compact) return <BrandIcon brand={brand} className={`h-9 w-9 ${className ?? ""}`} />;
  return <LockupImage brand={brand} height={40} className={`transition-transform duration-300 hover:scale-[1.02] ${className ?? ""}`} />;
}

/** A larger lockup for the footer, the sign-in page and the 404 pages. */
export function BrandLockup({ brand, height = 44, className }: { brand: BrandKey; height?: number; className?: string }) {
  return <LockupImage brand={brand} height={height} className={className} />;
}

/** Inline two-tone brand name in running text or app bars: "intervu<tree>". */
export function BrandWordmark({ brand, className }: { brand: BrandKey; className?: string }) {
  const b = BRANDS[brand];
  return (
    <span className={className}>
      {b.wordmark[0]}
      <span className={b.tone === "secondary" ? "text-secondary-soft" : b.tone === "green" ? "" : "text-accent"} style={b.tone === "green" ? { color: "var(--brand-green, #0FA36B)" } : undefined}>
        {b.wordmark[1]}
      </span>
    </span>
  );
}
