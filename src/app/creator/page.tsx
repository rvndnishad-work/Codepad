import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import CreatorConsole, { type ContentItem, type ProductRow } from "./CreatorConsole";

export const metadata = {
  title: "Creator Studio — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function CreatorPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");
  // Creator capability gate. Non-creators are bounced to their dashboard.
  if (!(await userCan(userId, "content:author"))) redirect("/dashboard");

  const [account, challenges, blogs, snippets, products] = await Promise.all([
    prisma.creatorAccount.findUnique({ where: { userId } }),
    prisma.challenge.findMany({
      where: { authorId: userId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.blogPost.findMany({
      where: { userId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.snippet.findMany({
      where: { userId },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const productRows: ProductRow[] = products.map((p) => ({
    id: p.id,
    contentType: p.contentType,
    contentId: p.contentId,
    kind: p.kind,
    priceCents: p.priceCents,
    currency: p.currency,
    published: p.published,
  }));

  const content: ContentItem[] = [
    ...challenges.map((c) => ({ contentType: "CHALLENGE" as const, contentId: c.id, title: c.title })),
    ...blogs.map((b) => ({ contentType: "BLOG_POST" as const, contentId: b.id, title: b.title })),
    ...snippets.map((s) => ({ contentType: "SNIPPET" as const, contentId: s.id, title: s.title })),
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <CreatorConsole
        chargesEnabled={!!account?.chargesEnabled}
        hasAccount={!!account?.stripeAccountId}
        content={content}
        products={productRows}
      />
    </div>
  );
}
