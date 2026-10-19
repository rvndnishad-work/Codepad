import { BRANDS, type BrandKey } from "@/lib/brand";

/**
 * Brand artwork, served as the SVG files in public/brand/. DevPrep's are the
 * supplied set (mark, mark-dark, logo, logo-dark, icon, icon-light, mono);
 * Intervutree's were drawn to match its brand board. `icon` here is the bare
 * mark for inline use; the tab icon comes from src/lib/brand.ts. The dark
 * DevPrep logo is the supplied file minus its background plate, and both
 * DevPrep logos are served with the viewBox cropped to the artwork (the
 * supplied canvas has wide margins), so the two brands render at one size.
 */
const FILES = {
  devprep: { icon: "/brand/devprep-mark.svg", iconDark: "/brand/devprep-mark-dark.svg", lockup: "/brand/devprep-logo-tight.svg", lockupDark: "/brand/devprep-logo-dark-tight.svg" },
  intervutree: { icon: "/brand/intervutree-icon.svg", iconDark: "/brand/intervutree-icon.svg", lockup: "/brand/intervutree-lockup.svg", lockupDark: "/brand/intervutree-lockup-dark.svg" },
} as const;

/* eslint-disable @next/next/no-img-element */

/** The square mark alone. */
export function BrandIcon({ brand, className }: { brand: BrandKey; className?: string }) {
  const f = FILES[brand];
  const name = BRANDS[brand].name;
  if (f.iconDark === f.icon) return <img src={f.icon} alt={name} className={className} draggable={false} />;
  return (
    <>
      <img src={f.icon} alt={name} className={`dark:hidden ${className ?? ""}`} draggable={false} />
      <img src={f.iconDark} alt={name} className={`hidden dark:block ${className ?? ""}`} draggable={false} />
    </>
  );
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
