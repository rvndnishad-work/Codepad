import type { Permission } from "@/lib/permissions/permissions";
import type { SiteKind } from "@/lib/domains";
import type { IconName } from "./AdminLink";

/**
 * The admin sidebar, by who you are helping. Each link names the permission
 * its page requires, so the sidebar only shows what the person can open.
 * `match` lists extra path prefixes that light the link (Content covers four
 * pages, Assistant covers the old /admin/copilot URL).
 *
 * `site` marks a group or link that belongs to one domain: the console opened
 * on Intervutree hides the developer ones, and on DevPrep hides the recruiter
 * ones. Unmarked items show on both. When the domains are not split (local
 * dev, previews) everything shows.
 */
export type AdminNavLink = {
  href: string;
  icon: IconName;
  label: string;
  permission: Permission | "staff";
  exact?: boolean;
  match?: string[];
  site?: SiteKind;
};

export type AdminNavGroup = { label: string | null; site?: SiteKind; links: AdminNavLink[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    links: [
      { href: "/admin", icon: "LayoutDashboard", label: "Home", permission: "staff", exact: true },
      // Every Inbox queue is developer content (blogs, experiences, reports, creators).
      { href: "/admin/inbox", icon: "Inbox", label: "Inbox", permission: "staff", site: "developer" },
    ],
  },
  {
    label: "Recruiters",
    site: "recruiter",
    links: [
      { href: "/admin/recruiters", icon: "BarChart3", label: "Dashboard", permission: "platform:admin" },
      { href: "/admin/workspaces", icon: "Building2", label: "Workspaces", permission: "platform:admin" },
      { href: "/admin/users/recruiters", icon: "UserCog", label: "Recruiter accounts", permission: "user:manage" },
      { href: "/admin/users/candidates", icon: "UserCheck", label: "Candidate accounts", permission: "user:manage" },
      { href: "/admin/interviews", icon: "Briefcase", label: "Interviews", permission: "platform:admin" },
      { href: "/admin/ai-interviews", icon: "Coins", label: "AI credits", permission: "platform:admin" },
      { href: "/admin/demo-requests", icon: "CalendarCheck", label: "Demo requests", permission: "platform:admin" },
      { href: "/admin/pricing", icon: "CreditCard", label: "Pricing", permission: "platform:admin" },
    ],
  },
  {
    label: "Developers",
    site: "developer",
    links: [
      { href: "/admin/developers", icon: "BarChart3", label: "Dashboard", permission: "platform:admin" },
      { href: "/admin/users", icon: "Users", label: "Developer accounts", permission: "user:manage", exact: true },
      {
        href: "/admin/interview-questions",
        icon: "FileText",
        label: "Content",
        permission: "content:curate",
        match: ["/admin/challenges", "/admin/blogs", "/admin/snippets", "/admin/content"],
      },
      {
        href: "/admin/community",
        icon: "MessageCircle",
        label: "Community",
        permission: "comment:moderate",
        match: ["/admin/comments"],
      },
      { href: "/admin/attempts", icon: "Code2", label: "Attempts", permission: "platform:admin" },
      { href: "/admin/creators", icon: "Sparkles", label: "Creators", permission: "creator:review" },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/admin/maintenance", icon: "Wrench", label: "Maintenance", permission: "platform:admin" },
      { href: "/admin/switches", icon: "ToggleRight", label: "Feature switches", permission: "platform:admin" },
      { href: "/admin/jobs", icon: "Activity", label: "Jobs and health", permission: "platform:admin" },
      { href: "/admin/audit", icon: "ScrollText", label: "Audit log", permission: "platform:admin" },
      { href: "/admin/emails", icon: "Mail", label: "Emails", permission: "platform:admin" },
      { href: "/admin/notifications", icon: "Megaphone", label: "Notifications", permission: "platform:admin" },
      { href: "/admin/todos", icon: "ClipboardList", label: "Todos", permission: "platform:admin" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/admin/assistant", icon: "GemmaMark", label: "Assistant", permission: "platform:admin", match: ["/admin/copilot"] },
      { href: "/admin/roles", icon: "ShieldCheck", label: "Roles", permission: "platform:admin" },
      { href: "/admin/settings", icon: "Settings", label: "Settings", permission: "platform:admin" },
    ],
  },
];

/** True when an item marked for `itemSite` belongs on the console opened on `site`. */
export function onSite(itemSite: SiteKind | undefined, site: SiteKind | null | undefined): boolean {
  return !itemSite || !site || itemSite === site;
}

/** Links the holder of `perms` can open, on the domain `site` (null: both). */
export function visibleNav(perms: ReadonlySet<string>, site: SiteKind | null = null): AdminNavGroup[] {
  const can = (p: AdminNavLink["permission"]) => p === "staff" || perms.has(p) || perms.has("*");
  return ADMIN_NAV.filter((g) => onSite(g.site, site))
    .map((g) => ({ ...g, links: g.links.filter((l) => can(l.permission) && onSite(l.site, site)) }))
    .filter((g) => g.links.length > 0);
}
