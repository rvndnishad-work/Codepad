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

  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space || space.ownerId !== userId) notFound();

  const [account, tierRows, challenges, blogs, snippets, tutorialRows, qaRows, experienceRows, policies, viewRows] =
    await Promise.all([
      prisma.creatorAccount.findUnique({ where: { userId } }),
      prisma.spaceTier.findMany({ where: { spaceId: space.id }, orderBy: { rank: "asc" } }),
      prisma.challenge.findMany({
        where: { authorId: userId },
        select: { id: true, slug: true, title: true, published: true, updatedAt: true },
      }),
      prisma.blogPost.findMany({
        where: { userId },
        select: { id: true, slug: true, title: true, published: true, updatedAt: true },
      }),
      prisma.snippet.findMany({
        where: { userId },
        select: { id: true, slug: true, title: true, visibility: true, updatedAt: true },
      }),
      prisma.tutorial.findMany({
        where: { spaceId: space.id },
        select: { id: true, slug: true, title: true, published: true, updatedAt: true },
      }),
      prisma.interviewQA.findMany({
        where: { spaceId: space.id },
        select: { id: true, slug: true, title: true, published: true, updatedAt: true },
      }),
      prisma.interviewExperience.findMany({
        where: { spaceId: space.id },
        select: { id: true, slug: true, title: true, published: true, updatedAt: true },
      }),
      prisma.spaceContent.findMany({ where: { spaceId: space.id } }),
      prisma.spaceEvent.groupBy({
        by: ["contentType", "contentId"],
        where: { spaceId: space.id, kind: "CONTENT_VIEW" },
        _count: { _all: true },
      }),
    ]);

  const policyFor = (contentType: string, contentId: string) => {
    const p = policies.find((x) => x.contentType === contentType && x.contentId === contentId);
    return p
      ? { spaceContentId: p.id, accessTierRank: p.accessTierRank, purchasePriceCents: p.purchasePriceCents }
      : null;
  };
  const viewsFor = (contentType: string, contentId: string) =>
    viewRows.find((v) => v.contentType === contentType && v.contentId === contentId)?._count._all ?? 0;

  const mk = (
    contentType: ContentItem["contentType"],
    id: string,
    title: string,
    published: boolean,
    updatedAt: Date,
    publicHref: string,
  ): ContentItem => ({
    contentType,
    contentId: id,
    title,
    published,
    updatedAt: updatedAt.toISOString(),
    views: viewsFor(contentType, id),
    policy: policyFor(contentType, id),
    publicHref,
  });

  const contentList: ContentItem[] = [
    ...tutorialRows.map((t) => mk("TUTORIAL", t.id, t.title, t.published, t.updatedAt, `/c/${handle}/tutorials/${t.slug}`)),
    ...qaRows.map((q) => mk("INTERVIEW_QA", q.id, q.title, q.published, q.updatedAt, `/c/${handle}/interview/${q.slug}`)),
    ...experienceRows.map((e) => mk("INTERVIEW_EXPERIENCE", e.id, e.title, e.published, e.updatedAt, `/c/${handle}/experience/${e.slug}`)),
    ...challenges.map((c) => mk("CHALLENGE", c.id, c.title, c.published, c.updatedAt, `/challenges/${c.slug}`)),
    ...snippets.map((s) => mk("SNIPPET", s.id, s.title, s.visibility === "public", s.updatedAt, `/play/${s.slug}`)),
    ...blogs.map((b) => mk("BLOG_POST", b.id, b.title, b.published, b.updatedAt, `/blog/${b.slug}`)),
  ].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <ContentClient
      spaceId={space.id}
      handle={handle}
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
