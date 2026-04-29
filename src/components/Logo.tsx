/**
 * Codepad brand mark.
 *
 * Concept: a miniature editor — three stylized "code lines" of varying widths
 * with a cyan caret at the active line, set inside a rounded square with a
 * diagonal violet gradient. Conveys "code playground with live typing"
 * without the generic `</>` cliche.
 *
 * Use `<LogoMark />` for a square icon (header, favicon, app icon).
 * Use `<LogoWordmark />` for icon + "Codepad" text (login page, footer hero).
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
      <defs>
        <linearGradient
          id={brand}
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#8b8dff" />
          <stop offset="55%" stopColor="#7c7fff" />
          <stop offset="100%" stopColor="#5752e6" />
        </linearGradient>
        <linearGradient
          id={cursor}
          x1="0"
          y1="0"
          x2="0"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient
          id={sheen}
          x1="0"
          y1="0"
          x2="0"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base */}
      <rect width="32" height="32" rx="8" fill={`url(#${brand})`} />
      {/* Top sheen */}
      <rect width="32" height="32" rx="8" fill={`url(#${sheen})`} />
      {/* Inner border */}
      <rect
        x="0.6"
        y="0.6"
        width="30.8"
        height="30.8"
        rx="7.4"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
      />

      {/* Code lines */}
      <rect
        x="7"
        y="8.5"
        width="14"
        height="2.6"
        rx="1.3"
        fill="#ffffff"
        fillOpacity="0.95"
      />
      <rect
        x="7"
        y="14"
        width="10"
        height="2.6"
        rx="1.3"
        fill="#ffffff"
        fillOpacity="0.7"
      />
      <rect
        x="7"
        y="19.5"
        width="13"
        height="2.6"
        rx="1.3"
        fill="#ffffff"
        fillOpacity="0.95"
      />

      {/* Active caret */}
      <rect
        x="22"
        y="18.5"
        width="2.2"
        height="4.6"
        rx="1.1"
        fill={`url(#${cursor})`}
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
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      <span className="font-semibold tracking-tight text-fg">Codepad</span>
    </span>
  );
}
