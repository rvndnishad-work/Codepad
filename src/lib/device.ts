/**
 * UA-based device detection — used by interview/take-home entry routes to
 * decide whether to show the mobile-handoff lobby (IP-38).
 *
 * Why UA sniffing instead of feature detection? We need to render the
 * decision *on the server* so a candidate who tapped an emailed link doesn't
 * even fetch the Sandpack/Monaco bundle (~MB) before being told to switch
 * devices. Client-side viewport checks would still load the heavy editor.
 *
 * Conservative regex — only matches well-known mobile UAs. Tablets are
 * treated as desktop (iPad on iPadOS sends a Mac UA anyway, so we'd miss it;
 * Android tablets are uncommon enough that a tiny percentage of tablet users
 * seeing the lobby is fine — they can hit "Continue anyway").
 */

const MOBILE_UA_PATTERN =
  /\b(?:iPhone|iPod|Android.*Mobile|BlackBerry|IEMobile|Opera Mini|webOS|Windows Phone)\b/i;

export function isMobileDevice(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return MOBILE_UA_PATTERN.test(userAgent);
}

/**
 * Cookie name set by the "Continue anyway" button in the mobile lobby. When
 * present the entry route skips the lobby and renders the real page even if
 * the UA still smells mobile. Scoped to the path so it doesn't bleed across
 * unrelated routes.
 *
 * Value semantics: presence is enough; we don't inspect the body.
 */
export const MOBILE_BYPASS_COOKIE = "ipad_mobile_bypass";

/**
 * Query-string flag the lobby itself appends when redirecting to "Continue
 * anyway" so the destination route sees both the cookie and the explicit
 * intent on first load (the cookie isn't yet visible to the server on the
 * very same response that sets it — Set-Cookie roundtrips next request).
 */
export const MOBILE_BYPASS_QUERY = "desktop";

/**
 * Inverse of MOBILE_BYPASS_QUERY — appending `?lobby=force` will render the
 * lobby even on a desktop UA. Useful for design QA / screenshots / preview
 * verification without needing to swap UA strings. Mirrors `?desktop=force`
 * in the opposite direction.
 */
export const MOBILE_FORCE_QUERY = "lobby";

function readQuery(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams | null | undefined,
  key: string,
): string | null {
  if (!searchParams) return null;
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get(key)
      : searchParams[key];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" ? v : null;
}

export function shouldRenderMobileLobby({
  userAgent,
  searchParams,
  cookieHeader,
}: {
  userAgent: string | null | undefined;
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams | null | undefined;
  cookieHeader: string | null | undefined;
}): boolean {
  // QA escape hatch — force the lobby regardless of UA. Checked first so it
  // wins over a bypass cookie left over from a previous session.
  if (readQuery(searchParams, MOBILE_FORCE_QUERY) === "force") return true;

  if (!isMobileDevice(userAgent)) return false;

  // Explicit bypass via query string.
  if (readQuery(searchParams, MOBILE_BYPASS_QUERY) === "force") return false;

  // Bypass via cookie set by "Continue anyway".
  if (cookieHeader && cookieHeader.includes(`${MOBILE_BYPASS_COOKIE}=`)) {
    return false;
  }

  return true;
}
