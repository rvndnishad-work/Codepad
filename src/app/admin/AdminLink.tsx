"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Users, FileText, Settings, Pin, Briefcase, Code2, MessageCircle, Inbox, Building2, Sparkles, Coins, ClipboardList, GraduationCap, HelpCircle, Activity, Megaphone, Mail } from "lucide-react";
import type { ComponentType } from "react";
import GemmaMark from "./copilot/GemmaMark";

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

  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-muted/30 cursor-not-allowed">
        {Icon && <Icon className="w-4 h-4" size={16} />}
        {label}
        <span className="ml-auto text-[9px] font-medium normal-case tracking-normal">soon</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl uppercase tracking-wider transition-all duration-200 ${
        nested
          ? "ml-3 pl-4 pr-3 py-1.5 text-[10px] font-bold border-l border-border/60"
          : "px-3.5 py-2.5 text-xs font-black"
      } ${
        isActive
          ? "bg-violet-500/10 text-violet-400 border-l-2 border-violet-500 pl-3 shadow-[0_0_15px_rgba(139,92,246,0.05)]"
          : "text-muted hover:text-fg hover:bg-panel/40"
      }`}
    >
      {Icon && <Icon className={nested ? "w-3.5 h-3.5" : "w-4 h-4"} size={nested ? 14 : 16} />}
      {label}
    </Link>
  );
}
