"use client";

/**
 * Lobby: the invite details, a quick check that this browser can reach the
 * room, and who has already arrived. Both sides land here from their link
 * and go into the room with one click.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Clock3,
  Copy,
  Globe2,
  Layers,
  Lock,
  Monitor,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { RoomData } from "@/lib/interview/room-server";
import { useRelayProvider, useRelaySnapshot } from "@/app/interview/[id]/tools/useToolsRoom";
import { Avatar, ConnectionPill, PresenceDot, relTime, roleLabel, useNow, useRoster, whenLabel } from "./parts";

type CheckState = "checking" | "ok" | "warn" | "fail";
type CheckRow = { id: string; label: string; state: CheckState; detail: string };

export default function LobbyClient({ data }: { data: RoomData }) {
  const { interview: iv, viewer, workspace } = data;
  const router = useRouter();
  const reduce = useReducedMotion();
  const provider = useRelayProvider({ sessionId: iv.id, place: "lobby", readOnly: true });
  const snap = useRelaySnapshot(provider);
  const me = useMemo(() => ({ name: viewer.name, role: viewer.role }), [viewer.name, viewer.role]);
  const people = useRoster(snap, me, "lobby");
  const now = useNow(snap.offset, 15000);
  const isInterviewer = viewer.role === "interviewer";
  const status = snap.room?.status ?? iv.status;
  const ended = status === "completed" || status === "abandoned";
  const roomHref = `/w/${workspace.slug}/interviews/${iv.id}/room`;

  // Warm the room page so the click feels instant.
  useEffect(() => {
    if (!ended) router.prefetch(roomHref);
  }, [router, roomHref, ended]);

  const checks = useChecks(provider ? () => provider.ping() : null, snap.offset, snap.synced);
  const blocking = checks.some((c) => c.state === "fail");

  const others = people.filter((p) => !p.me);
  const otherSide = others.filter((p) => p.role !== viewer.role);
  const startsIn = iv.scheduledAt ? new Date(iv.scheduledAt).getTime() - now : null;

  const fade = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.05 * i, duration: 0.35, ease: [0.2, 0.7, 0.2, 1] as const } });

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-14">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary-soft flex items-center justify-center text-[13px] font-semibold shrink-0" aria-hidden>
            {workspace.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-[14px] font-medium truncate">{workspace.name}</span>
          <span className="text-subtle" aria-hidden>
            /
          </span>
          <span className="text-[14px] text-muted">Interview lobby</span>
        </div>
        <ConnectionPill snap={snap} />
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <section className="flex flex-col gap-6 min-w-0">
          <motion.div {...fade(0)} className="rounded-2xl border border-border bg-surface p-6 md:p-8">
            <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-secondary-soft">{iv.formatLabel}</p>
            <h1 className="mt-2 text-2xl md:text-[32px] leading-tight font-semibold tracking-tight">{iv.title}</h1>
            <p className="mt-2 text-[15px] text-muted">
              {isInterviewer ? (
                <>
                  With <span className="text-fg">{iv.candidateName}</span>
                </>
              ) : (
                <>
                  Hi <span className="text-fg">{iv.candidateName}</span>, welcome. Here is everything about your interview with {workspace.name}.
                </>
              )}
            </p>

            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-px rounded-xl overflow-hidden border border-border bg-border">
              <Fact icon={CalendarClock} label="When" value={whenLabel(iv.scheduledAt)} sub={startsIn != null && !ended ? (Math.abs(startsIn) < 60000 ? "Starting now" : relTime(startsIn)) : null} />
              <Fact icon={Clock3} label="Length" value={`${Math.round(iv.totalSec / 60)} minutes`} sub={iv.startedAt && !ended ? `Clock started ${relTime(new Date(iv.startedAt).getTime() - now)}` : null} />
              <Fact icon={Users} label="Interviewers" value={[iv.hostName, ...iv.panel].join(", ")} sub={iv.guests.length ? `Also invited: ${iv.guests.join(", ")}` : null} />
              <Fact icon={Globe2} label="Time zone" value={Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")} sub="Times on this page are yours" />
            </dl>
          </motion.div>

          <motion.div {...fade(1)} className="rounded-2xl border border-border bg-surface p-6 md:p-8">
            <h2 className="text-[15px] font-semibold">{isInterviewer ? "How the room works" : "What to expect"}</h2>
            <ul className="mt-4 grid gap-3.5">
              {(isInterviewer ? INTERVIEWER_NOTES : candidateNotes(iv.formatBlurb, iv.hostName)).map((n) => (
                <li key={n.title} className="flex gap-3">
                  <span className="mt-0.5 w-7 h-7 rounded-lg bg-panel text-muted flex items-center justify-center shrink-0">
                    <n.icon className="w-3.5 h-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium">{n.title}</p>
                    <p className="text-[13px] text-muted leading-relaxed">{n.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            {iv.tools.length > 0 && (
              <p className="mt-5 flex flex-wrap items-center gap-1.5 text-[12px] text-subtle">
                <Wrench className="w-3.5 h-3.5" aria-hidden /> In the room:
                {iv.tools.map((t) => (
                  <span key={t} className="h-6 px-2 rounded-md bg-panel ring-1 ring-inset ring-border text-muted inline-flex items-center">
                    {t}
                  </span>
                ))}
              </p>
            )}
          </motion.div>

          {isInterviewer && data.private && <InterviewerPrep data={data} fade={fade(2)} />}
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
          <motion.div {...fade(1)} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-[15px] font-semibold">Who is here</h2>
            <ul className="mt-4 grid gap-2.5" aria-live="polite">
              {people.map((p) => (
                <li key={p.key} className="flex items-center gap-3">
                  <span className="relative">
                    <Avatar name={p.name} size={34} />
                    <PresenceDot on className="absolute -bottom-0.5 -right-0.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium truncate">
                      {p.name}
                      {p.me && <span className="text-subtle font-normal"> (you)</span>}
                    </p>
                    <p className="text-[12px] text-muted">
                      {roleLabel(p.role)} · {p.place === "room" ? "in the room" : "in the lobby"}
                    </p>
                  </div>
                </li>
              ))}
              {otherSide.length === 0 && !ended && (
                <li className="flex items-center gap-3 text-muted">
                  <span className="w-[34px] h-[34px] rounded-full border border-dashed border-border-strong" aria-hidden />
                  <p className="text-[13px]">
                    {isInterviewer ? `${iv.candidateName} has not opened the link yet.` : `${iv.hostName} has not arrived yet. You can go in and wait.`}
                  </p>
                </li>
              )}
            </ul>
          </motion.div>

          <motion.div {...fade(2)} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-[15px] font-semibold">Before you join</h2>
            <ul className="mt-4 grid gap-3">
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
            {ended ? (
              <div className="mt-6 rounded-xl bg-panel p-4 text-[13px] text-muted">
                This interview has finished.{" "}
                {isInterviewer ? (
                  <Link href={`/interview/${iv.id}/report`} className="text-secondary-soft hover:underline">
                    Open the report
                  </Link>
                ) : (
                  "Thank you for your time. The team will be in touch."
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={blocking || snap.connection === "denied"}
                onClick={() => router.push(roomHref)}
                className="group mt-6 w-full h-11 rounded-xl bg-secondary text-bg text-[14px] font-semibold inline-flex items-center justify-center gap-2 transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {status === "in_progress" ? "Rejoin the interview" : "Enter the interview room"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
              </button>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-subtle">
              <Lock className="w-3 h-3" aria-hidden /> Private room. Only people on this invite can join.
            </p>
          </motion.div>
        </aside>
      </div>
    </main>
  );
}

function Fact({ icon: Icon, label, value, sub }: { icon: typeof Clock3; label: string; value: string; sub: string | null }) {
  return (
    <div className="bg-surface p-4 flex gap-3 min-w-0">
      <Icon className="w-4 h-4 mt-0.5 text-subtle shrink-0" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[12px] text-subtle">{label}</dt>
        <dd className="text-[14px] font-medium mt-0.5 break-words">{value}</dd>
        {sub && <dd className="text-[12px] text-muted mt-0.5">{sub}</dd>}
      </div>
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

const INTERVIEWER_NOTES = [
  { icon: Layers, title: "You run the stage", body: "Put a coding round, a whiteboard or a question on the shared stage. The candidate sees only what you show." },
  { icon: Clock3, title: "Start the clock when you are both in", body: "The room shows who has arrived. Starting early is fine too; the candidate follows automatically." },
  { icon: ShieldCheck, title: "Your notes stay private", body: "The guide, reference answers, notes and scorecard are never sent to the candidate's browser." },
];

function candidateNotes(blurb: string | null, host: string) {
  return [
    { icon: Monitor, title: "Nothing to install", body: "Everything runs in this browser tab: a shared editor, and a whiteboard or notes if your interviewer uses them. A laptop or desktop works best." },
    { icon: Clock3, title: `${host} starts the interview`, body: blurb ? `${blurb} You can go into the room early and wait there.` : "You can go into the room early and wait there." },
    { icon: ShieldCheck, title: "Your work is saved as you type", body: "If your connection drops or you refresh the page, you come back to exactly where you were." },
  ];
}

function InterviewerPrep({ data, fade }: { data: RoomData; fade: object }) {
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
    <motion.div {...fade} className="min-w-0 rounded-2xl border border-border bg-surface p-6 md:p-8">
      <h2 className="text-[15px] font-semibold">For interviewers only</h2>
      {p.questionsNeeded && (
        <div className="mt-4 rounded-xl bg-warning/10 ring-1 ring-inset ring-warning/25 p-4 text-[13px] text-fg flex gap-3">
          <TriangleAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
          <p>
            Questions have not been picked yet.{" "}
            {p.pickHref && (
              <Link href={p.pickHref} className="text-secondary-soft hover:underline">
                Pick them now
              </Link>
            )}
          </p>
        </div>
      )}
      {p.brief && (
        <div className="mt-4">
          <p className="text-[12px] text-subtle">Brief</p>
          <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap">{p.brief}</p>
        </div>
      )}
      <div className="mt-5 grid gap-1.5">
        <p className="text-[12px] text-subtle">Candidate link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate h-9 px-3 rounded-lg bg-panel ring-1 ring-inset ring-border text-[12px] text-muted block leading-9 font-mono">{p.candidateLink}</code>
          <button type="button" onClick={copy} className="h-9 px-3 rounded-lg border border-border text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-panel">
            {copied ? <Check className="w-3.5 h-3.5 text-success" aria-hidden /> : <Copy className="w-3.5 h-3.5 text-muted" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-[12px] text-muted">A private link for {data.interview.candidateName} only. It stops working a day after the interview.</p>
      </div>
      <p className="mt-5 text-[13px] text-muted">
        {data.roundCount} {data.roundCount === 1 ? "round" : "rounds"} ready
        {p.guide.length ? ` · ${p.guide.length} guide questions` : ""}
      </p>
    </motion.div>
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
