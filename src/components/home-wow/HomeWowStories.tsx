import Link from "next/link";
import { ArrowRight, PenSquare, Flame, Eye } from "lucide-react";
import { type BlogFeedEntry } from "@/components/BlogFeedItem";
import { StoryHeroCard } from "./StoryCards";
import StoriesRail from "./StoriesRail";
import PinnedRail from "./PinnedRail";
import WowReveal from "@/components/wow/WowReveal";

/**
 * Stories, reskinned for the WOW homepage: cinema pinned rail, lead-story
 * billboard, lazy-loading card rail, numbered most-read sidebar and a
 * gradient-gated write CTA. Same props and data contract as before —
 * page.tsx is untouched.
 */
export default function HomeWowStories({
  hero,
  grid,
  popular,
  pinned,
  cursor,
  excludeIds,
  signedIn,
}: {
  hero: BlogFeedEntry | null;
  grid: BlogFeedEntry[];
  popular: BlogFeedEntry[];
  pinned: BlogFeedEntry[];
  cursor: string | null;
  excludeIds: string[];
  signedIn: boolean;
}) {
  return (
    <section className="relative overflow-hidden bg-surface px-4 py-24 text-fg transition-colors md:py-32">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-secondary/15 blur-[130px]" />
      <div className="relative mx-auto max-w-7xl">
        <WowReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">✦ writing</p>
          <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="wow-font-display text-4xl md:text-5xl lg:text-6xl">LATEST <span className="wow-gradient-text">STORIES.</span></h2>
            <Link
              href="/blog"
              className="group flex w-fit shrink-0 items-center gap-2 rounded-full border border-border bg-panel px-6 py-3 text-xs font-black uppercase tracking-wider transition hover:border-secondary md:self-end"
            >
              Read all articles <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </WowReveal>

        {pinned.length > 0 && (
          <WowReveal className="mt-10">
            <PinnedRail items={pinned} />
          </WowReveal>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {hero && (
              <WowReveal>
                <StoryHeroCard blog={hero} />
              </WowReveal>
            )}
            {grid.length > 0 && (
              <WowReveal>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-subtle">Keep scrolling</span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                </div>
                <div className="mt-4">
                  <StoriesRail initialItems={grid} initialCursor={cursor} excludeIds={excludeIds} />
                </div>
              </WowReveal>
            )}
          </div>

          <aside className="min-w-0 space-y-5">
            {popular.length > 0 && (
              <WowReveal>
                <div className="rounded-3xl border border-border bg-panel p-5 backdrop-blur-sm md:p-6">
                  <p className="flex items-center gap-2 border-b border-border pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
                    <Flame className="h-3.5 w-3.5 text-accent-3" /> Most read
                  </p>
                  <ol className="divide-y divide-border">
                    {popular.map((blog, i) => (
                      <li key={blog.id}>
                        <Link href={`/blog/${blog.slug}`} className="group flex items-baseline gap-4 py-3.5">
                          <span
                            className={`wow-font-display shrink-0 text-3xl tabular-nums md:text-4xl ${
                              i === 0 ? "wow-gradient-text" : "text-border transition-colors group-hover:text-subtle"
                            }`}
                            style={i === 0 ? undefined : { WebkitTextStroke: "1.5px rgb(var(--c-subtle))", color: "transparent" }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[14.5px] font-bold leading-snug tracking-tight text-fg line-clamp-2">
                              {blog.title}
                            </span>
                            <span className="mt-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                              <span className="flex items-center gap-1 tabular-nums"><Eye className="h-3 w-3" />{blog.viewCount.toLocaleString()}</span>
                              <span>·</span>
                              <span className="tabular-nums">{blog.readingMinutes} min</span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                  <Link
                    href="/blog?tab=top"
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-2xl border border-border py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition hover:border-secondary"
                  >
                    See all popular <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </WowReveal>
            )}

            <WowReveal>
              <div className="rounded-3xl bg-gradient-to-br from-secondary via-accent-3 to-accent-4 p-[1.5px] shadow-[0_16px_60px_-20px_rgb(var(--c-accent-3)/0.55)]">
                <div className="rounded-[calc(1.5rem-1.5px)] bg-surface p-5 md:p-6">
                  <p className="flex items-center gap-2 border-b border-border pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
                    <PenSquare className="h-3.5 w-3.5 text-secondary" /> Write here
                  </p>
                  <p className="wow-font-display mt-4 text-2xl leading-[0.95]">
                    YOUR WAR STORY<br />GOES <span className="wow-gradient-text">HERE.</span>
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    Embed runnable code, get reactions, grow an audience.
                  </p>
                  <Link
                    href={signedIn ? "/dashboard/blogs/new" : "/login?next=/dashboard/blogs/new"}
                    className="mt-4 block rounded-full bg-fg py-3 text-center text-xs font-black uppercase tracking-widest text-bg transition hover:scale-[1.02]"
                  >
                    {signedIn ? "Start writing" : "Sign in to write"}
                  </Link>
                </div>
              </div>
            </WowReveal>
          </aside>
        </div>
      </div>
    </section>
  );
}
