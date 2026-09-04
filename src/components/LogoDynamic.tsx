/**
 * Dynamic Interviewpad brand mark for the WOW theme.
 *
 * - Theme-adaptive: the tile gradient + white glyph read on light and dark;
 *   only the wordmark follows `var(--fg)`.
 * - Persona-adaptive: `tone="secondary"` shifts the gradient to indigo/cyan
 *   on hiring routes (mirrors the old LogoLockup convention).
 * - Alive: orbiting ring + blinking caret (inline <style>, same pattern as
 *   Logo.tsx so it works wherever the header renders, no global CSS needed).
 */

type Props = {
  tone?: "accent" | "secondary";
  compact?: boolean;
  className?: string;
};

const GRADIENTS = {
  accent: ["#8b93ff", "#ff2fb3", "#22d3ee"],
  secondary: ["#6366f1", "#8b93ff", "#22d3ee"],
} as const;

export function LogoDynamicMark({ tone = "accent", className }: { tone?: Props["tone"]; className?: string }) {
  const [a, b, c] = GRADIENTS[tone];
  const gid = `ldg-${tone}`;
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={`shrink-0 ${className ?? ""}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={a} />
          <stop offset="0.55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      {/* orbit ring */}
      <ellipse
        cx="20"
        cy="20"
        rx="17"
        ry="10.5"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="1.6"
        opacity="0.65"
        transform="rotate(-24 20 20)"
        className="logo-dynamic-orbit"
      />
      {/* tile */}
      <rect x="8" y="8" width="24" height="24" rx="7" fill={`url(#${gid})`} />
      {/* glyph >_ */}
      <path d="M15 15.5l5 4.5-5 4.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="21.5" y1="24.5" x2="26" y2="24.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" className="logo-dynamic-caret" />
    </svg>
  );
}

export default function LogoDynamic({ tone = "accent", compact = false, className }: Props) {
  const [a, , c] = GRADIENTS[tone];
  return (
    <span className={`group/logo inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <style>{`
        @keyframes logo-dynamic-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes logo-dynamic-spin { to { transform: rotate(360deg); } }
        .logo-dynamic-caret { animation: logo-dynamic-blink 1.1s step-end infinite; }
        .logo-dynamic-orbit { transform-origin: 20px 20px; animation: logo-dynamic-spin 14s linear infinite; }
        .group\\/logo:hover .logo-dynamic-orbit { animation-duration: 4s; }
      `}</style>
      <LogoDynamicMark
        tone={tone}
        className="h-9 w-9 drop-shadow-[0_4px_16px_rgba(139,147,255,0.45)] transition-transform duration-300 group-hover/logo:scale-105 group-hover/logo:-rotate-6"
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="ld-word text-[17px] font-extrabold tracking-tight" style={{ color: "var(--fg)" }}>
            interview
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(92deg, ${a}, ${c})`,
              }}
            >
              pad
            </span>
          </span>
          <span
            className="ld-sub mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.32em]"
            style={{ color: "var(--subtle)" }}
          >
            {tone === "secondary" ? "Hiring runtime" : "Interview runtime"}
          </span>
        </span>
      )}
    </span>
  );
}
