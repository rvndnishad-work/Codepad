import { notFound } from "next/navigation";
import { after } from "next/server";
import { Building2, Briefcase } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RichContent from "@/components/rich-editor/RichContent";
import { hasAccess, getPaywallOptions } from "@/lib/marketplace/access";
import { recordSpaceEvent } from "@/lib/creator/events";
import SpacePaywall from "../../SpacePaywall";
import SpaceCrumb from "../../SpaceCrumb";

type Props = { params: Promise<{ handle: string; slug: string }> };

const OUTCOME_TONE: Record<string, string> = {
  offer: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
  rejected: "text-rose-500 bg-rose-500/10 border-rose-500/25",
  pending: "text-amber-500 bg-amber-500/10 border-amber-500/25",
  withdrew: "text-muted bg-panel/60 border-border",
};
const DIFF_TONE: Record<string, string> = {
  easy: "text-emerald-500 bg-emerald-500/10",
  medium: "text-amber-500 bg-amber-500/10",
  hard: "text-rose-500 bg-rose-500/10",
};

export async function generateMetadata({ params }: Props) {
  const { handle, slug } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle }, select: { id: true, name: true, published: true } });
  if (!space || !space.published) return {};
  const exp = await prisma.interviewExperience.findUnique({
    where: { spaceId_slug: { spaceId: space.id, slug } },
    select: { title: true, summary: true, published: true },
  });
  if (!exp || !exp.published) return {};
  return {
    title: `${exp.title} — ${space.name}`,
    description: exp.summary ?? `A real interview experience shared by ${space.name}.`,
  };
}

export default async function ExperienceViewer({ params }: Props) {
  const { handle, slug } = await params;
  const space = await prisma.creatorSpace.findUnique({
    where: { handle },
    select: { id: true, name: true, avatarUrl: true, published: true },
  });
  if (!space || !space.published) notFound();

  const exp = await prisma.interviewExperience.findUnique({
    where: { spaceId_slug: { spaceId: space.id, slug } },
  });
  if (!exp || !exp.published) notFound();

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  if (!(await hasAccess(userId, "INTERVIEW_EXPERIENCE", exp.id))) {
    const options = await getPaywallOptions("INTERVIEW_EXPERIENCE", exp.id);
    if (options) return <SpacePaywall title={exp.title} blurb={exp.summary} options={options} />;
  }

  after(() =>
    recordSpaceEvent({
      spaceId: space.id,
      kind: "CONTENT_VIEW",
      contentType: "INTERVIEW_EXPERIENCE",
      contentId: exp.id,
      userId,
    }),
  );

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <SpaceCrumb handle={handle} name={space.name} avatarUrl={space.avatarUrl} />

      {exp.coverImage && (
        <div className="mt-6 aspect-[21/9] rounded-2xl overflow-hidden border border-border bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={exp.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mt-6">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-500 bg-sky-500/10 border border-sky-500/25 rounded-full px-2.5 py-1">
          <Briefcase className="w-3 h-3" /> Interview Experience
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-fg leading-tight">{exp.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {exp.company && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg bg-panel/60 border border-border rounded-full px-2.5 py-1">
              <Building2 className="w-3.5 h-3.5 text-muted" /> {exp.company}
            </span>
          )}
          {exp.role && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg bg-panel/60 border border-border rounded-full px-2.5 py-1">
              <Briefcase className="w-3.5 h-3.5 text-muted" /> {exp.role}
            </span>
          )}
          {exp.outcome && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${OUTCOME_TONE[exp.outcome] ?? "text-muted bg-panel/60 border-border"}`}
            >
              {exp.outcome}
            </span>
          )}
          {exp.difficulty && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${DIFF_TONE[exp.difficulty] ?? "text-muted bg-panel/60"}`}
            >
              {exp.difficulty}
            </span>
          )}
        </div>

        {exp.summary && <p className="text-muted mt-4 leading-relaxed">{exp.summary}</p>}
      </div>

      <RichContent
        json={exp.bodyJson}
        markdown={exp.body}
        className="prose prose-sm dark:prose-invert max-w-none mt-8"
      />
    </article>
  );
}
