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
  /** Icon-only rail with tooltips (driven by the sidebar collapse toggle). */
  collapsed?: boolean;
};

type NavItem = {
  label: string;
  icon: typeof Compass;
  href: string;
  isActive: boolean;
  count?: number | null;
  badge?: "New" | "Beta" | null;
};

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  const tone = item.isActive
    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
    : "text-muted hover:text-fg hover:bg-panel/40";
  const hasCount = item.count !== null && item.count !== undefined && item.count > 0;

  if (collapsed) {
    // Icon-only with a native tooltip + corner badges. Native `title` avoids the
    // clipping/positioning issues a custom popover would hit inside the
    // overflow-y-auto scroll container.
    return (
      <Link
        href={item.href}
        title={item.label}
        aria-label={item.label}
        className={`group relative flex items-center justify-center h-9 rounded-md transition-colors ${tone}`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${item.isActive ? "text-indigo-500" : "text-muted/70"}`} />
        {hasCount ? (
          <span className="absolute -top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-indigo-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
            {item.count! > 99 ? "99+" : item.count}
          </span>
        ) : item.badge ? (
          <span
            className={`absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full ${
              item.badge === "Beta" ? "bg-indigo-400" : "bg-amber-400"
            }`}
          />
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${tone}`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${item.isActive ? "text-indigo-500" : "text-muted/60"}`} />
        <span className="truncate">{item.label}</span>
      </span>
      {item.count !== null && item.count !== undefined ? (
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold tabular-nums shrink-0 ${
            item.isActive ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" : "bg-panel/60 text-muted/70"
          }`}
        >
          {item.count}
        </span>
      ) : item.badge ? (
        <span
          className={`inline-flex items-center justify-center px-1.5 h-[18px] rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
            item.badge === "Beta"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function SectionHeader({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    // A short centered divider replaces the text label so groups stay readable.
    return <div className="h-px bg-border/50 w-6 mx-auto my-2" aria-hidden />;
  }
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
      {label}
    </div>
  );
}

export default function WorkspaceSidebarNav({ slug, planName, counts, collapsed = false }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeSection = params.get("section") || "overview";
  const onWorkspaceRoute = pathname === `/w/${slug}`;
  const planHasAiScreening = planName === "GROWTH" || planName === "ENTERPRISE";

  const sectionHref = (section: string) =>
    section === "overview" ? `/w/${slug}` : `/w/${slug}?section=${section}`;
  const sectionActive = (section: string) => onWorkspaceRoute && activeSection === section;

  const operational: NavItem[] = [
    { label: "Overview", icon: Compass, href: sectionHref("overview"), isActive: sectionActive("overview"), count: null },
    { label: "Candidates", icon: UserCircle2, href: sectionHref("candidates"), isActive: sectionActive("candidates"), count: counts.candidates },
    { label: "Assessments", icon: Briefcase, href: sectionHref("assessments"), isActive: sectionActive("assessments"), count: counts.interviews + counts.takeHomes + counts.replays },
    { label: "Library", icon: Trophy, href: sectionHref("library"), isActive: sectionActive("library"), count: counts.challenges },
  ];

  const automation: NavItem[] = [
    { label: "AI Screening", icon: Bot, href: `/w/${slug}/ai-interviews`, isActive: pathname === `/w/${slug}/ai-interviews`, badge: "New" },
    { label: "MCP API Keys", icon: KeyRound, href: `/w/${slug}/api-keys`, isActive: pathname === `/w/${slug}/api-keys`, badge: "New" },
    { label: "External MCP", icon: Plug, href: `/w/${slug}/external-mcp`, isActive: pathname === `/w/${slug}/external-mcp`, badge: "Beta" },
    { label: "ATS Sync", icon: Workflow, href: `/w/${slug}/ats`, isActive: pathname === `/w/${slug}/ats`, badge: "New" },
  ];

  const settings: NavItem[] = [
    { label: "Members", icon: Users, href: sectionHref("members"), isActive: sectionActive("members"), count: counts.members },
    { label: "Billing", icon: CreditCard, href: sectionHref("billing"), isActive: sectionActive("billing"), count: null },
    { label: "Integrations", icon: Sparkles, href: sectionHref("integrations"), isActive: sectionActive("integrations"), count: null },
    { label: "Audit log", icon: ScrollText, href: `/w/${slug}/audit`, isActive: pathname === `/w/${slug}/audit`, badge: "New" },
    { label: "Email activity", icon: Mail, href: `/w/${slug}/emails`, isActive: pathname === `/w/${slug}/emails`, badge: "New" },
  ];

  return (
    <>
      <div className="space-y-1">
        <SectionHeader label="Workspace" collapsed={collapsed} />
        {operational.map((item) => (
          <NavLink key={item.label} item={item} collapsed={collapsed} />
        ))}
      </div>

      {planHasAiScreening && (
        <div className="space-y-1 mt-4">
          <SectionHeader label="Automation" collapsed={collapsed} />
          {automation.map((item) => (
            <NavLink key={item.label} item={item} collapsed={collapsed} />
          ))}
        </div>
      )}

      <div className="space-y-1 mt-4">
        <SectionHeader label="Settings" collapsed={collapsed} />
        {settings.map((item) => (
          <NavLink key={item.label} item={item} collapsed={collapsed} />
        ))}
      </div>
    </>
  );
}
