import { useId } from "react";

/**
 * Intervutree brand mark, "Tree of Talent": a tree whose leaves hold three
 * people in green, teal and blue. From the designer pack
 * (public/brand/intervutree-icon.svg is the same drawing for the browser tab).
 * Colours are the pack's own, unchanged.
 */
export function IntervutreeMark({ className, title = "Intervutree" }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const g = `${id}-green`;
  const t = `${id}-teal`;
  const b = `${id}-blue`;
  return (
    <svg viewBox="0 0 512 512" role="img" aria-label={title} className={className}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#67E83F" /><stop offset="1" stopColor="#00B878" /></linearGradient>
        <linearGradient id={t} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#16D9B0" /><stop offset="1" stopColor="#008F91" /></linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3B9BFF" /><stop offset="1" stopColor="#4D43D9" /></linearGradient>
      </defs>
      <g stroke="#073B4C" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M256 438V286M256 344L166 254M256 327L350 236M256 382L194 337M256 382L320 322" />
      </g>
      <path d="M223 438L245 365L267 365L289 438Z" fill="#073B4C" />
      <path d="M127 112C158 71 208 61 244 79C247 119 221 160 180 172C151 159 133 139 127 112Z" fill={`url(#${g})`} />
      <path d="M270 70C310 50 354 64 375 99C365 137 333 159 296 153C274 130 266 100 270 70Z" fill={`url(#${t})`} />
      <path d="M350 176C377 142 420 139 450 161C447 199 419 226 382 226C360 214 349 197 350 176Z" fill={`url(#${b})`} />
      <path d="M60 204C78 173 114 165 144 182C150 213 131 241 101 250C77 239 64 224 60 204Z" fill={`url(#${t})`} />
      <path d="M171 240C186 211 219 202 246 216C251 244 234 269 206 277C185 269 174 257 171 240Z" fill={`url(#${b})`} />
      <g fill="#FFFFFF">
        <circle cx="186" cy="112" r="19" /><path d="M153 154C153 134 167 124 186 124S219 134 219 154V163H153Z" />
        <circle cx="311" cy="100" r="15" /><path d="M285 132C285 116 296 108 311 108S337 116 337 132V141H285Z" />
        <circle cx="400" cy="174" r="13" /><path d="M378 203C378 189 387 181 400 181S422 189 422 203V211H378Z" />
      </g>
    </svg>
  );
}

/** The mark with "intervutree" beside it: "intervu" in the text colour, "tree" in brand green. */
export function IntervutreeWordmark({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center ${className ?? ""}`} style={{ height, gap: Math.round(height * 0.22) }}>
      <IntervutreeMark className="h-full w-auto shrink-0" />
      <span className="font-bold leading-none tracking-[-0.04em]" style={{ fontSize: Math.round(height * 0.78), color: "var(--fg)" }}>
        intervu<span style={{ color: "var(--brand-green, #00A86B)" }}>tree</span>
      </span>
    </span>
  );
}
