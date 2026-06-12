import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { notFound, redirect } from "next/navigation";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Clock, 
  ArrowLeft,
  Search,
  Filter,
  Trash2,
  Lock,
  Globe,
  Plus,
  Trophy,
  ExternalLink,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import WorkspacesClientSurface from "./WorkspacesClientSurface";

export const metadata = {
  title: "B2B Workspaces & SaaS Subscriptions Operations — Interviewpad",
};

export default async function AdminWorkspacesPage() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) notFound();

  // 1. Fetch all workspaces globally with counts & relationships
  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
        include: {
          user: { select: { name: true, email: true, image: true } }
        }
      },
      challenges: { select: { id: true, title: true } },
      takeHomes: { select: { id: true, status: true } },
      atsIntegration: { select: { id: true, provider: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  // 2. Fetch platform global counts to double-validate metrics
  const totalTakeHomesCount = await prisma.takeHomeAssignment.count();

  // 3. Compute SaaS Telemetry Statistics
  const totalWorkspaces = workspaces.length;
  const growthWorkspaces = workspaces.filter(w => w.planName === "GROWTH").length;
  const enterpriseWorkspaces = workspaces.filter(w => w.planName === "ENTERPRISE").length;
  const lockedWorkspaces = workspaces.filter(w => w.planName === "LOCKED").length;

  // Metered paid seats count (members enrolled in paid workspaces)
  const paidSeatsCount = workspaces
    .filter(w => w.planName === "GROWTH" || w.planName === "ENTERPRISE")
    .reduce((acc, w) => acc + w.members.length, 0);

  // MRR estimation: paid seats * $49/month
  const estimatedMRR = paidSeatsCount * 49;

  // Format workspaces for interactive client-side rendering
  const formattedWorkspaces = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    stripeCustomerId: w.stripeCustomerId,
    stripeSubscriptionId: w.stripeSubscriptionId,
    planName: w.planName,
    createdAt: w.createdAt.toISOString(),
    memberCount: w.members.length,
    challengeCount: w.challenges.length,
    takeHomeCount: w.takeHomes.length,
    completedTakeHomes: w.takeHomes.filter(t => t.status === "SUBMITTED").length,
    atsProvider: w.atsIntegration?.provider || null,
    members: w.members.map(m => ({
      name: m.user.name,
      email: m.user.email,
      role: m.role
    }))
  }));

  return (
    <div className="space-y-8">
      {/* 1. Header Navigation Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Platform Monetization
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1 text-fg">Corporate Hubs</h2>
          <p className="text-sm text-muted mt-1">Audit multi-tenant recruitment spaces and seat-based subscriptions.</p>
        </div>
      </div>

      {/* 2. SaaS Telemetry KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Paid Seat License MRR */}
        <div className="p-5 rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.07] via-panel/30 to-panel/20 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/35 transition-all">
          <div className="flex items-center justify-between text-muted mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-fg">Estimated MRR</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-black text-indigo-400 font-mono">${estimatedMRR.toLocaleString()}</div>
            <div className="text-[10px] text-muted">/month</div>
          </div>
          <div className="text-[10px] text-muted leading-relaxed mt-2.5 pt-2.5 border-t border-border">
            Based on paid metered seat quotas.
          </div>
        </div>

        {/* Paid Teammate Seat Licences */}
        <div className="p-5 rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.07] via-panel/30 to-panel/20 backdrop-blur-md relative overflow-hidden group hover:border-violet-500/35 transition-all">
          <div className="flex items-center justify-between text-muted mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-fg">Seats Leased</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-fg font-mono">{paidSeatsCount}</div>
          <div className="text-[10px] text-muted leading-relaxed mt-2.5 pt-2.5 border-t border-border">
            Total active reviewers on paid plans.
          </div>
        </div>

        {/* Corporate Tenant Workspaces */}
        <div className="p-5 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.07] via-panel/30 to-panel/20 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/35 transition-all">
          <div className="flex items-center justify-between text-muted mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-fg">Active Tenants</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-fg font-mono">{totalWorkspaces}</div>
            <div className="text-[10px] text-muted font-mono font-semibold">
              ({growthWorkspaces}G / {enterpriseWorkspaces}E)
            </div>
          </div>
          <div className="text-[10px] text-muted leading-relaxed mt-2.5 pt-2.5 border-t border-border">
            {lockedWorkspaces} locked workspaces.
          </div>
        </div>

        {/* Global Candidate Evaluations */}
        <div className="p-5 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.07] via-panel/30 to-panel/20 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/35 transition-all">
          <div className="flex items-center justify-between text-muted mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-fg">Take-Homes Scheduled</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-fg font-mono">{totalTakeHomesCount}</div>
          <div className="text-[10px] text-muted leading-relaxed mt-2.5 pt-2.5 border-t border-border">
            Completed assessments: {workspaces.reduce((acc, w) => acc + w.takeHomes.filter(t => t.status === "SUBMITTED").length, 0)}
          </div>
        </div>

      </div>

      {/* 3. Interactive Client-Side Search Ledger Surface */}
      <WorkspacesClientSurface workspaces={formattedWorkspaces} />
    </div>
  );
}
