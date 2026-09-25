import { notFound } from "next/navigation";
import { loadTakeHomeReport } from "@/lib/take-home/report-server";
import { loadTakeHomeAccess } from "../_lib";
import ReportView, { type ReportTab } from "../_components/ReportView";

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ q?: string; tab?: string }>;
};

export const metadata = { title: "Take home report — Interviewpad", robots: { index: false, follow: false } };

const TABS: ReportTab[] = ["code", "tests", "replay"];

export default async function TakeHomeReportPage({ params, searchParams }: Props) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const access = await loadTakeHomeAccess(slug, `/w/${slug}/take-homes/${id}`);
  const now = new Date();
  const report = await loadTakeHomeReport(access.workspace.id, id, now);
  if (!report) notFound();

  const q = report.questions.find((x) => x.key === sp.q)?.key ?? report.questions[0]?.key ?? "";
  const tab = TABS.includes(sp.tab as ReportTab) ? (sp.tab as ReportTab) : "code";

  return (
    <ReportView
      key={report.id}
      slug={slug}
      report={report}
      active={q}
      tab={tab}
      now={now.toISOString()}
      canDecide={access.canDecide}
      canCreate={access.canCreate}
    />
  );
}
