import Link from "next/link";
import { Store, Heart, Users, LayoutGrid, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import WowReveal from "@/components/wow/WowReveal";

/**
 * Creators: up to four published spaces as cards, featured first. Hides
 * when nobody has published yet, so there are no empty shells on the
 * homepage.
 */
export default async function HomeWowCreators() {
  let spaces: {
    id: string;
    handle: string;
    name: string;
    tagline: string | null;
    avatarUrl: string | null;
    ownerId: string;
  }[] = [];
  try {
    spaces = await prisma.creatorSpace.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
      take: 4,
      select: { id: true, handle: true, name: true, tagline: true, avatarUrl: true, ownerId: true },
    });
  } catch {
    return null;
  }
  if (spaces.length === 0) return null;

  const spaceIds = spaces.map((s) => s.id);
  type CountRow = { spaceId: string; _count: { _all: number } };
  const [followCounts, memberCounts, verifiedApps]: [CountRow[], CountRow[], { userId: string }[]] = await Promise.all([
    prisma.spaceFollow.groupBy({ by: ["spaceId"], where: { spaceId: { in: spaceIds } }, _count: { _all: true } }),
    prisma.spaceMembership.groupBy({ by: ["spaceId"], where: { spaceId: { in: spaceIds }, status: "active" }, _count: { _all: true } }),
    prisma.creatorApplication.findMany({ where: { userId: { in: spaces.map((s) => s.ownerId) }, status: "APPROVED" }, select: { userId: true } }),
  ]).catch(() => [[], [], []] as [CountRow[], CountRow[], { userId: string }[]]);
  const count = (rows: CountRow[], id: string) => rows.find((r) => r.spaceId === id)?._count._all ?? 0;
  const verified = new Set(verifiedApps.map((v) => v.userId));

  return (
    <section className="relative bg-bg px-4 py-24 text-fg transition-colors md:py-32">
      <div className="mx-auto max-w-7xl">
        <WowReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">✦ learn from creators</p>
          <h2 className="wow-font-display mt-3 text-4xl md:text-5xl lg:text-6xl">PREP WITH PEOPLE<br />WHO <span className="wow-gradient-text">CLEARED IT.</span></h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">Vetted creators publish tutorials, real interview loops and paid cohorts. Following them is free.</p>
        </WowReveal>

        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {spaces.map((s, i) => (
            <li key={s.id} className="min-w-0">
              <WowReveal delay={i * 0.06} className="h-full">
                <Link href={`/c/${s.handle}`} className="wow-card-glow group flex h-full flex-col gap-4 rounded-3xl border border-border bg-surface p-6">
                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatarUrl} alt="" className="h-16 w-16 rounded-2xl border border-border object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-elevated text-subtle"><Store className="h-6 w-6" aria-hidden /></span>
                  )}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-lg font-bold">
                      <span className="truncate">{s.name}</span>
                      {verified.has(s.ownerId) && <BadgeCheck className="h-4 w-4 shrink-0 text-accent-4" aria-label="Verified creator" />}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-[13px] leading-relaxed text-muted">{s.tagline ?? `/c/${s.handle}`}</span>
                  </span>
                  <span className="mt-auto flex items-center gap-4 border-t border-border pt-4 font-mono text-[11px] tabular-nums text-subtle">
                    <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" aria-hidden />{count(followCounts, s.id).toLocaleString()} <span className="sr-only">followers</span></span>
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden />{count(memberCounts, s.id).toLocaleString()} <span className="sr-only">members</span></span>
                  </span>
                </Link>
              </WowReveal>
            </li>
          ))}
        </ul>

        <WowReveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/creators" className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-xs font-black uppercase tracking-wider text-bg transition hover:scale-105">
              <LayoutGrid className="h-4 w-4" aria-hidden /> Browse creators
            </Link>
            <Link href="/become-creator" className="text-[13px] font-semibold underline decoration-secondary decoration-2 underline-offset-4">
              Teach what you know →
            </Link>
          </div>
        </WowReveal>
      </div>
    </section>
  );
}
