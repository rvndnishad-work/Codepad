"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_TABS } from "@/lib/workspace/settings";

/** Underline tabs, one route per tab: /w/[slug]/settings/<tab>. */
export default function SettingsTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="flex gap-6 border-b border-border overflow-x-auto">
      {SETTINGS_TABS.map((t) => {
        const href = `/w/${slug}/settings/${t.id}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={t.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center h-10 text-sm whitespace-nowrap transition-colors ${
              active ? "text-fg font-medium" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
            {active && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-secondary" />}
          </Link>
        );
      })}
    </nav>
  );
}
