"use client";

import { useState, useTransition, useEffect, Fragment } from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  Clock, 
  Award,
  Search,
  Filter,
  Trash2,
  Lock,
  Globe,
  Plus,
  Trophy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  MoreVertical,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { updateWorkspacePlanAction, deleteWorkspaceAction } from "./actions";

type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planName: string;
  createdAt: string;
  memberCount: number;
  challengeCount: number;
  takeHomeCount: number;
  completedTakeHomes: number;
  atsProvider: string | null;
  members: { name: string | null; email: string | null; role: string }[];
};

type Props = {
  workspaces: WorkspaceItem[];
};

const PLAN_BADGES: Record<string, string> = {
  FREE: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
  GROWTH: "text-indigo-600 dark:text-indigo-300 border-indigo-500/25 bg-indigo-500/[0.08]",
  ENTERPRISE: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
  LOCKED: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]"
};

export default function WorkspacesClientSurface({ workspaces }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // Row UI Popover State trackers
  const [activeMenuWorkspaceId, setActiveMenuWorkspaceId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | null>(null);

  // Close plan menu on outside click or Escape
  useEffect(() => {
    if (!activeMenuWorkspaceId) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-plan-menu]") && !target.closest("[data-plan-trigger]")) {
        setActiveMenuWorkspaceId(null);
        setMenuPos(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenuWorkspaceId(null);
        setMenuPos(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [activeMenuWorkspaceId]);

  const togglePlanMenu = (workspaceId: string, btn: HTMLButtonElement) => {
    if (activeMenuWorkspaceId === workspaceId) {
      setActiveMenuWorkspaceId(null);
      setMenuPos(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
    setActiveMenuWorkspaceId(workspaceId);
  };

  // Filter workspaces locally based on search query and selected plan tier
  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesSearch = 
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = selectedPlan === "ALL" || ws.planName === selectedPlan;

    return matchesSearch && matchesPlan;
  });

  // Action: update workspace plan name
  const handleUpdatePlan = (workspaceId: string, newPlanName: string) => {
    setActiveMenuWorkspaceId(null);
    setMenuPos(null);
    startTransition(async () => {
      try {
        await updateWorkspacePlanAction(workspaceId, newPlanName);
        toast.success(`Workspace plan updated to ${newPlanName}!`);
      } catch (err: any) {
        toast.error(err.message || "Failed to update workspace plan.");
      }
    });
  };

  // Action: hard delete workspace
  const handleDeleteWorkspace = (workspaceId: string) => {
    setConfirmDeleteId(null);
    startTransition(async () => {
      try {
        await deleteWorkspaceAction(workspaceId);
        toast.success("Workspace deleted successfully.");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete workspace.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar Card */}
      <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        
        {/* Search Bar input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 w-4 h-4 text-muted/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by corporate name or URL slug..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40 placeholder:text-muted/40 transition-colors"
          />
        </div>

        {/* Plan Filters dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted hidden sm:inline">
            Plan Tier:
          </span>
          <div className="relative flex items-center">
            <Filter className="absolute left-3 w-3.5 h-3.5 text-muted/50" />
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40 appearance-none font-bold cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="FREE">Free Trial</option>
              <option value="GROWTH">Growth seat plan</option>
              <option value="ENTERPRISE">Enterprise Custom</option>
              <option value="LOCKED">Suspended / Locked</option>
            </select>
            <ChevronDown className="absolute right-3.5 w-3.5 h-3.5 text-muted/50 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* Main Workspace Ledger List Card */}
      <div className="rounded-3xl border border-border bg-surface/50 backdrop-blur-md overflow-visible relative shadow-lg">
        
        {/* Loading overlay spinner during transitions */}
        {isPending && (
          <div className="absolute inset-0 bg-bg/75 backdrop-blur-[2px] flex items-center justify-center z-50 rounded-3xl animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-3 bg-surface border border-border p-6 rounded-2xl shadow-2xl backdrop-blur-lg">
              <RefreshCw className="w-6 h-6 text-accent animate-spin" />
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Updating DB state...</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-elevated/60 border-b border-border text-muted uppercase font-semibold text-[10px] tracking-[0.14em]">
                <th className="px-6 py-3.5 font-semibold">Corporate Tenant</th>
                <th className="px-6 py-3.5 font-semibold">Billing Plan</th>
                <th className="px-6 py-3.5 font-semibold">Assets &amp; Seats</th>
                <th className="px-6 py-3.5 font-semibold">Stripe Reference</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredWorkspaces.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-muted">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-soft mb-4">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-semibold text-fg">No corporate hubs found</h4>
                    <p className="text-xs text-muted/70 max-w-xs mx-auto leading-relaxed mt-1">
                      No corporate workspaces match the search query or plan filter constraints.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWorkspaces.map((ws) => {
                  const createdDate = new Date(ws.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  });

                  const isExpanded = expandedWorkspaceId === ws.id;

                  return (
                    <Fragment key={ws.id}>
                      <tr
                        className={`group border-b border-border hover:bg-panel/40 transition-colors duration-150 ${isExpanded ? "bg-panel/40" : ""}`}
                      >

                        {/* Company Tenant */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setExpandedWorkspaceId(isExpanded ? null : ws.id)}
                              className="p-1 rounded-md text-muted/60 hover:text-fg hover:bg-panel/40 transition-colors active:scale-90 cursor-pointer shrink-0"
                              title={isExpanded ? "Collapse details" : "Expand details"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-accent" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <div
                              onClick={() => setExpandedWorkspaceId(isExpanded ? null : ws.id)}
                              className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-[11px] shrink-0 select-none group-hover:border-indigo-500/30 transition-colors cursor-pointer"
                            >
                              {ws.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/admin/workspaces/${ws.id}`}
                                className="font-semibold text-fg text-sm tracking-tight hover:text-accent transition-colors cursor-pointer select-none truncate inline-block max-w-full"
                              >
                                {ws.name}
                              </Link>
                              <div className="text-[11px] text-muted/70 font-mono mt-0.5 truncate">
                                /{ws.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Billing Plan */}
                        <td className="px-6 py-4 align-middle">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${PLAN_BADGES[ws.planName] || PLAN_BADGES.FREE}`}>
                            {ws.planName}
                          </span>
                        </td>

                        {/* Assets & Seats — single row of consistent stats */}
                        <td className="px-6 py-4 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-4 text-[12px]">
                            <span className="inline-flex items-center gap-1.5 text-fg font-medium" title="Active seats">
                              <Users className="w-3.5 h-3.5 text-indigo-500/80 shrink-0" />
                              <span className="tabular-nums">{ws.memberCount}</span>
                              <span className="text-muted/70 font-normal">seat{ws.memberCount === 1 ? "" : "s"}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-fg font-medium" title="Challenges">
                              <Trophy className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                              <span className="tabular-nums">{ws.challengeCount}</span>
                              <span className="text-muted/70 font-normal">test{ws.challengeCount === 1 ? "" : "s"}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-fg font-medium" title="Take-homes (completed / total)">
                              <Clock className="w-3.5 h-3.5 text-purple-400/80 shrink-0" />
                              <span className="tabular-nums">{ws.completedTakeHomes}/{ws.takeHomeCount}</span>
                              <span className="text-muted/70 font-normal">run{ws.takeHomeCount === 1 ? "" : "s"}</span>
                            </span>
                          </div>
                        </td>

                        {/* Stripe Reference */}
                        <td className="px-6 py-4 align-middle">
                          {ws.stripeCustomerId ? (
                            <Link
                              href={`https://dashboard.stripe.com/customers/${ws.stripeCustomerId}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/[0.06] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors font-mono text-[11px] font-medium"
                            >
                              <Globe className="w-3 h-3 opacity-70" />
                              <span className="truncate max-w-[140px]">{ws.stripeCustomerId}</span>
                            </Link>
                          ) : (
                            <span className="text-[11px] text-muted/60 font-medium italic select-none">
                              Trial account
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right relative align-middle">
                          <div className="flex items-center justify-end gap-2">

                            {confirmDeleteId === ws.id ? (
                              <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-200">
                                <button
                                  onClick={() => handleDeleteWorkspace(ws.id)}
                                  className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold uppercase text-[10px] tracking-wider transition-colors shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-3 py-1.5 rounded-md bg-panel border border-border text-muted font-semibold uppercase text-[10px] tracking-wider hover:text-fg transition-colors active:scale-95 cursor-pointer whitespace-nowrap"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  data-plan-trigger
                                  onClick={(e) => togglePlanMenu(ws.id, e.currentTarget)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-panel/40 border border-border hover:border-accent/40 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-fg hover:bg-elevated transition-colors active:scale-95 cursor-pointer whitespace-nowrap"
                                >
                                  <span>Manage plan</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-muted/50 shrink-0" />
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveMenuWorkspaceId(null);
                                    setMenuPos(null);
                                    setConfirmDeleteId(ws.id);
                                  }}
                                  className="w-8 h-8 rounded-md bg-rose-500/[0.08] border border-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors shrink-0 cursor-pointer active:scale-95"
                                  title="Evict workspace"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                          </div>
                        </td>

                      </tr>

                      {/* Expandable row detail container */}
                      {isExpanded && (
                        <tr className="bg-panel/20 border-b border-border select-text">
                          <td colSpan={5} className="px-8 py-6 text-fg">
                            <div className="space-y-5 animate-in slide-in-from-top-3 duration-250">

                              {/* Metadata strip */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted/70 font-mono pb-4 border-b border-border">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="text-muted/45 uppercase tracking-wider text-[10px]">ID</span>
                                  <span>{ws.id}</span>
                                </span>
                                <span className="text-muted/25">·</span>
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="text-muted/45 uppercase tracking-wider text-[10px]">Created</span>
                                  <span>{createdDate}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                              {/* Left: Teammates */}
                              <div className="space-y-2.5">
                                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5 text-indigo-500/80" />
                                  Teammates &amp; seats
                                  <span className="text-muted/50 font-medium normal-case tracking-normal">({ws.members.length})</span>
                                </h4>
                                <div className="rounded-xl border border-border bg-bg/40 divide-y divide-border overflow-hidden">
                                  {ws.members.length === 0 ? (
                                    <div className="p-4 text-xs text-muted/60 italic">No registered teammates.</div>
                                  ) : (
                                    ws.members.map((m, idx) => (
                                      <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-panel/30 transition-colors">
                                        <div className="min-w-0">
                                          <div className="font-semibold text-fg text-sm truncate">{m.name || "Anonymous Recruiter"}</div>
                                          <div className="text-[11px] text-muted/65 font-mono mt-0.5 truncate">{m.email}</div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-md bg-panel/50 border border-border text-[10px] font-semibold uppercase tracking-wider text-muted shrink-0">
                                          {m.role}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Right: Integrations + Billing */}
                              <div className="space-y-2.5">
                                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted flex items-center gap-2">
                                  <Globe className="w-3.5 h-3.5 text-indigo-500/80" />
                                  Integrations &amp; billing
                                </h4>

                                <div className="rounded-xl border border-border bg-bg/40 divide-y divide-border overflow-hidden">
                                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                                    <span className="text-xs text-muted">ATS connection</span>
                                    {ws.atsProvider ? (
                                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                        {ws.atsProvider}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-muted/60 italic">None configured</span>
                                    )}
                                  </div>
                                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                                    <span className="text-xs text-muted">Private challenges</span>
                                    <span className="text-[11px] font-semibold text-fg tabular-nums">{ws.challengeCount}</span>
                                  </div>
                                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                                    <span className="text-xs text-muted">Take-home assignments</span>
                                    <span className="text-[11px] font-semibold text-fg tabular-nums">
                                      {ws.completedTakeHomes}<span className="text-muted/50 font-medium"> / {ws.takeHomeCount}</span>
                                    </span>
                                  </div>
                                  <div className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                                    <span className="text-xs text-muted shrink-0 pt-0.5">Stripe customer</span>
                                    {ws.stripeCustomerId ? (
                                      <Link
                                        href={`https://dashboard.stripe.com/customers/${ws.stripeCustomerId}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 hover:underline truncate"
                                      >
                                        <Globe className="w-3 h-3 opacity-60 shrink-0" />
                                        <span className="truncate">{ws.stripeCustomerId}</span>
                                      </Link>
                                    ) : (
                                      <span className="text-[11px] text-muted/60 italic">No subscription bound</span>
                                    )}
                                  </div>
                                </div>

                                <p className="text-[11px] text-muted/70 leading-relaxed px-1">
                                  {ws.stripeCustomerId ? (
                                    <>Configured for <span className="text-fg font-semibold">{ws.memberCount} seat{ws.memberCount === 1 ? "" : "s"}</span> on the {ws.planName.toLowerCase()} metered pricing plan.</>
                                  ) : (
                                    <>Operating on the <span className="text-amber-600 dark:text-amber-400 font-semibold">Free</span> tier — up to {ws.memberCount}/3 seats, no Stripe subscription bound.</>
                                  )}
                                </p>
                              </div>

                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Fixed-position plan menu (rendered outside table to escape overflow clipping) */}
      {activeMenuWorkspaceId && menuPos && (() => {
        const targetWs = workspaces.find((w) => w.id === activeMenuWorkspaceId);
        if (!targetWs) return null;
        return (
          <div
            data-plan-menu
            className="fixed w-40 rounded-lg border border-border bg-elevated shadow-2xl ring-1 ring-black/5 dark:ring-white/5 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/70 px-3 pt-2.5 pb-1.5 border-b border-border/60">
              Set plan
            </div>
            <div className="p-1">
              {(["FREE", "GROWTH", "ENTERPRISE", "LOCKED"] as const).map((tier) => {
                const isCurrent = targetWs.planName === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => handleUpdatePlan(targetWs.id, tier)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                      isCurrent
                        ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25"
                        : "text-muted hover:text-fg hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15"
                    }`}
                  >
                    <span>{tier}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
