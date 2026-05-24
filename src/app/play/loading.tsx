export default function PlayLoading() {
  return <PlaygroundSkeleton />;
}

export function PlaygroundSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-bg select-none overflow-hidden h-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes skeleton-glow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
        @keyframes skeleton-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-pulse {
          animation: skeleton-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .skeleton-shimmer-bg {
          background-size: 200% 100%;
          animation: skeleton-shimmer 2s infinite linear;
        }
        .dark .skeleton-shimmer-bg {
          background-image: linear-gradient(90deg, rgba(255,255,255,0.015) 25%, rgba(255,255,255,0.045) 50%, rgba(255,255,255,0.015) 75%);
        }
        .light .skeleton-shimmer-bg {
          background-image: linear-gradient(90deg, rgba(0,0,0,0.015) 25%, rgba(0,0,0,0.045) 50%, rgba(0,0,0,0.015) 75%);
        }
      ` }} />

      {/* Premium Frosted Header Toolbar */}
      <div className="border-b border-border bg-surface/40 backdrop-blur-md shrink-0">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-panel/75 border border-border skeleton-pulse shrink-0" />
            <div className="h-4 w-40 rounded bg-panel/75 border border-border skeleton-pulse" />
            <div className="h-4.5 w-16 rounded bg-accent/10 border border-accent/20 flex items-center justify-center text-[9px] font-black uppercase text-accent/50">
              Loading
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <div className="h-7.5 w-16 rounded-lg bg-panel/75 border border-border skeleton-pulse" />
            <div className="h-7.5 w-24 rounded-lg bg-panel/75 border border-border skeleton-pulse" />
            <div className="h-7.5 w-32 rounded-lg bg-panel/75 border border-border skeleton-pulse" />
            <div className="h-7.5 w-20 rounded-lg bg-accent/25 border border-accent/40 skeleton-pulse" />
          </div>
        </div>
      </div>

      {/* Editor Main Content Workspace */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 flex">
          {/* File Explorer Sidebar Skeleton */}
          <div className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-surface/20">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-panel/75 border border-border skeleton-pulse" />
            </div>
            <div className="p-3 space-y-3 flex-1 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-panel/75 border border-border shrink-0 skeleton-pulse" />
                  <div
                    className="h-3 rounded bg-panel/75 border border-border skeleton-pulse skeleton-shimmer-bg"
                    style={{ width: `${50 + ((i * 13) % 40)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* IDE Monaco Code Editor Canvas Skeleton */}
          <div className="flex-1 min-w-0 bg-bg p-5 flex flex-col">
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-4 shrink-0">
              <div className="h-5 w-24 rounded bg-panel/75 border border-border skeleton-pulse" />
              <div className="h-5 w-16 rounded bg-panel/40 border border-border skeleton-pulse" />
            </div>
            <div className="flex-1 space-y-3.5 overflow-hidden">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 text-[10px] text-muted/30 font-mono text-right pr-2 shrink-0">{i + 1}</div>
                  <div
                    className="h-3 rounded bg-panel/75 border border-border skeleton-pulse skeleton-shimmer-bg"
                    style={{ width: `${20 + ((i * 19) % 65)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* live Output & Console Preview Panel Skeleton */}
          <div className="hidden lg:flex flex-col w-96 shrink-0 border-l border-border bg-surface/20">
            <div className="px-3 h-9 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40 animate-pulse" />
                <div className="h-3 w-14 rounded bg-panel/75 border border-border skeleton-pulse" />
              </div>
            </div>
            <div className="flex-1 p-5 space-y-5 flex flex-col justify-between overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-panel/75 border border-border skeleton-pulse" />
                  <div className="h-3 w-28 rounded bg-panel/75 border border-border skeleton-pulse" />
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 w-full rounded bg-panel/75 border border-border skeleton-pulse skeleton-shimmer-bg" />
                  <div className="h-3 w-5/6 rounded bg-panel/75 border border-border skeleton-pulse skeleton-shimmer-bg" />
                  <div className="h-3 w-4/5 rounded bg-panel/75 border border-border skeleton-pulse skeleton-shimmer-bg" />
                </div>
              </div>
              <div className="flex-1 rounded-xl border border-border bg-panel/40 p-4 space-y-2 skeleton-pulse skeleton-shimmer-bg">
                <div className="h-3 w-20 rounded bg-muted/20" />
                <div className="h-3.5 w-40 rounded bg-muted/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

