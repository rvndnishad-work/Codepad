/**
 * Dynamic Interviewpad brand mark for the WOW theme.
 *
 * - Deliberately simple: a monochrome `>_` code glyph in the surrounding
 *   foreground color — no gradient tile, no orbit. Reads on light and dark
 *   via `var(--fg)` with zero per-instance paint setup.
 * - Persona-adaptive wordmark: `tone="secondary"` shifts the "pad"
 *   colour (yellow for developers, indigo for hiring) and the sub-caption.
 * - Alive: blinking caret (inline <style>, same pattern as Logo.tsx so it
 *   works wherever the header renders, no global CSS needed).
 */

type Props = {
  tone?: "accent" | "secondary";
  compact?: boolean;
  /** Hide the "Interview runtime" sub-caption (e.g. tight toolbar lockup). */
  showSub?: boolean;
  className?: string;
};

export function LogoDynamicMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden
      className={`shrink-0 ${className ?? ""}`}
      style={{ color: "var(--fg)" }}
    >
      {/* chevron > */}
      <path
        d="M13 13.5l8 6.5-8 6.5"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* cursor _ */}
      <line
        x1="23"
        y1="26.5"
        x2="30.5"
        y2="26.5"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        className="logo-dynamic-caret"
      />
    </svg>
  );
}

export default function LogoDynamic({ tone = "accent", compact = false, showSub = true, className }: Props) {
  return (
    <span className={`group/logo flex justify-center items-center gap-2.5 ${className ?? ""}`}>
      <style>{`
        @keyframes logo-dynamic-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .logo-dynamic-caret { animation: logo-dynamic-blink 1.1s step-end infinite; }
      `}</style>
      <LogoDynamicMark
        className="h-9 w-9 transition-transform duration-300 group-hover/logo:scale-105"
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="ld-word text-[17px] font-semibold tracking-[-0.03em]" style={{ color: "var(--fg)" }}>
            interview
            <span className={tone === "secondary" ? "text-secondary-soft" : "text-accent"}>
              pad
            </span>
          </span>
          {showSub && (
            <span
              className="ld-sub mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: "var(--subtle)" }}
            >
              {tone === "secondary" ? "Hiring runtime" : "Interview runtime"}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
