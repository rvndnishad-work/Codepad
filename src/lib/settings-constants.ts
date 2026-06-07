export type NavStatus = "visible" | "hidden" | "coming_soon";

export type NavLinkGroup = "general" | "candidate" | "recruiter";

export interface NavLinkConfig {
  href: string;
  label: string;
  status: NavStatus;
  /** Which persona this link belongs to — drives the admin settings grouping. */
  group: NavLinkGroup;
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
