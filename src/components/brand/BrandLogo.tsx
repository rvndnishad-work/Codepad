import { BRANDS, type BrandKey } from "@/lib/brand";
import { DevprepMark } from "./DevprepLogo";
import { IntervutreeMark, IntervutreeWordmark } from "./IntervutreeLogo";

/**
 * The header logo for a brand: the mark beside a two-tone wordmark, or the
 * mark alone when compact. Both marks come from the designer packs.
 */
export function BrandLogo({
  brand,
  compact = false,
  showSub = true,
  className,
}: {
  brand: BrandKey;
  compact?: boolean;
  showSub?: boolean;
  className?: string;
}) {
  const b = BRANDS[brand];
  if (brand === "intervutree") {
    return compact ? (
      <IntervutreeMark className={`h-9 w-auto ${className ?? ""}`} />
    ) : (
      <span className={`group/logo flex items-center gap-2.5 ${className ?? ""}`}>
        <IntervutreeMark className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover/logo:scale-105" />
        <span className="flex flex-col leading-none">
          <span className="ld-word text-[17px] font-bold tracking-[-0.04em]" style={{ color: "var(--fg)" }}>
            {b.wordmark[0]}
            <span style={{ color: "var(--brand-green, #00A86B)" }}>{b.wordmark[1]}</span>
          </span>
          {showSub && (
            <span className="ld-sub mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: "var(--subtle)" }}>
              {b.tagline}
            </span>
          )}
        </span>
      </span>
    );
  }
  return (
    <span className={`group/logo flex items-center gap-2.5 ${className ?? ""}`}>
      <DevprepMark className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover/logo:scale-105" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="ld-word text-[17px] font-bold tracking-[-0.04em]" style={{ color: "var(--fg)" }}>
            {b.wordmark[0]}
            <span className="text-accent">{b.wordmark[1]}</span>
          </span>
          {showSub && (
            <span className="ld-sub mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: "var(--subtle)" }}>
              {b.tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/** A larger lockup for the footer and the sign-in page. */
export function BrandLockup({ brand, height = 44, className }: { brand: BrandKey; height?: number; className?: string }) {
  const b = BRANDS[brand];
  if (brand === "intervutree") {
    return <IntervutreeWordmark height={height} className={className} />;
  }
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`} style={{ height }}>
      <DevprepMark className="h-full w-auto" />
      <span className="font-bold tracking-[-0.04em] text-fg" style={{ fontSize: Math.round(height * 0.6) }}>
        {b.wordmark[0]}
        <span className="text-accent">{b.wordmark[1]}</span>
      </span>
    </span>
  );
}

/** Inline two-tone brand name in running text or app bars: "Intervu<tree>". */
export function BrandWordmark({ brand, className }: { brand: BrandKey; className?: string }) {
  const b = BRANDS[brand];
  return (
    <span className={className}>
      {b.wordmark[0]}
      <span className={b.tone === "secondary" ? "text-secondary-soft" : b.tone === "green" ? "" : "text-accent"} style={b.tone === "green" ? { color: "var(--brand-green, #00A86B)" } : undefined}>
        {b.wordmark[1]}
      </span>
    </span>
  );
}
