"use client";

/**
 * The workspace interview room.
 *
 * One relay connection carries everything: the shared document (code in
 * each round, whiteboard, notes), cursors, who is here, the tool switchboard
 * and the room status. The interviewer decides what is on the shared stage
 * (a round or a tool); the candidate's screen follows. When the interviewer
 * starts or ends the interview, both screens change within a second.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CircleStop,
  Code2,
  FileText,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Radio,
  Sparkles,
  Timer as TimerIcon,
  X,
} from "lucide-react";
import type { RoomData } from "@/lib/interview/room-server";
import { TOOLS, TOOL_BY_ID, type ToolId, type ToolsAction } from "@/lib/interview/tools";
import { clock, parseRound, roundKey } from "@/lib/interview/room";
import { useRelayProvider, useToolsRoomOn, type ToolsRoom } from "@/app/interview/[id]/tools/useToolsRoom";
import { TOOL_PLUGINS } from "@/app/interview/[id]/tools/registry";
import { TOOL_ICON } from "@/app/interview/[id]/tools/icons";
import { TimerPanel, TimerPill } from "@/app/interview/[id]/tools/Timer";
import type { ToolProps } from "@/app/interview/[id]/tools/types";
import RoundStage from "./RoundStage";
import InterviewerPanel from "./InterviewerPanel";
import { Avatar, ConnectionPill, PresenceDot, roleLabel, useNow, useRoster, type Person } from "./parts";

const spring = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.7 };

const VERDICTS = [
  { id: "success", label: "Recommend", body: "Strong enough to move forward." },
  { id: "failed", label: "Do not recommend", body: "Not the right fit for this role." },
  { id: "left_in_between", label: "Did not finish", body: "The candidate left or could not continue." },
  { id: "suspicious", label: "Integrity concern", body: "Something looked off; details in your notes." },
] as const;

export default function RoomClient({ data }: { data: RoomData }) {
  const { interview: iv, viewer, workspace } = data;
  const router = useRouter();
  const reduce = useReducedMotion();
  const isInterviewer = viewer.role === "interviewer";
  const provider = useRelayProvider({ sessionId: iv.id, place: "room" });
  const me = useMemo(() => ({ name: viewer.name, interviewer: isInterviewer }), [viewer.name, isInterviewer]);
  const room = useToolsRoomOn(provider, me);
  const snap = room?.relay;
  const people = useRoster(snap ?? EMPTY_SNAP, { name: viewer.name, role: viewer.role }, "room");
  const now = useNow(snap?.offset ?? 0);

  const status = (snap?.synced ? snap.room?.status : null) ?? iv.status;
  const startedAt = (snap?.synced ? snap.room?.startedAt : null) ?? iv.startedAt;
  const serverRound = snap?.synced ? (snap.room?.round ?? null) : iv.round;
  const ended = status === "completed" || status === "abandoned";
  const live = status === "in_progress";
  const readOnly = !(status === "scheduled" || live);

  // A new round on the stage: fetch its content (the candidate's page never
  // holds a round before it is shown).
  const refreshedFor = useRef<string | null>(`${iv.round}|${iv.status}`);
  useEffect(() => {
    if (!snap?.synced) return;
    const k = `${serverRound}|${status}`;
    if (k === `${iv.round}|${iv.status}` || refreshedFor.current === k) return;
    refreshedFor.current = k;
    router.refresh();
  }, [snap?.synced, serverRound, status, iv.round, iv.status, router]);

  const [error, setError] = useState<string | null>(null);
  const flash = useCallback((m: string) => {
    setError(m);
    setTimeout(() => setError(null), 4000);
  }, []);

  const control = useCallback(
    async (body: object): Promise<boolean> => {
      try {
        const r = await fetch(`/api/interview/${encodeURIComponent(iv.id)}/room`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          flash(typeof j.error === "string" ? j.error : "That did not work. Try again.");
          return false;
        }
        provider?.refresh();
        return true;
      } catch {
        flash("You look offline. Try again in a moment.");
        return false;
      }
    },
    [iv.id, provider, flash],
  );

  const act = useCallback(
    async (a: ToolsAction) => {
      if (!room) return;
      const err = await room.act(a);
      if (err) flash(err);
    },
    [room, flash],
  );

  const [starting, setStarting] = useState(false);
  const start = async () => {
    setStarting(true);
    await control({ type: "start" });
    setStarting(false);
  };

  const showRound = async (key: string | null) => {
    if (key && room?.state?.presented) await act({ type: "present", tool: null });
    await control({ type: "round", round: key });
  };
  const showTool = async (t: ToolId | null) => {
    await act({ type: "present", tool: t });
    if (t && serverRound) await control({ type: "round", round: null });
  };
  const showQuestion = async (text: string) => {
    await act({ type: "question", text });
    if (serverRound) await control({ type: "round", round: null });
  };

  const [panelOpen, setPanelOpen] = useState(true);
  const [ending, setEnding] = useState(false);

  const elapsed = startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)) : 0;
  const left = iv.totalSec - elapsed;

  const stageRound = data.stage && data.stage.key === serverRound ? data.stage : null;
  const presented = !serverRound ? (room?.state?.presented ?? null) : null;
  const dark = true;

  const toolProps: ToolProps | null =
    room && room.state
      ? { room, state: room.state, isInterviewer, readOnly, dark, guideQuestions: data.private?.guide.map((g) => g.q) ?? [], run: act }
      : null;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <TopBar
        data={data}
        status={status}
        left={left}
        elapsed={elapsed}
        people={people}
        snap={snap ?? EMPTY_SNAP}
        timer={!isInterviewer && toolProps?.state.timer && toolProps.state.enabled.includes("timer") ? <TimerPill state={toolProps.state} offset={snap?.offset ?? 0} isInterviewer={false} readOnly open={false} onToggle={() => {}} /> : null}
        actions={
          isInterviewer && !ended ? (
            <>
              {!live ? (
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={starting || !snap?.synced}
                  className="h-8 px-3.5 rounded-lg bg-secondary text-bg text-[13px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50"
                >
                  {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Play className="w-3.5 h-3.5" aria-hidden />}
                  Start interview
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEnding(true)}
                  className="h-8 px-3 rounded-lg border border-danger/40 text-danger text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-danger/10"
                >
                  <CircleStop className="w-3.5 h-3.5" aria-hidden /> End
                </button>
              )}
              {data.private && (
                <button
                  type="button"
                  onClick={() => setPanelOpen((o) => !o)}
                  aria-pressed={panelOpen}
                  aria-label={panelOpen ? "Hide interviewer panel" : "Show interviewer panel"}
                  className="hidden lg:inline-flex w-8 h-8 rounded-lg items-center justify-center text-muted hover:text-fg hover:bg-panel"
                >
                  {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                </button>
              )}
            </>
          ) : null
        }
      />

      <div className="flex-1 min-h-0 flex">
        {isInterviewer && !ended && room && toolProps && (
          <Rail
            data={data}
            live={live}
            serverRound={serverRound}
            presented={presented}
            props={toolProps}
            onRound={(k) => void showRound(k)}
            onTool={(t) => void showTool(t)}
          />
        )}

        <main className="flex-1 min-w-0 min-h-0 relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={ended ? "ended" : !live ? "waiting" : stageRound ? stageRound.key : presented ? `tool:${presented}` : serverRound ? "loading" : "home"}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              className="absolute inset-0"
            >
              {ended ? (
                <Ended data={data} />
              ) : !live ? (
                <Waiting data={data} people={people} onStart={isInterviewer ? () => void start() : null} starting={starting} ready={!!snap?.synced} />
              ) : stageRound && room ? (
                <RoundStage round={stageRound} room={room} sessionId={iv.id} isInterviewer={isInterviewer} readOnly={readOnly} dark={dark} startedAt={startedAt} />
              ) : presented && toolProps ? (
                <ToolStage tool={presented} props={toolProps} />
              ) : serverRound ? (
                <Center>
                  <Loader2 className="w-5 h-5 animate-spin text-muted" aria-hidden />
                  <p className="text-[14px] text-muted">Opening the next round</p>
                </Center>
              ) : (
                <Home isInterviewer={isInterviewer} host={iv.hostName} hasRounds={data.rounds.length > 0} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {isInterviewer && data.private && panelOpen && (
          <div className="hidden lg:block w-[340px] shrink-0 min-h-0">
            <InterviewerPanel data={data} readOnly={ended} onShowQuestion={(q) => void showQuestion(q)} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-surface ring-1 ring-danger/40 text-danger px-4 py-2 text-[13px] shadow-xl shadow-black/40"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>{ending && <EndDialog data={data} onClose={() => setEnding(false)} onEnded={() => provider?.refresh()} />}</AnimatePresence>
    </div>
  );
}

const EMPTY_SNAP = { connection: "connecting", synced: false, role: null, myName: null, live: true, peers: [], room: null, state: null, offset: 0, rttMs: null, unsaved: 0 } as NonNullable<ToolsRoom["relay"]>;

function TopBar({
  data,
  status,
  left,
  elapsed,
  people,
  snap,
  timer,
  actions,
}: {
  data: RoomData;
  status: string;
  left: number;
  elapsed: number;
  people: Person[];
  snap: ToolsRoom["relay"];
  timer: React.ReactNode;
  actions: React.ReactNode;
}) {
  const { interview: iv, workspace } = data;
  const live = status === "in_progress";
  const over = live && left < 0;
  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-3 md:px-4 border-b border-border bg-surface">
      <Link
        href={`/w/${workspace.slug}/interviews/${iv.id}/lobby`}
        aria-label="Back to the lobby"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <div className="min-w-0 flex flex-col leading-tight">
        <span className="text-[14px] font-semibold truncate">{iv.title}</span>
        <span className="text-[12px] text-muted truncate">
          {workspace.name} · {iv.formatLabel}
        </span>
      </div>

      <div className="mx-auto flex items-center gap-2">
        {live ? (
          <span
            role="timer"
            aria-label={over ? `${clock(-left)} over time` : `${clock(left)} left`}
            className={`h-8 px-3 rounded-lg inline-flex items-center gap-2 text-[13px] font-semibold tabular-nums ring-1 ring-inset ${over ? "bg-warning/10 text-warning ring-warning/25" : "bg-panel ring-border"}`}
          >
            <span className="relative flex w-2 h-2" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-danger/60 animate-ping motion-reduce:animate-none" />
              <span className="relative w-2 h-2 rounded-full bg-danger" />
            </span>
            {over ? `+${clock(-left)} over` : `${clock(left)} left`}
            <span className="hidden md:inline text-subtle font-normal">· {clock(elapsed)} in</span>
          </span>
        ) : status === "scheduled" ? (
          <span className="h-8 px-3 rounded-lg inline-flex items-center gap-2 text-[13px] text-muted bg-panel ring-1 ring-inset ring-border">
            <TimerIcon className="w-3.5 h-3.5" aria-hidden /> Not started · {Math.round(iv.totalSec / 60)} min
          </span>
        ) : (
          <span className="h-8 px-3 rounded-lg inline-flex items-center gap-2 text-[13px] text-muted bg-panel ring-1 ring-inset ring-border">
            <Check className="w-3.5 h-3.5" aria-hidden /> Ended
          </span>
        )}
        {timer}
      </div>

      <ul className="hidden sm:flex items-center -space-x-1.5" aria-label="In the room">
        {people.map((p) => (
          <li key={p.key} className="relative" title={`${p.name}${p.me ? " (you)" : ""}, ${roleLabel(p.role).toLowerCase()}${p.place === "lobby" ? ", in the lobby" : ""}`}>
            <span className="block rounded-full ring-2 ring-surface">
              <Avatar name={p.name} size={28} />
            </span>
            <PresenceDot on={p.place === "room"} className="absolute -bottom-0.5 -right-0.5 scale-75" />
            <span className="sr-only">
              {p.name}, {roleLabel(p.role)}
              {p.place === "lobby" ? ", in the lobby" : ""}
            </span>
          </li>
        ))}
      </ul>
      <ConnectionPill snap={snap} compact />
      {actions}
    </header>
  );
}

function Rail({
  data,
  live,
  serverRound,
  presented,
  props,
  onRound,
  onTool,
}: {
  data: RoomData;
  live: boolean;
  serverRound: string | null;
  presented: ToolId | null;
  props: ToolProps;
  onRound: (k: string | null) => void;
  onTool: (t: ToolId | null) => void;
}) {
  const [timerOpen, setTimerOpen] = useState(false);
  const cur = parseRound(serverRound);
  const stageTools = TOOLS.filter((t) => t.stage && TOOL_PLUGINS[t.id].Stage);
  const state = props.state;
  const hasTimer = state.enabled.includes("timer") && !!state.timer;
  return (
    <nav aria-label="Stage" className="hidden md:flex w-[248px] shrink-0 min-h-0 flex-col border-r border-border bg-surface">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 grid content-start gap-5">
        <section>
          <h2 className="px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Rounds</h2>
          {data.rounds.length === 0 ? (
            <p className="px-2 mt-2 text-[12.5px] text-muted">No set rounds. Use the tools below.</p>
          ) : (
            <ul className="mt-2 grid gap-1">
              {data.rounds.map((r, i) => {
                const on = !!cur && roundKey({ ...cur, step: 0 }) === r.key;
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      disabled={!live}
                      onClick={() => onRound(on ? null : r.key)}
                      title={live ? (on ? "Take it off the stage" : "Show to the candidate") : "Start the interview first"}
                      className={`relative w-full text-left rounded-lg px-2.5 py-2 flex items-start gap-2.5 transition-colors disabled:opacity-60 ${on ? "bg-panel ring-1 ring-inset ring-border-strong" : "hover:bg-panel/60"}`}
                    >
                      <span className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0 ${on ? "bg-secondary text-bg" : "bg-panel text-muted"}`}>
                        {r.kind === "prompt" ? <FileText className="w-3.5 h-3.5" aria-hidden /> : r.kind === "playground" ? <Code2 className="w-3.5 h-3.5" aria-hidden /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium truncate">{r.title}</span>
                        <span className="block text-[11.5px] text-muted truncate capitalize">{[r.kind === "challenge" ? "Coding" : r.kind === "playground" ? "Playground" : "Prompt", r.meta].filter(Boolean).join(" · ")}</span>
                      </span>
                      {on && <Radio className="w-3.5 h-3.5 text-success shrink-0 mt-1" aria-label="On the stage" />}
                    </button>
                    {on && r.steps > 1 && cur && (
                      <div className="mt-1 ml-10 flex flex-wrap gap-1">
                        {Array.from({ length: r.steps }, (_, s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => onRound(roundKey({ ...cur, step: s }))}
                            aria-pressed={cur.step === s}
                            className={`h-6 px-2 rounded text-[11.5px] ${cur.step === s ? "bg-secondary/20 text-secondary-soft" : "text-muted hover:bg-panel"}`}
                          >
                            Step {s + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Tools</h2>
          <ul className="mt-2 grid gap-1">
            {stageTools.map((t) => {
              const Icon = TOOL_ICON[t.id];
              const on = presented === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={props.readOnly}
                    onClick={() => onTool(on ? null : t.id)}
                    title={on ? "Take it off the stage" : `${t.blurb} Shows to the candidate.`}
                    className={`w-full text-left rounded-lg px-2.5 h-9 flex items-center gap-2.5 text-[13px] transition-colors ${on ? "bg-panel ring-1 ring-inset ring-border-strong text-fg" : "text-muted hover:text-fg hover:bg-panel/60"}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{t.label}</span>
                    {on && <Radio className="w-3.5 h-3.5 text-success" aria-label="On the stage" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <div className="relative p-3 border-t border-border flex items-center gap-2">
        <AnimatePresence>{timerOpen && hasTimer && <TimerPanel state={state} offset={props.room.offset} run={props.run} onClose={() => setTimerOpen(false)} />}</AnimatePresence>
        {hasTimer ? (
          <TimerPill state={state} offset={props.room.offset} isInterviewer readOnly={props.readOnly} open={timerOpen} onToggle={() => setTimerOpen((o) => !o)} />
        ) : (
          <button
            type="button"
            disabled={props.readOnly}
            onClick={() => void props.run(TOOL_PLUGINS.timer.switchOn!(state))}
            className="h-9 px-3 rounded-lg text-[13px] text-muted hover:text-fg hover:bg-panel inline-flex items-center gap-2"
          >
            <TimerIcon className="w-4 h-4" aria-hidden /> Add a shared timer
          </button>
        )}
      </div>
    </nav>
  );
}

function ToolStage({ tool, props }: { tool: ToolId; props: ToolProps }) {
  const Stage = TOOL_PLUGINS[tool].Stage;
  const Actions = TOOL_PLUGINS[tool].HeaderActions;
  const Icon = TOOL_ICON[tool];
  return (
    <section aria-label={TOOL_BY_ID[tool].label} className="h-full flex flex-col">
      <header className="h-11 shrink-0 flex items-center gap-2.5 px-4 border-b border-border">
        <Icon className="w-4 h-4 text-secondary-soft" aria-hidden />
        <h2 className="text-[14px] font-semibold">{TOOL_BY_ID[tool].label}</h2>
        <span className="text-[12px] text-muted">{props.isInterviewer ? "The candidate sees this" : "Shared by your interviewer"}</span>
        <div className="ml-auto">{Actions && <Actions {...props} />}</div>
      </header>
      <div className="flex-1 min-h-0 relative">{Stage && <Stage {...props} />}</div>
    </section>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">{children}</div>;
}

function Home({ isInterviewer, host, hasRounds }: { isInterviewer: boolean; host: string; hasRounds: boolean }) {
  return (
    <Center>
      <span className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary-soft flex items-center justify-center">
        <Sparkles className="w-5 h-5" aria-hidden />
      </span>
      <h2 className="text-xl font-semibold tracking-tight">{isInterviewer ? "The stage is empty" : "You are all set"}</h2>
      <p className="text-[14px] text-muted max-w-sm leading-relaxed">
        {isInterviewer
          ? hasRounds
            ? "Pick a round or a tool on the left. The candidate sees it the moment you do."
            : "Pick a tool on the left, or show a question from your guide."
          : `${host} will put the first question here. Meanwhile, say hello.`}
      </p>
    </Center>
  );
}

function Waiting({ data, people, onStart, starting, ready }: { data: RoomData; people: Person[]; onStart: (() => void) | null; starting: boolean; ready: boolean }) {
  const { interview: iv } = data;
  const candidateHere = people.some((p) => p.role === "candidate" && p.place === "room");
  const interviewerHere = people.some((p) => p.role === "interviewer" && !p.me && p.place === "room") || !!onStart;
  return (
    <Center>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-left">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-secondary-soft">Waiting room</p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight leading-snug">
          {onStart ? (candidateHere ? `${iv.candidateName} is here. Start when you are ready.` : `Waiting for ${iv.candidateName}`) : interviewerHere ? `${iv.hostName} is here and will start shortly` : `You are in. ${iv.hostName} will start the interview.`}
        </h2>
        <ul className="mt-5 grid gap-2.5">
          {people.map((p) => (
            <li key={p.key} className="flex items-center gap-3">
              <span className="relative">
                <Avatar name={p.name} size={30} />
                <PresenceDot on className="absolute -bottom-0.5 -right-0.5 scale-90" />
              </span>
              <span className="text-[14px]">
                {p.name}
                {p.me && <span className="text-subtle"> (you)</span>}
              </span>
              <span className="ml-auto text-[12px] text-muted">
                {roleLabel(p.role)}
                {p.place === "lobby" ? ", lobby" : ""}
              </span>
            </li>
          ))}
          {!candidateHere && onStart && (
            <li className="flex items-center gap-3 text-muted">
              <span className="w-[30px] h-[30px] rounded-full border border-dashed border-border-strong" aria-hidden />
              <span className="text-[13px]">{iv.candidateName} has not joined yet</span>
            </li>
          )}
        </ul>
        {onStart ? (
          <button
            type="button"
            onClick={onStart}
            disabled={starting || !ready}
            className="mt-6 w-full h-11 rounded-xl bg-secondary text-bg text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Play className="w-4 h-4" aria-hidden />}
            Start the interview
          </button>
        ) : (
          <p className="mt-6 text-[13px] text-muted leading-relaxed">Keep this tab open. It switches to the interview by itself when it starts.</p>
        )}
      </div>
    </Center>
  );
}

function Ended({ data }: { data: RoomData }) {
  const { interview: iv, viewer, workspace } = data;
  const isInterviewer = viewer.role === "interviewer";
  return (
    <Center>
      <span className="w-12 h-12 rounded-2xl bg-success/15 text-success flex items-center justify-center">
        <Check className="w-5 h-5" aria-hidden />
      </span>
      <h2 className="text-xl font-semibold tracking-tight">{isInterviewer ? "Interview ended" : "Thank you, that is the end of the interview"}</h2>
      <p className="text-[14px] text-muted max-w-sm leading-relaxed">
        {isInterviewer ? "The code from each round, your notes and the scorecard are saved with the report." : `${workspace.name} will be in touch about next steps. You can close this tab.`}
      </p>
      {isInterviewer && (
        <div className="mt-2 flex items-center gap-2">
          <Link href={`/interview/${iv.id}/report`} className="h-9 px-4 rounded-lg bg-secondary text-bg text-[13px] font-semibold inline-flex items-center hover:brightness-110">
            Open the report
          </Link>
          {viewer.userId && (
            <Link href={`/w/${workspace.slug}/interviews`} className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium inline-flex items-center hover:bg-panel">
              All interviews
            </Link>
          )}
        </div>
      )}
    </Center>
  );
}

function EndDialog({ data, onClose, onEnded }: { data: RoomData; onClose: () => void; onEnded: () => void }) {
  const [verdict, setVerdict] = useState<string | null>(data.interview.verdict);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);
  const end = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/interview/${encodeURIComponent(data.interview.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", finishedAt: new Date().toISOString(), ...(verdict ? { verdict } : {}) }),
      });
      if (!r.ok) throw new Error();
      onEnded();
      router.refresh();
      onClose();
    } catch {
      setErr("Could not end the interview. Check your connection and try again.");
      setBusy(false);
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-title"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-3">
          <h2 id="end-title" className="text-[17px] font-semibold flex-1">
            End the interview for everyone?
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 -mt-1 -mr-1 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[13.5px] text-muted">The candidate sees a thank-you screen. The code, your notes and the scorecard are saved to the report.</p>
        <fieldset className="mt-5">
          <legend className="text-[13px] font-medium">Your take (optional, the team decides who passes)</legend>
          <div className="mt-2 grid gap-1.5">
            {VERDICTS.map((v) => (
              <label key={v.id} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer ring-1 ring-inset transition-colors ${verdict === v.id ? "bg-secondary/10 ring-secondary/40" : "ring-border hover:bg-panel/60"}`}>
                <input type="radio" name="verdict" className="mt-1 accent-[rgb(var(--c-accent-2))]" checked={verdict === v.id} onChange={() => setVerdict(v.id)} />
                <span>
                  <span className="block text-[13.5px] font-medium">{v.label}</span>
                  <span className="block text-[12.5px] text-muted">{v.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {err && (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            {err}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium hover:bg-panel">
            Keep going
          </button>
          <button type="button" onClick={() => void end()} disabled={busy} className="h-9 px-4 rounded-lg bg-danger text-bg text-[13px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            End interview
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
