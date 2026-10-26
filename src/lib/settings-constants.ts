export type NavStatus = "visible" | "hidden" | "coming_soon";

export type NavLinkGroup = "general" | "candidate" | "recruiter";

export interface NavLinkConfig {
  href: string;
  label: string;
  status: NavStatus;
  /** Which persona this link belongs to — drives the admin settings grouping. */
  group: NavLinkGroup;
}

/** Site-wide maintenance switch. When `enabled`, every non-admin request is
 *  served a 503 "we'll be back" page by the proxy (see src/proxy.ts), except
 *  for an allowlist (login, auth, admin) so admins can sign in and toggle it
 *  off. `message` is an optional admin note shown on the maintenance screen. */
export type MaintenanceConfig = {
  enabled: boolean;
  message: string;
};

export const DEFAULT_MAINTENANCE: MaintenanceConfig = {
  enabled: false,
  message: "",
};

/**
 * Routes that must always stay publicly reachable, regardless of admin nav
 * settings. The home page is the site's front door — gating it would 404 /
 * redirect the entire public site for every logged-out visitor (and admins
 * can't see the breakage because they bypass the check). Both
 * `validatePageAccess` (read path) and `updateNavLinks` (write path) enforce
 * this, and the admin UI locks these rows to "visible".
 */
export const PROTECTED_ROUTES = new Set<string>(["/"]);

export function isProtectedRoute(href: string): boolean {
  return PROTECTED_ROUTES.has(href);
}

/**
 * One row per item in the site header (src/components/Header.tsx), so every
 * menu entry can be shown, hidden or marked coming soon from
 * /admin/settings. Recruiter menu items are matched by label in the header,
 * since their real hrefs are dynamic (/w/[slug]/...).
 */
export const DEFAULT_NAV_LINKS: NavLinkConfig[] = [
  // ── General / Site-wide ──
  { href: "/", label: "Home", status: "visible", group: "general" },
  { href: "/features", label: "Features", status: "visible", group: "general" },
  { href: "/pricing", label: "Pricing", status: "visible", group: "general" },
  { href: "/about", label: "About us", status: "visible", group: "general" },
  { href: "/blog", label: "Blog", status: "visible", group: "general" },

  // ── Candidate-facing ──
  { href: "menu:developers", label: "For Developers Menu", status: "visible", group: "candidate" },
  { href: "/playgrounds", label: "Playgrounds", status: "visible", group: "candidate" },
  { href: "/interview-questions", label: "Interview Questions", status: "visible", group: "candidate" },
  { href: "/challenges", label: "Challenges", status: "visible", group: "candidate" },
  { href: "/interview", label: "Interviews", status: "visible", group: "candidate" },
  { href: "/candidate/prompt-practice", label: "Prompt Arena", status: "visible", group: "candidate" },
  { href: "/prep", label: "Prep Journeys", status: "visible", group: "candidate" },
  { href: "/candidate/ai-code-review", label: "Review the AI's Code", status: "visible", group: "candidate" },
  { href: "/creators", label: "Creators", status: "visible", group: "candidate" },
  { href: "/explore", label: "Explore", status: "visible", group: "candidate" },

  // ── Recruiter-facing ──
  { href: "menu:recruiters", label: "For Recruiters Menu", status: "visible", group: "recruiter" },
  { href: "/w", label: "Workspaces", status: "visible", group: "recruiter" },
  { href: "/w/ai-screening", label: "AI Screening", status: "visible", group: "recruiter" },
  { href: "/hire#sandbox", label: "Live Interviews", status: "visible", group: "recruiter" },
  { href: "/hire", label: "Platform Overview", status: "visible", group: "recruiter" },
  { href: "/docs", label: "Docs", status: "visible", group: "recruiter" },
];

/**
 * The setting that governs `path`: an exact match, else the longest href that
 * is a whole-segment prefix of it ("/interview" covers "/interview/new" but
 * not "/interview-questions"). The home page only matches itself.
 */
export function navLinkFor<T extends Pick<NavLinkConfig, "href">>(links: T[], path: string): T | undefined {
  let best: T | undefined;
  for (const l of links) {
    const hit = path === l.href || (l.href.startsWith("/") && l.href !== "/" && path.startsWith(l.href + "/"));
    if (hit && (!best || l.href.length > best.href.length)) best = l;
  }
  return best;
}
