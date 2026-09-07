"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Code2, Newspaper, Trophy, Compass, Telescope } from "lucide-react";
import DashboardList from "./DashboardList";
import BlogsTab from "./BlogsTab";
import ChallengesTab from "./ChallengesTab";
import DashboardFeed from "./DashboardFeed";
import type { SnippetItem, BlogItem, ChallengeItem, FeedItem } from "./types";

type TabId = "snippets" | "blogs" | "challenges" | "discover";

const TABS: { id: TabId; label: string; icon: typeof Code2; accent: string; blurb: string }[] = [
  { id: "snippets", label: "Star Chart", icon: Code2, accent: "#8b93ff", blurb: "Every snippet you launched into orbit" },
  { id: "blogs", label: "Transmissions", icon: Newspaper, accent: "#22d3ee", blurb: "Stories beamed back to the galaxy" },
  { id: "challenges", label: "Missions", icon: Trophy, accent: "#ffd166", blurb: "Trials you designed for other pilots" },
  { id: "discover", label: "Deep Field", icon: Compass, accent: "#ff2fb3", blurb: "Signals from crews you follow" },
];

/**
 * Observatory deck: identical tab state, hash sync and content components —
 * reskinned as galaxy sectors with an animated sector selector and a
 * GSAP crossfade whenever the sector changes.
 */
export default function DashboardWorkspace({
  snippets,
  blogs,
  challenges,
  following,
  trending,
}: {
  snippets: SnippetItem[];
  blogs: BlogItem[];
  challenges: ChallengeItem[];
  following: FeedItem[];
  trending: FeedItem[];
}) {
  const [active, setActive] = useState<TabId>("snippets");
  const panel = useRef<HTMLDivElement>(null);

  // Hydrate from hash so the tab is bookmarkable / survives reloads.
  useEffect(() => {
    const fromHash = (window.location.hash.replace("#", "") || "") as TabId;
    if (TABS.some((t) => t.id === fromHash)) setActive(fromHash);
    const onHash = () => {
      const h = (window.location.hash.replace("#", "") || "snippets") as TabId;
      if (TABS.some((t) => t.id === h)) setActive(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Crossfade + rise whenever the sector changes.
  useLayoutEffect(() => {
    if (!panel.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      panel.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", overwrite: "auto" }
    );
  }, [active]);

  function select(id: TabId) {
    setActive(id);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  }

  const counts: Record<TabId, number> = {
    snippets: snippets.length,
    blogs: blogs.length,
    challenges: challenges.length,
    discover: following.length + trending.length,
  };
  const current = TABS.find((t) => t.id === active)!;

  return (
    <section className="gx gx-panel overflow-hidden rounded-[28px]">
      {/* sector selector */}
      <div className="border-b border-white/10 px-4 pt-4 md:px-6">
        <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[rgba(238,240,255,0.42)]">
          <Telescope className="h-3.5 w-3.5 text-[#ffd166]" />
          Observatory deck — pick a sector
        </p>
        <nav role="tablist" aria-label="Dashboard workspace" className="flex items-center gap-2 overflow-x-auto pb-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => select(t.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? "gx-tab-active text-white"
                    : "border-white/10 bg-black/20 text-[rgba(238,240,255,0.6)] hover:border-white/25 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" style={{ color: isActive ? t.accent : undefined }} />
                <span>{t.label}</span>
                <span
                  className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums"
                  style={isActive ? { background: `${t.accent}26`, color: t.accent } : { background: "rgba(255,255,255,0.06)", color: "rgba(238,240,255,0.5)" }}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-b border-white/10 px-4 py-3 md:px-6">
        <p className="text-xs text-[rgba(238,240,255,0.55)]">
          <span className="font-bold" style={{ color: current.accent }}>{current.label}</span>
          {" — "}{current.blurb}
        </p>
      </div>

      <div ref={panel} className="p-4 md:p-6">
        {active === "snippets" && <DashboardList initial={snippets} />}
        {active === "blogs" && <BlogsTab initial={blogs} />}
        {active === "challenges" && <ChallengesTab initial={challenges} />}
        {active === "discover" && (
          <DashboardFeed following={following} trending={trending} />
        )}
      </div>
    </section>
  );
}
