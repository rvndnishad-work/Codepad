import Link from "next/link";
import { Store, Heart, Users, LayoutGrid, ArrowRight, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import WowReveal from "@/components/wow/WowReveal";

const ORBIT = [
  { r: "132px", dur: "16s", delay: "0s" },
  { r: "132px", dur: "16s", delay: "-8s" },
  { r: "188px", dur: "24s", delay: "0s" },
  { r: "188px", dur: "24s", delay: "-8s" },
  { r: "188px", dur: "24s", delay: "-16s" },
];

/**
 * Live creator orbit: real published spaces ride the rings. Hides when
 * nobody has published yet — no empty shells on the homepage.
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
      take: 5,
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
    <section className="relative overflow-hidden bg-[var(--wow-bg)] px-4 py-24 text-[var(--wow-fg)] transition-colors md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        {/* orbit visual with REAL avatars */}
        <div className="relative mx-auto grid h-[400px] w-[400px] max-w-full place-items-center md:h-[480px] md:w-[480px]">
          <div aria-hidden className="wow-spin-slower absolute inset-4 rounded-full border border-dashed border-[var(--wow-card-border)]" />
          <div aria-hidden className="wow-spin-slow absolute inset-[76px] rounded-full border border-[var(--wow-card-border)]" />
          <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,47,179,0.22),transparent_60%)] blur-2xl" />
          <div className="relative z-10 grid h-36 w-36 place-items-center rounded-[2rem] border-2 border-[#ffe600] bg-gradient-to-br from-[#ffe600] to-[#ff7a18] text-center shadow-[0_0_80px_-10px_#ffe600] dark:shadow-[0_0_80px_-10px_#ffe600]">
            <div><p className="wow-font-display text-3xl text-black">YOU</p><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/70">main character</p></div>
          </div>
          {spaces.map((s, i) => {
            const o = ORBIT[i % ORBIT.length];
            return (
              <div key={s.id} className="absolute left-1/2 top-1/2 z-10" style={{ animation: `wow-orbit ${o.dur} linear infinite`, ["--orbit-r" as string]: o.r, animationDelay: o.delay }}>
                <div className="group relative -ml-8 -mt-8 h-16 w-16" style={{ animation: `wow-orbit ${o.dur} linear infinite reverse`, animationDelay: o.delay }}>
                  <Link href={`/c/${s.handle}`} aria-label={s.name}>
                    {s.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatarUrl} alt="" className="h-16 w-16 rounded-2xl border-2 border-white/70 object-cover shadow-xl transition group-hover:scale-110 dark:border-white/70" loading="lazy" />
                    ) : (
                      <span className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-[var(--wow-card-border)] bg-[var(--wow-card)] text-[var(--wow-faint)] transition group-hover:scale-110">
                        <Store className="h-6 w-6" />
                      </span>
                    )}
                  </Link>
                  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-white opacity-0 backdrop-blur transition group-hover:opacity-100">/c/{s.handle}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <WowReveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8b93ff]">✦ learn from the guild</p>
            <h2 className="wow-font-display mt-3 text-5xl md:text-6xl">PREP WITH PEOPLE<br />WHO <span className="wow-gradient-text">CLEARED IT.</span></h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--wow-muted)]">Vetted creators run storefronts — tutorials, real loops, paid cohorts. Follow free, orbit forever.</p>
          </WowReveal>
          <div className="mt-6 space-y-3">
            {spaces.slice(0, 3).map((s, i) => (
              <WowReveal key={s.id} delay={i * 0.07}>
                <Link href={`/c/${s.handle}`} className="group flex items-center gap-4 rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-4 backdrop-blur-sm transition hover:border-[#8b93ff]/60">
                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-[var(--wow-card-border)] object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--wow-card-border)] text-[var(--wow-faint)]"><Store className="h-5 w-5" /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[15px] font-bold">
                      <span className="truncate">{s.name}</span>
                      {verified.has(s.ownerId) && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" />}
                    </span>
                    <span className="block truncate text-[13px] text-[var(--wow-faint)]">{s.tagline ?? `/c/${s.handle}`}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4 font-mono text-[11px] tabular-nums text-[var(--wow-faint)]">
                    <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" />{count(followCounts, s.id).toLocaleString()}</span>
                    <span className="hidden items-center gap-1.5 sm:inline-flex"><Users className="h-3.5 w-3.5" />{count(memberCounts, s.id).toLocaleString()}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-[#8b93ff]" />
                  </span>
                </Link>
              </WowReveal>
            ))}
          </div>
          <WowReveal delay={0.15}>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href="/creators" className="inline-flex items-center gap-2 rounded-full bg-[var(--wow-fg)] px-6 py-3 text-xs font-black uppercase tracking-wider text-[var(--wow-bg)] transition hover:scale-105">
                <LayoutGrid className="h-4 w-4" /> Browse all creators
              </Link>
              <Link href="/become-creator" className="text-[13px] font-semibold underline decoration-[#8b93ff] decoration-2 underline-offset-4">
                Teach what you know →
              </Link>
            </div>
          </WowReveal>
        </div>
      </div>
    </section>
  );
}
