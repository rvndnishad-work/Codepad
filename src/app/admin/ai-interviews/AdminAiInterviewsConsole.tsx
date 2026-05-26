"use client";

import { useState, useTransition } from "react";
import {
  Coins,
  Sparkles,
  Users,
  TrendingDown,
  Search,
  Plus,
  X,
  RotateCcw,
  Building2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  grantCreditsAction,
  refundSessionAction,
} from "./actions";

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  planName: string;
  sessionCount: number;
  balance: number;
  usedThisMonth: number;
  lastActivity: string | null;
}

interface LedgerEntry {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  kind: string;
  amount: number;
  note: string | null;
  adminUserId: string | null;
  sessionId: string | null;
  candidateName: string | null;
  createdAt: string;
}

interface SessionRow {
  id: string;
  workspaceName: string;
  workspaceSlug: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  status: string;
  score: number | null;
  templateId: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

interface Stats {
  totalGranted: number;
  totalConsumedThisMonth: number;
  activeWorkspaces: number;
  totalWorkspaces: number;
}

interface Props {
  workspaces: WorkspaceRow[];
  recentLedger: LedgerEntry[];
  recentSessions: SessionRow[];
  stats: Stats;
}

const KIND_STYLES: Record<string, { label: string; cls: string }> = {
  PURCHASE: { label: "Purchase", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  GRANT: { label: "Grant", cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  CONSUMPTION: { label: "Consumption", cls: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  REFUND: { label: "Refund", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

export default function AdminAiInterviewsConsole({
  workspaces,
  recentLedger,
  recentSessions,
  stats,
}: Props) {
  const [search, setSearch] = useState("");
  const [grantTarget, setGrantTarget] = useState<WorkspaceRow | null>(null);
  const [forensicsTarget, setForensicsTarget] = useState<SessionRow | null>(null);

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-fg flex items-center gap-2">
          <Coins className="w-7 h-7 text-amber-400" /> AI Screening — Credit Operations
        </h1>
        <p className="text-sm text-muted/80 mt-1 max-w-2xl leading-relaxed">
          Manage AI Screening credits across workspaces. Recruiters run actual screenings inside their workspaces — this console is the admin-side ledger, grant tool, and forensic audit view.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="Total Credits Granted"
          value={stats.totalGranted.toLocaleString()}
          tone="amber"
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="Consumed This Month"
          value={stats.totalConsumedThisMonth.toLocaleString()}
          tone="rose"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label="Active Workspaces"
          value={`${stats.activeWorkspaces}`}
          sub={`of ${stats.totalWorkspaces}`}
          tone="accent"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Recent Sessions"
          value={`${recentSessions.length}`}
          sub="last 30 shown"
          tone="indigo"
        />
      </div>

      {/* Workspaces table */}
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b border-border">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg">Workspaces</h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workspace..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bg/50">
              <tr className="text-left text-muted uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Workspace</th>
                <th className="px-4 py-3 font-bold">Plan</th>
                <th className="px-4 py-3 font-bold text-right">Balance</th>
                <th className="px-4 py-3 font-bold text-right">Used MTD</th>
                <th className="px-4 py-3 font-bold text-right">Sessions</th>
                <th className="px-4 py-3 font-bold">Last Activity</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkspaces.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    No workspaces match your search.
                  </td>
                </tr>
              ) : (
                filteredWorkspaces.map((w) => (
                  <tr key={w.id} className="border-t border-border/40 hover:bg-surface/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted/60 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-fg truncate">{w.name}</div>
                          <div className="text-[10px] text-muted/60 font-mono truncate">{w.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-bg text-[9px] font-bold uppercase tracking-wider">
                        {w.planName}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-black ${w.balance <= 0 ? "text-rose-400" : w.balance < 5 ? "text-amber-400" : "text-emerald-400"}`}>
                      {w.balance}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{w.usedThisMonth}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{w.sessionCount}</td>
                    <td className="px-4 py-3 text-muted/70 text-[10px]">
                      {w.lastActivity ? new Date(w.lastActivity).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setGrantTarget(w)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 text-accent border border-accent/25 hover:bg-accent/20 text-[10px] font-bold uppercase tracking-wider transition"
                      >
                        <Plus className="w-3 h-3" /> Grant
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ledger view */}
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg">Credit Ledger</h2>
          <p className="text-[11px] text-muted/70 mt-0.5">Append-only history. Most recent 50 entries across all workspaces.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bg/50">
              <tr className="text-left text-muted uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-4 py-3 font-bold">Workspace</th>
                <th className="px-4 py-3 font-bold">Kind</th>
                <th className="px-4 py-3 font-bold text-right">Amount</th>
                <th className="px-4 py-3 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {recentLedger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    No credit activity yet. Grant some credits to a workspace to get started.
                  </td>
                </tr>
              ) : (
                recentLedger.map((e) => {
                  const style = KIND_STYLES[e.kind] || { label: e.kind, cls: "text-muted bg-bg border-border" };
                  return (
                    <tr key={e.id} className="border-t border-border/40">
                      <td className="px-4 py-3 text-muted/70 text-[10px] whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-fg font-bold">{e.workspaceName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${style.cls}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-black ${e.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {e.amount > 0 ? "+" : ""}{e.amount}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {e.candidateName && (
                          <span className="block text-[10px] text-fg font-mono">
                            {e.candidateName}
                          </span>
                        )}
                        {e.note && <span className="block text-[10px] text-muted/70 italic">{e.note}</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent sessions (forensics) */}
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg">Recent Sessions</h2>
          <p className="text-[11px] text-muted/70 mt-0.5">For support and forensics. Refund a credit if a screening was technically broken.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bg/50">
              <tr className="text-left text-muted uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Candidate</th>
                <th className="px-4 py-3 font-bold">Workspace</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Score</th>
                <th className="px-4 py-3 font-bold">Started</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    No sessions yet.
                  </td>
                </tr>
              ) : (
                recentSessions.map((s) => {
                  const wasCharged = !!s.startedAt;
                  return (
                    <tr key={s.id} className="border-t border-border/40">
                      <td className="px-4 py-3">
                        <div className="font-bold text-fg">{s.candidateName}</div>
                        <div className="text-[10px] text-muted/60 font-mono">{s.candidateEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">{s.workspaceName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase border tracking-wider ${
                            s.status === "COMPLETED"
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : s.status === "ACTIVE"
                              ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                              : "text-muted bg-bg border-border"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-fg font-bold">
                        {s.score !== null ? `${s.score}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted/70 text-[10px]">
                        {s.startedAt ? new Date(s.startedAt).toLocaleString() : <span className="italic">never</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setForensicsTarget(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-elevated text-muted hover:text-fg text-[10px] font-bold uppercase tracking-wider transition"
                        >
                          Inspect
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {wasCharged && (
                          <button
                            onClick={() => setForensicsTarget({ ...s, _action: "refund" } as SessionRow)}
                            className="ml-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-500/25 text-amber-400 hover:bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider transition"
                          >
                            <RotateCcw className="w-3 h-3" /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {grantTarget && (
        <GrantCreditsModal
          workspace={grantTarget}
          onClose={() => setGrantTarget(null)}
        />
      )}

      {forensicsTarget && (
        <SessionForensicsModal
          session={forensicsTarget}
          onClose={() => setForensicsTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "amber" | "rose" | "accent" | "indigo";
}) {
  const toneCls = {
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    accent: "bg-accent/10 border-accent/20 text-accent",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${toneCls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</span>
        <div className="text-2xl font-black text-fg mt-0.5 tabular-nums">{value}</div>
        {sub && <span className="text-[10px] text-muted/70 block">{sub}</span>}
      </div>
    </div>
  );
}

function GrantCreditsModal({
  workspace,
  onClose,
}: {
  workspace: WorkspaceRow;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await grantCreditsAction({
          workspaceId: workspace.id,
          amount: Number(amount),
          note,
        });
        toast.success(`Granted ${amount} credits to ${workspace.name}.`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Grant failed.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" /> Grant Credits
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-elevated text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl border border-border bg-bg p-3 text-xs">
          <div className="text-muted">Workspace</div>
          <div className="font-bold text-fg">{workspace.name}</div>
          <div className="text-[10px] text-muted/60 font-mono">{workspace.slug} • {workspace.planName}</div>
          <div className="mt-2 text-[11px]">
            Current balance: <span className="font-black tabular-nums text-fg">{workspace.balance}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Amount</label>
          <input
            type="number"
            min={1}
            max={10000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-fg tabular-nums focus:outline-none focus:border-accent"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
            Reason (audit trail, required)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Onboarding comp, Q2 enterprise renewal, technical issue refund..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent resize-none"
            required
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted hover:text-fg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-50"
          >
            {isPending ? "Granting..." : `Grant ${amount} credits`}
          </button>
        </div>
      </form>
    </div>
  );
}

type ForensicsSession = SessionRow & { _action?: "refund" };

function SessionForensicsModal({
  session,
  onClose,
}: {
  session: ForensicsSession;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const isRefundMode = session._action === "refund";

  const submitRefund = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await refundSessionAction({ sessionId: session.id, note });
        toast.success(`Refunded 1 credit for ${session.candidateName}.`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Refund failed.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-surface border border-border rounded-3xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-fg">
            {isRefundMode ? "Refund Session Credit" : "Session Forensics"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-elevated text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl border border-border bg-bg p-4 space-y-2 text-xs">
          <Row label="Candidate" value={`${session.candidateName} (${session.candidateEmail})`} />
          <Row label="Workspace" value={session.workspaceName} />
          <Row label="Position" value={session.positionTitle} />
          <Row label="Template" value={session.templateId} />
          <Row label="Status" value={session.status} />
          <Row label="Score" value={session.score !== null ? `${session.score}%` : "—"} />
          <Row label="Created" value={new Date(session.createdAt).toLocaleString()} />
          <Row label="Started" value={session.startedAt ? new Date(session.startedAt).toLocaleString() : "never"} />
          <Row label="Finished" value={session.finishedAt ? new Date(session.finishedAt).toLocaleString() : "—"} />
        </div>

        {isRefundMode ? (
          <form onSubmit={submitRefund} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
                Refund Reason (required)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Candidate had technical issues, AI grader failure, recruiter request..."
                rows={3}
                required
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted hover:text-fg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !note.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 text-bg text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition disabled:opacity-50"
              >
                {isPending ? "Refunding..." : "Refund 1 Credit"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-[10px] text-muted/70 leading-relaxed">
            Deeper inspection (chat replay + file diff) is available from the workspace recruiter console. This admin view is intentionally read-only for audit purposes.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-fg font-medium text-right truncate">{value}</span>
    </div>
  );
}
