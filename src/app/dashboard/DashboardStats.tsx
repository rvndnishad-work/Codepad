"use client";

import { Box, Eye, Globe, Lock, Star, Newspaper, Trophy } from "lucide-react";

type StatsProps = {
  total: number;
  publicCount: number;
  privateCount: number;
  totalViews: number;
  pinnedCount: number;
  blogsCount: number;
  challengesCount: number;
};

export default function DashboardStats({ stats }: { stats: StatsProps }) {
  const items: { icon: typeof Box; label: string; value: number | string; hint?: string }[] = [
    { icon: Box, label: "Snippets", value: stats.total, hint: `${stats.publicCount} public · ${stats.privateCount} private` },
    { icon: Newspaper, label: "Blogs", value: stats.blogsCount },
    { icon: Trophy, label: "Challenges", value: stats.challengesCount },
    { icon: Eye, label: "Total views", value: stats.totalViews },
    { icon: Star, label: "Pinned", value: stats.pinnedCount },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-panel"
          >
            <div className="w-9 h-9 rounded-xl bg-surface border border-border grid place-items-center shrink-0">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tabular-nums text-fg leading-none">{item.value}</div>
              <div className="text-[11px] text-muted mt-1 truncate">{item.label}</div>
              {item.hint && (
                <div className="text-[10px] text-muted/60 mt-0.5 truncate">{item.hint}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
