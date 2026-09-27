import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { ComingSoonCard } from "../_components/form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Screening defaults settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

/** Placeholder for the Screening defaults tab. Replace with the real tab. */
export default async function ScreeningDefaultsSettingsPage({ params }: Props) {
  const { slug } = await params;
  await getSettingsPageContext(slug);
  return <ComingSoonCard title="Screening defaults">Pass marks, reminders and lengths that new take-homes, AI screenings and interviews start with. Coming soon.</ComingSoonCard>;
}
