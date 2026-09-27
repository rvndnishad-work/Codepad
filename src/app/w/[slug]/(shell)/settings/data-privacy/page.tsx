import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { ComingSoonCard } from "../_components/form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Data and privacy settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

/** Placeholder for the Data and privacy tab. Replace with the real tab. */
export default async function DataAndPrivacySettingsPage({ params }: Props) {
  const { slug } = await params;
  await getSettingsPageContext(slug);
  return <ComingSoonCard title="Data and privacy">Retention rules, candidate data requests, export everything and delete the workspace. Coming soon.</ComingSoonCard>;
}
