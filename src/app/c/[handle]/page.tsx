import { notFound } from "next/navigation";
import Link from "next/link";
import { after } from "next/server";
import {
  Store,
  Sparkles,
  BadgeCheck,
  Users,
  Heart,
  LayoutGrid,
  Check,
  Youtube,
  Linkedin,
  Twitter,
  Github,
  Globe,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { SubscribeButton } from "@/app/creator/BuyButton";
import { type SectionKey } from "@/lib/creator/layout";
import { blocksDocToLayout, normalizeBlocks } from "@/lib/creator/blocks";
import { normalizeTokenSet, tokenSetToCssVars } from "@/lib/creator/tokens";
import { recordSpaceEvent } from "@/lib/creator/events";
import Image from "next/image";
import FollowButton from "./FollowButton";
import AnimatedCounter from "./AnimatedCounter";
import SpaceSectionNav, { type NavSection } from "./SpaceSectionNav";
import BlockRenderer from "./BlockRenderer";
import { type ContentSectionKey, type SpaceCard } from "./space-cards";

type Props = { params: Promise<{ handle: string }> };

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const CAROUSEL_SIZE = 6;

/** Allow next/image for allowlisted hosts; fall back to unoptimized for user-pasted URLs. */
function isSafeImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return [
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
      "platform-lookaside.fbsbx.com",
      "graph.facebook.com",
      "secure.gravatar.com",
      "www.gravatar.com",
      "image.pollinations.ai",
      "images.unsplash.com",
      "plus.unsplash.com",
      "images.pexels.com",
      "picsum.photos",
      // common user-pasted blog covers — serve optimized when possible
      "cdn.hashnode.com",
      "dev-to-uploads.s3.amazonaws.com",
      "miro.medium.com",
      "images.pexels.com",
    ].includes(u.hostname);
  } catch {
    return false;
  }
}

/* ── socials ──────────────────────────────────────────────────────────────── */

const SOCIAL_META: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "x", label: "X (Twitter)", Icon: Twitter },
  { key: "github", label: "GitHub", Icon: Github },
  { key: "website", label: "Website", Icon: Globe },
];

function parseSocials(raw: unknown): { key: string; label: string; Icon: LucideIcon; url: string }[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  return SOCIAL_META.flatMap((m) => {
    const url = obj[m.key];
    return typeof url === "string" && /^https?:\/\//.test(url) ? [{ ...m, url }] : [];
  });
}

function stripMarkdown(md: string): string {
  return md
    .replace(/[#*_`>\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── metadata ─────────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({
    where: { handle },
    select: { name: true, tagline: true, description: true, published: true },
  });
  if (!space || !space.published) return { title: "Creator Space" };
  const description =
    space.tagline ??
    (space.description ? stripMarkdown(space.description).slice(0, 160) : `Exclusive interview prep and tutorials by ${space.name}.`);
  const title = `${space.name} — Creator Space`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image" as const, title, description },
  };
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default async function CreatorSpacePage({ params }: Props) {
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space || !space.published) notFound();

  // Stage 1+2: prefer blocks doc when present; fall back to legacy layout via adapter.
  // Keeping normalizeLayout as fallback ensures 2-release backward compat (see blocks.ts).
  const rawBlocks = (space as unknown as { blocks?: unknown }).blocks;
  const rawStyles = (space as unknown as { styles?: unknown }).styles;
  const blocksDoc = normalizeBlocks(rawBlocks, space.layout);
  // `layout` kept for tier/hero/nav helpers until BlockRenderer fully owns those;
  // BlockRenderer is the streaming shell that will gradually replace page.tsx layout wiring.
  const layout = blocksDocToLayout(blocksDoc);
  const tokenSet = normalizeTokenSet(rawStyles);
  const tokenVars = tokenSet ? tokenSetToCssVars(tokenSet) : null;

  const session = await auth().catch(() => null);
  const viewerId = session?.user?.id ?? null;
  const isOwner = viewerId === space.ownerId;

  const [owner, tiers, items, followerCount, memberCount, viewerFollow, viewerMembership, verifiedApp] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: space.ownerId }, select: { name: true, image: true } }),
      prisma.spaceTier.findMany({ where: { spaceId: space.id, published: true }, orderBy: { rank: "asc" } }),
      prisma.spaceContent.findMany({ where: { spaceId: space.id }, orderBy: { createdAt: "asc" } }),
      prisma.spaceFollow.count({ where: { spaceId: space.id } }),
      prisma.spaceMembership.count({ where: { spaceId: space.id, status: "active" } }),
      viewerId
        ? prisma.spaceFollow.findUnique({ where: { userId_spaceId: { userId: viewerId, spaceId: space.id } } })
        : Promise.resolve(null),
      viewerId
        ? prisma.spaceMembership.findFirst({
            where: { subscriberId: viewerId, spaceId: space.id, status: "active" },
            select: { tierRank: true },
          })
        : Promise.resolve(null),
      prisma.creatorApplication.findUnique({
        where: { userId: space.ownerId },
        select: { status: true },
      }),
    ]);

  // Analytics: record the visit after the response is sent — never blocks render.
  after(() => recordSpaceEvent({ spaceId: space.id, kind: "SPACE_VIEW", userId: viewerId }));

  /* ── resolve content details per type ──────────────────────────────────── */
  // Published-only: editors auto-attach drafts to the space on first save, so
  // an unfiltered lookup would surface dead links to draft-only content.
  const ids = (t: string) => items.filter((i) => i.contentType === t).map((i) => i.contentId);
  const [challenges, snippets, blogs, tutorials, qas, experiences, viewerEntitlements] = await Promise.all([
    prisma.challenge.findMany({
      where: { id: { in: ids("CHALLENGE") }, published: true, visibility: "public" },
      select: { id: true, title: true, slug: true, difficulty: true, category: true, updatedAt: true },
    }),
    prisma.snippet.findMany({
      where: { id: { in: ids("SNIPPET") }, visibility: "public" },
      select: { id: true, title: true, slug: true, template: true, updatedAt: true },
    }),
    prisma.blogPost.findMany({
      where: { id: { in: ids("BLOG_POST") }, published: true },
      select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, updatedAt: true },
    }),
    prisma.tutorial.findMany({
      where: { id: { in: ids("TUTORIAL") }, published: true },
      select: { id: true, title: true, slug: true, summary: true, coverImage: true, updatedAt: true, _count: { select: { sections: true } } },
    }),
    prisma.interviewQA.findMany({
      where: { id: { in: ids("INTERVIEW_QA") }, published: true },
      select: { id: true, title: true, slug: true, summary: true, category: true, coverImage: true, updatedAt: true, _count: { select: { questions: true } } },
    }),
    prisma.interviewExperience.findMany({
      where: { id: { in: ids("INTERVIEW_EXPERIENCE") }, published: true },
      select: { id: true, title: true, slug: true, summary: true, company: true, role: true, outcome: true, difficulty: true, coverImage: true, updatedAt: true },
    }),
    viewerId
      ? prisma.entitlement.findMany({
          where: { userId: viewerId, contentId: { in: items.map((i) => i.contentId) } },
          select: { contentType: true, contentId: true },
        })
      : Promise.resolve([]),
  ]);

  const entitled = new Set(viewerEntitlements.map((e) => `${e.contentType}:${e.contentId}`));
  const membershipRank = viewerMembership?.tierRank ?? null;

  // The cheapest tier that unlocks content at a given rank requirement.
  const tierNameForRank = (rank: number) => tiers.find((t) => t.rank >= rank)?.name ?? "Members";

  const cardFor = (item: (typeof items)[number]): SpaceCard | null => {
    const base = {
      key: `${item.contentType}:${item.contentId}`,
      sectionKey: item.contentType as ContentSectionKey,
      accessTierRank: item.accessTierRank,
      tierName: item.accessTierRank != null ? tierNameForRank(item.accessTierRank) : null,
      purchase:
        item.purchasePriceCents != null && item.purchasePriceCents > 0
          ? { spaceContentId: item.id, priceCents: item.purchasePriceCents, currency: item.currency }
          : null,
      unlocked:
        isOwner ||
        item.accessTierRank == null ||
        entitled.has(`${item.contentType}:${item.contentId}`) ||
        (membershipRank != null && membershipRank >= item.accessTierRank),
    };
    const finish = ({
      updatedAt,
      ...row
    }: {
      title: string;
      href: string;
      cover: string | null;
      summary: string | null;
      chips: string[];
      updatedAt: Date;
    }): SpaceCard => ({ ...base, ...row, updatedAtIso: updatedAt.toISOString() });

    switch (item.contentType) {
      case "TUTORIAL": {
        const t = tutorials.find((x) => x.id === item.contentId);
        if (!t) return null;
        return finish({
          title: t.title,
          href: `/c/${handle}/tutorials/${t.slug}`,
          cover: t.coverImage,
          summary: t.summary,
          updatedAt: t.updatedAt,
          chips: [`${t._count.sections} lesson${t._count.sections === 1 ? "" : "s"}`],
        });
      }
      case "INTERVIEW_QA": {
        const q = qas.find((x) => x.id === item.contentId);
        if (!q) return null;
        return finish({
          title: q.title,
          href: `/c/${handle}/interview/${q.slug}`,
          cover: q.coverImage,
          summary: q.summary,
          updatedAt: q.updatedAt,
          chips: [q.category, `${q._count.questions} question${q._count.questions === 1 ? "" : "s"}`].filter(
            (c): c is string => !!c,
          ),
        });
      }
      case "INTERVIEW_EXPERIENCE": {
        const e = experiences.find((x) => x.id === item.contentId);
        if (!e) return null;
        return finish({
          title: e.title,
          href: `/c/${handle}/experience/${e.slug}`,
          cover: e.coverImage,
          summary: e.summary,
          updatedAt: e.updatedAt,
          chips: [e.company, e.role, e.outcome ? `outcome: ${e.outcome}` : null, e.difficulty].filter(
            (c): c is string => !!c,
          ),
        });
      }
      case "CHALLENGE": {
        const c = challenges.find((x) => x.id === item.contentId);
        if (!c) return null;
        return finish({
          title: c.title,
          href: `/challenges/${c.slug}`,
          cover: null,
          summary: null,
          updatedAt: c.updatedAt,
          chips: [c.difficulty, c.category].filter((x): x is string => !!x),
        });
      }
      case "SNIPPET": {
        const s = snippets.find((x) => x.id === item.contentId);
        if (!s) return null;
        return finish({
          title: s.title,
          href: `/play/${s.slug}`,
          cover: null,
          summary: null,
          updatedAt: s.updatedAt,
          chips: [s.template],
        });
      }
      case "BLOG_POST": {
        const b = blogs.find((x) => x.id === item.contentId);
        if (!b) return null;
        return finish({
          title: b.title,
          href: `/blog/${b.slug}`,
          cover: b.coverImage,
          summary: b.excerpt,
          updatedAt: b.updatedAt,
          chips: [],
        });
      }
    }
    return null;
  };

  const allCards = items.map(cardFor).filter((c): c is SpaceCard => c !== null);

  // Newest publications feed the autoplay carousel; sections stay complete.
  // ISO-8601 strings sort lexicographically in chronological order.
  const carouselItems: SpaceCard[] = [...allCards]
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso))
    .slice(0, CAROUSEL_SIZE);

  const sectionVisible = (key: SectionKey) => layout.sections.find((s) => s.key === key)?.visible !== false;
  const contentSections = layout.sections
    .filter((s): s is typeof s & { key: ContentSectionKey } => s.key !== "ABOUT" && s.key !== "MEMBERSHIP")
    .filter((s) => s.visible)
    .map((s) => ({
      key: s.key,
      cards: allCards.filter((c) => c.sectionKey === s.key),
    }))
    .filter((s) => s.cards.length > 0);

  const totalResources = allCards.length;
  const socials = parseSocials(space.socials);
  const verified = verifiedApp?.status === "APPROVED";
  const showBanner = layout.heroStyle === "banner" && !!space.coverUrl;
  const recommendedTierId = tiers.length > 1 ? tiers[tiers.length - 1].id : null;
  const hasAbout = sectionVisible("ABOUT") && !!space.description;
  const hasMembership = sectionVisible("MEMBERSHIP") && tiers.length > 0;

  // Map for BlockRenderer streaming shell (Stage 3)
  const sectionsByKey = new Map<string, SpaceCard[]>();
  for (const s of contentSections) sectionsByKey.set(s.key, s.cards);

  const navSections: NavSection[] = [
    ...(carouselItems.length > 0 ? [{ id: "latest", label: "Latest" }] : []),
    ...(totalResources > 0 ? [{ id: "posts", label: "Posts", count: totalResources }] : []),
    ...(hasMembership ? [{ id: "membership", label: "Membership" }] : []),
    ...(hasAbout ? [{ id: "about", label: "About" }] : []),
  ];

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: space.name,
    description: space.tagline ?? undefined,
    mainEntity: {
      "@type": "Person",
      name: owner?.name ?? space.name,
      description: space.tagline ?? undefined,
      image: space.avatarUrl ?? owner?.image ?? undefined,
      sameAs: socials.map((s) => s.url),
    },
  };

  return (
    <div className="min-h-screen pb-20 bg-bg" style={tokenVars as React.CSSProperties | undefined}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />

      {/* ── HERO v2 — editorial, glass, motion ───────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border/50">
        {/* Backdrop */}
        <div className="absolute inset-0">
          {showBanner ? (
            <>
              <Image
                src={space.coverUrl!}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover scale-[1.02]"
                unoptimized={!isSafeImageUrl(space.coverUrl!)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-violet-500/20 mix-blend-overlay" />
              <div className="absolute inset-0 backdrop-blur-[0.5px]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black" />
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/15 via-transparent to-violet-500/15" />
              <div
                className="absolute inset-0 opacity-[0.06] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-accent/15 blur-[90px] animate-[float_10s_ease-in-out_infinite]" />
              <div className="absolute -bottom-32 -right-24 w-[640px] h-[640px] rounded-full bg-violet-500/10 blur-[110px] animate-[float_12s_ease-in-out_infinite_reverse]" />
              <div className="absolute inset-0 hidden md:block font-mono text-white/10 select-none pointer-events-none">
                <span className="absolute top-[18%] left-[8%] text-sm tracking-widest animate-float">{"</>"}</span>
                <span className="absolute top-[45%] left-[14%] text-xs tracking-widest animate-float" style={{ animationDelay: "1.2s" }}>{"() =>"}</span>
                <span className="absolute top-[22%] right-[10%] text-base tracking-widest animate-float" style={{ animationDelay: "0.6s" }}>{"{ }"}</span>
                <span className="absolute top-[55%] right-[18%] text-xs tracking-widest animate-float" style={{ animationDelay: "2s" }}>{"[ ]"}</span>
              </div>
            </>
          )}
        </div>

        <div className="relative max-w-6xl mx-auto px-4">
          {/* Top meta bar */}
          <div className="pt-6 flex items-center justify-between gap-3 text-[11px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur-md px-3 py-1.5 text-white/90 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live space
              <span className=" hidden sm:inline text-white/60">·</span>
              <span className=" hidden sm:inline text-white/80">{totalResources} resources</span>
            </span>
            <div className=" hidden md:flex items-center gap-2">
              {verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur-md px-3 py-1.5 text-white text-[11px] font-bold">
                  <BadgeCheck className="w-3.5 h-3.5 text-sky-300" /> Verified creator
                </span>
              )}
              <span className=" hidden lg:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 backdrop-blur px-3 py-1.5 text-white/70">
                <LayoutGrid className="w-3.5 h-3.5" /> {tiers.length} tiers
              </span>
            </div>
          </div>

          {/* Main hero grid */}
          <div className="mt-6 md:mt-10 pb-8 md:pb-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            {/* Left: identity card (glass) */}
            <div className="lg:col-span-8">
              <div className="rounded-[1.5rem] border border-white/15 bg-white/[0.08] backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] p-5 md:p-7 flex flex-col md:flex-row gap-5 md:gap-7">
                <div className="shrink-0 relative self-start">
                  <div className="absolute -inset-1 rounded-[1.25rem] bg-gradient-to-br from-accent via-accent/50 to-violet-500 opacity-60 blur-[8px]" aria-hidden />
                  <div className="relative">
                    <SpaceAvatar avatarUrl={space.avatarUrl} fallbackImage={owner?.image} name={space.name} />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white grid place-items-center shadow">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3 flex-wrap">
                    <h1 className="text-[28px] md:text-[40px] font-black tracking-tight leading-none text-white">
                      <span className="bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">{space.name}</span>
                    </h1>
                    {verified && (
                      <span className=" md:hidden inline-flex items-center gap-1 rounded-full bg-sky-500 text-white text-[10px] font-bold px-2 py-1">
                        <BadgeCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  {space.tagline && (
                    <p className="mt-2 text-[14px] md:text-[15px] leading-relaxed text-white/80 max-w-2xl">{space.tagline}</p>
                  )}

                  {/* Stats pills */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white">
                      <Heart className="w-3.5 h-3.5 text-white/90" />
                      <strong className="tabular-nums text-white">
                        <AnimatedCounter value={followerCount} />
                      </strong>
                      <span className="text-white/70">followers</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white">
                      <Users className="w-3.5 h-3.5 text-white/90" />
                      <strong className="tabular-nums text-white">
                        <AnimatedCounter value={memberCount} />
                      </strong>
                      <span className="text-white/70">members</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white/90">
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <strong className="tabular-nums text-white">
                        <AnimatedCounter value={totalResources} />
                      </strong>
                      <span className="text-white/60">resources</span>
                    </span>
                    {socials.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 backdrop-blur p-1">
                        {socials.map((s) => (
                          <a
                            key={s.key}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={s.label}
                            className="w-7 h-7 rounded-full grid place-items-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                          >
                            <s.Icon className="w-3.5 h-3.5" />
                          </a>
                        ))}
                      </span>
                    )}
                  </div>

                  {space.topics.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {space.topics.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border border-white/15 bg-white/10 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 hover:bg-white/15 transition-colors"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: actions card */}
            <div className="lg:col-span-4">
              <div className="rounded-[1.25rem] border border-white/15 bg-white/[0.08] backdrop-blur-xl p-4 md:p-5 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-white/90">Join this space</div>
                  {tiers.length > 0 && (
                    <span className="text-[11px] text-white/60">From {money(Math.min(...tiers.map((t) => t.priceCents)))} /mo</span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5">
                  {isOwner ? (
                    <Link
                      href={`/creator/${handle}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFE600] hover:bg-[#FFD600] text-black text-sm font-black px-4 py-2.5 shadow-[0_8px_20px_-8px_rgba(255,230,0,0.6)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Store className="w-4 h-4" /> Open studio
                    </Link>
                  ) : (
                    <>
                      <FollowButton
                        spaceId={space.id}
                        handle={handle}
                        isAuthed={!!viewerId}
                        initiallyFollowing={!!viewerFollow}
                        followerCount={followerCount}
                      />
                      {tiers.length > 0 && !viewerMembership && (
                        <a
                          href="#membership"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFE600] hover:bg-[#FFD600] text-black text-sm font-black px-4 py-2.5 shadow-[0_8px_20px_-8px_rgba(255,230,0,0.6)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Sparkles className="w-4 h-4" /> Become a member
                        </a>
                      )}
                      {viewerMembership && (
                        <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-100 text-sm font-bold px-4 py-2.5">
                          <Check className="w-4 h-4" /> {tierNameForRank(viewerMembership.tierRank)} member
                        </span>
                      )}
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href={`/c/${handle}#posts`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-3 py-2 backdrop-blur transition-colors"
                    >
                      Browse posts <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <a
                      href="#about"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-white/90 text-xs font-bold px-3 py-2 backdrop-blur transition-colors"
                    >
                      About
                    </a>
                  </div>
                </div>
                {tiers.length > 0 && (
                  <p className="mt-3 text-[11px] leading-relaxed text-white/60 text-center">Cancel anytime · Members unlock gated content at tier and above</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky section nav (direct child of the page root so `sticky`
             can travel the full page height, not a wrapper's box) ─────────── */}
      <SpaceSectionNav sections={navSections} />

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main content column — Stage 3 streaming shell */}
        <div className="lg:col-span-8 space-y-12">
          {contentSections.length === 0 && carouselItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center relative overflow-hidden">
              <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto text-muted/40" fill="none" aria-hidden>
                <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" className="animate-[spin_24s_linear_infinite] origin-center" />
                <path d="M28 34h24M28 42h16M28 50h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <p className="mt-4 text-sm font-semibold text-fg">Nothing published yet</p>
              <p className="text-xs text-muted mt-1">Follow to get notified when {space.name} publishes.</p>
            </div>
          ) : (
            <BlockRenderer
              doc={blocksDoc}
              allCards={allCards}
              carouselItems={carouselItems}
              sectionsByKey={sectionsByKey}
              membershipRank={membershipRank}
              isOwner={isOwner}
              entitledKeys={entitled}
            />
          )}
        </div>

        {/* Sidebar: membership + about — editorial premium */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          {hasMembership && (
            <div id="membership" className="rounded-[1.5rem] border border-border bg-surface shadow-[0_16px_40px_-20px_rgba(0,0,0,0.15)] overflow-hidden scroll-mt-32">
              <div className="p-6 pb-4 bg-gradient-to-br from-accent/[0.06] via-transparent to-violet-500/[0.04] border-b border-border/50">
                <h3 className="text-[13px] font-black tracking-tight text-fg flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-accent text-black grid place-items-center shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  Membership
                </h3>
                <p className="text-[12px] text-muted mt-2 leading-relaxed">Unlock members-only content at your tier and above. Cancel anytime, keep your progress.</p>
              </div>
              <div className="p-5 space-y-3 bg-surface">
                {tiers.map((t) => {
                  const isCurrent = membershipRank != null && membershipRank === t.rank;
                  const recommended = t.id === recommendedTierId;
                  return (
                    <div
                      key={t.id}
                      className={`rounded-2xl border p-5 space-y-3 relative transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        recommended ? "border-[#FFE600] bg-[#FFE600]/[0.06] shadow-sm" : "border-border bg-panel/50 hover:bg-panel"
                      }`}
                    >
                      {recommended && (
                        <span className="absolute -top-2.5 right-4 text-[10px] font-black uppercase tracking-wider text-black bg-[#FFE600] rounded-full px-3 py-1 shadow z-10">
                          Best value
                        </span>
                      )}
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[15px] font-black text-fg">{t.name}</span>
                        <span className="text-[18px] font-black tracking-tight text-fg">
                          {money(t.priceCents, t.currency)}
                          <span className="text-[11px] font-semibold text-muted">/mo</span>
                        </span>
                      </div>
                      {t.description && <p className="text-[13px] text-muted leading-relaxed">{t.description}</p>}
                      {t.benefits.length > 0 && (
                        <ul className="space-y-2 pt-1">
                          {t.benefits.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-[13px] text-muted leading-snug">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 grid place-items-center shrink-0 mt-0.5">
                                <Check className="w-3 h-3 text-emerald-600" />
                              </span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="pt-1">
                        {isCurrent ? (
                          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-2.5">
                            <Check className="w-3.5 h-3.5" /> Your current tier
                          </span>
                        ) : (
                          !isOwner && (
                            <SubscribeButton tierId={t.id} name={t.name} priceCents={t.priceCents} currency={t.currency} />
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasAbout && (
            <div id="about" className="rounded-[1.5rem] border border-border bg-surface p-6 shadow-sm scroll-mt-32">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-panel border border-border grid place-items-center">
                  <Store className="w-3 h-3.5" />
                </span>
                About
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] text-muted leading-relaxed prose-p:leading-relaxed prose-headings:font-black prose-headings:tracking-tight">
                <MarkdownRenderer content={space.description!} />
              </div>
            </div>
          )}

          {/* Growth loop: every public space advertises the program. */}
          <Link
            href="/become-creator"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-surface/60 px-4 py-3.5 hover:border-accent/40 transition-colors"
          >
            <div>
              <div className="text-xs font-bold text-fg group-hover:text-accent transition-colors">
                Teach on Interviewpad
              </div>
              <p className="text-[10px] text-muted mt-0.5">Launch your own creator space.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────────── */

function SpaceAvatar({
  avatarUrl,
  fallbackImage,
  name,
}: {
  avatarUrl: string | null;
  fallbackImage: string | null | undefined;
  name: string;
}) {
  const src = avatarUrl || fallbackImage || null;
  const cls = "w-24 h-24 md:w-28 md:h-28 rounded-[1.25rem] object-cover bg-surface shrink-0 border-4 border-bg";
  if (src) {
    // next/image with fallback to unoptimized for arbitrary user URLs; priority in hero
    return (
      <Image
        src={src}
        alt={name}
        width={112}
        height={112}
        priority
        className={cls}
        unoptimized={!isSafeImageUrl(src)}
      />
    );
  }
  return (
    <div className={`${cls} grid place-items-center bg-accent/10 text-accent`}>
      <Store className="w-10 h-10" />
    </div>
  );
}
