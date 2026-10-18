"use client";

import { usePathname } from "next/navigation";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";

type Counts = {
  members: number;
  candidates: number;
  aiScreenings: number;
  takeHomes: number;
  interviews: number;
  recordings: number;
};

export default function WorkspaceTabs({ workspaceId, counts }: { workspaceId: string; counts: Counts }) {
  const pathname = usePathname();
  const base = `/admin/workspaces/${workspaceId}`;
  const tabs = [
    { id: "overview", label: "Overview", href: base },
    { id: "members", label: "Members", href: `${base}/members`, count: counts.members },
    { id: "billing", label: "Billing and credits", href: `${base}/billing` },
    { id: "candidates", label: "Candidates", href: `${base}/candidates`, count: counts.candidates },
    { id: "ai-interviews", label: "AI screenings", href: `${base}/ai-interviews`, count: counts.aiScreenings },
    { id: "takehomes", label: "Take homes", href: `${base}/takehomes`, count: counts.takeHomes },
    { id: "interviews", label: "Interviews", href: `${base}/interviews`, count: counts.interviews },
    { id: "recordings", label: "Recordings", href: `${base}/recordings`, count: counts.recordings },
    { id: "settings", label: "Settings", href: `${base}/settings` },
  ];
  const rest = pathname.slice(base.length).split("/")[1] ?? "";
  const active = tabs.find((t) => t.id === rest)?.id ?? (rest ? "" : "overview");
  return <UnderlineTabs tabs={tabs} active={active} label="Workspace sections" />;
}
