"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import WorkspaceSidebarNav, { type SidebarCounts } from "./WorkspaceSidebarNav";
import type { PlanDisplay } from "@/lib/workspace/display";

const STORAGE_KEY = "ws_sidebar_collapsed";

type Props = {
  slug: string;
  plan: PlanDisplay;
  counts: SidebarCounts;
  /** Seat cap for the plan footer; null = unlimited. */
  seatLimit: number | null;
  /** Mobile drawer state, owned by the shell so the app bar can toggle it. */
  mobileOpen: boolean;
  onNavigate: () => void;
};

function PlanFooter({ slug, plan, members, seatLimit }: { slug: string; plan: PlanDisplay; members: number; seatLimit: number | null }) {
  if (plan.onTrial) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-fg">Trial</span>
          <span className="text-muted">
            {plan.trialDaysLeft} {plan.trialDaysLeft === 1 ? "day" : "days"} left
          </span>
        </div>
        <div className="h-1 rounded-full bg-elevated" aria-hidden>
          <div className="h-1 rounded-full bg-secondary" style={{ width: `${Math.round((plan.trialUsed ?? 0) * 100)}%` }} />
        </div>
        <Link
          href={`/w/${slug}?section=billing`}
          className="h-8 flex items-center justify-center rounded-lg bg-secondary text-bg text-[13px] font-medium hover:brightness-110 transition"
        >
          See plans
        </Link>
      </div>
    );
  }
  return (
    <div className="border-t border-border pt-3.5 px-2.5 flex flex-col gap-1">
      <Link href={`/w/${slug}?section=billing`} className="text-[13px] font-medium text-fg hover:text-secondary-soft transition-colors">
        {plan.label} plan
      </Link>
      <div className="text-xs text-subtle">
        {members} {members === 1 ? "seat" : "seats"}
        {seatLimit ? ` of ${seatLimit}` : ""} in use
      </div>
    </div>
  );
}

export default function WorkspaceSidebar({ slug, plan, counts, seatLimit, mobileOpen, onNavigate }: Props) {
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

      <div className={`shrink-0 p-3 flex flex-col gap-3 ${collapsed ? "md:hidden" : ""}`}>
        <PlanFooter slug={slug} plan={plan} members={counts.members} seatLimit={seatLimit} />
        <Link
          href="/dashboard"
          className="flex items-center justify-between px-2.5 h-8 rounded-lg text-[13px] text-muted hover:text-fg hover:bg-panel transition-colors"
        >
          Personal dashboard
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
