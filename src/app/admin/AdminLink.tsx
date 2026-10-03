"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Users, FileText, Settings, Pin, Briefcase, Code2, MessageCircle, Inbox, Building2, Sparkles, Coins, ClipboardList, GraduationCap, HelpCircle, Activity, Megaphone, Mail, ShieldCheck, CreditCard, BarChart3, UserCog, UserCheck, Wrench, ToggleRight, ScrollText } from "lucide-react";
import type { ComponentType } from "react";
import GemmaMark from "./copilot/GemmaMark";
import { useAdminNavCollapsed } from "./admin-nav-context";

// Lucide icons accept className; our custom GemmaMark accepts className + size.
// The shared shape below is the subset every nav icon must support.
type NavIcon = ComponentType<{ className?: string; size?: number }>;

const iconsMap: Record<string, NavIcon> = {
  LayoutDashboard,
  Target,
  Users,
  FileText,
  Settings,
  Pin,
  Briefcase,
  Code2,
  MessageCircle,
  Inbox,
  Building2,
  Sparkles,
  Coins,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Activity,
  Megaphone,
  Mail,
  ShieldCheck,
  CreditCard,
  BarChart3,
  UserCog,
  UserCheck,
  Wrench,
  ToggleRight,
  ScrollText,
  // Custom brand glyph — used for the Gemma Copilot row.
  GemmaMark,
};


export type IconName = keyof typeof iconsMap;

export default function AdminLink({
  href,
  icon,
  label,
  disabled,
  exact,
  nested,
  match,
  badge,
}: {
  href: string;
  icon: IconName;
  label: string;
  disabled?: boolean;
  /** When true, only highlight on exact pathname match. Use for parent links
   *  that have their own child routes (e.g. /admin/users with /candidates,
   *  /recruiters children) so the parent doesn't stay lit on every child. */
  exact?: boolean;
  /** Render as an indented sub-link under a parent group. */
  nested?: boolean;
  /** Extra path prefixes that also light this link. */
  match?: string[];
  /** Small count shown at the end of the row. */
  badge?: { count: number; tone: "warn" | "bad" };
}) {
  const pathname = usePathname();
  const Icon = iconsMap[icon];

  // /admin is always exact (otherwise every admin route would match it).
  // Callers also opt into exact for parents that now have child routes.
  const under = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const isActive =
    href === "/admin" || exact
      ? pathname === href
      : under(href) || (match ?? []).some(under);

  const collapsed = useAdminNavCollapsed();
  const iconClass = `w-4 h-4 shrink-0 ${isActive ? "text-secondary" : "text-subtle"}`;

  if (disabled) {
    return (
      <div className="flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-sm text-subtle/60 cursor-not-allowed">
        {Icon && <Icon className="w-4 h-4 shrink-0" size={16} />}
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && <span className="text-xs">Soon</span>}
      </div>
    );
  }

  const tone = isActive ? "bg-panel text-fg font-medium" : "text-muted hover:text-fg hover:bg-panel";

  if (collapsed) {
    // Icon-only rail with a native tooltip, same as the workspace sidebar.
    return (
      <Link
        href={href}
        title={label}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex items-center justify-center h-9 rounded-lg transition-colors ${tone}`}
      >
        {Icon && <Icon className={iconClass} size={16} />}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-sm transition-colors ${nested ? "ml-4" : ""} ${tone}`}
    >
      {isActive && <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-secondary" />}
      {Icon && <Icon className={iconClass} size={16} />}
      <span className="flex-1 truncate">{label}</span>
      {badge && badge.count > 0 && (
        <span
          className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-medium tabular-nums inline-flex items-center justify-center ${
            badge.tone === "bad" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
          }`}
        >
          {badge.count}
        </span>
      )}
    </Link>
  );
}
