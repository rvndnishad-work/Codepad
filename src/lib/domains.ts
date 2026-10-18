/**
 * Two-domain routing: the developer site and the recruiter site are served by
 * the same deployment on two domains. The proxy (src/proxy.ts) asks
 * `routeForHost` what to do with each request:
 *
 * - a recruiter page opened on the developer domain moves to the recruiter
 *   domain (same path and query), and the other way round;
 * - on the recruiter domain, "/" shows the /hire landing page and "/hire"
 *   moves to "/";
 * - a request on an old domain (LEGACY_SITE_HOSTS) moves to whichever new
 *   domain owns the page, except /api, so webhooks and OAuth callbacks that
 *   still point at the old domain keep working;
 * - pages both sites need (sign-in, interview rooms, admin, legal, API) stay
 *   on whichever domain they were opened on.
 *
 * Nothing changes until both domains are configured: RECRUITER_SITE_URL and
 * the main site origin (NEXT_PUBLIC_SITE_URL, see site-url.ts).
 */
import { configuredOrigin, recruiterConfiguredOrigin, siteOrigin } from "./site-url";

export type SiteKind = "developer" | "recruiter";

/** Pages that belong to the recruiter site. Matched as exact or prefix. */
export const RECRUITER_PATHS = [
  "/hire",
  "/w",
  "/pricing",
  "/features",
  "/purchase",
  "/docs",
  "/take-home",
  "/ai-interview",
  "/share/screening",
  "/invite",
];

/** Pages that belong to the developer site. Matched as exact or prefix. */
export const DEVELOPER_PATHS = [
  "/challenges",
  "/interview-questions",
  "/interview-question",
  "/prep",
  "/playgrounds",
  "/play",
  "/blog",
  "/explore",
  "/creators",
  "/creator",
  "/become-creator",
  "/c",
  "/u",
  "/tracks",
  "/dashboard",
  "/candidate",
];

/** The recruiter landing page, served at "/" on the recruiter domain. */
export const RECRUITER_HOME = "/hire";
/** The recruiter domain's sitemap and robots.txt, served at the usual paths there. */
export const RECRUITER_SITEMAP = "/sitemap-recruiter.xml";
export const RECRUITER_ROBOTS = "/robots-recruiter.txt";

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Which site owns a path, or null for pages both sites serve. "/" is the developer home. */
export function siteForPath(pathname: string): SiteKind | null {
  if (pathname === "/") return "developer";
  if (matches(pathname, RECRUITER_PATHS)) return "recruiter";
  if (matches(pathname, DEVELOPER_PATHS)) return "developer";
  return null;
}

export type DomainConfig = {
  developerOrigin: string;
  recruiterOrigin: string;
  /** Old hostnames (no scheme) that should send visitors to the new domains. */
  legacyHosts: string[];
  /** 308 when true, 307 otherwise. Start with 307 so a mistake is not cached by browsers. */
  permanent: boolean;
};

/** Reads the domain split from env vars, or null when it is not set up. */
export function domainConfig(): DomainConfig | null {
  const recruiterOrigin = recruiterConfiguredOrigin();
  const developerOrigin = configuredOrigin();
  if (!recruiterOrigin || !developerOrigin) return null;
  if (hostOf(recruiterOrigin) === hostOf(developerOrigin)) return null;
  const legacyHosts = (process.env.LEGACY_SITE_HOSTS ?? "")
    .split(",")
    .map((h) => normaliseHost(h.trim().replace(/^https?:\/\//i, "").split("/")[0]))
    .filter(Boolean);
  return {
    developerOrigin,
    recruiterOrigin,
    legacyHosts,
    permanent: process.env.DOMAIN_REDIRECTS_PERMANENT === "true",
  };
}

function hostOf(origin: string): string {
  return normaliseHost(new URL(origin).host);
}

/** Lower case, no port, no leading "www.", so www and apex count as the same site. */
export function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}

/** The site a request host belongs to, "legacy" for an old domain, or null for anything else (previews, localhost). */
export function siteForHost(host: string | null | undefined, cfg: DomainConfig): SiteKind | "legacy" | null {
  if (!host) return null;
  const h = normaliseHost(host);
  if (h === hostOf(cfg.developerOrigin)) return "developer";
  if (h === hostOf(cfg.recruiterOrigin)) return "recruiter";
  if (cfg.legacyHosts.includes(h)) return "legacy";
  return null;
}

/** The path a recruiter page has on the recruiter domain: "/hire" is its home, "/". */
export function recruiterPath(pathname: string): string {
  return pathname === RECRUITER_HOME ? "/" : pathname;
}

export type DomainRoute =
  | { kind: "redirect"; url: string; status: 307 | 308 }
  | { kind: "rewrite"; pathname: string };

/**
 * What the proxy should do with a request, or null to serve it as is.
 * `search` includes the leading "?" (or is empty).
 */
export function routeForHost(
  host: string | null | undefined,
  pathname: string,
  search: string,
  cfg: DomainConfig | null,
): DomainRoute | null {
  if (!cfg) return null;
  const site = siteForHost(host, cfg);
  if (!site) return null;
  const status = cfg.permanent ? 308 : 307;
  const owner = siteForPath(pathname);
  const toDeveloper = (): DomainRoute => ({ kind: "redirect", url: cfg.developerOrigin + pathname + search, status });
  const toRecruiter = (): DomainRoute => ({ kind: "redirect", url: cfg.recruiterOrigin + recruiterPath(pathname) + search, status });

  if (site === "legacy") {
    // Webhooks, OAuth callbacks and API clients may not follow redirects.
    if (pathname === "/api" || pathname.startsWith("/api/")) return null;
    return owner === "recruiter" ? toRecruiter() : toDeveloper();
  }

  if (site === "developer") {
    return owner === "recruiter" ? toRecruiter() : null;
  }

  // Recruiter domain.
  if (pathname === "/") return { kind: "rewrite", pathname: RECRUITER_HOME };
  if (pathname === "/sitemap.xml") return { kind: "rewrite", pathname: RECRUITER_SITEMAP };
  if (pathname === "/robots.txt") return { kind: "rewrite", pathname: RECRUITER_ROBOTS };
  if (pathname === RECRUITER_HOME) return { kind: "redirect", url: cfg.recruiterOrigin + "/" + search, status };
  return owner === "developer" ? toDeveloper() : null;
}

/** True when this request host is the recruiter domain. */
export function isRecruiterHost(host: string | null | undefined): boolean {
  const cfg = domainConfig();
  return !!cfg && siteForHost(host, cfg) === "recruiter";
}

/**
 * Absolute URL of a recruiter page, for canonical links and metadata. Points
 * at the recruiter domain once the split is configured, at the main site
 * (with the path unchanged) before that.
 */
export function recruiterUrl(pathname: string): string {
  const cfg = domainConfig();
  return cfg ? cfg.recruiterOrigin + recruiterPath(pathname) : siteOrigin() + pathname;
}

/**
 * Which site this request host is, or null when the domains are not split or
 * the host is neither domain (previews, localhost, an old domain). Null means
 * "show both sites", as before the split.
 */
export function siteForRequestHost(host: string | null | undefined): SiteKind | null {
  const cfg = domainConfig();
  if (!cfg) return null;
  const site = siteForHost(host, cfg);
  return site === "legacy" ? null : site;
}
