import { useId } from "react";

/**
 * DevPrep brand mark, "Cap, Code and Book": a gold graduation cap over code
 * brackets and an open book. From the designer pack
 * (public/brand/devprep-icon.svg is the same drawing for the browser tab).
 * The charcoal parts follow the text colour so they stay visible on dark.
 */
export function DevprepMark({ className, title = "DevPrep" }: { className?: string; title?: string }) {
  const gold = `${useId().replace(/:/g, "")}-gold`;
  const ink = "var(--fg, #111318)";
  return (
    <svg viewBox="0 0 512 512" role="img" aria-label={title} className={className}>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFE34D" /><stop offset="1" stopColor="#FFB800" /></linearGradient>
      </defs>
      <path d="M64 142L256 52L448 142L256 229Z" fill={`url(#${gold})`} />
      <path d="M112 166V231C151 271 205 284 256 284S361 271 400 231V166L256 236Z" fill="#FFD700" />
      <path d="M437 151V231" stroke={ink} strokeWidth="12" strokeLinecap="round" /><path d="M424 231H450L463 272H411Z" fill={ink} />
      <path d="M173 199L139 230L173 261M339 199L373 230L339 261M283 190L229 272" fill="none" stroke={ink} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M83 321Q164 316 256 388Q348 316 429 321V366Q346 361 256 438Q166 361 83 366Z" fill={ink} />
      <path d="M83 303Q164 298 256 370Q348 298 429 303V348Q346 343 256 420Q166 343 83 348Z" fill={`url(#${gold})`} stroke={ink} strokeWidth="13" strokeLinejoin="round" /><path d="M256 370V420" stroke={ink} strokeWidth="12" />
    </svg>
  );
}
