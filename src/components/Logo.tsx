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
  const brand = `cp-brand${idSuffix}`;
  const cursor = `cp-cursor${idSuffix}`;
  const sheen = `cp-sheen${idSuffix}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      {/* Code lines */}
      <rect
        x="6"
        y="9"
        width="14"
        height="3"
        rx="1.5"
        fill="currentColor"
      />
      <rect
        x="6"
        y="14.5"
        width="10"
        height="3"
        rx="1.5"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <rect
        x="6"
        y="20"
        width="16"
        height="3"
        rx="1.5"
        fill="currentColor"
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
      <div className="w-8 h-8 rounded-xl bg-accent grid place-items-center shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]">
         <LogoMark size={20} className="text-bg" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-black text-lg tracking-tighter text-fg">Interviewpad</span>
        <span className="text-[9px] font-bold text-muted/50 uppercase tracking-[0.3em]">Pro Sandbox</span>
      </div>
    </span>
  );
}
