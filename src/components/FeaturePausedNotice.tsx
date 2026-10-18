import { PauseCircle } from "lucide-react";

export type FeaturePausedValue = {
  key: string;
  /** Name of the function, e.g. "Playground runs". */
  label: string;
  state: "on" | "read_only" | "off";
  message: string;
  resumeAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

function utc(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return `${date.toISOString().slice(11, 16)} UTC`;
}

/**
 * The one notice shown wherever a feature switch is not "on". Plain markup
 * with no hooks, so it renders in server and client components alike; pass
 * the switch value (see `getSwitch` in src/lib/admin/switches.ts). Renders
 * nothing when the switch is on.
 */
export default function FeaturePausedNotice({
  value,
  className = "",
}: {
  value: FeaturePausedValue | null | undefined;
  className?: string;
}) {
  if (!value || value.state === "on") return null;
  const title = value.state === "read_only" ? `${value.label} is read only for now` : `${value.label} is paused`;
  const back = utc(value.resumeAt);
  const since = utc(value.updatedAt);
  return (
    <div
      role="status"
      className={`rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 flex gap-3 items-start ${className}`}
    >
      <PauseCircle className="w-5 h-5 mt-0.5 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <div className="text-sm font-medium text-fg">{title}</div>
        {value.message && <p className="text-sm text-muted leading-relaxed whitespace-pre-line mt-0.5">{value.message}</p>}
        {(back || since) && (
          <div className="text-xs text-muted mt-1">
            {since && <>Paused by Interviewpad at {since}</>}
            {since && back && " · "}
            {back && <>Back on at {back}</>}
          </div>
        )}
      </div>
    </div>
  );
}
