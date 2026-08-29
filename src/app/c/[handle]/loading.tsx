/**
 * Streaming skeleton for /c/[handle]. Shows instantly while the page's
 * async data (tiers, items, entitlements) resolves, keeping LCP stable.
 */
export default function Loading() {
  return (
    <div className="min-h-screen pb-20 animate-pulse">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-56 md:h-72 bg-panel" />
        <div className="relative max-w-6xl mx-auto px-4 pt-32 md:pt-44">
          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-7">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-[1.25rem] bg-surface border-4 border-bg shrink-0" />
            <div className="flex-1 space-y-3 min-w-0">
              <div className="h-8 w-48 bg-panel rounded-xl" />
              <div className="h-4 w-64 bg-panel rounded" />
              <div className="flex gap-3">
                <div className="h-4 w-20 bg-panel rounded" />
                <div className="h-4 w-20 bg-panel rounded" />
                <div className="h-4 w-20 bg-panel rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav pills skeleton */}
      <div className="sticky top-16 z-30 mt-6 py-2.5 bg-bg/75 backdrop-blur-md border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1.5">
          <div className="h-7 w-20 bg-panel rounded-full" />
          <div className="h-7 w-20 bg-panel rounded-full" />
          <div className="h-7 w-20 bg-panel rounded-full" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl border border-border/20 bg-surface/70 p-6 space-y-4">
            <div className="h-40 bg-panel rounded-xl" />
            <div className="h-4 w-3/4 bg-panel rounded" />
            <div className="h-3 w-full bg-panel rounded" />
          </div>
          <div className="rounded-2xl border border-border/50 bg-surface/60 p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-24 h-14 rounded-lg bg-panel shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-panel rounded" />
                  <div className="h-2 w-1/2 bg-panel rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-accent/25 bg-accent/[0.03] p-5 space-y-3">
            <div className="h-4 w-24 bg-panel rounded" />
            <div className="h-16 bg-panel rounded-xl" />
            <div className="h-16 bg-panel rounded-xl" />
          </div>
          <div className="rounded-2xl border border-border/50 bg-surface/60 p-5 space-y-3">
            <div className="h-3 w-16 bg-panel rounded" />
            <div className="h-20 bg-panel rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
