import { notFound } from "next/navigation";
import Link from "next/link";
import { Store, Sparkles, Lock, BookOpen, HelpCircle, Briefcase, Code2, FileText, Braces, Coins, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { SubscribeButton, BuyContentButton } from "@/app/creator/BuyButton";
import { normalizeLayout, type SectionKey } from "@/lib/creator/layout";

type Props = { params: Promise<{ handle: string }> };

const SECTION_META: Record<SectionKey, { label: string; icon: LucideIcon }> = {
  ABOUT: { label: "About Me", icon: Store },
  MEMBERSHIP: { label: "Membership", icon: Sparkles },
  TUTORIAL: { label: "Tutorials", icon: BookOpen },
  INTERVIEW_QA: { label: "Interview Prep", icon: HelpCircle },
  INTERVIEW_EXPERIENCE: { label: "Interview Experiences", icon: Briefcase },
  CHALLENGE: { label: "Challenges", icon: Braces },
  SNIPPET: { label: "Playgrounds", icon: Code2 },
  BLOG_POST: { label: "Blog", icon: FileText },
};

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle }, select: { name: true } });
  return { title: space ? `${space.name} — Creator Space` : "Creator Space" };
}

export default async function CreatorSpacePage({ params }: Props) {
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space || !space.published) notFound();

  const layout = normalizeLayout(space.layout);

  const [owner, tiers, items] = await Promise.all([
    prisma.user.findUnique({ where: { id: space.ownerId }, select: { name: true, image: true } }),
    prisma.spaceTier.findMany({ where: { spaceId: space.id, published: true }, orderBy: { rank: "asc" } }),
    prisma.spaceContent.findMany({ where: { spaceId: space.id }, orderBy: { createdAt: "asc" } }),
  ]);

  // Resolve titles + hrefs per content type.
  const ids = (t: string) => items.filter((i) => i.contentType === t).map((i) => i.contentId);
  const [challenges, snippets, blogs, tutorials, qas, experiences] = await Promise.all([
    prisma.challenge.findMany({ where: { id: { in: ids("CHALLENGE") } }, select: { id: true, title: true, slug: true } }),
    prisma.snippet.findMany({ where: { id: { in: ids("SNIPPET") } }, select: { id: true, title: true, slug: true } }),
    prisma.blogPost.findMany({ where: { id: { in: ids("BLOG_POST") } }, select: { id: true, title: true, slug: true } }),
    prisma.tutorial.findMany({ where: { id: { in: ids("TUTORIAL") } }, select: { id: true, title: true, slug: true } }),
    prisma.interviewQA.findMany({ where: { id: { in: ids("INTERVIEW_QA") } }, select: { id: true, title: true, slug: true } }),
    prisma.interviewExperience.findMany({ where: { id: { in: ids("INTERVIEW_EXPERIENCE") } }, select: { id: true, title: true, slug: true } }),
  ]);

  const resolve = (ct: string, id: string): { title: string; href: string } | null => {
    switch (ct) {
      case "CHALLENGE": { const c = challenges.find((x) => x.id === id); return c ? { title: c.title, href: `/challenges/${c.slug}` } : null; }
      case "SNIPPET": { const s = snippets.find((x) => x.id === id); return s ? { title: s.title, href: `/play/${s.slug}` } : null; }
      case "BLOG_POST": { const b = blogs.find((x) => x.id === id); return b ? { title: b.title, href: `/blog/${b.slug}` } : null; }
      case "TUTORIAL": { const t = tutorials.find((x) => x.id === id); return t ? { title: t.title, href: `/c/${handle}/tutorials/${t.slug}` } : null; }
      case "INTERVIEW_QA": { const q = qas.find((x) => x.id === id); return q ? { title: q.title, href: `/c/${handle}/interview/${q.slug}` } : null; }
      case "INTERVIEW_EXPERIENCE": { const e = experiences.find((x) => x.id === id); return e ? { title: e.title, href: `/c/${handle}/experience/${e.slug}` } : null; }
    }
    return null;
  };

  const accessBadge = (accessTierRank: number | null) =>
    accessTierRank == null ? (
      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Free</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded"><Lock className="w-2.5 h-2.5" /> Tier {accessTierRank}+</span>
    );

  const showBanner = layout.heroStyle === "banner" && !!space.coverUrl;

  const isAboutVisible = layout.sections.find((s) => s.key === "ABOUT")?.visible !== false;
  const isMembershipVisible = layout.sections.find((s) => s.key === "MEMBERSHIP")?.visible !== false;
  const contentSections = layout.sections.filter((s) => s.key !== "ABOUT" && s.key !== "MEMBERSHIP");

  return (
    <div className={`theme-${layout.theme} min-h-screen py-10 px-4 transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Banner + Header */}
        {showBanner ? (
          <div className="space-y-4">
            <div className="aspect-[3/1] w-full rounded-2xl overflow-hidden border border-border bg-panel">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={space.coverUrl!} alt="" className="w-full h-full object-cover" />
            </div>
            <div className={`px-1 -mt-10 flex gap-4 ${
              layout.alignment === "center" ? "flex-col items-center text-center" :
              layout.alignment === "right" ? "flex-row-reverse items-end justify-between text-right" :
              "items-end text-left"
            }`}>
              <Avatar avatarUrl={space.avatarUrl} fallbackImage={owner?.image} name={space.name} ring />
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-bold text-fg truncate">{space.name}</h1>
                {space.tagline && <p className="text-sm text-muted mt-0.5">{space.tagline}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className={`flex gap-4 ${
            layout.alignment === "center" ? "flex-col items-center text-center" :
            layout.alignment === "right" ? "flex-row-reverse items-center justify-between text-right w-full" :
            "items-center text-left"
          }`}>
            <Avatar avatarUrl={space.avatarUrl} fallbackImage={owner?.image} name={space.name} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-fg truncate">{space.name}</h1>
              {space.tagline && <p className="text-sm text-muted mt-0.5">{space.tagline}</p>}
            </div>
          </div>
        )}

        {/* Facebook-style page layout grid: Left sticky panel, Right content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: About Block + Membership Panel (Facebook-style Sidebar) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            {/* About Block */}
            {isAboutVisible && space.description && (
              <div className="p-6 rounded-2xl border border-border bg-surface space-y-3 theme-card">
                <h3 className={`text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5 ${
                  layout.alignment === "center" ? "justify-center" :
                  layout.alignment === "right" ? "flex-row-reverse" : ""
                }`}>
                  <Store className="w-3.5 h-3.5 text-muted" /> About Me
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-muted leading-relaxed">
                  <MarkdownRenderer content={space.description} />
                </div>
              </div>
            )}

            {/* Membership Panel */}
            {isMembershipVisible && tiers.length > 0 && (
              <div className="p-6 rounded-2xl border border-accent/30 bg-accent/[0.04] space-y-4 theme-card-membership">
                <div className={`flex items-center gap-2 text-xs font-bold text-accent ${
                  layout.alignment === "center" ? "justify-center" :
                  layout.alignment === "right" ? "flex-row-reverse" : ""
                }`}>
                  <Sparkles className="w-3.5 h-3.5" /> Membership
                </div>
                <p className={`text-xs text-muted leading-relaxed ${
                  layout.alignment === "center" ? "text-center" :
                  layout.alignment === "right" ? "text-right" : ""
                }`}>
                  Subscribe for all-access to this space&apos;s content at your tier and above.
                </p>
                <div className="flex flex-col gap-2">
                  {tiers.map((t) => (
                    <SubscribeButton key={t.id} tierId={t.id} name={t.name} priceCents={t.priceCents} currency={t.currency} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Content Grid flow */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {contentSections.map(({ key, visible, cols }) => {
              if (!visible) return null;
              const sectionItems = items.filter((i) => i.contentType === key);
              if (sectionItems.length === 0) return null;
              const meta = SECTION_META[key];
              const Icon = meta.icon;

              const colSpanClass = {
                1: "md:col-span-1",
                2: "md:col-span-2",
                3: "md:col-span-3",
                4: "md:col-span-4",
                5: "md:col-span-5",
                6: "md:col-span-6",
                7: "md:col-span-7",
                8: "md:col-span-8",
                9: "md:col-span-9",
                10: "md:col-span-10",
                11: "md:col-span-11",
                12: "md:col-span-12",
              }[cols || 12] || "md:col-span-12";

              return (
                <div key={key} className={`${colSpanClass} p-5 rounded-2xl border border-border bg-surface space-y-4 theme-card`}>
                  <h2 className={`flex items-center gap-2 text-sm font-bold text-fg pb-3 border-b border-border ${
                    layout.alignment === "center" ? "justify-center" :
                    layout.alignment === "right" ? "flex-row-reverse" : ""
                  }`}><Icon className="w-4 h-4 text-accent" /> {meta.label}</h2>
                  <div className="flex flex-col gap-3">
                    {sectionItems.map((i) => {
                      const r = resolve(key, i.contentId);
                      if (!r) return null;
                      return (
                        <div key={i.id} className="rounded-xl border border-border bg-panel/40 hover:bg-elevated/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200">
                          <div className="flex-1 min-w-0">
                            <Link href={r.href} className="text-sm font-bold text-fg hover:text-accent line-clamp-2 block leading-snug">
                              {r.title}
                            </Link>
                          </div>
                          
                          <div className="flex items-center justify-end gap-3 shrink-0">
                            {i.purchasePriceCents != null && i.purchasePriceCents > 0 ? (
                              <>
                                <div className="flex items-center gap-1.5 text-accent font-extrabold text-xs whitespace-nowrap">
                                  <Coins className="w-3.5 h-3.5 text-accent/70 shrink-0" />
                                  <span>${(i.purchasePriceCents / 100).toFixed(2)}</span>
                                </div>
                                <BuyContentButton spaceContentId={i.id} priceCents={i.purchasePriceCents} currency={i.currency} showPrice={false} />
                              </>
                            ) : i.accessTierRank != null ? (
                              <>
                                <div className="flex items-center gap-1 text-muted text-xs font-semibold whitespace-nowrap">
                                  <Lock className="w-3.5 h-3.5 text-accent/70 shrink-0" />
                                  <span>Tier {i.accessTierRank}+</span>
                                </div>
                                <Link href={r.href} className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-panel hover:bg-elevated text-xs font-bold text-fg transition-colors h-8 whitespace-nowrap">
                                  View
                                </Link>
                              </>
                            ) : (
                              <Link href={r.href} className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-panel hover:bg-elevated text-xs font-bold text-fg transition-colors h-8 whitespace-nowrap">
                                View
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({
  avatarUrl,
  fallbackImage,
  name,
  ring,
}: {
  avatarUrl: string | null;
  fallbackImage: string | null | undefined;
  name: string;
  ring?: boolean;
}) {
  const src = avatarUrl || fallbackImage || null;
  const cls = `w-16 h-16 rounded-2xl object-cover bg-surface shrink-0 ${ring ? "border-2 border-bg ring-1 ring-border" : "border border-border"}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cls} />;
  }
  return (
    <div className={`${cls} grid place-items-center bg-accent/10 text-accent`}>
      <Store className="w-7 h-7" />
    </div>
  );
}
