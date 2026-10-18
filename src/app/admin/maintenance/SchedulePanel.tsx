"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { bookedInterviewsAction, scheduleMaintenanceAction, type BookedInterview } from "./actions";

export type SchedulePanelProps = {
  mode: "new" | "edit";
  area: string;
  areaLabel: string;
  coversRooms: boolean;
  /** The rule is running now: start cannot change. */
  running: boolean;
  roles: { key: string; label: string }[];
  initial: {
    ruleId?: string;
    paths?: string[];
    startsAt: string | null;
    durationMin: number | null;
    message: string;
    bannerHours: number;
    bypassRoles: string[];
  };
};

const LENGTHS: { value: string; label: string }[] = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "120", label: "2 hours" },
  { value: "240", label: "4 hours" },
  { value: "480", label: "8 hours" },
  { value: "1440", label: "24 hours" },
  { value: "", label: "Until I bring it back" },
];

/** ISO → value for <input type="datetime-local"> in the browser time zone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function utcLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}, ${d.toISOString().slice(11, 16)} UTC`;
}

const field = "w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-secondary";

export default function SchedulePanel(props: SchedulePanelProps) {
  const { mode, area, areaLabel, coversRooms, running, roles, initial } = props;
  const router = useRouter();
  const [pending, start] = useTransition();

  const [startMode, setStartMode] = useState<"now" | "at">(initial.startsAt && !running ? "at" : "now");
  // Filled after mount so the server and the browser agree on the first render.
  const [startLocal, setStartLocal] = useState("");
  useEffect(() => {
    const base = initial.startsAt ?? new Date(Date.now() + 24 * 3_600_000).toISOString();
    setStartLocal(toLocalInput(base));
  }, [initial.startsAt]);

  const [length, setLength] = useState(initial.durationMin === null ? "" : String(initial.durationMin));
  const lengths = useMemo(
    () =>
      LENGTHS.some((l) => l.value === length)
        ? LENGTHS
        : [{ value: length, label: `${length} minutes` }, ...LENGTHS],
    [length],
  );
  const [paths, setPaths] = useState((initial.paths ?? []).join("\n"));
  const [message, setMessage] = useState(initial.message);
  const [banner, setBanner] = useState(String(initial.bannerHours));
  const [bypass, setBypass] = useState<string[]>(initial.bypassRoles);
  const [error, setError] = useState<string | null>(null);

  const startsAtIso = startMode === "now" || running || !startLocal ? null : new Date(startLocal).toISOString();
  const durationMin = length ? Number(length) : null;

  // Interviews booked inside the window, for areas that cover rooms.
  const [booked, setBooked] = useState<{ items: BookedInterview[]; more: boolean } | null>(null);
  useEffect(() => {
    if (!coversRooms) return;
    if (startMode === "at" && !startLocal) return;
    let live = true;
    const t = setTimeout(() => {
      bookedInterviewsAction({ startsAt: startsAtIso, durationMin })
        .then((r) => live && setBooked(r))
        .catch(() => live && setBooked(null));
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [coversRooms, startsAtIso, durationMin, startMode, startLocal]);

  function submit() {
    setError(null);
    start(async () => {
      const res = await scheduleMaintenanceAction({
        ruleId: initial.ruleId ?? null,
        area,
        paths: area === "custom" ? paths.split("\n") : undefined,
        startsAt: startsAtIso,
        durationMin,
        message,
        bannerHours: Number(banner),
        bypassRoles: bypass,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(
        mode === "edit"
          ? "Saved"
          : startsAtIso
            ? `Scheduled for ${utcLabel(startsAtIso)}`
            : `${areaLabel} is down now. Every server picks it up within 10 seconds.`,
      );
      router.push("/admin/maintenance");
      router.refresh();
    });
  }

  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  return (
    <aside aria-label="Schedule maintenance" className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-[15px] font-semibold">{mode === "edit" ? "Edit maintenance" : "Schedule maintenance"}</h2>
        <div className="text-sm text-muted">{areaLabel}</div>
      </div>

      {area === "custom" && (
        <div>
          <label htmlFor="m-paths" className="block text-sm font-medium mb-1.5">Paths</label>
          <textarea
            id="m-paths"
            value={paths}
            onChange={(e) => setPaths(e.target.value)}
            rows={3}
            placeholder={"/prep\n/w/*/batches"}
            className={`${field} py-2 font-mono`}
          />
          <div className="text-xs text-muted mt-1">One per line. Each covers every page under it; * stands for one part of the address.</div>
        </div>
      )}

      <div>
        <span className="block text-sm font-medium mb-1.5">When</span>
        {running ? (
          <div className="text-sm text-muted">Running now. You can change the length and the message.</div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="m-start" checked={startMode === "now"} onChange={() => setStartMode("now")} />
                Start now
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="m-start" checked={startMode === "at"} onChange={() => setStartMode("at")} />
                At a time
              </label>
            </div>
            {startMode === "at" && (
              <div>
                <input
                  type="datetime-local"
                  aria-label="Start time"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  className={`${field} h-10`}
                />
                <div className="text-xs text-muted mt-1">
                  Your time zone{tz ? ` (${tz})` : ""}. {startsAtIso ? `That is ${utcLabel(startsAtIso)}.` : ""}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-2">
          <label htmlFor="m-len" className="block text-sm font-medium mb-1.5">
            {running ? "Length from when it started" : "Length"}
          </label>
          <select id="m-len" value={length} onChange={(e) => setLength(e.target.value)} className={`${field} h-10`}>
            {lengths.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <div className="text-xs text-muted mt-1">Ends on its own, or when you bring it back.</div>
        </div>
      </div>

      <div>
        <label htmlFor="m-msg" className="block text-sm font-medium mb-1.5">Message people see</label>
        <textarea
          id="m-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Rooms are closed Sat 4 Oct 01:00 to 02:00 UTC for a video upgrade."
          className={`${field} py-2`}
        />
        <div className="text-xs text-muted mt-1">Shown word for word on the page and in the banner.</div>
      </div>

      <div>
        <label htmlFor="m-banner" className="block text-sm font-medium mb-1.5">Warn ahead with a banner</label>
        <select id="m-banner" value={banner} onChange={(e) => setBanner(e.target.value)} className={`${field} h-10`}>
          <option value="24">24 hours before, on the pages affected</option>
          <option value="1">1 hour before</option>
          <option value="0">No banner</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Who gets through</span>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked disabled className="w-4 h-4" /> Platform admins
        </label>
        {roles.map((r) => (
          <label key={r.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={bypass.includes(r.key)}
              onChange={(e) =>
                setBypass((cur) => (e.target.checked ? [...cur, r.key] : cur.filter((k) => k !== r.key)))
              }
            />
            {r.label}
          </label>
        ))}
        <div className="text-xs text-muted">Sign-in, webhooks, scheduled jobs and /admin always keep working.</div>
      </div>

      {coversRooms && booked && (
        <div className="rounded-lg border border-border bg-panel p-3 text-sm space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <CalendarClock className="w-4 h-4 text-warning" aria-hidden />
            {booked.items.length === 0
              ? durationMin === null
                ? "No live interviews in the next 24 hours"
                : "No live interviews in that window"
              : `${booked.items.length}${booked.more ? "+" : ""} live interview${booked.items.length === 1 ? "" : "s"} in that window`}
          </div>
          {booked.items.length > 0 && (
            <>
              <ul className="divide-y divide-border">
                {booked.items.map((b) => (
                  <li key={b.id} className="py-1.5">
                    <div className="text-fg">
                      {b.candidateName || b.title}
                      {b.workspace ? <span className="text-muted"> · {b.workspace}</span> : null}
                    </div>
                    <div className="text-xs text-muted">
                      {b.status === "scheduled" ? utcLabel(b.scheduledAt) : "Running now"} · host {b.hostName || b.hostEmail || "unknown"}
                      {b.hostEmail && b.hostName ? ` (${b.hostEmail})` : ""}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="text-xs text-muted">
                There is no email for moved interviews yet, so hosts are not emailed from here. Contact them from this list, or leave them and they see the message.
              </div>
            </>
          )}
        </div>
      )}

      {error && <div className="text-sm text-danger" role="alert">{error}</div>}

      <div className="flex gap-2 justify-end">
        <Link href="/admin/maintenance" className="h-9 px-3.5 inline-flex items-center rounded-lg border border-border text-sm text-fg hover:bg-panel">
          Cancel
        </Link>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving" : mode === "edit" ? "Save" : startMode === "now" ? "Take it down now" : "Schedule"}
        </button>
      </div>
    </aside>
  );
}
