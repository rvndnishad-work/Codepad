// Shared motion language for the homepage. Keep this small — every value
// here is referenced from multiple animated components, so changes here
// retune the entire site rhythm at once.

/**
 * "Expo out" — the tight cubic-bezier iOS uses. Sharp start, soft landing.
 * Reach for this for almost every reveal/parallax curve on the homepage.
 */
export const EASE_EXPO_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * "Smooth in-out" — for scroll-linked transforms where the element travels
 * both ways (e.g. parallax that scrubs back when scrolling up).
 */
export const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const;

/** Single source of truth for reveal duration (in seconds). */
export const REVEAL_DURATION = 0.6;

/** Default per-item stagger inside a reveal group (in seconds). */
export const REVEAL_STAGGER = 0.08;

/** Vertical travel for the default fade-up reveal (in pixels). */
export const REVEAL_DISTANCE = 24;
