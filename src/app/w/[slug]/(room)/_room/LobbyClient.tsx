"use client";

/**
 * Lobby: the invite at a glance, who has arrived, and a quick check that
 * this browser can reach the room. Both sides land here from their link and
 * go into the room with one click.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock3,
  Code2,
  Copy,
  DoorOpen,
  FileText,
  Globe2,
  Layers,
  Link2,
  Lock,
  NotebookPen,
  Play,
  TriangleAlert,
  Users,
  Video,
  X,
} from "lucide-react";
import type { RoomData } from "@/lib/interview/room-server";
import { useRelayProvider, useRelaySnapshot } from "@/app/interview/[id]/tools/useToolsRoom";
import { meetingProvider } from "@/lib/interview/meeting";
import { Avatar, Brand, ConnectionPill, DotGrid, GLOW, MeetingButton, PresenceDot, countdown, useNow, useRoster, whenLabel, type Person } from "./parts";

type CheckState = "checking" | "ok" | "warn" | "fail";
type CheckRow = { id: string; label: string; state: CheckState; detail: string };

/** Everyone on the invite, marked with whether they are here right now. */
type Seat = { key: string; name: string; role: "interviewer" | "candidate"; tag: string; here: Person | null; me: boolean };

function useSeats(data: RoomData, people: Person[]): Seat[] {
  const { interview: iv } = data;
  return useMemo(() => {
    const byName = new Map(people.map((p) => [`${p.role}:${p.name.toLowerCase()}`, p]));
    const used = new Set<string>();
    const seat = (name: string, role: Seat["role"], tag: string): Seat => {
      const k = `${role}:${name.toLowerCase()}`;
      const here = byName.get(k) ?? null;
      if (here) used.add(k);
      return { key: `seat:${k}`, name, role, tag, here, me: !!here?.me };
    };
    const seats = [seat(iv.hostName, "interviewer", "Host"), ...iv.panel.map((n) => seat(n, "interviewer", "Panel")), seat(iv.candidateName, "candidate", "Candidate")];
    // People who are here but not named on the invite (an admin, an emailed interviewer).
    for (const p of people) {
      const k = `${p.role}:${p.name.toLowerCase()}`;
      if (used.has(k)) continue;
      seats.splice(seats.length - 1, 0, { key: p.key, name: p.name, role: p.role, tag: p.role === "interviewer" ? "Interviewer" : "Candidate", here: p, me: p.me });
    }
    const seen = new Set<string>();
    return seats.filter((s) => (seen.has(s.key) ? false : (seen.add(s.key), true)));
  }, [iv.hostName, iv.panel, iv.candidateName, people]);
}

export default function LobbyClient({ data }: { data: RoomData }) {
  const { interview: iv, viewer, workspace } = data;
  const router = useRouter();
  const reduce = useReducedMotion();
  const provider = useRelayProvider({ sessionId: iv.id, place: "lobby", readOnly: true });
  const snap = useRelaySnapshot(provider);
  const me = useMemo(() => ({ name: viewer.name, role: viewer.role }), [viewer.name, viewer.role]);
  const people = useRoster(snap, me, "lobby");
  const seats = useSeats(data, people);
  const now = useNow(snap.offset, 1000);
  const isInterviewer = viewer.role === "interviewer";
  const status = snap.room?.status ?? iv.status;
  const ended = status === "completed" || status === "abandoned";
  const live = status === "in_progress";
  const roomHref = `/w/${workspace.slug}/interviews/${iv.id}/room`;
  const startedAt = snap.room?.startedAt ?? iv.startedAt;

  // Warm the room page so the click feels instant.
  useEffect(() => {
    if (!ended) router.prefetch(roomHref);
  }, [router, roomHref, ended]);

  const checks = useChecks(provider ? () => provider.ping() : null, snap.offset, snap.synced);
  const blocking = checks.some((c) => c.state === "fail");
  const passed = checks.filter((c) => c.state === "ok").length;
  const checking = checks.some((c) => c.state === "checking");

  const startsIn = iv.scheduledAt ? new Date(iv.scheduledAt).getTime() - now : null;
  const inRoom = seats.filter((s) => s.here && !s.me).length;

  const rise = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.06 * i, duration: 0.4, ease: [0.2, 0.7, 0.2, 1] as const } };

  const enter = () => router.push(roomHref);

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-3">
          <Brand workspace={workspace} href={viewer.via === "member" ? `/w/${workspace.slug}` : undefined} trail="Interview lobby" />
          <div className="ml-auto flex items-center gap-2">
            <ConnectionPill snap={snap} />
            {viewer.via === "member" && (
              <Link href={`/w/${workspace.slug}/interviews`} className="hidden sm:inline-flex h-8 px-3 rounded-lg border border-border text-[13px] font-medium items-center hover:bg-panel">
                All interviews
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        {/* Hero: the invite and the one action that matters. */}
        <motion.section {...rise(0)} className="relative overflow-hidden rounded-2xl border border-border bg-surface" style={GLOW}>
          <DotGrid />
          <div className="relative grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 p-5 sm:p-7 md:p-9">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-secondary/15 ring-1 ring-inset ring-secondary/30 text-[12px] font-medium text-secondary-soft">
                <FormatIcon format={iv.formatLabel} /> {iv.formatLabel}
              </span>
              <h1 className="mt-4 text-[26px] sm:text-[32px] md:text-[36px] leading-[1.12] font-semibold tracking-[-0.025em] text-balance">{iv.title}</h1>
              <p className="mt-3 text-[15px] text-muted leading-relaxed max-w-xl">
                {isInterviewer ? (
                  <>
                    Your interview with <span className="text-fg font-medium">{iv.candidateName}</span>. Check your setup, then open the room. You start the clock.
                  </>
                ) : (
                  <>
                    Hi <span className="text-fg font-medium">{iv.candidateName}</span>, welcome. This is your interview with <span className="text-fg font-medium">{workspace.name}</span>. Everything happens in this browser tab.
                  </>
                )}
              </p>

              <dl className="mt-6 flex flex-wrap gap-2">
                <Chip icon={CalendarClock} label="When" value={whenLabel(iv.scheduledAt)} />
                <Chip icon={Clock3} label="Length" value={`${Math.round(iv.totalSec / 60)} min`} />
                <Chip icon={Users} label="Interviewers" value={[iv.hostName, ...iv.panel].join(", ")} />
                <Chip icon={Globe2} label="Time zone" value={Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")} />
              </dl>
            </div>

            <StatusCard
              ended={ended}
              live={live}
              startsIn={startsIn}
              elapsedMs={live && startedAt ? now - new Date(startedAt).getTime() : null}
              seats={seats}
              inRoom={inRoom}
              isInterviewer={isInterviewer}
              reportHref={isInterviewer ? `/interview/${iv.id}/report` : null}
              disabled={blocking || snap.connection === "denied"}
              onEnter={enter}
              meetingUrl={iv.meetingUrl}
            />
          </div>
        </motion.section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
          <div className="flex flex-col gap-6 min-w-0">
            <motion.section {...rise(1)} className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
              <h2 className="text-[16px] font-semibold tracking-tight">{isInterviewer ? "How the room works" : "What happens next"}</h2>
              <ol className="mt-5 relative grid gap-5">
                <span aria-hidden className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-secondary/50 via-border to-border" />
                {steps(isInterviewer, iv.hostName, iv.formatBlurb, { checked: !checking && !blocking, live, ended }).map((s, i) => (
                  <li key={s.title} className="relative flex gap-4">
                    <span
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ring-4 ring-surface ${
                        s.done ? "bg-success/15 text-success" : s.current ? "bg-secondary text-bg" : "bg-panel text-muted"
                      }`}
                    >
                      {s.done ? <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden /> : i + 1}
                    </span>
                    <div className="min-w-0 pt-1">
                      <p className="text-[14px] font-medium flex flex-wrap items-center gap-2">
                        {s.title}
                        {s.current && <span className="h-5 px-1.5 rounded bg-secondary/15 text-secondary-soft text-[12px] font-medium inline-flex items-center">Now</span>}
                      </p>
                      <p className="mt-0.5 text-[13.5px] text-muted leading-relaxed">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {iv.tools.length > 0 && (
                <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-subtle mr-1">In the room</span>
                  {iv.tools.map((t) => (
                    <span key={t} className="h-7 px-2.5 rounded-lg bg-panel ring-1 ring-inset ring-border text-[12.5px] text-muted inline-flex items-center">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.section>

            {isInterviewer && data.private && <InterviewerPrep data={data} rise={rise(2)} />}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-20">
            <motion.section {...rise(1)} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold tracking-tight">Who is here</h2>
                <span className="text-[12.5px] text-muted tabular-nums">
                  {seats.filter((s) => s.here).length} of {seats.length}
                </span>
              </div>
              <ul className="mt-4 grid gap-1" aria-live="polite">
                {seats.map((s) => (
                  <li key={s.key} className={`flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 transition-colors ${s.here ? "" : "opacity-60"}`}>
                    <span className="relative">
                      {s.here ? <Avatar name={s.name} size={36} /> : <span className="block w-9 h-9 rounded-full border border-dashed border-border-strong" aria-hidden />}
                      {s.here && <PresenceDot on className="absolute -bottom-0.5 -right-0.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">
                        {s.name}
                        {s.me && <span className="text-subtle font-normal"> (you)</span>}
                      </p>
                      <p className="text-[12.5px] text-muted">{s.here ? (s.here.place === "room" ? "In the room" : "In the lobby") : "Not here yet"}</p>
                    </div>
                    <span className={`h-6 px-2 rounded-md text-[12px] inline-flex items-center ${s.role === "candidate" ? "bg-accent/10 text-accent" : "bg-secondary/10 text-secondary-soft"}`}>{s.tag}</span>
                  </li>
                ))}
              </ul>
            </motion.section>

            <motion.section {...rise(2)} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold tracking-tight">Your setup</h2>
                <span className={`text-[12.5px] tabular-nums ${blocking ? "text-danger" : checking ? "text-muted" : "text-success"}`}>
                  {checking ? "Checking" : blocking ? "Needs attention" : `${passed} of ${checks.length} ready`}
                </span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-panel overflow-hidden" aria-hidden>
                <motion.div
                  className={`h-full rounded-full ${blocking ? "bg-danger" : "bg-success"}`}
                  initial={false}
                  animate={{ width: `${(checks.filter((c) => c.state !== "checking").length / checks.length) * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                />
              </div>
              <ul className="mt-4 grid gap-3.5">
                {checks.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <CheckIcon state={c.state} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium">{c.label}</p>
                      <p className="text-[12.5px] text-muted leading-relaxed">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-[12.5px] text-muted">
                <Lock className="w-3.5 h-3.5 text-subtle shrink-0" aria-hidden /> Private room. Only people on this invite can get in, and each link is personal.
              </p>
            </motion.section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function FormatIcon({ format }: { format: string }) {
  const f = format.toLowerCase();
  const Icon = f.includes("coding") ? Code2 : f.includes("design") ? Layers : f.includes("behaviour") || f.includes("behavior") ? Users : FileText;
  return <Icon className="w-3.5 h-3.5" aria-hidden />;
}

function Chip({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="min-w-0 max-w-full flex items-center gap-2.5 h-11 pl-2 pr-3.5 rounded-xl bg-bg/60 ring-1 ring-inset ring-border">
      <span className="w-7 h-7 rounded-lg bg-panel flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted" aria-hidden />
      </span>
      <div className="min-w-0 leading-tight">
        <dt className="text-[12px] text-subtle">{label}</dt>
        <dd className="text-[13.5px] font-medium truncate">{value}</dd>
      </div>
    </div>
  );
}

function StatusCard({
  ended,
  live,
  startsIn,
  elapsedMs,
  seats,
  inRoom,
  isInterviewer,
  reportHref,
  disabled,
  onEnter,
  meetingUrl,
}: {
  ended: boolean;
  live: boolean;
  startsIn: number | null;
  elapsedMs: number | null;
  seats: Seat[];
  inRoom: number;
  isInterviewer: boolean;
  reportHref: string | null;
  disabled: boolean;
  onEnter: () => void;
  meetingUrl: string | null;
}) {
  const here = seats.filter((s) => s.here);
  const soon = startsIn != null && startsIn > 0;
  const label = ended ? "Finished" : live ? "Live now" : soon ? "Starts in" : startsIn != null ? "Start time passed" : "Not scheduled yet";
  const big = ended ? "Thank you" : live ? countdown(elapsedMs ?? 0) : soon ? countdown(startsIn!) : startsIn != null ? "Ready when you are" : "Any time";
  return (
    <div className="self-start rounded-2xl bg-surface/80 backdrop-blur ring-1 ring-inset ring-border-strong p-5 shadow-panel">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        {live && (
          <span className="relative flex w-2 h-2" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-danger/60 animate-ping motion-reduce:animate-none" />
            <span className="relative w-2 h-2 rounded-full bg-danger" />
          </span>
        )}
        {label}
        {live && <span className="text-subtle">· time in</span>}
      </div>
      <p suppressHydrationWarning className={`mt-1 font-semibold tracking-[-0.02em] tabular-nums ${big.length > 9 ? "text-[22px]" : "text-[34px] leading-none"}`}>
        {big}
      </p>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex gap-1">
          {here.slice(0, 4).map((s) => (
            <span key={s.key} className="rounded-full" title={s.name}>
              <Avatar name={s.name} size={30} />
            </span>
          ))}
        </div>
        <p className="text-[13px] text-muted leading-snug">
          {inRoom === 0 ? (isInterviewer ? "Only you so far" : "You are the first one here") : `${inRoom} ${inRoom === 1 ? "other person is" : "others are"} here`}
        </p>
      </div>

      {ended ? (
        reportHref ? (
          <Link href={reportHref} className="group mt-5 w-full h-11 rounded-xl bg-secondary text-bg text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110">
            Open the report <ArrowUpRight className="w-4 h-4" aria-hidden />
          </Link>
        ) : (
          <p className="mt-5 rounded-xl bg-panel p-3.5 text-[13px] text-muted leading-relaxed">The team will be in touch about next steps. You can close this tab.</p>
        )
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onEnter}
          className="group mt-5 w-full h-12 rounded-xl bg-secondary text-bg text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgb(var(--c-accent-2)/0.6)] transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {live ? <Play className="w-4 h-4" aria-hidden /> : <DoorOpen className="w-4 h-4" aria-hidden />}
          {live ? "Rejoin the interview" : "Enter the interview room"}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </button>
      )}
      {!ended && disabled && <p className="mt-2 text-[12.5px] text-danger text-center">Fix the setup item marked in red first.</p>}
      {!ended && meetingUrl && (
        <div className="mt-2.5">
          <MeetingButton url={meetingUrl} />
          <p className="mt-2 text-[12.5px] text-muted text-center">Audio and video run in your meeting tool. Keep this tab open for the code.</p>
        </div>
      )}
    </div>
  );
}

function CheckIcon({ state }: { state: CheckState }) {
  if (state === "checking") return <span className="mt-0.5 w-5 h-5 rounded-full border-2 border-border-strong border-t-secondary animate-spin shrink-0" aria-label="Checking" />;
  const cls = state === "ok" ? "bg-success/15 text-success" : state === "warn" ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger";
  const Icon = state === "ok" ? Check : state === "warn" ? TriangleAlert : X;
  return (
    <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${cls}`} aria-label={state === "ok" ? "Passed" : state === "warn" ? "Warning" : "Failed"}>
      <Icon className="w-3 h-3" strokeWidth={2.5} aria-hidden />
    </span>
  );
}

type Step = { title: string; body: string; done: boolean; current: boolean };

function steps(isInterviewer: boolean, host: string, blurb: string | null, s: { checked: boolean; live: boolean; ended: boolean }): Step[] {
  const inRoom = s.live || s.ended;
  const rows = isInterviewer
    ? [
        { title: "Check your setup", body: "Connection, browser and screen are checked on this page." },
        { title: "Open the room and start the clock", body: "The room shows who has arrived. Start when you are both in; the candidate's screen follows." },
        { title: "Run the stage", body: "Put a coding round, a whiteboard or a guide question on the shared stage. The candidate sees only what you show." },
        { title: "End and score", body: "Your notes and scorecard stay private and go into the report with the code from each round." },
      ]
    : [
        { title: "Check your setup", body: "We check your connection, browser and screen right here. Nothing to install." },
        { title: "Go into the room", body: `You can go in early and wait. ${host} starts the interview.` },
        { title: "Solve and talk it through", body: blurb ?? "You share an editor with your interviewer. Everything you type is saved as you go." },
        { title: "Wrap up", body: "When the interviewer ends the session you see a thank-you screen. You can close the tab then." },
      ];
  const doneUpTo = s.ended ? 4 : s.live ? 2 : s.checked ? 1 : 0;
  return rows.map((r, i) => ({ ...r, done: i < doneUpTo || (inRoom && i === 1), current: i === doneUpTo && !s.ended }));
}

function InterviewerPrep({ data, rise }: { data: RoomData; rise: object }) {
  const p = data.private!;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.candidateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <motion.section {...rise} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-2">
        <h2 className="text-[16px] font-semibold tracking-tight">Your prep</h2>
        <span className="h-6 px-2 rounded-md bg-panel text-[12px] text-muted inline-flex items-center gap-1">
          <Lock className="w-3 h-3" aria-hidden /> Only interviewers
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat icon={Layers} value={data.roundCount} label={data.roundCount === 1 ? "round ready" : "rounds ready"} />
        <Stat icon={NotebookPen} value={p.guide.length} label={p.guide.length === 1 ? "guide question" : "guide questions"} />
      </div>

      {p.questionsNeeded && (
        <div className="mt-4 rounded-xl bg-warning/10 ring-1 ring-inset ring-warning/25 p-4 text-[13.5px] flex gap-3">
          <TriangleAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
          <p className="flex-1">
            Questions have not been picked yet.{" "}
            {p.pickHref && (
              <Link href={p.pickHref} className="font-medium text-warning underline-offset-2 hover:underline">
                Pick them now
              </Link>
            )}
          </p>
        </div>
      )}

      {p.brief && (
        <div className="mt-5">
          <p className="text-[13px] text-subtle">Brief</p>
          <p className="mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap border-l-2 border-secondary/50 pl-3">{p.brief}</p>
        </div>
      )}

      <MeetingEditor id={data.interview.id} initial={data.interview.meetingUrl} />

      <div className="mt-5">
        <p className="text-[13px] text-subtle">Candidate link</p>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-bg ring-1 ring-inset ring-border p-1.5 pl-3">
          <Link2 className="w-4 h-4 text-subtle shrink-0" aria-hidden />
          <code className="flex-1 min-w-0 truncate text-[12.5px] text-muted font-mono">{p.candidateLink}</code>
          <button type="button" onClick={copy} className="h-8 px-3 rounded-lg bg-panel ring-1 ring-inset ring-border text-[13px] font-medium inline-flex items-center gap-1.5 hover:ring-border-strong shrink-0">
            {copied ? <Check className="w-3.5 h-3.5 text-success" aria-hidden /> : <Copy className="w-3.5 h-3.5 text-muted" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-1.5 text-[12.5px] text-muted">Personal to {data.interview.candidateName}. It stops working a day after the interview.</p>
      </div>
    </motion.section>
  );
}

function MeetingEditor({ id, initial }: { id: string; initial: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [editing, setEditing] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async (v: string) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/interview/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetingUrl: v.trim() || null }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not save the link.");
      setEditing(!v.trim());
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the link.");
    } finally {
      setBusy(false);
    }
  };
  const provider = meetingProvider(initial);
  return (
    <div className="mt-5">
      <p className="text-[13px] text-subtle">Video call</p>
      {!editing && initial ? (
        <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-bg ring-1 ring-inset ring-border p-1.5 pl-3">
          <Video className="w-4 h-4 text-success shrink-0" aria-hidden />
          <span className="text-[13px] font-medium shrink-0">{provider ?? "Meeting"}</span>
          <a href={initial} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-[12.5px] text-muted font-mono hover:text-fg">
            {initial}
          </a>
          <button type="button" onClick={() => setEditing(true)} className="h-8 px-3 rounded-lg bg-panel ring-1 ring-inset ring-border text-[13px] font-medium hover:ring-border-strong shrink-0">
            Change
          </button>
        </div>
      ) : (
        <form
          className="mt-1.5 flex items-center gap-2 rounded-xl bg-bg ring-1 ring-inset ring-border focus-within:ring-secondary/60 p-1.5 pl-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save(value);
          }}
        >
          <Video className="w-4 h-4 text-subtle shrink-0" aria-hidden />
          <input
            type="url"
            inputMode="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a Zoom, Google Meet or Teams link"
            aria-label="Video call link"
            className="flex-1 min-w-0 bg-transparent text-[13.5px] placeholder:text-subtle focus:outline-none"
          />
          <button type="submit" disabled={busy || value.trim() === (initial ?? "")} className="h-8 px-3 rounded-lg bg-secondary text-bg text-[13px] font-semibold hover:brightness-110 disabled:opacity-50 shrink-0">
            {busy ? "Saving" : "Save"}
          </button>
        </form>
      )}
      {err ? (
        <p role="alert" className="mt-1.5 text-[12.5px] text-danger">
          {err}
        </p>
      ) : (
        <p className="mt-1.5 text-[12.5px] text-muted">{initial ? "Everyone in the lobby and room gets a Join call button." : "Optional. Everyone gets a Join call button in the lobby and the room."}</p>
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Clock3; value: number; label: string }) {
  return (
    <div className="rounded-xl bg-bg ring-1 ring-inset ring-border p-3.5 flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary-soft flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      <div className="leading-tight min-w-0">
        <p className="text-[20px] font-semibold tabular-nums">{value}</p>
        <p className="text-[12.5px] text-muted truncate">{label}</p>
      </div>
    </div>
  );
}

/** Connection, browser, screen and clock checks for the lobby. */
function useChecks(ping: (() => Promise<number | null>) | null, offset: number, synced: boolean): CheckRow[] {
  const [net, setNet] = useState<{ state: CheckState; ms: number | null }>({ state: "checking", ms: null });
  const [screenOk, setScreenOk] = useState<boolean | null>(null);
  const [browserOk, setBrowserOk] = useState<boolean | null>(null);

  useEffect(() => {
    const onResize = () => setScreenOk(window.innerWidth >= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    setBrowserOk(typeof fetch === "function" && typeof AbortController === "function" && !!window.crypto?.subtle && typeof navigator.sendBeacon === "function");
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!ping) return;
    let stop = false;
    (async () => {
      const times: number[] = [];
      for (let i = 0; i < 3 && !stop; i++) {
        const t = await ping();
        if (t != null) times.push(t);
      }
      if (stop) return;
      if (!times.length) return setNet({ state: "fail", ms: null });
      const ms = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
      setNet({ state: ms < 900 ? "ok" : "warn", ms });
    })();
    return () => {
      stop = true;
    };
  }, [ping ? 1 : 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const skewMin = Math.round(Math.abs(offset) / 60000);
  return [
    {
      id: "net",
      label: "Connection to the room",
      state: net.state,
      detail:
        net.state === "checking"
          ? "Checking"
          : net.state === "fail"
            ? "Cannot reach Interviewpad. Check your internet connection, or try another network."
            : net.state === "warn"
              ? `Slow (${net.ms} ms) but it works. Edits may take a moment to appear.`
              : `Good (${net.ms} ms). Works on office and home networks, no special setup needed.`,
    },
    {
      id: "browser",
      label: "Browser",
      state: browserOk == null ? "checking" : browserOk ? "ok" : "fail",
      detail: browserOk === false ? "This browser is too old for the room. Use a recent Chrome, Edge, Firefox or Safari." : "Supported",
    },
    {
      id: "screen",
      label: "Screen",
      state: screenOk == null ? "checking" : screenOk ? "ok" : "warn",
      detail: screenOk === false ? "A laptop or desktop works best. The editor is hard to use on a small screen." : "Large enough for the editor",
    },
    {
      id: "clock",
      label: "Clock",
      state: !synced ? "checking" : skewMin >= 2 ? "warn" : "ok",
      detail: skewMin >= 2 ? `Your computer clock is about ${skewMin} min off. The interview timer corrects for it.` : "In sync",
    },
  ];
}
