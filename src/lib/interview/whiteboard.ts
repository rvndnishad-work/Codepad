/**
 * Whiteboard sync and "follow" rules, kept pure so they can be tested
 * without Excalidraw. Safe to import from client components.
 *
 * Elements live in a Y.Map keyed by element id. The higher version wins;
 * on a tie the lower versionNonce wins (the rule Excalidraw uses to
 * reconcile), so both sides settle on one scene.
 */

export type WbEl = { id: string; version: number; versionNonce: number; index?: string | null; isDeleted?: boolean };

/** Scene rectangle: [minX, minY, maxX, maxY]. */
export type Box = readonly [number, number, number, number];

/** `a` should replace `b` (b missing counts as older). */
export function newer(a: WbEl, b: WbEl | undefined): boolean {
  if (!b) return true;
  if (a.version !== b.version) return a.version > b.version;
  return a.versionNonce < b.versionNonce;
}

/** Excalidraw's fractional index order. */
export function byIndex(a: WbEl, b: WbEl): number {
  const x = a.index ?? "";
  const y = b.index ?? "";
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Remote elements merged into the local scene: every remote element newer
 * than the local copy replaces it. Null when nothing changes.
 */
export function mergeRemote<T extends WbEl>(local: readonly T[], remote: Iterable<T>): { elements: T[]; changed: T[] } | null {
  const byId = new Map(local.map((e) => [e.id, e]));
  const changed: T[] = [];
  for (const r of remote) {
    if (r && typeof r.id === "string" && newer(r, byId.get(r.id))) {
      byId.set(r.id, r);
      changed.push(r);
    }
  }
  return changed.length ? { elements: [...byId.values()].sort(byIndex), changed } : null;
}

/** The part of the scene on screen, from Excalidraw's app state. */
export function viewportBox(s: { scrollX: number; scrollY: number; zoom: { value: number }; width: number; height: number }): Box {
  const z = s.zoom.value > 0 ? s.zoom.value : 1;
  // Excalidraw: sceneX = viewportX / zoom - scrollX.
  const x = 0 - s.scrollX;
  const y = 0 - s.scrollY;
  return [x, y, x + s.width / z, y + s.height / z];
}

/** Some of `b` is off screen. */
export function outside(b: Box, view: Box): boolean {
  return b[0] < view[0] || b[1] < view[1] || b[2] > view[2] || b[3] > view[3];
}

/** Local edits, taps and scrolls in the last few seconds keep the view where the person put it. */
export const FOLLOW_QUIET_MS = 4000;
/** Remote changes are gathered this long after the last one, so a stroke streaming in moves the view once. */
export const FOLLOW_SETTLE_MS = 400;
/** ...but never longer than this after the first. */
export const FOLLOW_MAX_WAIT_MS = 1500;

/** How long to wait before following, given when the first pending change arrived. */
export function followDelay(firstAt: number, now: number): number {
  return Math.max(0, Math.min(firstAt + FOLLOW_MAX_WAIT_MS, now + FOLLOW_SETTLE_MS) - now);
}

/**
 * Whether to move the view to remote changes: something changed off
 * screen, and this person has not touched the board lately.
 */
export function shouldFollow(a: { changed: readonly Box[]; view: Box; now: number; lastLocalAt: number }): boolean {
  if (a.now - a.lastLocalAt < FOLLOW_QUIET_MS) return false;
  return a.changed.some((b) => outside(b, a.view));
}

/** Below this zoom, fitting the whole board would be unreadable; show just the new part instead. */
export const FOLLOW_MIN_ZOOM = 0.3;

/** Fraction of the screen the content covers after a fit. */
export const FIT_PADDING = 0.9;

/** The zoom that fits `b` into a width x height screen, with padding. */
export function fitZoom(b: Box, width: number, height: number): number {
  const w = Math.max(1, b[2] - b[0]);
  const h = Math.max(1, b[3] - b[1]);
  return Math.min(width / w, height / h) * FIT_PADDING;
}

/**
 * Where to move the view when following: the whole board when it still
 * reads at that size, else just the changed part. Following never zooms
 * in past the current zoom, and never past 100%.
 */
export function followTarget(a: { all: Box; width: number; height: number; zoom: number }): { target: "all" | "changed"; maxZoom: number } {
  const maxZoom = Math.min(1, a.zoom);
  return { target: fitZoom(a.all, a.width, a.height) >= FOLLOW_MIN_ZOOM ? "all" : "changed", maxZoom };
}

export function union(boxes: readonly Box[]): Box | null {
  if (!boxes.length) return null;
  let [x1, y1, x2, y2] = boxes[0];
  for (const b of boxes) {
    x1 = Math.min(x1, b[0]);
    y1 = Math.min(y1, b[1]);
    x2 = Math.max(x2, b[2]);
    y2 = Math.max(y2, b[3]);
  }
  return [x1, y1, x2, y2];
}
