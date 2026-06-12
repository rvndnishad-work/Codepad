import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ContentClient, { type ContentItem } from "./ContentClient";

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function CreatorSpaceContentPage({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");

  const space = await prisma.creatorSpace.findUnique({
    where: { handle },
  });

  if (!space || space.ownerId !== userId) notFound();

  const [account, tierRows, challenges, blogs, snippets, tutorialRows, qaRows, experienceRows, policies] =
    await Promise.all([
      prisma.creatorAccount.findUnique({ where: { userId } }),
      prisma.spaceTier.findMany({ where: { spaceId: space.id }, orderBy: { rank: "asc" } }),
      prisma.challenge.findMany({ where: { authorId: userId }, select: { id: true, title: true } }),
      prisma.blogPost.findMany({ where: { userId }, select: { id: true, title: true } }),
      prisma.snippet.findMany({ where: { userId }, select: { id: true, title: true } }),
      prisma.tutorial.findMany({ where: { spaceId: space.id }, select: { id: true, title: true, slug: true, published: true } }),
      prisma.interviewQA.findMany({ where: { spaceId: space.id }, select: { id: true, title: true, slug: true, published: true } }),
      prisma.interviewExperience.findMany({ where: { spaceId: space.id }, select: { id: true, title: true, slug: true, published: true } }),
      prisma.spaceContent.findMany({ where: { spaceId: space.id } }),
    ]);

  const policyFor = (contentType: string, contentId: string) => {
    const p = policies.find((x) => x.contentType === contentType && x.contentId === contentId);
    return p
      ? { spaceContentId: p.id, accessTierRank: p.accessTierRank, purchasePriceCents: p.purchasePriceCents }
      : null;
  };

  const mk = (contentType: ContentItem["contentType"], id: string, title: string): ContentItem => ({
    contentType,
    contentId: id,
    title,
    policy: policyFor(contentType, id),
  });

  const contentList: ContentItem[] = [
    ...challenges.map((c) => mk("CHALLENGE", c.id, c.title)),
    ...snippets.map((s) => mk("SNIPPET", s.id, s.title)),
    ...blogs.map((b) => mk("BLOG_POST", b.id, b.title)),
    ...tutorialRows.map((t) => mk("TUTORIAL", t.id, t.title)),
    ...qaRows.map((q) => mk("INTERVIEW_QA", q.id, q.title)),
    ...experienceRows.map((e) => mk("INTERVIEW_EXPERIENCE", e.id, e.title)),
  ];

  return (
    <ContentClient
      spaceId={space.id}
      content={contentList}
      tiers={tierRows.map((t) => ({
        id: t.id,
        name: t.name,
        rank: t.rank,
        priceCents: t.priceCents,
        currency: t.currency,
        published: t.published,
      }))}
      chargesEnabled={!!account?.chargesEnabled}
    />
  );
}
