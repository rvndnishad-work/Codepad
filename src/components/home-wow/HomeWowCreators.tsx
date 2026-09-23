import Link from "next/link";
import { Store, Heart, Users, LayoutGrid, ArrowRight, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import WowReveal from "@/components/wow/WowReveal";

// Every avatar rides the outer dashed ring, evenly spaced. The ring's radius
// is set on the orbit box as --orbit-r (container half-width minus the ring's
// 1rem inset) so the avatars sit on the ring at both breakpoints.
const ORBIT_SECONDS = 24;

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
    <section className="relative overflow-hidden bg-bg px-4 py-24 text-fg transition-colors md:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
        {/* orbit visual with REAL avatars */}
        <div className="relative mx-auto hidden h-[400px] w-[400px] max-w-full place-items-center [--orbit-r:calc(200px_-_1rem)] sm:grid md:h-[480px] md:w-[480px] md:[--orbit-r:calc(240px_-_1rem)]">
          <div aria-hidden className="wow-spin-slower absolute inset-4 rounded-full border border-dashed border-border" />
          <div aria-hidden className="wow-spin-slow absolute inset-[76px] rounded-full border border-border" />
          <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--c-accent-3)/0.22),transparent_60%)] blur-2xl" />
          <div className="relative z-10 grid h-36 w-36 place-items-center rounded-[2rem] border-2 border-accent bg-gradient-to-br from-accent to-accent-soft text-center shadow-[0_0_80px_-10px_rgb(var(--c-accent))] dark:shadow-[0_0_80px_-10px_rgb(var(--c-accent))]">
            <div><p className="wow-font-display text-3xl text-accent-ink">YOU</p><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent-ink opacity-70">main character</p></div>
          </div>
          {spaces.map((s, i) => {
            // wow-orbit already counter-rotates, so the avatar stays upright
            // without a second animated wrapper.
            const delay = `${(-ORBIT_SECONDS * i) / spaces.length}s`;
            return (
              <div key={s.id} className="wow-orbit-rider absolute left-1/2 top-1/2 z-10" style={{ animation: `wow-orbit ${ORBIT_SECONDS}s linear infinite`, animationDelay: delay }}>
                <div className="group relative -ml-8 -mt-8 h-16 w-16">
                  <Link href={`/c/${s.handle}`} aria-label={s.name}>
                    {s.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatarUrl} alt="" className="h-16 w-16 rounded-2xl border-2 border-fg/70 object-cover shadow-xl transition group-hover:scale-110 dark:border-fg/70" loading="lazy" />
                    ) : (
                      <span className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-border bg-surface text-subtle transition group-hover:scale-110">
                        <Store className="h-6 w-6" />
                      </span>
                    )}
                  </Link>
                  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-fg opacity-0 backdrop-blur transition group-hover:opacity-100">/c/{s.handle}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="min-w-0">
          <WowReveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">✦ learn from the guild</p>
            <h2 className="wow-font-display mt-3 text-4xl md:text-5xl lg:text-6xl">PREP WITH PEOPLE<br />WHO <span className="wow-gradient-text">CLEARED IT.</span></h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">Vetted creators run storefronts — tutorials, real loops, paid cohorts. Follow free, orbit forever.</p>
          </WowReveal>
          <div className="mt-6 space-y-3">
            {spaces.slice(0, 3).map((s, i) => (
              <WowReveal key={s.id} delay={i * 0.07}>
                <Link href={`/c/${s.handle}`} className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 backdrop-blur-sm transition hover:border-secondary/60">
                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border text-subtle"><Store className="h-5 w-5" /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[15px] font-bold">
                      <span className="truncate">{s.name}</span>
                      {verified.has(s.ownerId) && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" />}
                    </span>
                    <span className="block truncate text-[13px] text-subtle">{s.tagline ?? `/c/${s.handle}`}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4 font-mono text-[11px] tabular-nums text-subtle">
                    <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" />{count(followCounts, s.id).toLocaleString()}</span>
                    <span className="hidden items-center gap-1.5 sm:inline-flex"><Users className="h-3.5 w-3.5" />{count(memberCounts, s.id).toLocaleString()}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-secondary" />
                  </span>
                </Link>
              </WowReveal>
            ))}
          </div>
          <WowReveal delay={0.15}>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href="/creators" className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-xs font-black uppercase tracking-wider text-bg transition hover:scale-105">
                <LayoutGrid className="h-4 w-4" /> Browse all creators
              </Link>
              <Link href="/become-creator" className="text-[13px] font-semibold underline decoration-secondary decoration-2 underline-offset-4">
                Teach what you know →
              </Link>
            </div>
          </WowReveal>
        </div>
      </div>
    </section>
  );
}
