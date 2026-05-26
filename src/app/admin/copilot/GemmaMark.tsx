"use client";

/**
 * GemmaMark — the brand glyph for the Gemma Admin Copilot.
 *
 * Composition (outer → inner):
 *   1. A slow-rotating dashed reticle, indicating "listening / scanning"
 *   2. A counter-rotating segmented ring with three orbital spark nodes
 *      placed at 12 / 4 / 8 o'clock — evokes a satellite constellation
 *   3. A hexagonal core filled with a violet→fuchsia gradient, stroked
 *      with a brighter violet outline
 *   4. A stylized "G" carved into the core via negative-space arcs
 *   5. A central pulse dot that breathes regardless of state
 *
 * The component is purely SVG + CSS keyframes (no framer-motion) so it
 * renders cheaply, scales perfectly, and stays crisp on retina displays.
 *
 * It is theme-agnostic: gradient stops use the violet/fuchsia palette
 * already established by GemmaConsole so it sits naturally next to the
 * existing copilot UI in both light and dark mode.
 */

type GemmaMarkState = "idle" | "thinking" | "speaking";

export default function GemmaMark({
  size = 40,
  state = "idle",
  className,
}: {
  /** Pixel size of the bounding square. The SVG is internally 100×100 so any size scales cleanly. */
  size?: number;
  /** Drives ring speed and spark glow intensity. */
  state?: GemmaMarkState;
  className?: string;
}) {
  // Per-state ring speeds. Thinking spins quickly, speaking pulses the
  // sparks, idle drifts slowly so the glyph never feels frozen.
  const outerDur = state === "thinking" ? "5s" : "18s";
  const innerDur = state === "thinking" ? "3.5s" : "12s";
  const sparkDur = state === "speaking" ? "0.9s" : "2.6s";
  const coreDur = state === "thinking" ? "1.4s" : "3.2s";

  // Stable namespace so multiple mounts don't fight over defs ids.
  const uid = "gemma-mark";

  return (
    <span
      className={`relative inline-block align-middle ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <style jsx>{`
        @keyframes gemma-spin-cw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes gemma-spin-ccw {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
        @keyframes gemma-pulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.08); }
        }
        @keyframes gemma-spark {
          0%, 100% { opacity: 0.65; }
          50%      { opacity: 1; filter: drop-shadow(0 0 4px rgba(232,121,249,0.85)); }
        }
        .gm-outer { transform-origin: 50% 50%; animation: gemma-spin-cw ${outerDur} linear infinite; }
        .gm-inner { transform-origin: 50% 50%; animation: gemma-spin-ccw ${innerDur} linear infinite; }
        .gm-core  { transform-origin: 50% 50%; animation: gemma-pulse ${coreDur} ease-in-out infinite; }
        .gm-spark { animation: gemma-spark ${sparkDur} ease-in-out infinite; }
        .gm-spark-1 { animation-delay: 0s; }
        .gm-spark-2 { animation-delay: 0.3s; }
        .gm-spark-3 { animation-delay: 0.6s; }
      `}</style>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        <defs>
          {/* Core hexagon fill — deep violet to fuchsia diagonal */}
          <linearGradient id={`${uid}-core`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
          {/* Ring stroke — bright violet with a fuchsia kicker */}
          <linearGradient id={`${uid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f0abfc" />
          </linearGradient>
          {/* Glow halo behind the hex */}
          <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#a855f7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
          {/* Soft drop-shadow used on the core hex */}
          <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feOffset dx="0" dy="1" />
            <feComposite in="SourceGraphic" />
          </filter>
        </defs>

        {/* 1. Halo */}
        <circle cx="50" cy="50" r="46" fill={`url(#${uid}-halo)`} />

        {/* 2. Outer reticle — slow CW rotation */}
        <g className="gm-outer">
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={`url(#${uid}-ring)`}
            strokeOpacity="0.45"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />
        </g>

        {/* 3. Inner segmented ring + spark constellation — CCW rotation */}
        <g className="gm-inner">
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={`url(#${uid}-ring)`}
            strokeOpacity="0.7"
            strokeWidth="1.2"
            strokeDasharray="18 6 3 6"
          />
          {/* Three sparks at 12 / 4 / 8 o'clock */}
          <g>
            <circle className="gm-spark gm-spark-1" cx="50" cy="12" r="2.2" fill="#f0abfc" />
            <circle className="gm-spark gm-spark-2" cx="83" cy="69" r="1.8" fill="#c084fc" />
            <circle className="gm-spark gm-spark-3" cx="17" cy="69" r="1.8" fill="#c084fc" />
          </g>
        </g>

        {/* 4. Hexagonal core — gradient-filled, violet-stroked */}
        <g className="gm-core" filter={`url(#${uid}-shadow)`}>
          <polygon
            points="50,20 76,35 76,65 50,80 24,65 24,35"
            fill={`url(#${uid}-core)`}
            stroke="#f0abfc"
            strokeOpacity="0.9"
            strokeWidth="1.2"
          />

          {/* 5. Stylized "G" carved into the hex via two strokes:
                 - An open arc forming the bowl of the G
                 - A short horizontal serif at the gap */}
          <path
            d="M 60 38
               A 12 12 0 1 0 60 62
               L 53 62
               L 53 53
               L 60 53"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.96"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central breath dot */}
          <circle cx="50" cy="50" r="1.8" fill="#fff" fillOpacity="0.85" />
        </g>
      </svg>
    </span>
  );
}
