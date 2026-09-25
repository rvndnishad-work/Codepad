"use client";

import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import WorkspaceSidebarNav, { type SidebarCounts } from "./WorkspaceSidebarNav";
import type { PlanDisplay } from "@/lib/workspace/display";

const STORAGE_KEY = "ws_sidebar_collapsed";

type Props = {
  slug: string;
  plan: PlanDisplay;
  counts: SidebarCounts;
  /** Mobile drawer state, owned by the shell so the app bar can toggle it. */
  mobileOpen: boolean;
  onNavigate: () => void;
};

export default function WorkspaceSidebar({ slug, plan, counts, mobileOpen, onNavigate }: Props) {
  // Collapse is a desktop affordance, persisted so it survives navigation.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* storage blocked */
      }
      return next;
    });

  return (
    <aside
      className={`${mobileOpen ? "flex" : "hidden"} md:flex absolute md:relative inset-0 md:inset-auto z-30 w-full ${
        collapsed ? "md:w-16" : "md:w-60"
      } shrink-0 flex-col bg-bg border-r border-border transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none`}
    >
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden md:flex absolute -right-3 top-5 z-40 w-6 h-6 items-center justify-center rounded-full border border-border bg-surface text-subtle hover:text-fg hover:border-border-strong transition-colors"
      >
        {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
      </button>

      <div
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 ${collapsed ? "md:px-2 px-3" : "px-3"}`}
        onClick={(e) => {
          if ((e.target as HTMLElement | null)?.closest("a")) onNavigate();
        }}
      >
        <WorkspaceSidebarNav slug={slug} growthFeatures={plan.growthFeatures} counts={counts} collapsed={collapsed} />
      </div>

    </aside>
  );
}
