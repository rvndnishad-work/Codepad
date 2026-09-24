"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Blocks,
  BookOpen,
  Bot,
  ClipboardList,
  CreditCard,
  Home,
  KeyRound,
  Mail,
  Plug,
  RefreshCw,
  ScrollText,
  Lock,
  Users,
  UsersRound,
} from "lucide-react";

export type SidebarCounts = {
  challenges: number;
  interviews: number;
  takeHomes: number;
  candidates: number;
  replays: number;
  members: number;
};

type Props = {
  slug: string;
  /** Growth-level tools (AI screening, ATS sync, MCP) are on: paid or trial. */
  growthFeatures: boolean;
  counts: SidebarCounts;
  /** Icon-only rail with tooltips (driven by the sidebar collapse toggle). */
  collapsed?: boolean;
};

type NavItem = {
  label: string;
  icon: typeof Home;
  href: string;
  isActive: boolean;
  count?: number | null;
  /** Needs a Growth plan: shown with a lock and linked to billing. */
  locked?: boolean;
};

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  const tone = item.isActive ? "bg-panel text-fg font-medium" : "text-muted hover:text-fg hover:bg-panel";

  if (collapsed) {
    // Icon-only with a native tooltip: a custom popover would be clipped by
    // the scrolling nav container.
    return (
      <Link
        href={item.href}
        title={item.locked ? `${item.label} (Growth plan)` : item.label}
        aria-label={item.label}
        aria-current={item.isActive ? "page" : undefined}
        className={`relative flex items-center justify-center h-9 rounded-lg transition-colors ${tone}`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${item.isActive ? "text-secondary" : "text-subtle"}`} />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={item.isActive ? "page" : undefined}
      className={`relative flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-sm transition-colors ${tone}`}
    >
      {item.isActive && (
        <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-secondary" />
      )}
      <Icon className={`w-4 h-4 shrink-0 ${item.isActive ? "text-secondary" : "text-subtle"}`} aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {item.locked && <Lock className="w-3.5 h-3.5 text-subtle" aria-label="Growth plan" />}
      {item.count !== null && item.count !== undefined && (
        <span className={`text-xs tabular-nums ${item.isActive ? "text-fg" : "text-subtle"}`}>{item.count}</span>
      )}
    </Link>
  );
}

function Group({ label, items, collapsed }: { label?: string; items: NavItem[]; collapsed: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label &&
        (collapsed ? (
          <div className="h-px bg-border w-6 mx-auto my-3" aria-hidden />
        ) : (
          <div className="text-xs font-medium text-subtle px-2.5 mt-4 mb-1.5">{label}</div>
        ))}
      {items.map((item) => (
        <NavLink key={item.label} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

export default function WorkspaceSidebarNav({ slug, growthFeatures, counts, collapsed = false }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeSection = params.get("section") || "overview";
  const onWorkspaceRoute = pathname === `/w/${slug}`;

  const sectionHref = (section: string) =>
    section === "overview" ? `/w/${slug}` : `/w/${slug}?section=${section}`;
  const sectionActive = (section: string) => onWorkspaceRoute && activeSection === section;
  const route = (path: string) => ({ href: `/w/${slug}/${path}`, isActive: pathname.startsWith(`/w/${slug}/${path}`) });

  // Growth tools stay visible on Free so teams can find them; they open the
  // plans page instead of the tool.
  const growth = (item: NavItem): NavItem =>
    growthFeatures ? item : { ...item, href: sectionHref("billing"), isActive: false, locked: true };

  const hiring: NavItem[] = [
    {
      label: "Candidates",
      icon: Users,
      href: sectionHref("candidates"),
      isActive: sectionActive("candidates") || pathname.startsWith(`/w/${slug}/candidates`),
      count: counts.candidates,
    },
    {
      label: "Assessments",
      icon: ClipboardList,
      href: sectionHref("assessments"),
      isActive:
        sectionActive("assessments") ||
        pathname.startsWith(`/w/${slug}/take-homes`) ||
        pathname.startsWith(`/w/${slug}/attempts`),
      count: counts.interviews + counts.takeHomes + counts.replays,
    },
    growth({ label: "AI screening", icon: Bot, ...route("ai-interviews") }),
    { label: "Question library", icon: BookOpen, href: sectionHref("library"), isActive: sectionActive("library"), count: counts.challenges },
  ];

  const connections: NavItem[] = [
    { label: "Integrations", icon: Blocks, href: sectionHref("integrations"), isActive: sectionActive("integrations") },
    growth({ label: "ATS sync", icon: RefreshCw, ...route("ats") }),
    growth({ label: "API keys", icon: KeyRound, ...route("api-keys") }),
    growth({ label: "External MCP", icon: Plug, ...route("external-mcp") }),
  ];

  const admin: NavItem[] = [
    { label: "Members", icon: UsersRound, href: sectionHref("members"), isActive: sectionActive("members"), count: counts.members },
    { label: "Billing and plan", icon: CreditCard, href: sectionHref("billing"), isActive: sectionActive("billing") },
    { label: "Audit log", icon: ScrollText, ...route("audit") },
    { label: "Email activity", icon: Mail, ...route("emails") },
  ];

  return (
    <nav aria-label="Workspace" className="flex flex-col">
      <Group
        items={[{ label: "Overview", icon: Home, href: sectionHref("overview"), isActive: sectionActive("overview") }]}
        collapsed={collapsed}
      />
      <Group label="Hiring" items={hiring} collapsed={collapsed} />
      <Group label="Connections" items={connections} collapsed={collapsed} />
      <Group label="Administration" items={admin} collapsed={collapsed} />
    </nav>
  );
}
