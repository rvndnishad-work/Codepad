import Link from "next/link";
import { Store, Heart, Users, LayoutGrid, ArrowRight, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";
import SectionHeading from "@/components/home/SectionHeading";

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

  const cols =
    spaces.length === 1 ? "md:grid-cols-1" : spaces.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";

  return (
    <section className="relative border-b border-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          index="06"
          eyebrow="Learn from creators"
          eyebrowIcon={<Store className="h-3 w-3" />}
          title="Exclusive prep from people"
          highlight="who've been in the room."
          lede="Vetted creators publish tutorials, real interview loops and prep guides. Follow for free — get notified when they drop something new."
          linkHref="/creators"
          linkLabel="Browse all creators"
        />

        {/* One ruled sheet, so the spaces read as a directory listing rather
            than as floating cards. Borders (not grid gaps) draw the rules, so
            a partly filled final row stays clean — see HomeExplore. */}
        <RevealOnScroll className={`grid grid-cols-1 border-l border-t border-border ${cols}`}>
          {spaces.map((space) => (
            <div key={space.id} className="flex border-b border-r border-border bg-surface">
              <Link
                href={`/c/${space.handle}`}
                className="group ip-ticks ip-ticks-hover flex h-full w-full flex-col gap-4 p-5"
              >
                <div className="flex items-start gap-3">
                  {space.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={space.avatarUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 border border-border object-cover"
                    />
                  ) : (
                    <div className="grid h-11 w-11 shrink-0 place-items-center border border-border bg-panel text-subtle">
                      <Store className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-fg">
                        {space.name}
                      </span>
                      {verified.has(space.ownerId) && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      )}
                    </div>
                    <span className="ip-label ip-label-xs">/c/{space.handle}</span>
                  </div>
                </div>

                {space.tagline && (
                  <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                    {space.tagline}
                  </p>
                )}

                {/* Metrics as a monospaced readout on one baseline. */}
                <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 font-mono text-[10.5px] text-subtle">
                  <span className="ip-nums inline-flex items-center gap-1.5">
                    <Heart className="h-3 w-3" /> {count(followCounts, space.id).toLocaleString()}
                  </span>
                  <span className="ip-nums inline-flex items-center gap-1.5">
                    <Users className="h-3 w-3" /> {count(memberCounts, space.id).toLocaleString()}
                  </span>
                  <span className="ip-nums inline-flex items-center gap-1.5">
                    <LayoutGrid className="h-3 w-3" /> {count(contentCounts, space.id)}
                  </span>
                  <ArrowRight className="ip-arrow ml-auto h-3.5 w-3.5" />
                </div>
              </Link>
            </div>
          ))}
        </RevealOnScroll>

        <RevealOnScroll delay={0.1}>
          <p className="mt-6 text-[12.5px] text-subtle">
            Teach what you know —{" "}
            <Link href="/become-creator" className="ip-link text-[12.5px]">
              become a creator
            </Link>{" "}
            and publish paid or free prep to your own storefront.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
