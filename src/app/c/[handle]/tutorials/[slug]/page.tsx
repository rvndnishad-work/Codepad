import { notFound } from "next/navigation";
import { after } from "next/server";
import { BookOpen, List } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RichContent from "@/components/rich-editor/RichContent";
import { hasAccess, getPaywallOptions } from "@/lib/marketplace/access";
import { recordSpaceEvent } from "@/lib/creator/events";
import SpacePaywall from "../../SpacePaywall";
import SpaceCrumb from "../../SpaceCrumb";

type Props = { params: Promise<{ handle: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { handle, slug } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle }, select: { id: true, name: true, published: true } });
  if (!space || !space.published) return {};
  const tutorial = await prisma.tutorial.findUnique({
    where: { spaceId_slug: { spaceId: space.id, slug } },
    select: { title: true, summary: true, published: true },
  });
  if (!tutorial || !tutorial.published) return {};
  return {
    title: `${tutorial.title} — ${space.name}`,
    description: tutorial.summary ?? `A tutorial by ${space.name} on Interviewpad.`,
  };
}

export default async function TutorialViewer({ params }: Props) {
  const { handle, slug } = await params;
  const space = await prisma.creatorSpace.findUnique({
    where: { handle },
    select: { id: true, name: true, avatarUrl: true, published: true },
  });
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

  after(() =>
    recordSpaceEvent({ spaceId: space.id, kind: "CONTENT_VIEW", contentType: "TUTORIAL", contentId: tutorial.id, userId }),
  );

  const toc = tutorial.sections
    .map((s, i) => ({ id: `section-${i + 1}`, title: s.title || `Section ${i + 1}` }))
    .filter((_, i) => tutorial.sections.length > 1 || i === 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <SpaceCrumb handle={handle} name={space.name} avatarUrl={space.avatarUrl} />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <article className="lg:col-span-8 min-w-0">
          {tutorial.coverImage && (
            <div className="aspect-[21/9] rounded-2xl overflow-hidden border border-border bg-panel mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tutorial.coverImage} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500 bg-violet-500/10 border border-violet-500/25 rounded-full px-2.5 py-1">
            <BookOpen className="w-3 h-3" /> Tutorial
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-fg leading-tight">{tutorial.title}</h1>
          {tutorial.summary && <p className="text-muted mt-3 leading-relaxed">{tutorial.summary}</p>}

          <div className="mt-10 space-y-12">
            {tutorial.sections.map((s, i) => (
              <section key={s.id} id={`section-${i + 1}`} className="scroll-mt-24">
                {s.title && (
                  <h2 className="text-xl font-bold text-fg mb-4 flex items-baseline gap-3">
                    <span className="text-xs font-black text-accent/70 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </h2>
                )}
                <RichContent json={s.bodyJson} markdown={s.body} />
              </section>
            ))}
          </div>
        </article>

        {toc.length > 1 && (
          <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
                <List className="w-3.5 h-3.5" /> In this tutorial
              </div>
              <ol className="space-y-1">
                {toc.map((t, i) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="flex items-baseline gap-2.5 px-2 py-1.5 rounded-lg text-xs text-muted hover:text-fg hover:bg-panel/50 transition-colors"
                    >
                      <span className="font-black text-accent/60 tabular-nums text-[10px]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-snug">{t.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
