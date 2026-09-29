"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import WorkspaceAppBar, { type SwitcherWorkspace } from "../../_components/WorkspaceAppBar";
import WorkspaceSidebar from "./WorkspaceSidebar";
import type { SidebarCounts } from "./WorkspaceSidebarNav";
import type { PlanDisplay } from "@/lib/workspace/display";

type Props = {
  current: SwitcherWorkspace;
  workspaces: SwitcherWorkspace[];
  plan: PlanDisplay;
  counts: SidebarCounts;
  user: { name?: string | null; email?: string | null; image?: string | null };
  isAdmin: boolean;
  children: ReactNode;
};

/**
 * Full-height app frame for a workspace: app bar on top, sidebar on the left
 * (a drawer under the app bar on phones), and a main column that scrolls on
 * its own.
 */
export default function WorkspaceShell({ current, workspaces, plan, counts, user, isAdmin, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();

  // Close the drawer whenever the route or section changes.
  useEffect(() => setMobileOpen(false), [pathname, params]);

  return (
    <div className="workspace-app h-dvh flex flex-col bg-bg text-fg font-sans overflow-hidden">
      <WorkspaceAppBar
        current={current}
        workspaces={workspaces}
        user={user}
        isAdmin={isAdmin}
        menuOpen={mobileOpen}
        onMenuToggle={() => setMobileOpen((o) => !o)}
      />
      <div className="relative flex-1 min-h-0 flex">
        <WorkspaceSidebar
          slug={current.slug}
          plan={plan}
          counts={counts}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-bg">
          <div className="workspace-content mx-auto w-full max-w-[1200px] px-4 py-6 md:px-10 md:py-8 space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
