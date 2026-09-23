import Link from "next/link";
import { ArrowRight, PenSquare, Flame, Eye } from "lucide-react";
import { type BlogFeedEntry } from "@/components/BlogFeedItem";
import { StoryHeroCard, StoryCard } from "./StoryCards";
import WowReveal from "@/components/wow/WowReveal";

/**
 * From the blog: one lead story beside the numbered Most read list, then up
 * to three more cards. The pinned rail and the endless rail live on /blog.
 */
export default function HomeWowStories({
  hero,
  grid,
  popular,
  signedIn,
}: {
  hero: BlogFeedEntry | null;
  grid: BlogFeedEntry[];
  popular: BlogFeedEntry[];
  signedIn: boolean;
}) {
  const cards = grid.slice(0, 3);
  return (
    <section className="relative overflow-hidden bg-surface px-4 py-24 text-fg transition-colors md:py-32">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-secondary/15 blur-[130px]" />
      <div className="relative mx-auto max-w-7xl">
        <WowReveal>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-subtle">writing</p>
          <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="wow-font-display text-4xl md:text-5xl lg:text-6xl">From the <span className="wow-gradient-text">blog.</span></h2>
            <div className="flex flex-wrap items-center gap-4 md:self-end">
              <Link
                href={signedIn ? "/dashboard/blogs/new" : "/login?next=/dashboard/blogs/new"}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold underline decoration-secondary decoration-2 underline-offset-4"
              >
                <PenSquare className="h-3.5 w-3.5" aria-hidden /> {signedIn ? "Write a post" : "Sign in to write"}
              </Link>
              <Link
                href="/blog"
                className="group flex w-fit shrink-0 items-center gap-2 rounded-full border border-border bg-panel px-6 py-3 text-xs font-semibold transition hover:border-secondary"
              >
                Read all articles <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </WowReveal>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {hero && (
            <WowReveal className="min-w-0 lg:col-span-2">
              <StoryHeroCard blog={hero} />
            </WowReveal>
          )}

          <aside className={hero ? "min-w-0" : "min-w-0 lg:col-span-3"}>
            {popular.length > 0 && (
              <WowReveal>
                <div className="rounded-3xl border border-border bg-panel p-5 backdrop-blur-sm md:p-6">
                  <p className="flex items-center gap-2 border-b border-border pb-3 font-mono text-xs font-bold uppercase tracking-[0.12em]">
                    <Flame className="h-3.5 w-3.5 text-accent" /> Most read
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
                            <span className="mt-1 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-subtle">
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
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-2xl border border-border py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] transition hover:border-secondary"
                  >
                    See all popular <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </WowReveal>
            )}
          </aside>
        </div>

        {cards.length > 0 && (
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((blog, i) => (
              <li key={blog.id} className="min-w-0">
                <WowReveal delay={i * 0.06} className="h-full">
                  <StoryCard blog={blog} index={i} />
                </WowReveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
