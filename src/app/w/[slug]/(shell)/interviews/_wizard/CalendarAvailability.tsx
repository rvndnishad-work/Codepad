"use client";

/**
 * Schedule step: a week of hourly slots with the busy times of every
 * interviewer who connected a calendar. Picking a slot sets the time for the
 * chosen interviewee. Also holds the switch that puts the interview on the
 * organiser's calendar.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { MemberOption } from "@/lib/interview/wizard-server";
import { firstName, parseLocal, toLocalInput, type WizardState } from "@/lib/interview/wizard";
import { SLOT_HOURS, WEEKDAYS, addDays, busyPeople, slotAt, weekStart } from "@/lib/calendar/slots";
import type { MemberBusy } from "@/lib/calendar/server";
import { calendarBusyAction } from "../../calendar/actions";
import { Avatar, Btn } from "../../candidates/_components/ui";
import { Segmented, Switch } from "./parts";

type Patch = (p: Partial<WizardState>) => void;
type Configured = { google: boolean; microsoft: boolean };

const PROVIDER: Record<string, string> = { google: "Google", microsoft: "Outlook" };
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" });
const rangeFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default function CalendarAvailability({
  slug,
  state,
  patch,
  members,
  meId,
}: {
  slug: string;
  state: WizardState;
  patch: Patch;
  members: MemberOption[];
  meId: string;
}) {
  const interviewerIds = useMemo(() => [state.hostId, ...state.panelIds.filter((id) => id !== state.hostId)].filter(Boolean), [state.hostId, state.panelIds]);
  const idsKey = interviewerIds.join(",");
  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name || "Teammate";

  const rows = state.noCandidate || state.candidates.length === 0 ? [{ name: "Open link" }] : state.candidates.map((c) => ({ name: c.name }));
  const firstTime = state.times.map(parseLocal).find((d): d is Date => !!d);
  const [monday, setMonday] = useState(() => weekStart(firstTime ?? addDays(new Date(), 1)));
  const [target, setTarget] = useState(() => Math.max(0, state.times.findIndex((t) => !t)));
  const row = Math.min(target, rows.length - 1);

  const [data, setData] = useState<{ key: string; members: MemberBusy[]; configured: Configured } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${idsKey}|${monday.getTime()}`;
  const loading = !error && data?.key !== key;

  useEffect(() => {
    let live = true;
    setError(null);
    const ids = idsKey ? idsKey.split(",") : [];
    calendarBusyAction(slug, ids, monday.toISOString(), addDays(monday, WEEKDAYS + 1).toISOString())
      .then((res) => {
        if (!live) return;
        if (!res.ok) return setError(res.error);
        setData({ key, members: res.members, configured: res.configured });
      })
      .catch(() => live && setError("Busy times could not be loaded."));
    return () => {
      live = false;
    };
    // `key` covers the ids and the week.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, slug]);

  const statusOf = (id: string) => data?.members.find((m) => m.userId === id);
  const connected = (data?.members ?? []).filter((m) => m.status === "connected").map((m) => ({ name: firstName(nameOf(m.userId)), busy: m.busy }));
  const missing = interviewerIds.filter((id) => {
    const s = statusOf(id)?.status;
    return s === "none" || s === "expired";
  });
  const configured = data?.configured ?? { google: false, microsoft: false };
  const anyConfigured = configured.google || configured.microsoft;

  // Organiser: the host when their calendar is connected, otherwise you.
  const organiserId = [state.hostId, meId].find((id) => statusOf(id)?.status === "connected") ?? null;
  const addEvent = state.calendarEvent !== false && !!organiserId;
  const now = Date.now();
  const selfConnect = (p: string) => `/api/calendar/${p}/connect?slug=${encodeURIComponent(slug)}&next=${encodeURIComponent(`/w/${slug}/interviews/new`)}`;
  const [copied, setCopied] = useState(false);
  const copyConnectLink = () => {
    navigator.clipboard
      ?.writeText(`${window.location.origin}/w/${slug}/calendar`)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const pick = (d: Date) => {
    const next = Array.from({ length: rows.length }, (_, i) => state.times[i] ?? "");
    next[row] = toLocalInput(d);
    patch({ times: next, timesSet: true });
    // Move on to the next interviewee without a time.
    const after = next.findIndex((t, i) => i > row && !t);
    if (after >= 0) setTarget(after);
  };

  const chosenBy = (d: Date) => {
    const v = toLocalInput(d);
    return state.times.map((t, i) => (t === v ? i : -1)).filter((i) => i >= 0 && i < rows.length);
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-fg">Find a time</h3>
          <p className="text-[13px] text-muted">
            {connected.length > 1
              ? `Open slots are times when all ${connected.length} connected interviewers are free for ${state.minutes} minutes.`
              : connected.length === 1
                ? `Open slots are times when ${connected[0].name} is free for ${state.minutes} minutes.`
                : "Pick a slot to set the time. Busy times show here once interviewers connect a calendar."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted tabular-nums">
            {rangeFmt.format(monday)} to {rangeFmt.format(addDays(monday, WEEKDAYS - 1))}
          </span>
          <Btn icon={ChevronLeft} aria-label="Previous week" onClick={() => setMonday((m) => addDays(m, -7))}>
            Previous
          </Btn>
          <Btn icon={ChevronRight} aria-label="Next week" onClick={() => setMonday((m) => addDays(m, 7))}>
            Next
          </Btn>
        </div>
      </div>

      {rows.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted">Picking for</span>
          <Segmented
            id="cal-target"
            size="sm"
            value={String(row)}
            onChange={(v) => setTarget(Number(v))}
            options={rows.slice(0, 8).map((r, i) => ({ id: String(i), label: firstName(r.name) || `Person ${i + 1}` }))}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="grid gap-1.5 min-w-[560px]" style={{ gridTemplateColumns: `64px repeat(${WEEKDAYS}, minmax(0, 1fr))` }}>
          <span className="flex items-center">{loading && <Loader2 className="w-4 h-4 text-subtle animate-spin" aria-label="Loading busy times" />}</span>
          {Array.from({ length: WEEKDAYS }, (_, day) => (
            <span key={day} className="text-[13px] font-semibold text-fg">
              {dayFmt.format(addDays(monday, day))}
            </span>
          ))}
          {SLOT_HOURS.map((h) => (
            <Fragment key={h}>
              <span className="h-9 flex items-center font-mono text-xs text-muted tabular-nums">{hourLabel(h)}</span>
              {Array.from({ length: WEEKDAYS }, (_, day) => {
                const d = slotAt(monday, day, h);
                const who = chosenBy(d);
                const busy = busyPeople(d, state.minutes, connected);
                const past = d.getTime() < now;
                if (who.length) {
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => pick(d)}
                      className="h-9 rounded-lg border border-secondary bg-secondary text-bg text-xs font-medium truncate px-1.5"
                    >
                      {rows.length > 1 ? who.map((i) => firstName(rows[i].name)).join(", ") : `${hourLabel(h)} chosen`}
                    </button>
                  );
                }
                if (busy.length) {
                  return (
                    <div
                      key={day}
                      title={`${busy.join(", ")} busy`}
                      className="h-9 rounded-lg border border-dashed border-border bg-panel text-xs text-muted flex items-center justify-center truncate px-1.5"
                    >
                      {busy.length === connected.length || connected.length === 1 ? "Busy" : `${busy.join(", ")} busy`}
                    </div>
                  );
                }
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={past}
                    onClick={() => pick(d)}
                    aria-label={`${dayFmt.format(d)} ${hourLabel(h)}`}
                    className="h-9 rounded-lg border border-border bg-bg text-xs font-medium text-fg hover:border-secondary/60 hover:bg-secondary/10 disabled:opacity-40 disabled:pointer-events-none tabular-nums"
                  >
                    {hourLabel(h)}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {error && <p className="text-[13px] text-warning">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {interviewerIds.map((id) => {
          const s = statusOf(id);
          const label =
            s?.status === "connected"
              ? PROVIDER[s.provider ?? ""] ?? "Connected"
              : s?.status === "expired"
                ? "Needs reconnecting"
                : s?.status === "error"
                  ? "Could not read"
                  : s
                    ? "Not connected"
                    : "Checking";
          const tone = s?.status === "connected" ? "text-success" : s ? "text-warning" : "text-subtle";
          return (
            <span key={id} className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-2.5 h-9 text-[13px]">
              <Avatar name={nameOf(id)} size={22} />
              <span className="text-fg">{nameOf(id)}</span>
              <span className={`text-xs ${tone}`}>{label}</span>
            </span>
          );
        })}
      </div>

      {data && missing.length > 0 && anyConfigured && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 items-start rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2.5 text-[13px] text-fg">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
          <span className="flex-1 min-w-[200px]">
            {missingText(missing.map((id) => (id === meId ? "You" : firstName(nameOf(id)))), missing.includes(meId))}{" "}
            {missing.includes(meId) ? (
              (["google", "microsoft"] as const)
                .filter((p) => configured[p])
                .map((p) => (
                  <a key={p} href={selfConnect(p)} className="mr-3 font-medium text-secondary-soft hover:underline">
                    Connect {PROVIDER[p]}
                  </a>
                ))
            ) : (
              <button type="button" onClick={copyConnectLink} className="font-medium text-secondary-soft hover:underline">
                {copied ? "Link copied. Send it to them" : "Copy a link to ask them to connect"}
              </button>
            )}
          </span>
        </div>
      )}
      {data && !anyConfigured && (
        <p className="text-[13px] text-muted">Calendar connections are not set up on this server, so busy times are not shown.</p>
      )}

      {anyConfigured && (
        <div className="border-t border-border pt-4">
          <Switch
            on={addEvent}
            onChange={(v) => organiserId && patch({ calendarEvent: v })}
            label={organiserId ? `Add to ${organiserId === meId ? "your" : `${firstName(nameOf(organiserId))}'s`} calendar` : "Add to a calendar"}
            hint={
              organiserId
                ? "Creates an event with the room link and invites the other interviewers. The candidate gets the email invite instead. Changing or deleting the interview here updates the event."
                : "Connect your calendar, or the host's, to create the event automatically."
            }
          />
        </div>
      )}
    </section>
  );
}

function missingText(names: string[], includesMe: boolean): string {
  const list = names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  if (names.length === 1 && includesMe) return "You have not connected a calendar, so your busy times are missing.";
  return `${list} ${names.length === 1 ? "has" : "have"} not connected a calendar, so ${names.length === 1 ? "their" : "those"} busy times are missing.`;
}
