export default function PlayLoading() {
  return <PlaygroundSkeleton />;
}

export function PlaygroundSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse bg-bg">
      {/* Toolbar */}
      <div className="border-b border-border bg-surface/70">
        <div className="h-14 px-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-panel border border-border" />
          <div className="h-4 w-40 rounded bg-panel" />
          <div className="hidden md:block flex-1" />
          <div className="hidden md:flex items-center gap-2">
            <div className="h-7 w-16 rounded-lg bg-panel border border-border" />
            <div className="h-7 w-24 rounded-lg bg-panel border border-border" />
            <div className="h-7 w-32 rounded-lg bg-panel border border-border" />
            <div className="h-7 w-16 rounded-lg bg-accent/40" />
          </div>
        </div>
      </div>

      {/* Editor + preview */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 flex">
          {/* Sidebar */}
          <div className="hidden md:block w-52 shrink-0 border-r border-border bg-surface">
            <div className="px-2 py-2 border-b border-border">
              <div className="h-3 w-12 rounded bg-panel" />
            </div>
            <div className="p-2 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 w-full rounded bg-panel"
                  style={{ width: `${60 + ((i * 13) % 35)}%` }}
                />
              ))}
            </div>
          </div>
          {/* Editor */}
          <div className="flex-1 min-w-0 bg-bg p-4 space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-3 rounded bg-panel"
                style={{ width: `${30 + ((i * 17) % 60)}%` }}
              />
            ))}
          </div>
          {/* Preview */}
          <div className="hidden md:block flex-1 min-w-0 border-l border-border bg-surface">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full bg-panel" />
                 <div className="h-4 w-24 rounded bg-panel" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-panel" />
                <div className="h-3 w-4/5 rounded bg-panel" />
                <div className="h-3 w-3/4 rounded bg-panel" />
              </div>
              <div className="h-32 w-full rounded-lg bg-panel" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
