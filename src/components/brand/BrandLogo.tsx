import { BRANDS, type BrandKey } from "@/lib/brand";
import { LogoDynamicMark } from "@/components/LogoDynamic";
import { IntervutreeMark, IntervutreeWordmark } from "./IntervutreeLogo";

/**
 * The header logo for a brand. DevPrep keeps the `>_` mark with a two-tone
 * wordmark; Intervutree is the banyan wordmark, or just the tree when compact.
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
      <span className={`flex flex-col items-start leading-none ${className ?? ""}`}>
        <IntervutreeWordmark className="h-8 w-auto" />
        {showSub && (
          <span className="ld-sub mt-1 pl-[38px] font-mono text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: "var(--subtle)" }}>
            {b.tagline}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={`group/logo flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoDynamicMark className="h-9 w-9 transition-transform duration-300 group-hover/logo:scale-105" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="ld-word text-[17px] font-semibold tracking-[-0.03em]" style={{ color: "var(--fg)" }}>
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
      <LogoDynamicMark className="h-full w-auto" />
      <span className="font-semibold tracking-[-0.03em] text-fg" style={{ fontSize: Math.round(height * 0.6) }}>
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
      <span className={b.tone === "secondary" ? "text-secondary-soft" : "text-accent"}>{b.wordmark[1]}</span>
    </span>
  );
}
