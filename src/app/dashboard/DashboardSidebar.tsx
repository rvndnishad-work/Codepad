"use client";

import Link from "next/link";
import { Newspaper, Keyboard, Info, ExternalLink, MessageSquare, Building2, Plus, Sparkles, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import JoinInterviewBox from "../interview/JoinInterviewBox";

const NEWS = [
  { title: "Monaco Editor Intelligence Boost", date: "May 2", href: "#" },
  { title: "New Cobalt2 Theme Support", date: "Apr 28", href: "#" },
  { title: "Better JSX highlighting for React", date: "Apr 25", href: "#" },
];

const SHORTCUTS = [
  { keys: ["Ctrl", "S"], label: "Save snippet" },
  { keys: ["Ctrl", "Enter"], label: "Run code" },
  { keys: ["Ctrl", "P"], label: "Search files" },
];

type WorkspaceItem = {
  name: string;
  slug: string;
  plan: string;
};

export default function DashboardSidebar({
  workspaces = [],
  takeHomes = [],
}: {
  workspaces?: WorkspaceItem[];
  takeHomes?: any[];
}) {
  return (
    <div className="space-y-6">
      {/* Join scheduled recruiter interview box */}
      <JoinInterviewBox />

      {/* Take-Home Assignments */}
      {takeHomes.length > 0 && (
        <div className="rounded-3xl border border-border bg-gradient-to-br from-panel/90 to-surface/40 p-6 overflow-hidden shadow-sm relative">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/10 blur-[50px] pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-fg">
              Assigned Assessments
            </h3>
          </div>

          <div className="space-y-3">
            {takeHomes.map((th) => {
              const statusColor =
                th.status === "SUBMITTED" ? "text-emerald-500 border-emerald-500/25 bg-emerald-500/10"
                : th.status === "ACTIVE" ? "text-indigo-400 border-indigo-500/25 bg-indigo-500/10"
                : th.status === "EXPIRED" ? "text-rose-400 border-rose-500/25 bg-rose-500/10"
                : "text-amber-400 border-amber-500/25 bg-amber-500/10";
              const expired = th.expiresAt && new Date(th.expiresAt).getTime() < Date.now();
              const href = th.status === "SUBMITTED" ? "#" : expired ? "#" : `/take-home/${th.token}`;
              
              return (
                <div key={th.id} className="p-3 rounded-xl border border-border bg-surface/50 hover:bg-surface transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={href} className="font-bold text-xs text-fg hover:text-indigo-400 transition-colors line-clamp-1">
                      {th.challenge.title}
                    </Link>
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${statusColor}`}>
                      {th.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] text-muted">
                      From <span className="font-semibold text-fg/80">{th.workspace?.name ?? "—"}</span>
                    </div>
                    {th.status !== "SUBMITTED" && !expired && (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors group"
                      >
                        Start <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Corporate Hubs Section */}
      <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6 relative overflow-hidden">
        {/* Background shine */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
        
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center justify-between mb-4">
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Recruitment Hubs
          </span>
          <span className="text-[9px] font-black uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15">
            B2B SaaS
          </span>
        </h3>

        {workspaces.length === 0 ? (
          <div className="space-y-3.5">
            <p className="text-xs text-muted/90 leading-relaxed">
              Unlock developer asynchronous screening, automated test builders, and collaborative candidate review panels.
            </p>
            <Link
              href="/w/create"
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-[10px] font-black uppercase tracking-wider transition-colors shadow-soft flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3px]" />
              <span>Create Workspace</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {workspaces.map((ws) => (
                <Link
                  key={ws.slug}
                  href={`/w/${ws.slug}`}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border bg-surface/30 hover:border-indigo-500/30 hover:bg-surface/60 transition-all text-xs font-bold text-muted hover:text-fg group"
                >
                  <span className="truncate">{ws.name}</span>
                  <span className="text-[8px] font-black uppercase text-indigo-400 shrink-0 px-1 rounded bg-indigo-500/10 border border-indigo-500/15">
                    {ws.plan}
                  </span>
                </Link>
              ))}
            </div>
            
            <Link
              href="/w/create"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-dashed border-border hover:border-indigo-400 hover:text-indigo-400 text-muted/70 text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Workspace</span>
            </Link>
          </div>
        )}
      </div>

      {/* News Section */}
      <div className="rounded-3xl border border-border bg-panel p-6">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-accent" />
          Platform News
        </h3>
        <div className="space-y-4">
          {NEWS.map((item, i) => (
            <a key={i} href={item.href} className="group block">
              <div className="text-[10px] text-accent font-bold uppercase mb-0.5 tracking-wider">{item.date}</div>
              <div className="text-sm text-subtle group-hover:text-fg transition-colors flex items-center justify-between">
                {item.title}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Shortcuts Section */}
      <div className="rounded-3xl border border-border bg-panel p-6">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-2 mb-4">
          <Keyboard className="w-4 h-4 text-accent" />
          Quick Shortcuts
        </h3>
        <div className="space-y-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted">{s.label}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="px-1.5 py-0.5 rounded border border-border bg-surface text-[9px] font-mono text-muted">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support Section */}
      <div className="rounded-3xl border border-border bg-accent-glow p-6 border-accent/20">
        <h3 className="text-sm font-semibold text-accent flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4" />
          Need Help?
        </h3>
        <p className="text-xs text-subtle leading-relaxed mb-4">
          Join our Discord community or check the documentation for pro tips.
        </p>
        <button className="w-full py-2 rounded-xl bg-surface hover:bg-elevated text-fg text-xs font-medium border border-border transition-all">
          Join Community
        </button>
      </div>
    </div>
  );
}
