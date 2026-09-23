export default function PlayLoading() {
  return <PlaygroundSkeleton />;
}

const BAR = "rounded bg-panel motion-safe:animate-pulse";
// Code-line widths for the editor placeholder (percent of the column).
const LINES = [38, 64, 52, 0, 71, 45, 58, 0, 33, 67, 49, 26];

/**
 * Placeholder in the playground's own shape (toolbar, files, editor, output,
 * status bar), so the real UI lands without the layout jumping.
 */
export function PlaygroundSkeleton() {
  return (
    <div
      className="pg-skeleton flex h-full flex-1 select-none flex-col overflow-hidden bg-bg"
      role="status"
      aria-label="Loading the playground"
    >
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
        <div className={`h-7 w-7 ${BAR}`} />
        <div className={`h-4 w-36 ${BAR}`} />
        <div className="ml-auto flex items-center gap-2">
          <div className={`hidden h-8 w-36 md:block ${BAR}`} />
          <div className={`hidden h-8 w-16 md:block ${BAR}`} />
          <div className="h-8 w-16 rounded bg-accent/40 motion-safe:animate-pulse" />
          <div className={`h-8 w-8 ${BAR}`} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 max-md:flex-col">
        <div className="hidden w-[280px] shrink-0 flex-col gap-2.5 border-r border-border p-3 md:flex">
          <div className={`mb-1 h-3 w-12 ${BAR}`} />
          {[70, 55, 80, 48].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-3.5 w-3.5 shrink-0 ${BAR}`} />
              <div className={`h-3 ${BAR}`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4 max-md:basis-[55%] md:border-r md:border-border">
          {LINES.map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right font-mono text-[12px] text-subtle/50">{i + 1}</span>
              {w > 0 && <div className={`h-3 ${BAR}`} style={{ width: `${w}%` }} />}
            </div>
          ))}
          <p className="mt-3 text-[13px] text-subtle">Getting the editor ready…</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col max-md:border-t max-md:border-border">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
            <div className={`h-3 w-16 ${BAR}`} />
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="h-7 shrink-0 border-t border-border bg-surface" />
    </div>
  );
}
