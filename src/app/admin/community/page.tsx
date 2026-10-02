import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";
import ReportsTab from "./ReportsTab";
import CommentsTab from "./CommentsTab";

export const metadata = { title: "Community — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export type CommunitySearch = {
  tab?: string;
  status?: string;
  type?: string;
  source?: string;
  q?: string;
  page?: string;
};

export default async function CommunityPage({ searchParams }: { searchParams: Promise<CommunitySearch> }) {
  await requireAdminAccess("comment:moderate");
  const sp = await searchParams;
  const tab = sp.tab === "comments" || sp.tab === "experiences" ? sp.tab : "reports";

  const [openReports, pendingExperiences] = await Promise.all([
    prisma.contentReport.count({ where: { status: "open" } }),
    prisma.prepExperience.count({ where: { status: { in: ["pending", "approved"] } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Community</h1>
        <p className="text-sm text-muted mt-1">Reports from members, comments on blogs and questions, and interview experiences.</p>
      </div>
      <UnderlineTabs
        label="Community sections"
        active={tab}
        tabs={[
          { id: "reports", label: "Reports", href: "/admin/community", count: openReports },
          { id: "comments", label: "Comments", href: "/admin/community?tab=comments" },
          { id: "experiences", label: "Experiences", href: "/admin/community?tab=experiences", count: pendingExperiences },
        ]}
      />
      {tab === "reports" && <ReportsTab sp={sp} />}
      {tab === "comments" && <CommentsTab sp={sp} />}
      {tab === "experiences" && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted space-y-3">
          <p>
            {pendingExperiences === 0
              ? "No interview experiences are waiting for review."
              : `${pendingExperiences} interview experience${pendingExperiences === 1 ? " is" : "s are"} waiting for review.`}{" "}
            Experiences are reviewed on their own page, with bulk publish and reject.
          </p>
          <Link
            href="/admin/interview-questions/experiences"
            className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel"
          >
            Open experiences
          </Link>
        </div>
      )}
    </div>
  );
}
