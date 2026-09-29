import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/interview/links";
import { GREENHOUSE } from "@/lib/ats/greenhouse";
import { parseAtsSettings, stepIndex } from "@/lib/ats/settings";
import { connectionsViewer } from "../../_lib";
import { loadMappingData } from "../_data";
import AtsSetupClient from "./AtsSetupClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
};

export const metadata = { title: "Connect Greenhouse", robots: { index: false, follow: false } };

export default async function AtsSetupPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const v = await connectionsViewer(slug, "connections/ats/setup");
  if (!v.growth || !v.canManage) redirect(`/w/${slug}/connections`);

  const integration = await prisma.atsIntegration.findUnique({ where: { workspaceId: v.workspace.id } });
  // An older signed-webhook connection (Lever, Ashby) is managed on its own page.
  if (integration && integration.provider !== GREENHOUSE) redirect(`/w/${slug}/connections/ats`);

  const connected = !!integration?.partnerKeyHash;
  // Nothing past step 1 makes sense until the key exists.
  const step = connected ? stepIndex(sp.step) : 1;
  const settings = parseAtsSettings(integration?.settings);
  const [mapping, origin] = await Promise.all([
    connected ? loadMappingData(v.workspace.id, GREENHOUSE) : Promise.resolve({ rows: [], screenings: [] }),
    appOrigin(),
  ]);

  return (
    <AtsSetupClient
      slug={slug}
      step={step}
      connected={connected}
      settings={settings}
      rows={mapping.rows}
      screenings={mapping.screenings}
      partnerBaseUrl={`${origin}/api/integrations/greenhouse`}
    />
  );
}
