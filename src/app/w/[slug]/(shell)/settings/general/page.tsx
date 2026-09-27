import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { ComingSoonCard } from "../_components/form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `General settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

/** Placeholder for the General tab. Replace with the real tab. */
export default async function GeneralSettingsPage({ params }: Props) {
  const { slug } = await params;
  await getSettingsPageContext(slug);
  return <ComingSoonCard title="General">Workspace name, web address, logo, time zone and date format. Coming soon.</ComingSoonCard>;
}
