"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Users, FileText, Settings, Pin, Briefcase, Code2, MessageCircle, Inbox, Building2, Sparkles, Coins, ClipboardList, GraduationCap, HelpCircle, Activity, Megaphone, Mail, ShieldCheck, CreditCard } from "lucide-react";
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
}) {
  const pathname = usePathname();
  const Icon = iconsMap[icon];

  // /admin is always exact (otherwise every admin route would match it).
  // Callers also opt into exact for parents that now have child routes.
  const isActive =
    href === "/admin" || exact
      ? pathname === href
      : pathname.startsWith(href);

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
    </Link>
  );
}
