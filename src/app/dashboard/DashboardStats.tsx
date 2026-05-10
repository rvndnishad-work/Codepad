"use client";

import { Box, Eye, Globe, Lock, Star, TrendingUp } from "lucide-react";

type StatsProps = {
  total: number;
  publicCount: number;
  privateCount: number;
  totalViews: number;
  pinnedCount: number;
};

export default function DashboardStats({ stats }: { stats: StatsProps }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Total Card */}
      <div className="col-span-2 rounded-3xl border border-border bg-panel p-6 flex flex-col justify-between overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] transition-transform group-hover:scale-125">
          <Box className="w-32 h-32" />
        </div>
        <div>
          <h3 className="text-muted text-sm font-medium flex items-center gap-2 mb-1">
            <Box className="w-4 h-4 text-accent" />
            Total Snippets
          </h3>
          <div className="text-4xl font-bold tracking-tight text-fg">{stats.total}</div>
        </div>
        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-1.5 text-xs text-subtle">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            {stats.publicCount} Public
          </div>
          <div className="flex items-center gap-1.5 text-xs text-subtle">
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
            {stats.privateCount} Private
          </div>
        </div>
      </div>

      {/* Views Card */}
      <div className="rounded-3xl border border-border bg-panel p-6 flex flex-col justify-between group">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 transition-colors group-hover:bg-blue-500/20">
          <Eye className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-fg">{stats.totalViews}</div>
          <div className="text-xs text-muted font-medium flex items-center gap-1">
            Total Views
            <TrendingUp className="w-3 h-3 text-green-400" />
          </div>
        </div>
      </div>

      {/* Pinned Card */}
      <div className="rounded-3xl border border-border bg-panel p-6 flex flex-col justify-between group">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 transition-colors group-hover:bg-amber-500/20">
          <Star className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-fg">{stats.pinnedCount}</div>
          <div className="text-xs text-muted font-medium">Favorite Snippets</div>
        </div>
      </div>
    </div>
  );
}
