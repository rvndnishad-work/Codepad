import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { hasAccess, getPaywallOptions } from "@/lib/marketplace/access";
import SpacePaywall from "../../SpacePaywall";

type Props = { params: Promise<{ handle: string; slug: string }> };

export default async function TutorialViewer({ params }: Props) {
  const { handle, slug } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle }, select: { id: true, published: true } });
  if (!space || !space.published) notFound();

  const tutorial = await prisma.tutorial.findUnique({
    where: { spaceId_slug: { spaceId: space.id, slug } },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  if (!tutorial || !tutorial.published) notFound();

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  if (!(await hasAccess(userId, "TUTORIAL", tutorial.id))) {
    const options = await getPaywallOptions("TUTORIAL", tutorial.id);
    if (options) return <SpacePaywall title={tutorial.title} blurb={tutorial.summary} options={options} />;
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <Link href={`/c/${handle}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> {handle}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-fg">{tutorial.title}</h1>
      {tutorial.summary && <p className="text-muted mt-2">{tutorial.summary}</p>}
      <div className="mt-8 space-y-10">
        {tutorial.sections.map((s) => (
          <section key={s.id}>
            {s.title && <h2 className="text-xl font-bold text-fg mb-3">{s.title}</h2>}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={s.body} />
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
