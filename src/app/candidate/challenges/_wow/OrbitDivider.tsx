/**
 * ORBIT DIVIDER — a thin animated-SVG seam between page acts: two dashed
 * orbit ellipses counter-rotating around a pulsing rogue dot, with drifting
 * waypoint ticks. Zero JS (CSS keyframes), frozen for reduced motion.
 */
export default function OrbitDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center gap-4" aria-hidden>
      <style>{`
        @keyframes qg-spin { to { transform: rotate(360deg); } }
        @keyframes qg-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes qg-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        .qg-orbit-a { animation: qg-spin 26s linear infinite; transform-origin: center; transform-box: fill-box; }
        .qg-orbit-b { animation: qg-spin-rev 38s linear infinite; transform-origin: center; transform-box: fill-box; }
        .qg-blink { animation: qg-blink 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .qg-orbit-a, .qg-orbit-b, .qg-blink { animation: none; }
        }
      `}</style>
      <svg width="72" height="40" viewBox="0 0 72 40" fill="none" className="shrink-0">
        <g className="qg-orbit-a">
          <ellipse cx="36" cy="20" rx="32" ry="12" stroke="#8b93ff" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="5 6" />
        </g>
        <g className="qg-orbit-b">
          <ellipse cx="36" cy="20" rx="22" ry="16" stroke="#22d3ee" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 7" />
        </g>
        <circle cx="36" cy="20" r="3.5" fill="#0d0f16" stroke="#ffe600" strokeWidth="1.5" className="qg-blink" />
      </svg>
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-[var(--wow-card-border)] to-transparent" />
    </div>
  );
}
