import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import CreatorConsole, {
  type SpaceData,
  type TierRow,
  type ContentItem,
  type DocRow,
} from "./CreatorConsole";

export const metadata = {
  title: "Creator Studio — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function CreatorPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");
  if (!(await userCan(userId, "content:author"))) redirect("/dashboard");

  const [account, space] = await Promise.all([
    prisma.creatorAccount.findUnique({ where: { userId } }),
    prisma.creatorSpace.findUnique({ where: { ownerId: userId } }),
  ]);

  let tiers: TierRow[] = [];
  let content: ContentItem[] = [];
  let tutorials: DocRow[] = [];
  let interviews: DocRow[] = [];

  if (space) {
    const [tierRows, challenges, blogs, snippets, tutorialRows, qaRows, policies] =
      await Promise.all([
        prisma.spaceTier.findMany({ where: { spaceId: space.id }, orderBy: { rank: "asc" } }),
        prisma.challenge.findMany({ where: { authorId: userId }, select: { id: true, title: true } }),
        prisma.blogPost.findMany({ where: { userId }, select: { id: true, title: true } }),
        prisma.snippet.findMany({ where: { userId }, select: { id: true, title: true } }),
        prisma.tutorial.findMany({ where: { spaceId: space.id }, select: { id: true, title: true, slug: true, published: true } }),
        prisma.interviewQA.findMany({ where: { spaceId: space.id }, select: { id: true, title: true, slug: true, published: true } }),
        prisma.spaceContent.findMany({ where: { spaceId: space.id } }),
      ]);

    tiers = tierRows.map((t) => ({
      id: t.id,
      name: t.name,
      rank: t.rank,
      priceCents: t.priceCents,
      currency: t.currency,
      published: t.published,
    }));
    tutorials = tutorialRows;
    interviews = qaRows;

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

    content = [
      ...challenges.map((c) => mk("CHALLENGE", c.id, c.title)),
      ...snippets.map((s) => mk("SNIPPET", s.id, s.title)),
      ...blogs.map((b) => mk("BLOG_POST", b.id, b.title)),
      ...tutorialRows.map((t) => mk("TUTORIAL", t.id, t.title)),
      ...qaRows.map((q) => mk("INTERVIEW_QA", q.id, q.title)),
    ];
  }

  const spaceData: SpaceData | null = space
    ? {
        id: space.id,
        handle: space.handle,
        name: space.name,
        tagline: space.tagline,
        description: space.description,
        published: space.published,
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <CreatorConsole
        chargesEnabled={!!account?.chargesEnabled}
        hasAccount={!!account?.stripeAccountId}
        space={spaceData}
        tiers={tiers}
        content={content}
        tutorials={tutorials}
        interviews={interviews}
      />
    </div>
  );
}
