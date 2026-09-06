"use client";

/**
 * FIELD LOG — a slow horizontal drift of expedition snapshots (real photos
 * already shipped under /images/wow). Pure CSS motion, pauses on hover,
 * frozen for reduced motion.
 */
const SHOTS = [
  { src: "/images/wow/code-dark.jpg", caption: "02:14 — it finally compiled" },
  { src: "/images/wow/hackathon.jpg", caption: "Daily reps beat cramming" },
  { src: "/images/wow/pair-programming.jpg", caption: "Explain it out loud" },
  { src: "/images/wow/reviewer.jpg", caption: "Review yourself like a stranger" },
];

export default function FieldLogMarquee() {
  const loop = [...SHOTS, ...SHOTS];
  return (
    <div className="relative overflow-hidden">
      <style>{`
        @keyframes qg-drift { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .qg-track { animation: qg-drift 46s linear infinite; }
        .qg-marquee:hover .qg-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .qg-track { animation: none; } }
      `}</style>
      <div className="qg-marquee relative flex">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[var(--wow-bg)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[var(--wow-bg)] to-transparent" />
        <div className="qg-track flex w-max gap-4 py-1">
          {loop.map((s, i) => (
            <figure
              key={`${s.src}-${i}`}
              className="w-64 shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] p-2 backdrop-blur-sm dark:border-white/[0.07]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" loading="lazy" className="h-32 w-full rounded-xl object-cover" />
              <figcaption className="px-1 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {s.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
