/**
 * Light theme coverage. The light "Clay" palette (globals.css :root) runs
 * site-wide, admin console included; any route listed here is forced dark.
 */
const DARK_ONLY_PREFIX: string[] = [];

export function supportsLightTheme(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return !DARK_ONLY_PREFIX.some((p) => path === p || path.startsWith(p + "/"));
}
