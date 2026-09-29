"use client";

import { usePathname } from "next/navigation";
import { SETTINGS_TABS } from "@/lib/workspace/settings";
import UnderlineTabs from "../../_components/UnderlineTabs";

/** Underline tabs, one route per tab: /w/[slug]/settings/<tab>. */
export default function SettingsTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const tabs = SETTINGS_TABS.map((t) => ({ id: t.id, label: t.label, href: `/w/${slug}/settings/${t.id}` }));
  const active = tabs.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.id ?? "";
  return <UnderlineTabs tabs={tabs} active={active} label="Settings sections" />;
}
