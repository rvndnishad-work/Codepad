import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/permissions/staff";
import { ensureTotpEnrolledOrRedirect } from "@/lib/totp-gate";
import { notFound } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import FloatingJarvisAgent from "./FloatingJarvisAgent";
import { loadUserPermissions } from "@/lib/permissions/access";
import { visibleNav } from "./admin-nav";
import { loadNavBadges } from "./nav-badges";

export const metadata = {
  title: "Admin — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  // Entry gate: any platform-scope role (admin, moderator, content manager…)
  // may enter the console. Each sub-page enforces its own specific permission
  // (requireAdminAccess) so a moderator can't reach full-admin surfaces.
  if (!(await isStaff(session))) notFound();

  // IP-42 AC #6: admins must carry a second factor before reaching the console.
  if (session?.user?.id) {
    await ensureTotpEnrolledOrRedirect(session.user.id, true);
  }

  // The sidebar shows only the pages this person's permissions open.
  const perms = session?.user?.id ? await loadUserPermissions(session.user.id) : new Set<string>();
  const nav = visibleNav(perms as ReadonlySet<string>);
  const badges = await loadNavBadges(perms as ReadonlySet<string>);

  return (
    <div className="bg-bg text-fg flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-64px)] relative">
      {/* Dynamic Collapsible & Frosted Navigation Sidebar */}
      <AdminSidebar session={session} nav={nav} badges={badges} />

      {/* Main Scrollable Dashboard Content */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto bg-bg relative z-10">
        <div className="px-6 py-8 lg:px-10 lg:py-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
        <FloatingJarvisAgent />
      </main>
    </div>
  );
}
