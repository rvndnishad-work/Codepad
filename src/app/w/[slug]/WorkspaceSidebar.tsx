"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Plus, ChevronsLeft, ChevronsRight } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import WorkspaceSidebarNav from "./WorkspaceSidebarNav";

const PLAN_BADGES: Record<string, string> = {
  FREE: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
  GROWTH: "text-indigo-600 dark:text-indigo-300 border-indigo-500/25 bg-indigo-500/[0.08]",
  ENTERPRISE: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
  LOCKED: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
};

const STORAGE_KEY = "ws_sidebar_collapsed";

type Membership = { name: string; slug: string; planName: string };

type Props = {
  slug: string;
  workspaceName: string;
  planName: string;
  memberships: Membership[];
  counts: {
    challenges: number;
    interviews: number;
    takeHomes: number;
    candidates: number;
    replays: number;
    members: number;
  };
  user: { name: string | null | undefined; email: string | null | undefined; image: string | null | undefined };
  isAdmin: boolean;
};

export default function WorkspaceSidebar({
  slug,
  workspaceName,
  planName,
  memberships,
  counts,
  user,
  isAdmin,
}: Props) {
  // Collapse is a desktop affordance; persisted so it survives navigation.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      document.body.classList.toggle("sidebar-collapsed", collapsed);
    } catch {
      /* ignore */
    }
    return () => {
      try {
        document.body.classList.remove("sidebar-collapsed");
      } catch {
        /* ignore */
      }
    };
  }, [collapsed]);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <aside
      className={`relative w-full ${
        collapsed ? "md:w-16" : "md:w-64"
      } md:h-full bg-surface/80 border-b md:border-b-0 md:border-r border-border backdrop-blur-md flex flex-col shrink-0 z-30 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
    >
      {/* Edge collapse toggle — straddles the right border (desktop only). */}
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden md:flex absolute -right-3 top-6 z-40 w-6 h-6 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-fg hover:border-accent/50 shadow-sm transition-colors"
      >
        {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Active workspace header */}
      <div className={`border-b border-border ${collapsed ? "p-3 flex justify-center" : "p-4"}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-[11px] shrink-0 select-none"
            title={collapsed ? workspaceName : undefined}
          >
            {workspaceName.substring(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-fg truncate">{workspaceName}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider ${
                    PLAN_BADGES[planName] || PLAN_BADGES.FREE
                  }`}
                >
                  {planName}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Switcher + nav */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-5 ${collapsed ? "px-2" : "px-3"}`}
      >
        {/* Workspace switcher — collapses away to keep the rail focused on nav. */}
        {!collapsed && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
              Your workspaces
            </div>

            {memberships.map((ws) => {
              const isActive = ws.slug === slug;
              return (
                <Link
                  key={ws.slug}
                  href={`/w/${ws.slug}`}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                      : "text-muted hover:text-fg hover:bg-panel/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-500" : "text-muted/60"}`} />
                    <span className="truncate">{ws.name}</span>
                  </div>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider shrink-0 ${
                      isActive ? "text-indigo-500/80" : "text-muted/50"
                    }`}
                  >
                    {ws.planName}
                  </span>
                </Link>
              );
            })}

            <Link
              href="/w/create"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-muted/70 hover:text-fg hover:bg-panel/30 transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New workspace</span>
            </Link>
          </div>
        )}

        <WorkspaceSidebarNav slug={slug} planName={planName} counts={counts} collapsed={collapsed} />
      </div>

      {/* Footer */}
      <div className={`border-t border-border flex flex-col gap-2 ${collapsed ? "p-2 items-center" : "p-3"}`}>
        <Link
          href="/dashboard"
          title={collapsed ? "Personal dashboard" : undefined}
          aria-label="Personal dashboard"
          className={`flex items-center rounded-md bg-panel/40 border border-border text-muted hover:text-fg hover:border-accent/40 transition-colors ${
            collapsed ? "justify-center w-9 h-9" : "justify-between px-2.5 py-2 text-[11px] font-semibold w-full"
          }`}
        >
          {!collapsed && <span>Personal dashboard</span>}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </Link>

        <div
          className={`flex items-center rounded-md border border-border bg-bg/40 ${
            collapsed ? "justify-center p-1.5" : "justify-between p-1.5 gap-2 w-full"
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-7 h-7 rounded-md border border-border bg-surface shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xs font-semibold shrink-0">
                  {user.name?.substring(0, 1).toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-fg truncate">{user.name || "Anonymous"}</div>
                <div className="text-[10px] text-muted truncate">{user.email || "No email"}</div>
              </div>
            </div>
          )}
          <UserMenu user={{ name: user.name, email: user.email, image: user.image }} isAdmin={isAdmin} />
        </div>
      </div>
    </aside>
  );
}
