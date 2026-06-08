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

export const DEFAULT_NAV_LINKS: NavLinkConfig[] = [
  // ── General / Site-wide ──
  { href: "/", label: "Home", status: "visible", group: "general" },
  { href: "/features", label: "Features", status: "visible", group: "general" },
  { href: "/pricing", label: "Pricing", status: "visible", group: "general" },
  { href: "/blog", label: "Blog", status: "visible", group: "general" },

  // ── Candidate-facing ──
  { href: "menu:developers", label: "For Developers Menu", status: "visible", group: "candidate" },
  { href: "/playgrounds", label: "Playgrounds", status: "visible", group: "candidate" },
  { href: "/challenges", label: "Challenges", status: "visible", group: "candidate" },
  { href: "/explore", label: "Explore", status: "visible", group: "candidate" },
  { href: "/interview", label: "Interviews", status: "visible", group: "candidate" },

  // ── Recruiter-facing ──
  { href: "menu:recruiters", label: "For Recruiters Menu", status: "visible", group: "recruiter" },
  { href: "/w", label: "Workspaces", status: "visible", group: "recruiter" },
  { href: "/w/ai-screening", label: "AI Screening", status: "visible", group: "recruiter" },
];
