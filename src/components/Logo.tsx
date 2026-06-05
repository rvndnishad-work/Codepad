/**
 * Interviewpad brand mark.
 *
 * Concept: a miniature editor — three stylized "code lines" of varying widths
 * with a cyan caret at the active line, set inside a rounded square with a
 * diagonal violet gradient. Conveys "code playground with live typing"
 * without the generic `</>` cliche.
 *
 * Use `<LogoMark />` for a square icon (header, favicon, app icon).
 * Use `<LogoWordmark />` for icon + "Interviewpad" text (login page, footer hero).
 * Use `<LogoLockup />` for the all-in-one speech bubble that wraps the
 *   "interviewpad" wordmark inside it, with a blinking caret underlining the
 *   final "d". Best for wide/large placements (~180px+); fall back to
 *   `<LogoMark />` below that since text-in-bubble turns to mush when small.
 */

type SizeProps = { size?: number; className?: string; idSuffix?: string };

export function LogoMark({
  size = 28,
  className,
  idSuffix = "",
}: SizeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={`text-accent shrink-0 ${className ?? ""}`}
    >
      <style>{`
        @keyframes logo-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .logo-cursor {
          animation: logo-cursor-blink 1s step-end infinite;
        }
      `}</style>
      {/* Speech bubble outline */}
      <path d="M26 4H6a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h4v5l6-5h10a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4z" />
      {/* Code caret > */}
      <path d="M9 10l4 4-4 4" />
      {/* Cursor _ */}
      <line x1="16" y1="18" x2="22" y2="18" className="logo-cursor" />
    </svg>
  );
}

export function LogoLockup({
  height = 56,
  className,
  idSuffix = "lockup",
}: { height?: number; className?: string; idSuffix?: string }) {
  // viewBox is cropped tight to the artwork (tail tip reaches y≈128) so the
  // mark fills the box with no dead space. Width derives from height to keep
  // the aspect ratio. Origin is offset to leave just a hairline for the stroke.
  const VIEW_X = 9;
  const VIEW_Y = 9;
  const VIEW_W = 342;
  const VIEW_H = 123;
  const width = Math.round((height * VIEW_W) / VIEW_H);
  const blinkClass = `logo-cursor-${idSuffix}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Interviewpad"
      className={`shrink-0 ${className ?? ""}`}
      style={{ marginTop: "10px" }}
    >
      <style>{`
        @keyframes logo-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .${blinkClass} { animation: logo-cursor-blink 1.05s step-end infinite; }
      `}</style>
      {/* Bubble frame — one filled band between an outer contour (rounded
          corners) and an inner contour (boxy window). Both contours dip into
          the bottom-left tail, so the band's edge turns down into a thick,
          hollow tail rather than a solid wedge. Even-odd keeps the window and
          tail interior transparent for the wordmark. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M30 14 H330 a16 16 0 0 1 16 16 V84 a16 16 0 0 1 -16 16 H120 L76 128 L76 100 H30 a16 16 0 0 1 -16 -16 V30 a16 16 0 0 1 16 -16 Z M28 22 H332 a6 6 0 0 1 6 6 V88 a6 6 0 0 1 -6 6 H112 L84 114 L84 94 H28 a6 6 0 0 1 -6 -6 V28 a6 6 0 0 1 6 -6 Z"
        fill="var(--accent)"
      />
      {/* Code caret > */}
      <path
        d="M54 44 l16 13 -16 13"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Wordmark — "pad" accented to match the brand */}
      <text
        x="86"
        y="68"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        fontSize="38"
        fontWeight="700"
        letterSpacing="-1"
        fill="var(--fg)"
      >
        interview
        <tspan fill="var(--accent)">pad</tspan>
      </text>
      {/* Blinking cursor underlining the "d" */}
      <rect
        className={blinkClass}
        x="290"
        y="78"
        width="22"
        height="5"
        rx="2.5"
        fill="var(--accent)"
      />
    </svg>
  );
}

export function LogoWordmark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <LogoMark size={32} className="drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.35)]" />
      <div className="flex flex-col leading-none">
        <span className="font-extrabold text-lg tracking-tight text-fg">
          Interview<span className="text-accent font-medium">pad</span>
        </span>
        <span className="text-[9px] font-bold text-muted/50 uppercase tracking-[0.3em] mt-0.5">Pro Sandbox</span>
      </div>
    </span>
  );
}
