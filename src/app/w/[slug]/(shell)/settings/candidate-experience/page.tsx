import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { CANDIDATE_EMAIL_KEYS, isCandidateEmailKey, replyToStatus, type CandidateEmailKey } from "@/lib/workspace/candidate-experience";
import CandidateExperienceClient, { type SavedWording } from "./CandidateExperienceClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Candidate experience settings · ${ws.name} · Interviewpad` : "Workspace not found", robots: { index: false } };
}

/** Settings > Candidate experience: branding, sender, reply-to, email wording, privacy and consent. */
export default async function CandidateExperienceSettingsPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getSettingsPageContext(slug);
  const s = ctx.settings;

  const rows = await prisma.candidateEmailTemplate.findMany({
    where: { workspaceId: ctx.workspace.id },
    select: { key: true, subject: true, body: true, updatedAt: true },
  });
  const wording: Partial<Record<CandidateEmailKey, SavedWording>> = {};
  for (const r of rows) {
    if (isCandidateEmailKey(r.key) && (r.subject || r.body)) {
      wording[r.key] = { subject: r.subject, body: r.body, updatedAt: r.updatedAt.toISOString() };
    }
  }

  return (
    <CandidateExperienceClient
      key={slug}
      slug={slug}
      canEdit={ctx.canEdit}
      growth={ctx.growth}
      workspaceName={s.name}
      logoUrl={s.logoUrl}
      initial={{
        brandColor: s.brandColor ?? "",
        senderName: s.senderName ?? "",
        privacyNoticeUrl: s.privacyNoticeUrl ?? "",
        consentRequired: s.consentRequired,
        helpEmail: s.helpEmail ?? "",
      }}
      replyTo={{ email: s.replyToEmail, status: replyToStatus(s), confirmedAt: s.replyToConfirmedAt?.toISOString() ?? null }}
      wording={wording}
      emailKeys={[...CANDIDATE_EMAIL_KEYS]}
    />
  );
}
