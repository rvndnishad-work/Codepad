/**
 * Light theme rollout. The light "Clay" palette (globals.css :root) is being
 * rolled out page by page; every route not listed here is still forced dark
 * so a half-reviewed page never renders in a theme nobody has checked.
 * Add a route here once it has been reviewed in light.
 */
const LIGHT_READY_EXACT = ["/", "/hire"];
const LIGHT_READY_PREFIX: string[] = [];

export function supportsLightTheme(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (LIGHT_READY_EXACT.includes(path)) return true;
  return LIGHT_READY_PREFIX.some((p) => path === p || path.startsWith(p + "/"));
}
