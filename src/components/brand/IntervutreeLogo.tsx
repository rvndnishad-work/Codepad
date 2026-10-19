/**
 * Intervutree brand mark, straight from the designer pack: the file at
 * public/brand/intervutree-icon.svg is shown as an image, so the drawing is
 * the pack's own, unchanged.
 */
export function IntervutreeMark({ className, title = "Intervutree" }: { className?: string; title?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/intervutree-icon.svg" alt={title} className={className} draggable={false} />;
}
