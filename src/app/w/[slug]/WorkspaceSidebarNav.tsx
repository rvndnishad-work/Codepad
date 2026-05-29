"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Compass,
  Trophy,
  Briefcase,
  UserCircle2,
  Users,
  CreditCard,
  Sparkles,
  Bot,
  KeyRound,
  Plug,
  Workflow,
  ScrollText,
  Mail,
} from "lucide-react";

type Props = {
  slug: string;
  planName: string;
  counts: {
    challenges: number;
    interviews: number;
    takeHomes: number;
    candidates: number;
    replays: number;
    members: number;
  };
};

type Item = {
  section: string;
  label: string;
  icon: typeof Compass;
  count?: number | null;
};

export default function WorkspaceSidebarNav({ slug, planName, counts }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeSection = params.get("section") || "overview";

  const onWorkspaceRoute = pathname === `/w/${slug}`;
  const planHasAiScreening = planName === "GROWTH" || planName === "ENTERPRISE";
  const aiScreeningHref = `/w/${slug}/ai-interviews`;
  const isAiScreeningActive = pathname === aiScreeningHref;
  const apiKeysHref = `/w/${slug}/api-keys`;
  const isApiKeysActive = pathname === apiKeysHref;
  const externalMcpHref = `/w/${slug}/external-mcp`;
  const isExternalMcpActive = pathname === externalMcpHref;
  const atsHref = `/w/${slug}/ats`;
  const isAtsActive = pathname === atsHref;
  const auditHref = `/w/${slug}/audit`;
  const isAuditActive = pathname === auditHref;
  const emailsHref = `/w/${slug}/emails`;
  const isEmailsActive = pathname === emailsHref;

  const operational: Item[] = [
    { section: "overview", label: "Overview", icon: Compass, count: null },
    { section: "candidates", label: "Candidates", icon: UserCircle2, count: counts.candidates },
    { section: "assessments", label: "Assessments", icon: Briefcase, count: counts.interviews + counts.takeHomes + counts.replays },
    { section: "library", label: "Library", icon: Trophy, count: counts.challenges },
  ];

  const admin: Item[] = [
    { section: "members", label: "Members", icon: Users, count: counts.members },
    { section: "billing", label: "Billing", icon: CreditCard, count: null },
    { section: "integrations", label: "Integrations", icon: Sparkles, count: null },
  ];

  const renderItem = (item: Item) => {
    const isActive = onWorkspaceRoute && activeSection === item.section;
    const Icon = item.icon;
    const href = item.section === "overview" ? `/w/${slug}` : `/w/${slug}?section=${item.section}`;
    return (
      <Link
        key={item.section}
        href={href}
        className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
          isActive
            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
            : "text-muted hover:text-fg hover:bg-panel/40"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-500" : "text-muted/60"}`} />
          <span className="truncate">{item.label}</span>
        </span>
        {item.count !== null && item.count !== undefined && (
          <span
            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold tabular-nums shrink-0 ${
              isActive
                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                : "bg-panel/60 text-muted/70"
            }`}
          >
            {item.count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
          Workspace
        </div>
        {operational.map(renderItem)}
      </div>

      {planHasAiScreening && (
        <div className="space-y-1 mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
            Automation
          </div>
          <Link
            href={aiScreeningHref}
            className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              isAiScreeningActive
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                : "text-muted hover:text-fg hover:bg-panel/40"
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Bot className={`w-3.5 h-3.5 shrink-0 ${isAiScreeningActive ? "text-indigo-500" : "text-muted/60"}`} />
              <span className="truncate">AI Screening</span>
            </span>
            <span className="inline-flex items-center justify-center px-1.5 h-[18px] rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              New
            </span>
          </Link>
          <Link
            href={apiKeysHref}
            className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              isApiKeysActive
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                : "text-muted hover:text-fg hover:bg-panel/40"
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <KeyRound className={`w-3.5 h-3.5 shrink-0 ${isApiKeysActive ? "text-indigo-500" : "text-muted/60"}`} />
              <span className="truncate">MCP API Keys</span>
            </span>
            <span className="inline-flex items-center justify-center px-1.5 h-[18px] rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              New
            </span>
          </Link>
          <Link
            href={externalMcpHref}
            className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              isExternalMcpActive
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                : "text-muted hover:text-fg hover:bg-panel/40"
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Plug className={`w-3.5 h-3.5 shrink-0 ${isExternalMcpActive ? "text-indigo-500" : "text-muted/60"}`} />
              <span className="truncate">External MCP</span>
            </span>
            <span className="inline-flex items-center justify-center px-1.5 h-[18px] rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Beta
            </span>
          </Link>
          <Link
            href={atsHref}
            className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              isAtsActive
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                : "text-muted hover:text-fg hover:bg-panel/40"
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Workflow className={`w-3.5 h-3.5 shrink-0 ${isAtsActive ? "text-indigo-500" : "text-muted/60"}`} />
              <span className="truncate">ATS Sync</span>
            </span>
            <span className="inline-flex items-center justify-center px-1.5 h-[18px] rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              New
            </span>
          </Link>
        </div>
      )}

      <div className="space-y-1 mt-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
          Settings
        </div>
        {admin.map(renderItem)}
        {/*
          IP-37: workspace audit log. Compliance-tier surface — gated to
          OWNER/ADMIN at the page level. Inlined here rather than added to
          the admin[] array because it lives on a direct route, not a
          ?section= query param.
        */}
        <Link
          href={auditHref}
          className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            isAuditActive
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
              : "text-muted hover:text-fg hover:bg-panel/40"
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <ScrollText className={`w-3.5 h-3.5 shrink-0 ${isAuditActive ? "text-indigo-500" : "text-muted/60"}`} />
            <span className="truncate">Audit log</span>
          </span>
          <span className="inline-flex items-center justify-center px-1.5 h-[18px] rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            New
          </span>
        </Link>
        {/*
          IP-27 follow-on: workspace-scoped email delivery log. Same OWNER/ADMIN
          gating as the audit log; lives on a direct route, not a ?section=.
        */}
        <Link
          href={emailsHref}
          className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            isEmailsActive
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
              : "text-muted hover:text-fg hover:bg-panel/40"
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Mail className={`w-3.5 h-3.5 shrink-0 ${isEmailsActive ? "text-indigo-500" : "text-muted/60"}`} />
            <span className="truncate">Email activity</span>
          </span>
          <span className="inline-flex items-center justify-center px-1.5 h-[18px] rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            New
          </span>
        </Link>
      </div>
    </>
  );
}

