import Link from "next/link";
import { Store, Heart, Users, LayoutGrid, ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * "Learn from creators" homepage section. Follows the HomeArsenal convention:
 * every number comes from the DB and the whole section hides itself when
 * there are no published creator spaces — no empty shells on the homepage.
 */
export default async function HomeCreators() {
  let spaces: {
    id: string;
    handle: string;
    name: string;
    tagline: string | null;
    avatarUrl: string | null;
    topics: string[];
    ownerId: string;
  }[] = [];
  try {
    spaces = await prisma.creatorSpace.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
      take: 3,
      select: {
        id: true,
        handle: true,
        name: true,
        tagline: true,
        avatarUrl: true,
        topics: true,
        ownerId: true,
      },
    });
  } catch {
    return null;
  }
  if (spaces.length === 0) return null;

  const spaceIds = spaces.map((s) => s.id);
  const [followCounts, memberCounts, contentCounts, verifiedApps] = await Promise.all([
    prisma.spaceFollow.groupBy({ by: ["spaceId"], where: { spaceId: { in: spaceIds } }, _count: { _all: true } }),
    prisma.spaceMembership.groupBy({
      by: ["spaceId"],
      where: { spaceId: { in: spaceIds }, status: "active" },
      _count: { _all: true },
    }),
    prisma.spaceContent.groupBy({ by: ["spaceId"], where: { spaceId: { in: spaceIds } }, _count: { _all: true } }),
    prisma.creatorApplication.findMany({
      where: { userId: { in: spaces.map((s) => s.ownerId) }, status: "APPROVED" },
      select: { userId: true },
    }),
  ]);
  const count = (rows: { spaceId: string; _count: { _all: number } }[], id: string) =>
    rows.find((r) => r.spaceId === id)?._count._all ?? 0;
  const verified = new Set(verifiedApps.map((v) => v.userId));

  return (
    <section className="relative max-w-6xl mx-auto px-4 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-glow px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          <Store className="w-3.5 h-3.5" /> Learn from creators
        </div>
        <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight text-fg leading-tight">
          Exclusive prep from people
          <br />
          who&apos;ve been in the room.
        </h2>
        <p className="mt-3 text-sm md:text-base text-muted leading-relaxed">
          Vetted creators publish tutorials, real interview loops, and prep guides. Follow for free — get notified when
          they drop something new.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        {spaces.map((space) => (
          <Link
            key={space.id}
            href={`/c/${space.handle}`}
            className="group rounded-2xl border border-border bg-surface p-5 shadow-tile hover:border-accent/40 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-3">
              {space.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={space.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-border" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 grid place-items-center text-accent">
                  <Store className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-fg group-hover:text-accent transition-colors truncate">
                    {space.name}
                  </span>
                  {verified.has(space.ownerId) && <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                </div>
                <span className="text-[10px] font-mono text-muted">/c/{space.handle}</span>
              </div>
            </div>
            {space.tagline && (
              <p className="mt-3 text-[11px] text-muted line-clamp-2 leading-relaxed">{space.tagline}</p>
            )}
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-3 text-[10px] text-muted font-semibold">
              <span className="inline-flex items-center gap-1">
                <Heart className="w-3 h-3 text-accent/60" /> {count(followCounts, space.id).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3 text-accent/60" /> {count(memberCounts, space.id).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <LayoutGrid className="w-3 h-3 text-accent/60" /> {count(contentCounts, space.id)} resources
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          href="/creators"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition-colors"
        >
          Browse all creators <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/become-creator"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg transition-colors"
        >
          <Sparkles className="w-4 h-4 text-accent" /> Become one
        </Link>
      </div>
    </section>
  );
}
