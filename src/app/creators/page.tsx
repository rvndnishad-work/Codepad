import Link from "next/link";
import { Store, Heart, Users, LayoutGrid, Sparkles, BadgeCheck, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Creators — Exclusive Interview Prep from People Who've Been There | Interviewpad",
  description:
    "Follow creators sharing exclusive tutorials, interview experiences, and prep guides. Free to follow — get notified when they publish.",
};

export const revalidate = 300;

type Props = { searchParams: Promise<{ topic?: string }> };

export default async function CreatorsDirectoryPage({ searchParams }: Props) {
  const { topic } = await searchParams;

  const spaces = await prisma.creatorSpace.findMany({
    where: { published: true, ...(topic ? { topics: { has: topic } } : {}) },
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
    take: 60,
  });

  const spaceIds = spaces.map((s) => s.id);
  const ownerIds = [...new Set(spaces.map((s) => s.ownerId))];
  const [followCounts, memberCounts, contentCounts, owners, verifiedApps, allTopicsRows] = await Promise.all([
    prisma.spaceFollow.groupBy({ by: ["spaceId"], where: { spaceId: { in: spaceIds } }, _count: { _all: true } }),
    prisma.spaceMembership.groupBy({
      by: ["spaceId"],
      where: { spaceId: { in: spaceIds }, status: "active" },
      _count: { _all: true },
    }),
    prisma.spaceContent.groupBy({ by: ["spaceId"], where: { spaceId: { in: spaceIds } }, _count: { _all: true } }),
    prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, image: true } }),
    prisma.creatorApplication.findMany({
      where: { userId: { in: ownerIds }, status: "APPROVED" },
      select: { userId: true },
    }),
    prisma.creatorSpace.findMany({ where: { published: true }, select: { topics: true } }),
  ]);

  const count = (rows: { spaceId: string; _count: { _all: number } }[], id: string) =>
    rows.find((r) => r.spaceId === id)?._count._all ?? 0;
  const ownerById = new Map(owners.map((o) => [o.id, o]));
  const verified = new Set(verifiedApps.map((v) => v.userId));
  const allTopics = [...new Set(allTopicsRows.flatMap((r) => r.topics))].sort().slice(0, 12);

  return (
    <div className="relative overflow-hidden">
      {/* Ambient hero glow (matches /become-creator language) */}
      <div className="absolute inset-x-0 top-0 h-[420px] bg-hero-glow pointer-events-none" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 h-[420px] pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(var(--accent-rgb),0.10) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-20">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-glow px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            <Store className="w-3.5 h-3.5" /> Creator spaces
          </div>
          <h1 className="mt-6 text-4xl md:text-5xl font-black tracking-tight text-fg leading-[1.08]">
            Learn from people who&apos;ve
            <br />
            <span className="text-accent">been in the room.</span>
          </h1>
          <p className="mt-4 text-base text-muted leading-relaxed">
            Exclusive tutorials, real interview loops, and prep guides from vetted creators. Following is free — you&apos;ll
            be notified the moment they publish.
          </p>
        </div>

        {/* Topic filter */}
        {allTopics.length > 0 && (
          <div className="mt-10 flex items-center justify-center gap-1.5 flex-wrap">
            <Link
              href="/creators"
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                !topic ? "border-accent/50 bg-accent-glow text-accent" : "border-border text-muted hover:text-fg"
              }`}
            >
              All
            </Link>
            {allTopics.map((t) => (
              <Link
                key={t}
                href={`/creators?topic=${encodeURIComponent(t)}`}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                  topic === t ? "border-accent/50 bg-accent-glow text-accent" : "border-border text-muted hover:text-fg"
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        {/* Cards */}
        {spaces.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-border py-20 text-center max-w-lg mx-auto">
            <Store className="w-8 h-8 text-muted mx-auto mb-3" />
            <p className="text-sm font-semibold text-fg">No creator spaces {topic ? `for “${topic}”` : "yet"}</p>
            <p className="text-xs text-muted mt-1">Check back soon — or become the first.</p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {spaces.map((space) => {
              const owner = ownerById.get(space.ownerId);
              return (
                <Link
                  key={space.id}
                  href={`/c/${space.handle}`}
                  className="group rounded-2xl border border-border bg-surface overflow-hidden shadow-tile hover:border-accent/40 hover:-translate-y-0.5 transition-all"
                >
                  {/* Banner strip */}
                  <div className="h-20 bg-panel relative overflow-hidden">
                    {space.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={space.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 via-transparent to-violet-500/15" />
                    )}
                    {space.featured && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-bg bg-accent rounded-full px-2 py-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="p-4 -mt-8 relative">
                    {space.avatarUrl || owner?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={space.avatarUrl || owner?.image || ""}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover border-2 border-bg shadow-tile bg-surface"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl border-2 border-bg shadow-tile bg-accent/10 grid place-items-center text-accent">
                        <Store className="w-6 h-6" />
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-1.5">
                      <h2 className="text-sm font-black text-fg group-hover:text-accent transition-colors truncate">
                        {space.name}
                      </h2>
                      {verified.has(space.ownerId) && <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                    </div>
                    {space.tagline && (
                      <p className="text-[11px] text-muted mt-1 line-clamp-2 leading-relaxed">{space.tagline}</p>
                    )}
                    {space.topics.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                        {space.topics.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] font-bold uppercase tracking-wider text-muted bg-panel/70 rounded px-1.5 py-0.5"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center gap-3 text-[10px] text-muted font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3 text-accent/60" /> {count(followCounts, space.id).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3 text-accent/60" /> {count(memberCounts, space.id).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <LayoutGrid className="w-3 h-3 text-accent/60" /> {count(contentCounts, space.id)} resources
                      </span>
                      <ArrowRight className="w-3 h-3 ml-auto text-muted/50 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Become-a-creator CTA */}
        <div className="mt-16 rounded-3xl border border-accent/25 bg-accent/[0.04] p-8 text-center max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-fg">Have an audience of your own?</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Launch a creator space — publish exclusive prep, grow your following, and earn through memberships.
          </p>
          <Link
            href="/become-creator"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Become a creator
          </Link>
        </div>
      </div>
    </div>
  );
}
