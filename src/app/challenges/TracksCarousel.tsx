"use client";

import { useMemo, useState } from "react";
import { Award, Layers, Sparkles, ChevronRight, CheckCircle2, Download, Trophy } from "lucide-react";
import type { ChallengeListItem } from "./ChallengeList";

type TrackDef = {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  color: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
};

const TRACKS_DEF: TrackDef[] = [
  {
    id: "react-architect",
    title: "Frontend React Architect",
    subtitle: "Master hooks, state machines, and performant React architectures.",
    tags: ["react", "hooks", "state", "interactive"],
    color: "from-cyan-500/20 via-blue-500/10 to-indigo-500/5",
    borderColor: "group-hover:border-cyan-500/30",
    glowColor: "bg-cyan-500",
    accentColor: "#06b6d4",
  },
  {
    id: "ts-performance",
    title: "TypeScript Performance Master",
    subtitle: "Excel at strict typing, data models, and high-performance algorithms.",
    tags: ["typescript", "algorithms", "performance"],
    color: "from-indigo-500/20 via-purple-500/10 to-pink-500/5",
    borderColor: "group-hover:border-indigo-500/30",
    glowColor: "bg-indigo-500",
    accentColor: "#6366f1",
  },
  {
    id: "backend-system",
    title: "Backend System Engineer",
    subtitle: "Optimize databases, custom execution scripts, and core architecture.",
    tags: ["vanilla", "data-structures", "node", "algorithms"],
    color: "from-emerald-500/20 via-teal-500/10 to-cyan-500/5",
    borderColor: "group-hover:border-emerald-500/30",
    glowColor: "bg-emerald-500",
    accentColor: "#10b981",
  }
];

export default function TracksCarousel({
  items,
  signedIn,
}: {
  items: ChallengeListItem[];
  signedIn: boolean;
}) {
  const tracksWithProgress = useMemo(() => {
    return TRACKS_DEF.map((track) => {
      // Find challenges that have tags associated with this track
      const matchingChallenges = items.filter((c) =>
        c.tags.some((t) => track.tags.includes(t.toLowerCase()))
      );

      const totalCount = matchingChallenges.length || 3; // Fallback to 3 if database is empty
      const passedCount = matchingChallenges.filter(
        (c) => c.userStatus === "passed"
      ).length;

      // Simulate some progress for guests to show visual appeal, or keep it strict
      const solved = passedCount;
      const progress = Math.min(100, Math.round((solved / totalCount) * 100));
      const completed = progress === 100;

      return {
        ...track,
        totalCount,
        solved,
        progress,
        completed,
      };
    });
  }, [items]);

  const downloadBadge = (trackTitle: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFE600" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#0B0F19" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFE600"/>
          <stop offset="50%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#06b6d4"/>
        </linearGradient>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&amp;family=Inter:wght@400;500;800;900&amp;display=swap');
          .badge-title { font-family: 'Outfit', sans-serif; font-weight: 900; }
          .badge-text { font-family: 'Inter', sans-serif; }
        </style>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="#0B0F19"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      
      <!-- Premium Borders -->
      <rect x="25" y="25" width="750" height="450" rx="24" fill="none" stroke="url(#border-grad)" stroke-width="2.5" opacity="0.35"/>
      <rect x="35" y="35" width="730" height="430" rx="18" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.05"/>
      
      <!-- Stamp Design Top Right -->
      <circle cx="700" cy="80" r="30" fill="none" stroke="#FFE600" stroke-width="1" stroke-dasharray="4 4" opacity="0.3"/>
      <path d="M 685 80 L 715 80 M 700 65 L 700 95" stroke="#FFE600" stroke-width="1" opacity="0.2"/>

      <!-- Header Label -->
      <g transform="translate(400, 110)">
        <text text-anchor="middle" fill="#FFE600" class="badge-text" font-size="12" font-weight="900" letter-spacing="5">INTERVIEWPAD ACADEMY</text>
      </g>
      
      <!-- Certificate Icon Stamp -->
      <g transform="translate(400, 180) scale(1.5)">
        <path d="M -12 -5 L -8 -15 L 8 -15 L 12 -5 L 0 5 Z" fill="#FFE600" opacity="0.15"/>
        <circle cx="0" cy="0" r="10" fill="none" stroke="#FFE600" stroke-width="1.5"/>
        <path d="M -4 10 L -6 22 L 0 17 L 6 22 L 4 10" fill="none" stroke="#FFE600" stroke-width="1.5"/>
      </g>
      
      <!-- Track Title -->
      <g transform="translate(400, 280)">
        <text text-anchor="middle" fill="#F3F4F6" class="badge-title" font-size="34" font-weight="900" letter-spacing="1">${trackTitle.toUpperCase()}</text>
      </g>
      
      <!-- Subtitle -->
      <g transform="translate(400, 325)">
        <text text-anchor="middle" fill="#94A3B8" class="badge-text" font-size="13" font-weight="500">Has successfully completed the curriculum track requirements and code validations.</text>
      </g>
      
      <!-- Footer details -->
      <g transform="translate(400, 420)">
        <text text-anchor="middle" fill="#64748B" class="badge-text" font-size="10" font-weight="800" letter-spacing="3.5">VERIFIED PLATFORM CREDENTIAL</text>
      </g>
    </svg>`;
    
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const trigger = document.createElement("a");
    trigger.href = url;
    trigger.download = `interviewpad-${trackTitle.toLowerCase().replace(/\s+/g, "-")}-badge.svg`;
    trigger.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="flex items-end justify-between border-b border-border/40 pb-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-violet-400" />
            Curated Paths
          </span>
          <h2 className="text-xl md:text-2xl font-black text-fg tracking-tight">
            Developer Career Tracks
          </h2>
        </div>
        <span className="text-xs text-muted hidden sm:inline">Dynamic milestones</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tracksWithProgress.map((track) => {
          // Premium dynamic backgrounds for both light and dark modes matching their specific track identities
          const trackCardStyles: Record<string, string> = {
            "react-architect": "bg-gradient-to-br from-cyan-50/30 via-white to-white dark:bg-[#0c182c] dark:from-transparent hover:bg-cyan-50/60 hover:dark:bg-[#10233e] border border-cyan-100/70 dark:border-transparent shadow-[0_4px_20px_rgba(6,182,212,0.02)]",
            "ts-performance": "bg-gradient-to-br from-indigo-50/30 via-white to-white dark:bg-[#16122d] dark:from-transparent hover:bg-indigo-50/60 hover:dark:bg-[#20193e] border border-indigo-100/70 dark:border-transparent shadow-[0_4px_20px_rgba(99,102,241,0.02)]",
            "backend-system": "bg-gradient-to-br from-emerald-50/30 via-white to-white dark:bg-[#0b1c1e] dark:from-transparent hover:bg-emerald-50/60 hover:dark:bg-[#112d2d] border border-emerald-100/70 dark:border-transparent shadow-[0_4px_20px_rgba(16,185,129,0.02)]",
          };
          const cardClass = trackCardStyles[track.id] || "bg-slate-50 dark:bg-[#131522] border border-border dark:border-transparent";

          return (
            <div
              key={track.id}
              className={`group relative rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${cardClass}`}
            >
              {/* Background gradient washes */}
              <div className={`absolute inset-0 bg-gradient-to-b ${track.color} opacity-40 group-hover:opacity-75 transition-opacity duration-300 -z-10`} />
              
              <div className="p-5 space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: track.accentColor }} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                      {track.tags[0]} path
                    </span>
                  </div>
                  {track.completed ? (
                    <Trophy className="w-4 h-4 text-[#FFE600] animate-bounce" />
                  ) : (
                    <Layers className="w-4 h-4 text-muted/40" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-fg tracking-tight leading-snug group-hover:text-accent transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed line-clamp-2">
                    {track.subtitle}
                  </p>
                </div>
              </div>

              {/* Progress & Actions Gutter */}
              <div className="p-5 pt-0 border-t border-border/30 dark:border-transparent bg-surface/40 dark:bg-black/10">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted mb-2">
                  <span>Track progress</span>
                  <span className="font-mono text-fg">{track.progress}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#202334] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${track.completed ? 'bg-emerald-500' : 'bg-accent'}`}
                    style={{ width: `${track.progress}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] font-bold font-mono text-muted/70">
                    {track.solved} of {track.totalCount} completed
                  </span>

                  {track.completed ? (
                    <button
                      onClick={() => downloadBadge(track.title)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500 hover:text-bg text-[10px] font-black text-emerald-400 uppercase tracking-wider transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Claim Badge
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-black/30 border border-border dark:border-transparent text-[9px] font-bold uppercase tracking-wider text-muted/60">
                      Incomplete
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
