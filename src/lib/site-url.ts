/**
 * The one place that decides the site's absolute origin (scheme + host, no
 * trailing slash). Server and build time only.
 *
 * Order: an explicit env var (NEXTAUTH_URL, AUTH_URL, NEXT_PUBLIC_SITE_URL,
 * APP_URL), then the domain Vercel reports for this deployment, then the
 * production domain. A localhost value is ignored on a deployment, so a
 * missing or copied-from-.env variable can never put localhost into a link a
 * candidate, interviewer, search engine or webhook receives.
 */

export const PRODUCTION_ORIGIN = "https://interviewpad.in";
const DEV_ORIGIN = "http://localhost:3000";

/** True on a Vercel deployment (production or preview), where localhost is never right. */
export function onDeployment(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function isLocalHost(host: string): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  return h === "localhost" || h.endsWith(".localhost") || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1";
}

/** Normalises a URL-ish value to an origin, or null when it is empty, invalid or local on a deployment. */
export function cleanOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (onDeployment() && isLocalHost(u.host)) return null;
  return u.origin;
}

/** The origin set by env vars, or null when none is usable. */
export function configuredOrigin(): string | null {
  for (const v of [process.env.NEXTAUTH_URL, process.env.AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL, process.env.APP_URL]) {
    const o = cleanOrigin(v);
    if (o) return o;
  }
  return null;
}

/** Absolute origin for code that has no request (metadata, sitemap, crons, emails from background jobs). */
export function siteOrigin(): string {
  const configured = configuredOrigin();
  if (configured) return configured;
  if (onDeployment()) {
    if (process.env.VERCEL_ENV === "production") {
      // Vercel's shortest production domain; only a custom one beats the known domain.
      const own = cleanOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
      return own && !own.endsWith(".vercel.app") ? own : PRODUCTION_ORIGIN;
    }
    return cleanOrigin(process.env.VERCEL_BRANCH_URL) ?? cleanOrigin(process.env.VERCEL_URL) ?? PRODUCTION_ORIGIN;
  }
  return process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : DEV_ORIGIN;
}

/**
 * Origin from request headers (x-forwarded-host, then host), or null when
 * missing or local on a deployment. On production a *.vercel.app host (Vercel
 * cron calls, someone opening the raw deployment URL) is skipped too, so
 * emailed links always use the real domain.
 */
export function originFromHeaders(h: { get(name: string): string | null }): string | null {
  const host = (h.get("x-forwarded-host") ?? h.get("host"))?.split(",")[0]?.trim();
  if (!host) return null;
  if (process.env.VERCEL_ENV === "production" && /\.vercel\.app(:\d+)?$/i.test(host)) return null;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || (isLocalHost(host) ? "http" : "https");
  return cleanOrigin(`${proto}://${host}`);
}
