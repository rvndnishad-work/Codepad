import type { Permission } from "@/lib/permissions/permissions";
import type { IconName } from "./AdminLink";

/**
 * The admin sidebar, by who you are helping. Each link names the permission
 * its page requires, so the sidebar only shows what the person can open.
 * `match` lists extra path prefixes that light the link (Content covers four
 * pages, Assistant covers the old /admin/copilot URL).
 */
export type AdminNavLink = {
  href: string;
  icon: IconName;
  label: string;
  permission: Permission | "staff";
  exact?: boolean;
  match?: string[];
};

export type AdminNavGroup = { label: string | null; links: AdminNavLink[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    links: [
      { href: "/admin", icon: "LayoutDashboard", label: "Home", permission: "staff", exact: true },
      { href: "/admin/inbox", icon: "Inbox", label: "Inbox", permission: "staff" },
    ],
  },
  {
    label: "Recruiters",
    links: [
      { href: "/admin/recruiters", icon: "BarChart3", label: "Dashboard", permission: "platform:admin" },
      { href: "/admin/workspaces", icon: "Building2", label: "Workspaces", permission: "platform:admin" },
      { href: "/admin/users/recruiters", icon: "UserCog", label: "Recruiter accounts", permission: "user:manage" },
      { href: "/admin/interviews", icon: "Briefcase", label: "Interviews", permission: "platform:admin" },
      { href: "/admin/ai-interviews", icon: "Coins", label: "AI credits", permission: "platform:admin" },
      { href: "/admin/pricing", icon: "CreditCard", label: "Pricing", permission: "platform:admin" },
    ],
  },
  {
    label: "Developers",
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

/** Links the holder of `perms` can open. */
export function visibleNav(perms: ReadonlySet<string>): AdminNavGroup[] {
  const can = (p: AdminNavLink["permission"]) => p === "staff" || perms.has(p) || perms.has("*");
  return ADMIN_NAV.map((g) => ({ ...g, links: g.links.filter((l) => can(l.permission)) })).filter(
    (g) => g.links.length > 0,
  );
}
