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
import { normalizeLayout, type SectionKey } from "@/lib/creator/layout";
import { recordSpaceEvent } from "@/lib/creator/events";
import FollowButton from "./FollowButton";
import AnimatedCounter from "./AnimatedCounter";
import SpaceSectionNav, { type NavSection } from "./SpaceSectionNav";
import LatestCarousel from "./LatestCarousel";
import SpaceFeed from "./SpaceFeed";
import { type ContentSectionKey, type SpaceCard } from "./space-cards";

type Props = { params: Promise<{ handle: string }> };

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const CAROUSEL_SIZE = 6;

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

  const layout = normalizeLayout(space.layout);

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
    <div className="min-h-screen pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Backdrop: cover image or animated gradient mesh */}
        {showBanner ? (
          <div className="absolute inset-x-0 top-0 h-56 md:h-72 overflow-hidden bg-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={space.coverUrl!} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/10" />
          </div>
        ) : (
          <div className="absolute inset-x-0 top-0 h-56 md:h-72" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.14] via-transparent to-violet-500/10" />
            <div
              className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(var(--accent-rgb),0.16) 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            />
            {/* Floating code glyphs */}
            <div className="absolute inset-0 hidden md:block font-mono font-bold text-accent/25 select-none pointer-events-none">
              <span className="absolute top-[18%] left-[7%] text-lg animate-float" style={{ animationDuration: "7s" }}>{"</>"}</span>
              <span className="absolute top-[42%] left-[16%] text-xs animate-float" style={{ animationDuration: "9s", animationDelay: "1.2s" }}>{"() =>"}</span>
              <span className="absolute top-[22%] right-[10%] text-base animate-float" style={{ animationDuration: "8s", animationDelay: "0.6s" }}>{"{ }"}</span>
              <span className="absolute top-[52%] right-[20%] text-xs animate-float" style={{ animationDuration: "10s", animationDelay: "2s" }}>{"[ ]"}</span>
              <span className="absolute top-[10%] left-[38%] text-xs animate-float" style={{ animationDuration: "11s", animationDelay: "0.3s" }}>{"const"}</span>
            </div>
          </div>
        )}

        {/* Breathing ambient orbs */}
        <div className="cs-orb absolute -top-16 -left-16 w-72 h-72 rounded-full bg-accent/10 blur-[100px] pointer-events-none" aria-hidden />
        <div className="cs-orb absolute top-8 right-[-5%] w-80 h-80 rounded-full bg-violet-500/10 blur-[110px] pointer-events-none" style={{ animationDelay: "3s" }} aria-hidden />

        <div className="relative max-w-6xl mx-auto px-4 pt-32 md:pt-44">
          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-7">
            {/* Avatar with rotating conic ring */}
            <div className="cs-avatar-ring shrink-0 w-fit">
              <SpaceAvatar avatarUrl={space.avatarUrl} fallbackImage={owner?.image} name={space.name} />
            </div>

            <div className="flex-1 min-w-0 md:pb-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">{space.name}</h1>
                {verified && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-500 bg-sky-500/10 border border-sky-500/25 rounded-full px-2 py-0.5"
                    title="Verified creator"
                  >
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              {space.tagline && <p className="text-sm md:text-base text-muted mt-1.5 max-w-xl">{space.tagline}</p>}

              {/* Animated stats + pulse wave */}
              <div className="mt-3 flex items-center gap-5 flex-wrap text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-accent/70" />
                  <strong className="text-fg font-black text-sm tabular-nums">
                    <AnimatedCounter value={followerCount} />
                  </strong>
                  followers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-accent/70" />
                  <strong className="text-fg font-black text-sm tabular-nums">
                    <AnimatedCounter value={memberCount} />
                  </strong>
                  members
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-accent/70" />
                  <strong className="text-fg font-black text-sm tabular-nums">
                    <AnimatedCounter value={totalResources} />
                  </strong>
                  resources
                </span>
                {socials.length > 0 && (
                  <span className="inline-flex items-center gap-0.5">
                    {socials.map((s) => (
                      <a
                        key={s.key}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={s.label}
                        className="w-7 h-7 rounded-lg grid place-items-center text-muted hover:text-accent hover:bg-panel/60 hover:-translate-y-0.5 transition-all"
                      >
                        <s.Icon className="w-4 h-4" />
                      </a>
                    ))}
                  </span>
                )}
              </div>

              {/* Animated pulse-wave signature line */}
              <svg viewBox="0 0 320 18" className="mt-2.5 h-4 w-56 text-accent/40" fill="none" aria-hidden>
                <path
                  className="cs-wave"
                  d="M0 9 H70 L82 9 88 2 96 16 102 9 H150 L162 9 168 4 176 14 182 9 H240 L252 9 258 3 266 15 272 9 H320"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="flex items-center gap-2.5 md:pb-2 shrink-0">
              {isOwner ? (
                <Link
                  href={`/creator/${handle}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                      className="cs-shine inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles className="w-4 h-4" /> Become a member
                    </a>
                  )}
                  {viewerMembership && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" /> {tierNameForRank(viewerMembership.tierRank)} member
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {space.topics.length > 0 && (
            <div className="mt-5 flex items-center gap-1.5 flex-wrap">
              {space.topics.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-bold uppercase tracking-wider text-muted bg-panel/50 border border-border/40 rounded-full px-2.5 py-0.5 hover:border-accent/40 hover:text-fg transition-colors"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky section nav (direct child of the page root so `sticky`
             can travel the full page height, not a wrapper's box) ─────────── */}
      <SpaceSectionNav sections={navSections} />

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main content column */}
        <div className="lg:col-span-8 space-y-12">
          {/* Autoplay carousel of the newest publications */}
          {carouselItems.length > 0 && (
            <section id="latest" className="scroll-mt-32">
              <LatestCarousel items={carouselItems} />
            </section>
          )}

          {/* Sections: compact list by default, card grid on toggle */}
          <SpaceFeed sections={contentSections} />

          {contentSections.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center relative overflow-hidden">
              <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto text-muted/40" fill="none" aria-hidden>
                <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" className="animate-[spin_24s_linear_infinite] origin-center" />
                <path d="M28 34h24M28 42h16M28 50h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <p className="mt-4 text-sm font-semibold text-fg">Nothing published yet</p>
              <p className="text-xs text-muted mt-1">Follow to get notified when {space.name} publishes.</p>
            </div>
          )}
        </div>

        {/* Sidebar: membership + about */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-32">
          {hasMembership && (
            <div id="membership" className="rounded-2xl border border-accent/25 bg-accent/[0.03] p-5 space-y-4 scroll-mt-32">
              <div>
                <h3 className="text-sm font-black text-fg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" /> Membership
                </h3>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Unlock members-only content at your tier and above. Cancel anytime.
                </p>
              </div>
              <div className="space-y-3">
                {tiers.map((t) => {
                  const isCurrent = membershipRank != null && membershipRank === t.rank;
                  const recommended = t.id === recommendedTierId;
                  return (
                    <div
                      key={t.id}
                      className={`rounded-xl border p-4 space-y-3 relative transition-transform hover:-translate-y-0.5 ${
                        recommended ? "cs-shine border-accent/50 bg-accent/[0.05]" : "border-border/40 bg-surface/70"
                      }`}
                    >
                      {recommended && (
                        <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-wider text-bg bg-accent rounded-full px-2 py-0.5 z-10">
                          Best value
                        </span>
                      )}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-black text-fg">{t.name}</span>
                        <span className="text-sm font-black text-fg">
                          {money(t.priceCents, t.currency)}
                          <span className="text-[10px] font-semibold text-muted">/mo</span>
                        </span>
                      </div>
                      {t.description && <p className="text-[11px] text-muted leading-relaxed">{t.description}</p>}
                      {t.benefits.length > 0 && (
                        <ul className="space-y-1.5">
                          {t.benefits.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-snug">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-[1px]" /> {b}
                            </li>
                          ))}
                        </ul>
                      )}
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                          <Check className="w-3.5 h-3.5" /> Your current tier
                        </span>
                      ) : (
                        !isOwner && (
                          <SubscribeButton tierId={t.id} name={t.name} priceCents={t.priceCents} currency={t.currency} />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasAbout && (
            <div id="about" className="rounded-2xl border border-border/50 bg-surface/60 p-5 shadow-tile scroll-mt-32">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
                <Store className="w-3.5 h-3.5" /> About
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-muted leading-relaxed">
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
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cls} />;
  }
  return (
    <div className={`${cls} grid place-items-center bg-accent/10 text-accent`}>
      <Store className="w-10 h-10" />
    </div>
  );
}
