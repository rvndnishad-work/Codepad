import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, Target, Briefcase, FileVideo, Globe, Clock, CheckCircle2 } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Workspace overview — Interviewpad Admin",
};

export default async function WorkspaceOverviewPage({ params }: Props) {
  const { id } = await params;

  const ws = await prisma.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      planName: true,
      _count: {
        select: {
          members: true,
          challenges: true,
          sessions: true,
          takeHomes: true,
        },
      },
      atsIntegration: { select: { provider: true } },
      takeHomes: { select: { status: true } },
    },
  });

  if (!ws) notFound();

  const completedTakeHomes = ws.takeHomes.filter((t) => t.status === "SUBMITTED").length;
  const createdDate = ws.createdAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const stats = [
    { label: "Members", value: ws._count.members, icon: Users, accent: "indigo" },
    { label: "Challenges", value: ws._count.challenges, icon: Target, accent: "amber" },
    { label: "Interviews", value: ws._count.sessions, icon: Briefcase, accent: "violet" },
    { label: "Replays", value: ws._count.takeHomes, icon: FileVideo, accent: "purple" },
  ];

  const accentClasses: Record<string, string> = {
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    violet: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{s.label}</span>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${accentClasses[s.accent]}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-fg tabular-nums">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Two-column detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metadata */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Workspace metadata</h3>
          </div>
          <dl className="divide-y divide-border text-sm">
            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              <dt className="text-xs text-muted">ID</dt>
              <dd className="font-mono text-[11px] text-fg truncate">{ws.id}</dd>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              <dt className="text-xs text-muted">Created</dt>
              <dd className="text-[11px] text-fg">{createdDate}</dd>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              <dt className="text-xs text-muted">Plan</dt>
              <dd className="text-[11px] font-semibold text-fg">{ws.planName}</dd>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              <dt className="text-xs text-muted">Completed replays</dt>
              <dd className="text-[11px] font-semibold text-fg tabular-nums">
                <CheckCircle2 className="inline w-3 h-3 text-emerald-500 mr-1" />
                {completedTakeHomes}
                <span className="text-muted/60 font-medium"> / {ws._count.takeHomes}</span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Integrations & billing */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Integrations &amp; billing</h3>
          </div>
          <dl className="divide-y divide-border text-sm">
            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              <dt className="text-xs text-muted">ATS connection</dt>
              <dd>
                {ws.atsIntegration ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {ws.atsIntegration.provider}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted/60 italic">None configured</span>
                )}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              <dt className="text-xs text-muted">Stripe customer</dt>
              <dd>
                {ws.stripeCustomerId ? (
                  <Link
                    href={`https://dashboard.stripe.com/customers/${ws.stripeCustomerId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Globe className="w-3 h-3 opacity-60" />
                    <span className="truncate max-w-[180px]">{ws.stripeCustomerId}</span>
                  </Link>
                ) : (
                  <span className="text-[11px] text-muted/60 italic">No subscription bound</span>
                )}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              <dt className="text-xs text-muted">Subscription</dt>
              <dd className="text-[11px] font-mono text-fg truncate max-w-[180px]">
                {ws.stripeSubscriptionId ?? <span className="text-muted/60 italic font-sans">—</span>}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              <dt className="text-xs text-muted flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Take-home pipeline
              </dt>
              <dd className="text-[11px] font-semibold text-fg tabular-nums">
                {completedTakeHomes}<span className="text-muted/60 font-medium"> / {ws._count.takeHomes}</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
