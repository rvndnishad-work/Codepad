"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Users, FileText, Settings, Pin, Briefcase, Code2, MessageCircle, Inbox } from "lucide-react";

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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
        isActive
          ? "bg-surface text-fg border-l-2 border-violet-500 rounded-l-none pl-2.5"
          : "text-muted hover:text-fg hover:bg-surface"
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </Link>
  );
}
