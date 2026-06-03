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
