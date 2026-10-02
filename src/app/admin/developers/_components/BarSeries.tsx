import { shortDay, type SeriesPoint, type Bucket } from "@/lib/admin/stats/developer-helpers";

function label(d: Date, bucket: Bucket): string {
  const s = shortDay(d);
  return bucket === "week" ? `Week of ${s}` : s;
}

/**
 * One-series bar chart in plain markup: muted gold bars, the peak in a
 * deeper gold, a hover tooltip per bar, and a screen-reader table.
 */
export default function BarSeries({
  series,
  bucket,
  unit,
  peakNote,
}: {
  series: SeriesPoint[];
  bucket: Bucket;
  /** "sign-ups" etc., for tooltips and the table caption. */
  unit: string;
  peakNote?: string | null;
}) {
  const max = Math.max(1, ...series.map((p) => p.value));
  const peak = series.reduce<SeriesPoint | null>((b, p) => (p.value > 0 && (!b || p.value > b.value) ? p : b), null);
  const gap = series.length > 60 ? "gap-px" : series.length > 20 ? "gap-[3px]" : "gap-1.5";
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <div>
      <div className={`flex items-end ${gap} h-32 pt-2`} aria-hidden>
        {series.map((p) => {
          const isPeak = peak && p.at.getTime() === peak.at.getTime();
          const h = p.value > 0 ? Math.max(3, (p.value / max) * 100) : 0;
          return (
            <div key={p.at.getTime()} className="group relative flex-1 min-w-0 h-full flex items-end">
              <div
                className={`w-full rounded-t-[3px] ${
                  isPeak ? "bg-[#a07c3f] dark:bg-[#e2c25a]" : "bg-[#dcc06a] dark:bg-[#7d6935]"
                } group-hover:opacity-80`}
                style={{ height: h ? `${h}%` : "1px", opacity: h ? undefined : 0.35 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg shadow-sm">
                <span className="font-medium tabular-nums">{p.value.toLocaleString("en-US")}</span>{" "}
                <span className="text-muted">
                  {unit}, {label(p.at, bucket)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-start justify-between gap-3 text-xs text-muted">
        <span className="shrink-0">{first ? label(first.at, bucket) : ""}</span>
        <span className="text-center min-w-0">
          {peak
            ? `Peak ${peak.value.toLocaleString("en-US")} ${bucket === "week" ? "in the week of" : "on"} ${label(peak.at, "day")}${peakNote ? `, ${peakNote}` : ""}`
            : `No ${unit} in this range`}
        </span>
        <span className="shrink-0">{last ? label(last.at, bucket) : ""}</span>
      </div>
      <table className="sr-only">
        <caption>{unit} by {bucket}</caption>
        <thead>
          <tr>
            <th scope="col">{bucket === "week" ? "Week" : "Day"}</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.at.getTime()}>
              <td>{label(p.at, bucket)}</td>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
