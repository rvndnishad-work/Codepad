import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { ComingSoonCard } from "../_components/form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Candidate experience settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

/** Placeholder for the Candidate experience tab. Replace with the real tab. */
export default async function CandidateExperienceSettingsPage({ params }: Props) {
  const { slug } = await params;
  await getSettingsPageContext(slug);
  return <ComingSoonCard title="Candidate experience">Your logo, colour, sender name and email wording on everything candidates see. Coming soon.</ComingSoonCard>;
}
