/**
 * Generic full-page loading skeleton used by route-level `loading.tsx` files.
 *
 * Why it exists: the root layout reads the session cookie (auth) in the Header,
 * which forces every route into dynamic rendering. Next.js can't prefetch a
 * dynamic route's body, so a click would otherwise block on the server render
 * (auth + page queries) with no on-screen feedback — that's the "laggy" feel.
 * A `loading.tsx` gives the App Router an instant Suspense fallback to paint the
 * moment navigation starts, while the real page streams in behind it.
 *
 * Deliberately content-agnostic: a hero block plus a card grid reads as "a page
 * is loading" for the marketing/dashboard routes without pretending to match
 * each one pixel-for-pixel.
 */
export default function PageSkeleton() {
  return (
    <div className="flex-1 w-full mx-auto max-w-6xl px-4 sm:px-6 py-10 select-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes page-skeleton-glow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
        .page-skeleton-pulse {
          animation: page-skeleton-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `,
        }}
      />

      {/* Hero block */}
      <div className="rounded-3xl border border-border bg-surface/40 p-6 md:p-10 space-y-5">
        <div className="h-5 w-40 rounded-full bg-accent/15 border border-accent/25 page-skeleton-pulse" />
        <div className="h-9 w-3/4 max-w-xl rounded-lg bg-panel/75 border border-border page-skeleton-pulse" />
        <div className="space-y-2.5">
          <div className="h-3.5 w-full max-w-2xl rounded bg-panel/60 border border-border page-skeleton-pulse" />
          <div className="h-3.5 w-2/3 max-w-xl rounded bg-panel/60 border border-border page-skeleton-pulse" />
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface/30 p-5 space-y-4 page-skeleton-pulse"
            style={{ animationDelay: `${(i % 3) * 120}ms` }}
          >
            <div className="w-9 h-9 rounded-lg bg-panel/75 border border-border" />
            <div className="h-4 w-3/5 rounded bg-panel/75 border border-border" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-panel/50 border border-border" />
              <div className="h-3 w-4/5 rounded bg-panel/50 border border-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
