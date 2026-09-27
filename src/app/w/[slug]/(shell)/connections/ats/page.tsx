import { redirect } from "next/navigation";
import { appOrigin } from "@/lib/interview/links";
import { loadAtsSummary, loadSyncLog } from "@/lib/ats/connection-server";
import { providerName } from "@/lib/ats/import";
import { connectionsViewer } from "../_lib";
import { loadMappingData } from "./_data";
import AtsDetailClient from "./AtsDetailClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const metadata = { title: "ATS connection", robots: { index: false, follow: false } };

export default async function AtsDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const v = await connectionsViewer(slug, "connections/ats");
  if (!v.growth) redirect(`/w/${slug}/connections`);

  const summary = await loadAtsSummary(v.workspace.id);
  if (!summary) redirect(v.canManage ? `/w/${slug}/connections/ats/setup` : `/w/${slug}/connections`);
  if (summary.partner && !summary.settings.setupComplete && v.canManage) redirect(`/w/${slug}/connections/ats/setup`);

  const tab = sp.tab === "mapping" || sp.tab === "settings" ? sp.tab : "log";
  const [log, mapping, origin] = await Promise.all([
    tab === "log" ? loadSyncLog(v.workspace.id, { take: 100 }) : Promise.resolve([]),
    tab === "mapping" ? loadMappingData(v.workspace.id, summary.provider) : Promise.resolve(null),
    appOrigin(),
  ]);

  return (
    <AtsDetailClient
      slug={slug}
      tab={tab}
      summary={summary}
      providerName={providerName(summary.provider)}
      canManage={v.canManage}
      canSend={v.canSend}
      log={log}
      mapping={mapping}
      partnerBaseUrl={`${origin}/api/integrations/greenhouse`}
    />
  );
}
