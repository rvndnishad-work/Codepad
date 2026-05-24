"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Briefcase, FileVideo, Users, CreditCard } from "lucide-react";

type Props = {
  workspaceId: string;
  counts: {
    members: number;
    challenges: number;
    interviews: number;
    replays: number;
  };
};

export default function WorkspaceTabs({ workspaceId, counts }: Props) {
  const pathname = usePathname();
  const base = `/admin/workspaces/${workspaceId}`;

  const tabs = [
    { href: base, label: "Overview", icon: LayoutDashboard, count: null as number | null },
    { href: `${base}/challenges`, label: "Challenges", icon: Target, count: counts.challenges },
    { href: `${base}/interviews`, label: "Interviews", icon: Briefcase, count: counts.interviews },
    { href: `${base}/replays`, label: "Replays", icon: FileVideo, count: counts.replays },
    { href: `${base}/members`, label: "Members", icon: Users, count: counts.members },
    { href: `${base}/billing`, label: "Billing", icon: CreditCard, count: null },
  ];

  return (
    <nav className="flex items-center gap-1 border-b border-border overflow-x-auto -mx-1 px-1" aria-label="Workspace sections">
      {tabs.map((tab) => {
        const isActive = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative inline-flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap ${
              isActive
                ? "text-fg"
                : "text-muted hover:text-fg"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-500" : "text-muted/60"}`} />
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold tabular-nums ${
                  isActive
                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                    : "bg-panel/60 text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-[2px] bg-indigo-500 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
