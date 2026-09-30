/**
 * Light theme coverage. The light "Clay" palette (globals.css :root) now runs
 * site-wide; the routes below are the deliberate exceptions and are always
 * forced dark. Admin is an internal console that was never reviewed in light.
 */
const DARK_ONLY_PREFIX = ["/admin"];

export function supportsLightTheme(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return !DARK_ONLY_PREFIX.some((p) => path === p || path.startsWith(p + "/"));
}
