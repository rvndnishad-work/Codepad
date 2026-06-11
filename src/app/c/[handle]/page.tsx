import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Store, Sparkles, Lock, BookOpen, HelpCircle, Code2, FileText, Braces } from "lucide-react";
import { prisma } from "@/lib/prisma";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { SubscribeButton, BuyContentButton } from "@/app/creator/BuyButton";

type Props = { params: Promise<{ handle: string }> };

const SECTION_META: Record<string, { label: string; icon: typeof Code2 }> = {
  TUTORIAL: { label: "Tutorials", icon: BookOpen },
  INTERVIEW_QA: { label: "Interview Prep", icon: HelpCircle },
  CHALLENGE: { label: "Challenges", icon: Braces },
  SNIPPET: { label: "Playgrounds", icon: Code2 },
  BLOG_POST: { label: "Blog", icon: FileText },
};
const SECTION_ORDER = ["TUTORIAL", "INTERVIEW_QA", "CHALLENGE", "SNIPPET", "BLOG_POST"];

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle }, select: { name: true } });
  return { title: space ? `${space.name} — Creator Space` : "Creator Space" };
}

export default async function CreatorSpacePage({ params }: Props) {
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space || !space.published) notFound();

  const [owner, tiers, items] = await Promise.all([
    prisma.user.findUnique({ where: { id: space.ownerId }, select: { name: true, image: true } }),
    prisma.spaceTier.findMany({ where: { spaceId: space.id, published: true }, orderBy: { rank: "asc" } }),
    prisma.spaceContent.findMany({ where: { spaceId: space.id }, orderBy: { createdAt: "asc" } }),
  ]);

  // Resolve titles + hrefs per content type.
  const ids = (t: string) => items.filter((i) => i.contentType === t).map((i) => i.contentId);
  const [challenges, snippets, blogs, tutorials, qas] = await Promise.all([
    prisma.challenge.findMany({ where: { id: { in: ids("CHALLENGE") } }, select: { id: true, title: true, slug: true } }),
    prisma.snippet.findMany({ where: { id: { in: ids("SNIPPET") } }, select: { id: true, title: true, slug: true } }),
    prisma.blogPost.findMany({ where: { id: { in: ids("BLOG_POST") } }, select: { id: true, title: true, slug: true } }),
    prisma.tutorial.findMany({ where: { id: { in: ids("TUTORIAL") } }, select: { id: true, title: true, slug: true } }),
    prisma.interviewQA.findMany({ where: { id: { in: ids("INTERVIEW_QA") } }, select: { id: true, title: true, slug: true } }),
  ]);

  const resolve = (ct: string, id: string): { title: string; href: string } | null => {
    switch (ct) {
      case "CHALLENGE": { const c = challenges.find((x) => x.id === id); return c ? { title: c.title, href: `/challenges/${c.slug}` } : null; }
      case "SNIPPET": { const s = snippets.find((x) => x.id === id); return s ? { title: s.title, href: `/play/${s.slug}` } : null; }
      case "BLOG_POST": { const b = blogs.find((x) => x.id === id); return b ? { title: b.title, href: `/blog/${b.slug}` } : null; }
      case "TUTORIAL": { const t = tutorials.find((x) => x.id === id); return t ? { title: t.title, href: `/c/${handle}/tutorials/${t.slug}` } : null; }
      case "INTERVIEW_QA": { const q = qas.find((x) => x.id === id); return q ? { title: q.title, href: `/c/${handle}/interview/${q.slug}` } : null; }
    }
    return null;
  };

  const accessBadge = (accessTierRank: number | null) =>
    accessTierRank == null ? (
      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Free</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded"><Lock className="w-2.5 h-2.5" /> Tier {accessTierRank}+</span>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {owner?.image ? (
          <Image src={owner.image} alt={space.name} width={56} height={56} className="rounded-2xl border border-border" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent"><Store className="w-6 h-6" /></div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg truncate">{space.name}</h1>
          {space.tagline && <p className="text-sm text-muted mt-0.5">{space.tagline}</p>}
        </div>
      </div>

      {/* Membership panel */}
      {tiers.length > 0 && (
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-accent mb-1"><Sparkles className="w-4 h-4" /> Membership</div>
          <p className="text-xs text-muted mb-4">Subscribe for all-access to this space&apos;s content at your tier and above.</p>
          <div className="flex flex-wrap gap-2">
            {tiers.map((t) => <SubscribeButton key={t.id} tierId={t.id} name={t.name} priceCents={t.priceCents} currency={t.currency} />)}
          </div>
        </div>
      )}

      {/* About */}
      {space.description && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MarkdownRenderer content={space.description} />
        </div>
      )}

      {/* Content sections */}
      {SECTION_ORDER.map((ct) => {
        const sectionItems = items.filter((i) => i.contentType === ct);
        if (sectionItems.length === 0) return null;
        const meta = SECTION_META[ct];
        const Icon = meta.icon;
        return (
          <div key={ct} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Icon className="w-4 h-4 text-muted" /> {meta.label}</h2>
            {sectionItems.map((i) => {
              const r = resolve(ct, i.contentId);
              if (!r) return null;
              return (
                <div key={i.id} className="rounded-xl border border-border bg-surface p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={r.href} className="text-sm font-semibold text-fg hover:text-accent truncate">{r.title}</Link>
                    <div className="mt-1">{accessBadge(i.accessTierRank)}</div>
                  </div>
                  {i.accessTierRank != null && i.purchasePriceCents != null && (
                    <BuyContentButton spaceContentId={i.id} priceCents={i.purchasePriceCents} currency={i.currency} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
