"use client";

/**
 * JarvisCore — replaces the previous renderRobotFace() smiley with a
 * proper AI-core visualizer. No eyes, no mouth — just a faceted hex
 * crystal with state-driven equalizer/scan/pulse overlays.
 *
 * State semantics (preserved from the old face):
 *   • idle      — subtle breath pulse, brand violet
 *   • listening — slow cyan ping (voice input active)
 *   • thinking  — amber horizontal scanline sweep across the core
 *   • speaking  — fuchsia 5-bar equalizer underneath the core
 *
 * Severity overrides idle:
 *   • alert  — red tint while alerts are outstanding
 *   • stable — emerald tint when everything is clean
 *
 * Both light and dark themes use the same hues but lighter glow at
 * lower opacity in light mode so it doesn't blow out against a white
 * surface.
 */

export type JarvisState = "idle" | "listening" | "thinking" | "speaking";
export type JarvisSeverity = "stable" | "alert";

interface Tone {
  primary: string;   // saturated stroke / glow
  secondary: string; // gradient stop
  glow: string;      // rgba() for box / drop-shadow
}

function resolveTone(state: JarvisState, severity: JarvisSeverity, isLight: boolean): Tone {
  // Active states win over severity — when the user is actively interacting,
  // the alert hue would steal focus from the interaction signal.
  if (state === "listening") {
    return isLight
      ? { primary: "#0891b2", secondary: "#67e8f9", glow: "rgba(8,145,178,0.35)" }
      : { primary: "#22d3ee", secondary: "#67e8f9", glow: "rgba(6,182,212,0.55)" };
  }
  if (state === "thinking") {
    return isLight
      ? { primary: "#d97706", secondary: "#fcd34d", glow: "rgba(217,119,6,0.35)" }
      : { primary: "#fbbf24", secondary: "#fde68a", glow: "rgba(245,158,11,0.55)" };
  }
  if (state === "speaking") {
    return isLight
      ? { primary: "#c026d3", secondary: "#f0abfc", glow: "rgba(192,38,211,0.35)" }
      : { primary: "#f472b6", secondary: "#f5d0fe", glow: "rgba(232,121,249,0.6)" };
  }
  // Idle — severity decides tint.
  if (severity === "alert") {
    return isLight
      ? { primary: "#dc2626", secondary: "#fca5a5", glow: "rgba(220,38,38,0.3)" }
      : { primary: "#f87171", secondary: "#fecaca", glow: "rgba(248,113,113,0.5)" };
  }
  // Stable idle — brand violet leaning towards emerald for the "all clear" cue.
  return isLight
    ? { primary: "#7c3aed", secondary: "#c4b5fd", glow: "rgba(124,58,237,0.25)" }
    : { primary: "#a855f7", secondary: "#d8b4fe", glow: "rgba(168,85,247,0.5)" };
}

export default function JarvisCore({
  state = "idle",
  severity = "stable",
  variant = "lg",
  isLight = false,
  className,
}: {
  state?: JarvisState;
  severity?: JarvisSeverity;
  variant?: "lg" | "sm";
  isLight?: boolean;
  className?: string;
}) {
  const tone = resolveTone(state, severity, isLight);
  const isSm = variant === "sm";
  const uid = `jc-${state}-${severity}-${variant}`;
  const showEqualizer = state === "speaking";
  const showScan = state === "thinking";
  const showListenPing = state === "listening";

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center ${className ?? ""}`}
      aria-hidden="true"
    >
      <style jsx>{`
        @keyframes jc-breath {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50%      { transform: scale(1.04); opacity: 1; }
        }
        @keyframes jc-scan {
          0%   { transform: translateY(-22px); opacity: 0.2; }
          50%  { opacity: 1; }
          100% { transform: translateY(22px); opacity: 0.2; }
        }
        @keyframes jc-ping {
          0%   { transform: scale(0.6); opacity: 0.7; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes jc-eq-1 { 0%, 100% { height: 4px; } 50% { height: 18px; } }
        @keyframes jc-eq-2 { 0%, 100% { height: 6px; } 50% { height: 26px; } }
        @keyframes jc-eq-3 { 0%, 100% { height: 4px; } 50% { height: 22px; } }
        @keyframes jc-eq-4 { 0%, 100% { height: 6px; } 50% { height: 14px; } }
        @keyframes jc-eq-5 { 0%, 100% { height: 4px; } 50% { height: 20px; } }
        .jc-core    { animation: jc-breath 3.2s ease-in-out infinite; transform-origin: 50% 50%; }
        .jc-scan    { animation: jc-scan 1.6s ease-in-out infinite; }
        .jc-ping    { animation: jc-ping 1.8s ease-out infinite; transform-origin: 50% 50%; }
        .jc-eq-bar  { width: 4px; border-radius: 2px; transition: height 0.12s ease; }
        .jc-eq-1    { animation: jc-eq-1 0.55s ease-in-out infinite alternate; }
        .jc-eq-2    { animation: jc-eq-2 0.45s ease-in-out infinite alternate; }
        .jc-eq-3    { animation: jc-eq-3 0.6s  ease-in-out infinite alternate; }
        .jc-eq-4    { animation: jc-eq-4 0.5s  ease-in-out infinite alternate; }
        .jc-eq-5    { animation: jc-eq-5 0.55s ease-in-out infinite alternate; }
      `}</style>

      {/* Soft outer halo — never animates, just sits in the background */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "120%",
          height: "120%",
          background: `radial-gradient(circle at 50% 50%, ${tone.glow} 0%, transparent 65%)`,
          filter: "blur(6px)",
        }}
      />

      {/* The crystalline core itself */}
      <svg
        viewBox="0 0 100 100"
        className="w-[88%] h-[88%] relative z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${uid}-core`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={tone.secondary} stopOpacity={isLight ? 0.85 : 0.95} />
            <stop offset="100%" stopColor={tone.primary}   stopOpacity={isLight ? 0.5 : 0.8} />
          </linearGradient>
          <linearGradient id={`${uid}-facet`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isLight ? 0.7 : 0.45} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Hex core — breathes always */}
        <g className="jc-core">
          {/* Outer hex with gradient fill */}
          <polygon
            points="50,12 84,32 84,68 50,88 16,68 16,32"
            fill={`url(#${uid}-core)`}
            stroke={tone.primary}
            strokeOpacity={isLight ? 0.55 : 0.85}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />

          {/* Inner facet for a faux-3D crystal feel — top half catches light */}
          <polygon
            points="50,18 78,34 50,50 22,34"
            fill={`url(#${uid}-facet)`}
          />

          {/* Subtle inner outline so the facet edge reads cleanly */}
          <polygon
            points="50,12 84,32 84,68 50,88 16,68 16,32"
            fill="none"
            stroke="#ffffff"
            strokeOpacity={isLight ? 0.18 : 0.12}
            strokeWidth="0.6"
          />

          {/* Central spark — always present, brightens when active */}
          <circle
            cx="50"
            cy="50"
            r={state === "idle" ? 2.4 : 3.2}
            fill="#ffffff"
            fillOpacity={isLight ? 0.85 : 0.95}
            filter={`url(#${uid}-soft)`}
          />
        </g>

        {/* Listening ping — concentric pulse expanding outward */}
        {showListenPing && (
          <circle
            className="jc-ping"
            cx="50"
            cy="50"
            r="8"
            fill="none"
            stroke={tone.primary}
            strokeWidth="2"
            strokeOpacity="0.9"
          />
        )}

        {/* Thinking scanline — horizontal beam sweeping vertically */}
        {showScan && (
          <g className="jc-scan">
            <line
              x1="22"
              y1="50"
              x2="78"
              y2="50"
              stroke={tone.primary}
              strokeWidth="1.4"
              strokeOpacity="0.95"
            />
            <line
              x1="22"
              y1="50"
              x2="78"
              y2="50"
              stroke={tone.primary}
              strokeWidth="4"
              strokeOpacity="0.25"
              filter={`url(#${uid}-soft)`}
            />
          </g>
        )}
      </svg>

      {/* Speaking equalizer — 5 bars under the core, animate heights.
          Rendered outside the SVG so we can use CSS height animations cleanly. */}
      {showEqualizer && !isSm && (
        <div className="absolute bottom-[8%] left-0 right-0 flex items-end justify-center gap-1.5 z-20 pointer-events-none">
          {(["jc-eq-1", "jc-eq-2", "jc-eq-3", "jc-eq-4", "jc-eq-5"] as const).map((cls, i) => (
            <div
              key={i}
              className={`jc-eq-bar ${cls}`}
              style={{
                background: tone.primary,
                boxShadow: `0 0 6px ${tone.glow}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Compact variant: tiny status dot in the bottom-right corner reflects state colour */}
      {isSm && (
        <span
          className="absolute bottom-[10%] right-[10%] w-1.5 h-1.5 rounded-full z-20"
          style={{
            background: tone.primary,
            boxShadow: `0 0 4px ${tone.primary}`,
          }}
        />
      )}
    </div>
  );
}
