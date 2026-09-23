/**
 * True when the visitor asked the OS for reduced motion. GSAP tweens bypass
 * the CSS `prefers-reduced-motion` rules in wow.css, so every scripted
 * reveal checks this first and leaves content in its resting, visible state.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
