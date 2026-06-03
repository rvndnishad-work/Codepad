"use client";

import { useEffect, useState } from "react";
import { Code2, Newspaper, Trophy, Compass } from "lucide-react";
import DashboardList from "./DashboardList";
import BlogsTab from "./BlogsTab";
import ChallengesTab from "./ChallengesTab";
import DashboardFeed from "./DashboardFeed";
import type { SnippetItem, BlogItem, ChallengeItem, FeedItem } from "./types";

type TabId = "snippets" | "blogs" | "challenges" | "discover";

const TABS: { id: TabId; label: string; icon: typeof Code2 }[] = [
  { id: "snippets", label: "Snippets", icon: Code2 },
  { id: "blogs", label: "Blogs", icon: Newspaper },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "discover", label: "Discover", icon: Compass },
];

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

  return (
    <section className="rounded-3xl border border-border bg-surface">
      <nav
        role="tablist"
        aria-label="Dashboard workspace"
        className="flex items-center gap-1 overflow-x-auto px-2 pt-2 border-b border-border"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => select(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                isActive
                  ? "border-accent text-fg"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              <span
                className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                  isActive ? "bg-accent/15 text-accent" : "bg-panel text-muted"
                }`}
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 md:p-6">
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
