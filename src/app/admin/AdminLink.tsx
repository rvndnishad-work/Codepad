"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Users, FileText, Settings, Pin, Briefcase, Code2, MessageCircle, Inbox, Building2 } from "lucide-react";

const iconsMap = {
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
};


export type IconName = keyof typeof iconsMap;

export default function AdminLink({
  href,
  icon,
  label,
  disabled,
}: {
  href: string;
  icon: IconName;
  label: string;
  disabled?: boolean;
}) {
  const pathname = usePathname();
  const Icon = iconsMap[icon];

  // Highlight if pathname matches exactly, or if starting with href (excluding root /admin)
  const isActive = href === "/admin"
    ? pathname === "/admin"
    : pathname.startsWith(href);

  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-muted/30 cursor-not-allowed">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        <span className="ml-auto text-[9px] font-medium normal-case tracking-normal">soon</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
        isActive
          ? "bg-violet-500/10 text-violet-400 border-l-2 border-violet-500 pl-3 shadow-[0_0_15px_rgba(139,92,246,0.05)]"
          : "text-muted hover:text-fg hover:bg-panel/40"
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </Link>
  );
}
