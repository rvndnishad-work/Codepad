"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Compass,
  Trophy,
  Briefcase,
  Clock,
  UserCircle2,
  FileVideo,
  Users,
  CreditCard,
  Sparkles,
} from "lucide-react";

type Props = {
  slug: string;
  counts: {
    challenges: number;
    interviews: number;
    takeHomes: number;
    candidates: number;
    replays: number;
    members: number;
  };
};

type Item = {
  section: string;
  label: string;
  icon: typeof Compass;
  count?: number | null;
};

export default function WorkspaceSidebarNav({ slug, counts }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeSection = params.get("section") || "overview";

  const onWorkspaceRoute = pathname === `/w/${slug}`;

  const operational: Item[] = [
    { section: "overview", label: "Overview", icon: Compass, count: null },
    { section: "challenges", label: "Challenges", icon: Trophy, count: counts.challenges },
    { section: "interviews", label: "Interviews", icon: Briefcase, count: counts.interviews },
    { section: "take-homes", label: "Take-homes", icon: Clock, count: counts.takeHomes },
    { section: "candidates", label: "Candidates", icon: UserCircle2, count: counts.candidates },
    { section: "replays", label: "Replays", icon: FileVideo, count: counts.replays },
  ];

  const admin: Item[] = [
    { section: "members", label: "Members", icon: Users, count: counts.members },
    { section: "billing", label: "Billing", icon: CreditCard, count: null },
    { section: "integrations", label: "Integrations", icon: Sparkles, count: null },
  ];

  const renderItem = (item: Item) => {
    const isActive = onWorkspaceRoute && activeSection === item.section;
    const Icon = item.icon;
    const href = item.section === "overview" ? `/w/${slug}` : `/w/${slug}?section=${item.section}`;
    return (
      <Link
        key={item.section}
        href={href}
        className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
          isActive
            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
            : "text-muted hover:text-fg hover:bg-panel/40"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-500" : "text-muted/60"}`} />
          <span className="truncate">{item.label}</span>
        </span>
        {item.count !== null && item.count !== undefined && (
          <span
            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold tabular-nums shrink-0 ${
              isActive
                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                : "bg-panel/60 text-muted/70"
            }`}
          >
            {item.count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
          Workspace
        </div>
        {operational.map(renderItem)}
      </div>

      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
          Settings
        </div>
        {admin.map(renderItem)}
      </div>
    </>
  );
}
