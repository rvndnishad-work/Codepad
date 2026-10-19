/**
 * DevPrep brand mark, straight from the designer pack: the file at
 * public/brand/devprep-icon.svg is shown as an image, so the drawing is the
 * pack's own, unchanged. The pack's wordmark file sits beside it.
 */
export function DevprepMark({ className, title = "DevPrep" }: { className?: string; title?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/devprep-icon.svg" alt={title} className={className} draggable={false} />;
}

/** The pack's wordmark and tagline file ("devprep.academy", "Practice · Learn · Build · Get hired"). */
export function DevprepWordmarkFile({ className, height = 44 }: { className?: string; height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/devprep-wordmark.svg" alt="devprep.academy" className={className} style={{ height, width: "auto" }} draggable={false} />;
}
