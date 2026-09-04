export default function PlayLoading() {
  return <PlaygroundSkeleton />;
}

export function PlaygroundSkeleton() {
  return (
    <div className="flex h-full flex-1 select-none flex-col overflow-hidden bg-[#0b0d16]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes wow-sk-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes wow-sk-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes wow-sk-beam {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(240%); }
        }
        .wow-sk-pulse {
          animation: wow-sk-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .wow-sk-shimmer {
          background-size: 200% 100%;
          background-image: linear-gradient(90deg, rgba(139,147,255,0.04) 25%, rgba(139,147,255,0.12) 50%, rgba(139,147,255,0.04) 75%);
          animation: wow-sk-shimmer 2s infinite linear;
        }
        .wow-sk-beam {
          animation: wow-sk-beam 2.2s cubic-bezier(0.45, 0, 0.35, 1) infinite;
        }
        .wow-sk-caret {
          animation: wow-sk-glow 1.05s steps(1, end) infinite;
        }
      ` }} />

      {/* Command bar skeleton */}
      <div className="shrink-0 border-b border-white/10 bg-[#0d0f16]">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-white/5 wow-sk-pulse" />
            <div className="h-9 w-44 rounded-full bg-white/5 wow-sk-pulse" />
            <div className="h-9 w-24 rounded-full bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3] opacity-70 wow-sk-pulse" />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <div className="h-7 w-28 rounded-full bg-white/5 wow-sk-pulse" />
            <div className="h-7 w-20 rounded-full bg-white/5 wow-sk-pulse" />
            <div className="h-8 w-8 rounded-full bg-white/5 wow-sk-pulse" />
            <div className="h-8 w-8 rounded-full bg-white/5 wow-sk-pulse" />
          </div>
        </div>
        <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-[#8b93ff]/50 to-transparent" />
      </div>

      {/* Editor Main Content Workspace */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex">
          {/* File Explorer Sidebar Skeleton */}
          <div className="hidden w-52 shrink-0 flex-col border-r border-white/10 bg-white/[0.02] md:flex">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <div className="h-3 w-16 rounded bg-white/10 wow-sk-pulse" />
            </div>
            <div className="flex-1 space-y-3 overflow-hidden p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 shrink-0 rounded bg-white/10 wow-sk-pulse" />
                  <div
                    className="h-3 rounded bg-white/5 wow-sk-pulse wow-sk-shimmer"
                    style={{ width: `${50 + ((i * 13) % 40)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* IDE Monaco Code Editor Canvas Skeleton */}
          <div className="flex min-w-0 flex-1 flex-col bg-[#07090e] p-5">
            <div className="mb-4 flex shrink-0 items-center gap-2 border-b border-white/10 pb-2">
              <div className="h-5 w-24 rounded-full bg-white/10 wow-sk-pulse" />
              <div className="h-5 w-16 rounded-full bg-white/5 wow-sk-pulse" />
            </div>
            <div className="flex-1 space-y-3.5 overflow-hidden">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 shrink-0 pr-2 text-right font-mono text-[10px] text-white/20">{i + 1}</div>
                  <div
                    className="h-3 rounded bg-white/5 wow-sk-pulse wow-sk-shimmer"
                    style={{ width: `${20 + ((i * 19) % 65)}%` }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Warming up the runtime<span className="wow-sk-caret ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-[#8b93ff]" />
            </p>
          </div>

          {/* live Output & Console Preview Panel Skeleton */}
          <div className="hidden w-96 shrink-0 flex-col border-l border-white/10 bg-white/[0.02] lg:flex">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 px-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8b93ff]" />
                <div className="h-3 w-14 rounded bg-white/10 wow-sk-pulse" />
              </div>
            </div>
            <div className="relative flex flex-1 flex-col justify-between space-y-5 overflow-hidden p-5">
              {/* traveling beam */}
              <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/4 w-1/3 overflow-hidden opacity-60">
                <div className="wow-sk-beam h-full w-full bg-gradient-to-r from-transparent via-[#8b93ff]/15 to-transparent" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-white/10 wow-sk-pulse" />
                  <div className="h-3 w-28 rounded bg-white/10 wow-sk-pulse" />
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 w-full rounded bg-white/5 wow-sk-pulse wow-sk-shimmer" />
                  <div className="h-3 w-5/6 rounded bg-white/5 wow-sk-pulse wow-sk-shimmer" />
                  <div className="h-3 w-4/5 rounded bg-white/5 wow-sk-pulse wow-sk-shimmer" />
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="h-3.5 w-40 rounded bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
