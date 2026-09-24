import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Tab = { id: string; label: string; icon: LucideIcon; href: string };

/** Underlined section tabs used inside workspace sections. */
export default function SubTabs({ tabs, active, label }: { tabs: Tab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-none">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex items-center gap-2 h-10 px-3 text-sm whitespace-nowrap transition-colors ${
              isActive ? "text-fg font-medium" : "text-muted hover:text-fg"
            }`}
          >
            <t.icon className={`w-4 h-4 ${isActive ? "text-secondary" : "text-subtle"}`} aria-hidden />
            {t.label}
            {isActive && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-secondary" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
