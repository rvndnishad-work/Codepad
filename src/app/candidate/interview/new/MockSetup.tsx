"use client";

/**
 * Mock interview setup for developers, in four steps: who interviews you (the
 * AI or a fellow developer), the role, the questions from the public library,
 * then how the interview runs. A summary on the left fills in as you go.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Binary,
  Bot,
  BrainCircuit,
  Check,
  Copy,
  DoorOpen,
  Keyboard,
  Layers,
  Loader2,
  Mic,
  Monitor,
  Network,
  Server,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import {
  DEFAULT_AI_SETTINGS,
  MAX_PICKS,
  MOCK_LEVELS,
  MOCK_ROLES,
  PEER_LENGTHS,
  groupRounds,
  roleById,
  suggestedPeerLength,
  totalMinutes,
  type AiSettings,
  type MockLevel,
  type MockMode,
  type MockPick,
  type PeerSeat,
} from "@/lib/mock-interview/roles";
import { DSA_LANGUAGES, DSA_LANGUAGE_LABELS } from "@/lib/interview/stack";
import QuestionPicker, { KIND_META, type LibraryFilters } from "./QuestionPicker";
import { CheckDot, Chip, ChoiceCard, Segmented, StepHeading, fmtMinutes, spring, textareaCls } from "./parts";

const ROLE_ICON: Record<string, typeof Monitor> = {
  frontend: Monitor,
  backend: Server,
  fullstack: Layers,
  dsa: Binary,
  "system-design": Network,
  ai: BrainCircuit,
};

const STEPS = [
  { id: "format", label: "Format", sub: "Who interviews you" },
  { id: "role", label: "Role", sub: "What you are preparing for" },
  { id: "questions", label: "Questions", sub: "From the public library" },
  { id: "settings", label: "Settings", sub: "How it runs" },
] as const;

type Created = { mode: "peer"; id: string; shareToken: string; shortCode: string | null };

export default function MockSetup({
  filters,
  initialMode,
  initialRole,
  userName,
}: {
  filters: LibraryFilters;
  initialMode: MockMode | null;
  initialRole: string | null;
  userName: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [mode, setMode] = useState<MockMode | null>(initialMode);
  const [seat, setSeat] = useState<PeerSeat>("candidate");
  const [roleId, setRoleId] = useState<string | null>(initialRole && MOCK_ROLES.some((r) => r.id === initialRole) ? initialRole : null);
  const [level, setLevel] = useState<MockLevel>("mid");
  const [picks, setPicks] = useState<MockPick[]>([]);
  const [ai, setAi] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [language, setLanguage] = useState<string>("javascript");
  const [minutes, setMinutes] = useState<number | null>(null);
  const [brief, setBrief] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const suggestedFor = useRef<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const role = roleById(roleId);
  const peerLength = minutes ?? suggestedPeerLength(picks);
  const aiMinutes = useMemo(() => estimateAiMinutes(picks, ai), [picks, ai]);
  const hasCoding = picks.some((p) => p.kind === "coding");
  // One length everywhere: the AI estimate, or the room length once it is set.
  const shownMinutes = mode === "ai" ? aiMinutes : step >= 3 ? peerLength : totalMinutes(picks);

  const canContinue = [mode !== null, roleId !== null, picks.length > 0, true][step];
  const blocker = ["Pick who interviews you to begin", "Pick a role to continue", "Add at least one question", ""][step];

  const go = (n: number) => {
    setStep(n);
    setReached((r) => Math.max(r, n));
    top.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  async function suggest(replace = true) {
    if (!roleId) return;
    setSuggesting(true);
    try {
      const res = await fetch(`/api/mock-interview/suggest?role=${encodeURIComponent(roleId)}&level=${level}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { picks: MockPick[] };
      if (!data.picks.length) {
        toast.message("No suggestions for this role yet", { description: "Pick questions from the library instead." });
        return;
      }
      setPicks(replace ? data.picks.slice(0, MAX_PICKS) : picks);
      suggestedFor.current = `${roleId}:${level}`;
    } catch {
      toast.error("Could not suggest questions. Pick them from the library instead.");
    } finally {
      setSuggesting(false);
    }
  }

  // A ready starting set the first time the questions step opens for a role,
  // so there is always something to tweak instead of a blank list.
  useEffect(() => {
    if (step === 2 && picks.length === 0 && roleId && suggestedFor.current !== `${roleId}:${level}`) void suggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function create() {
    if (!mode || !roleId || !picks.length) return;
    setCreating(true);
    try {
      const res = await fetch("/api/mock-interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          role: roleId,
          level,
          picks: picks.map((p) => ({ kind: p.kind, id: p.id })),
          ai,
          language: hasCoding ? language : null,
          seat,
          minutes: peerLength,
          brief: brief.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Could not set up the interview.");
      if (data.mode === "ai") {
        router.push(`/candidate/interview/ai/${data.inviteToken}`);
        return;
      }
      setCreated(data as Created);
      setCreating(false);
      top.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set up the interview.");
      setCreating(false);
    }
  }

  if (created) return <PeerReady created={created} seat={seat} title={`${MOCK_LEVELS.find((l) => l.id === level)?.label} ${role.label.toLowerCase()}`} picks={picks} minutes={peerLength} />;

  return (
    <div ref={top} className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 pt-6 pb-32 scroll-mt-20">
      <div className="flex items-start gap-3 mb-6">
        <Link href="/candidate/interview" aria-label="Back to the practice arena" className="mt-1 w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:text-fg hover:bg-panel shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-tight text-fg leading-tight">New mock interview</h1>
          <p className="text-[14px] text-muted">
            Step {step + 1} of {STEPS.length}, {STEPS[step].sub.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Stepper step={step} reached={reached} onGo={go} />
          <Summary mode={mode} seat={seat} roleLabel={roleId ? role.label : null} level={level} picks={picks} minutes={shownMinutes} />
        </aside>

        <main className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-6"
            >
              {step === 0 && <FormatStep mode={mode} onMode={setMode} seat={seat} onSeat={setSeat} />}
              {step === 1 && (
                <RoleStep
                  roleId={roleId}
                  onRole={(id) => {
                    if (id !== roleId) {
                      setRoleId(id);
                      // A different role starts from a fresh suggestion.
                      setPicks([]);
                      suggestedFor.current = null;
                    }
                  }}
                  level={level}
                  onLevel={(l) => {
                    setLevel(l);
                    suggestedFor.current = null;
                  }}
                />
              )}
              {step === 2 && mode && (
                <>
                  <StepHeading
                    title="Pick the questions"
                    lead={
                      mode === "ai"
                        ? "Everything here comes from the public interview questions library. We started you with a set for this role; add, remove or reorder anything."
                        : "Everything here comes from the public interview questions library. The interviewer gets these with reference answers; the candidate does not see them."
                    }
                  />
                  <QuestionPicker mode={mode} role={role} filters={filters} picks={picks} onChange={setPicks} onSuggest={() => suggest()} suggesting={suggesting} minutes={shownMinutes} />
                </>
              )}
              {step === 3 && mode === "ai" && (
                <AiSettingsStep ai={ai} onAi={setAi} hasCoding={hasCoding} language={language} onLanguage={setLanguage} picks={picks} minutes={aiMinutes} />
              )}
              {step === 3 && mode === "peer" && (
                <PeerSettingsStep seat={seat} minutes={peerLength} suggested={suggestedPeerLength(picks)} onMinutes={setMinutes} brief={brief} onBrief={setBrief} picks={picks} userName={userName} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => go(Math.max(0, step - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border bg-surface text-[14px] font-medium text-fg hover:bg-panel disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <p className="hidden sm:block text-[13px] text-muted truncate text-center" aria-live="polite">
            {!canContinue ? blocker : footerNote(step, mode, role.label, picks, shownMinutes)}
          </p>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => go(step + 1)}
              disabled={!canContinue}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-accent text-accent-ink text-[14px] font-semibold hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={create}
              disabled={creating || !picks.length}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-accent text-accent-ink text-[14px] font-semibold hover:brightness-105 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "ai" ? <Bot className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
              {creating ? "Setting up" : mode === "ai" ? "Start the interview" : "Create the room"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function footerNote(step: number, mode: MockMode | null, role: string, picks: MockPick[], minutes: number): string {
  if (step === 0) return mode === "ai" ? "Solo practice with the AI interviewer" : "Two developers, one shared room";
  if (step === 1) return role;
  if (step === 2) return `${picks.length} question${picks.length === 1 ? "" : "s"}, about ${fmtMinutes(minutes)}`;
  return `${picks.length} question${picks.length === 1 ? "" : "s"}, ${fmtMinutes(minutes)}`;
}

/** AI interview length: each spoken question's time and follow-ups, plus each coding problem. */
function estimateAiMinutes(picks: MockPick[], ai: AiSettings): number {
  const followSecs = Math.max(60, Math.round(ai.secondsPerQuestion / 2));
  let secs = 0;
  for (const g of groupRounds(picks)) {
    if (g.kind === "coding") secs += g.pick.minutes * 60;
    else secs += g.picks.length * (ai.secondsPerQuestion + ai.followUps * followSecs * 0.5);
  }
  return Math.max(5, Math.ceil(secs / 60));
}

/* ── Left column ─────────────────────────────────────────────────────────── */

function Stepper({ step, reached, onGo }: { step: number; reached: number; onGo: (n: number) => void }) {
  return (
    <nav aria-label="Setup steps" className="hidden lg:block">
      <ol className="relative flex flex-col gap-1">
        <span aria-hidden className="absolute left-[21px] top-6 bottom-6 w-px bg-border" />
        {STEPS.map((s, i) => {
          const done = i < step || (i <= reached && i !== step && i < reached);
          const on = i === step;
          const can = i <= reached;
          return (
            <li key={s.id} className="relative">
              <button
                type="button"
                onClick={() => can && onGo(i)}
                disabled={!can}
                aria-current={on ? "step" : undefined}
                className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${on ? "bg-surface ring-1 ring-inset ring-border-strong" : can ? "hover:bg-surface/60" : "cursor-default"}`}
              >
                <span
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 border ${
                    on ? "bg-accent border-accent text-accent-ink" : done ? "bg-success/15 border-success/50 text-success" : "bg-bg border-border-strong text-muted"
                  }`}
                >
                  {done && !on ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[14px] font-medium ${on || can ? "text-fg" : "text-muted"}`}>{s.label}</span>
                  <span className="block text-xs text-muted">{s.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Summary({ mode, seat, roleLabel, level, picks, minutes }: { mode: MockMode | null; seat: PeerSeat; roleLabel: string | null; level: MockLevel; picks: MockPick[]; minutes: number }) {
  const counts = (["question", "design", "coding"] as const).map((k) => [k, picks.filter((p) => p.kind === k).length] as const).filter(([, n]) => n > 0);
  return (
    <section aria-label="Your interview" className="hidden lg:block rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <span className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">{mode === "peer" ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}</span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-fg truncate">{roleLabel ? `${roleLabel}` : "Your interview"}</span>
          <span className="block text-xs text-muted">{mode ? (picks.length ? `${fmtMinutes(minutes)}` : "Fills in as you go") : "Fills in as you go"}</span>
        </span>
      </div>
      <dl className="px-4 py-3 flex flex-col gap-3 text-[13px]">
        <Row label="Interviewer">{mode === "ai" ? "AI interviewer" : mode === "peer" ? (seat === "candidate" ? "Your peer interviews you" : "You interview your peer") : "Not chosen"}</Row>
        <Row label="Level">{roleLabel ? MOCK_LEVELS.find((l) => l.id === level)?.label : "Not chosen"}</Row>
        <Row label="Questions">
          {counts.length ? (
            <span className="flex flex-wrap gap-1.5 mt-0.5">
              {counts.map(([k, n]) => (
                <Chip key={k}>
                  {n} {KIND_META[k].short.toLowerCase()}
                  {n === 1 ? "" : "s"}
                </Chip>
              ))}
            </span>
          ) : (
            "None yet"
          )}
        </Row>
      </dl>
      {picks.length > 0 && (
        <ol className="px-4 pb-4 flex flex-col gap-1 text-[13px] text-fg">
          {picks.slice(0, 4).map((p, i) => (
            <li key={`${p.kind}:${p.id}`} className="flex gap-2 min-w-0">
              <span className="text-subtle tabular-nums w-4 shrink-0">{i + 1}.</span>
              <span className="truncate">{p.title}</span>
            </li>
          ))}
          {picks.length > 4 && <li className="text-xs text-muted pl-6">and {picks.length - 4} more</li>}
        </ol>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}

/* ── Steps ───────────────────────────────────────────────────────────────── */

function FormatStep({ mode, onMode, seat, onSeat }: { mode: MockMode | null; onMode: (m: MockMode) => void; seat: PeerSeat; onSeat: (s: PeerSeat) => void }) {
  const reduce = useReducedMotion();
  return (
    <>
      <StepHeading title="Who interviews you?" lead="Practise on your own with the AI interviewer, or pair up with another developer and take turns in the hot seat." />
      <div role="radiogroup" aria-label="Interviewer" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModeCard
          on={mode === "ai"}
          onSelect={() => onMode("ai")}
          Icon={Bot}
          title="AI interviewer"
          body="The AI asks the questions you pick, out loud, listens to your answers and follows up like a real interviewer. You get a score and feedback at the end."
          chips={["Just you", "Voice or typing", "Feedback report"]}
        />
        <ModeCard
          on={mode === "peer"}
          onSelect={() => onMode("peer")}
          Icon={Users}
          title="A fellow developer"
          body="One of you interviews, the other answers. You share a room with an editor, a whiteboard and a private question guide for the interviewer."
          chips={["Two people", "Shared editor", "Invite by link"]}
        />
      </div>

      <AnimatePresence initial={false}>
        {mode === "peer" && (
          <motion.section
            key="seat"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            aria-label="Your seat"
          >
            <h3 className="text-[15px] font-semibold text-fg">Which seat are you taking?</h3>
            <p className="text-[13px] text-muted mt-0.5 mb-3">The interviewer gets the questions and reference answers. The candidate never sees them.</p>
            <div role="radiogroup" aria-label="Your seat" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { id: "candidate", title: "I am the candidate", body: "You answer. Your peer opens the link and runs the interview from the guide.", Icon: UserRound },
                  { id: "interviewer", title: "I am the interviewer", body: "You run it from the guide. Send the link to the developer you are interviewing.", Icon: Mic },
                ] as const
              ).map((s) => (
                <ChoiceCard key={s.id} selected={seat === s.id} onSelect={() => onSeat(s.id)} className="p-4">
                  <span className="flex items-start gap-3">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${seat === s.id ? "bg-accent text-accent-ink" : "bg-panel text-muted"}`}>
                      <s.Icon className="w-4 h-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-fg">{s.title}</span>
                      <span className="block text-[13px] text-muted mt-0.5">{s.body}</span>
                    </span>
                    <CheckDot on={seat === s.id} />
                  </span>
                </ChoiceCard>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function ModeCard({ on, onSelect, Icon, title, body, chips }: { on: boolean; onSelect: () => void; Icon: typeof Bot; title: string; body: string; chips: string[] }) {
  return (
    <ChoiceCard selected={on} onSelect={onSelect} className="p-5 flex flex-col gap-3 min-h-[220px]">
      <span className="flex items-start justify-between">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${on ? "bg-accent text-accent-ink" : "bg-panel text-fg"}`}>
          <Icon className="w-5 h-5" aria-hidden />
        </span>
        <CheckDot on={on} />
      </span>
      <span className="block text-[17px] font-semibold text-fg">{title}</span>
      <span className="block text-[14px] text-muted leading-relaxed flex-1">{body}</span>
      <span className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <Chip key={c}>{c}</Chip>
        ))}
      </span>
    </ChoiceCard>
  );
}

function RoleStep({ roleId, onRole, level, onLevel }: { roleId: string | null; onRole: (id: string) => void; level: MockLevel; onLevel: (l: MockLevel) => void }) {
  return (
    <>
      <StepHeading
        title="What are you preparing for?"
        lead="The role decides which topics we suggest and which ones show first in the library. You can still add anything."
        aside={<Segmented id="level" label="Level" value={level} onChange={onLevel} options={MOCK_LEVELS.map((l) => ({ id: l.id, label: l.label }))} />}
      />
      <div role="radiogroup" aria-label="Role" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {MOCK_ROLES.map((r) => {
          const Icon = ROLE_ICON[r.id] ?? Monitor;
          const on = roleId === r.id;
          const mix = (["question", "design", "coding"] as const).filter((k) => r.mix[k] > 0);
          return (
            <ChoiceCard key={r.id} selected={on} onSelect={() => onRole(r.id)} className="p-4 flex flex-col gap-2.5">
              <span className="flex items-start justify-between">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${on ? "bg-accent text-accent-ink" : "bg-panel text-fg"}`}>
                  <Icon className="w-[18px] h-[18px]" aria-hidden />
                </span>
                <CheckDot on={on} />
              </span>
              <span className="block text-[15px] font-semibold text-fg">{r.label}</span>
              <span className="block text-[13px] text-muted">{r.blurb}</span>
              <span className="flex flex-wrap gap-1.5 mt-auto pt-1">
                {mix.map((k) => (
                  <Chip key={k}>
                    {r.mix[k]} {KIND_META[k].short.toLowerCase()}
                    {r.mix[k] === 1 ? "" : "s"}
                  </Chip>
                ))}
              </span>
            </ChoiceCard>
          );
        })}
      </div>
      <p className="text-[13px] text-muted">
        {MOCK_LEVELS.find((l) => l.id === level)?.label} ({MOCK_LEVELS.find((l) => l.id === level)?.hint}): suggestions lean{" "}
        {level === "junior" ? "towards easy and medium questions" : level === "senior" ? "towards hard questions" : "towards medium questions"}.
      </p>
    </>
  );
}

function AiSettingsStep({
  ai,
  onAi,
  hasCoding,
  language,
  onLanguage,
  picks,
  minutes,
}: {
  ai: AiSettings;
  onAi: (a: AiSettings) => void;
  hasCoding: boolean;
  language: string;
  onLanguage: (l: string) => void;
  picks: MockPick[];
  minutes: number;
}) {
  const rounds = groupRounds(picks);
  const talk = picks.some((p) => p.kind !== "coding");
  return (
    <>
      <StepHeading title="How the AI interviews you" lead="Defaults work well for a first run. Make it harder by cutting the time per question or allowing more follow-ups." />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">
          {talk && (
            <>
              <Setting label="How you answer" hint="Speak like in a real interview, or type if you are somewhere quiet.">
                <Segmented
                  id="answer"
                  label="How you answer"
                  value={ai.answerMode}
                  onChange={(v) => onAi({ ...ai, answerMode: v })}
                  options={[
                    { id: "voice", label: (<><Mic className="w-3.5 h-3.5" aria-hidden /> Voice</>) },
                    { id: "typing", label: (<><Keyboard className="w-3.5 h-3.5" aria-hidden /> Typing</>) },
                  ]}
                />
              </Setting>
              <Setting label="Time per question" hint="Most real interviews give two to three minutes for a spoken answer.">
                <Segmented
                  id="secs"
                  label="Time per question"
                  value={ai.secondsPerQuestion}
                  onChange={(v) => onAi({ ...ai, secondsPerQuestion: v })}
                  options={([60, 120, 180, 300] as const).map((s) => ({ id: s, label: `${s / 60} min` }))}
                />
              </Setting>
              <Setting label="Follow-up questions" hint="The AI digs into your answer, the way a real interviewer would.">
                <Segmented
                  id="fu"
                  label="Follow-up questions"
                  value={ai.followUps}
                  onChange={(v) => onAi({ ...ai, followUps: v })}
                  options={[
                    { id: 0, label: "None" },
                    { id: 1, label: "Up to one" },
                    { id: 2, label: "Up to two" },
                  ]}
                />
              </Setting>
            </>
          )}
          {hasCoding && (
            <Setting label="Coding language" hint="Used for algorithm problems that support it. UI problems run in React.">
              <select value={language} onChange={(e) => onLanguage(e.target.value)} aria-label="Coding language" className="h-9 rounded-lg border border-border-strong bg-bg px-3 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-accent/30">
                {DSA_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {DSA_LANGUAGE_LABELS[l] ?? l}
                  </option>
                ))}
              </select>
            </Setting>
          )}
        </div>

        <aside className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" aria-hidden /> What happens next
          </h3>
          <ol className="flex flex-col gap-2.5 text-[13px] text-muted">
            <Li n={1}>The AI interviewer greets you and runs {rounds.length === 1 ? "one round" : `${rounds.length} rounds`}, about {fmtMinutes(minutes)} in all.</Li>
            {talk && <Li n={2}>It reads each question aloud, waits for your answer and may follow up.</Li>}
            {hasCoding && <Li n={talk ? 3 : 2}>For coding problems you get an editor with tests, and can talk the AI through your approach.</Li>}
            <Li n={(talk ? 1 : 0) + (hasCoding ? 1 : 0) + 2}>At the end you get a score, feedback on each answer, and the reference answers to compare with.</Li>
          </ol>
          <p className="text-xs text-subtle">Free practice. Nothing is shared with anyone.</p>
        </aside>
      </div>
    </>
  );
}

function PeerSettingsStep({
  seat,
  minutes,
  suggested,
  onMinutes,
  brief,
  onBrief,
  picks,
  userName,
}: {
  seat: PeerSeat;
  minutes: number;
  suggested: number;
  onMinutes: (m: number) => void;
  brief: string;
  onBrief: (b: string) => void;
  picks: MockPick[];
  userName: string | null;
}) {
  const need = totalMinutes(picks);
  return (
    <>
      <StepHeading title="Set up the room" lead="We create a private room with a timer, a shared editor and the question guide. You get a link for the other developer next." />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">
          <Setting label="Length" hint={`Your questions need about ${fmtMinutes(need)}. We suggest ${fmtMinutes(suggested)}.`}>
            <Segmented id="len" label="Length" value={minutes} onChange={onMinutes} options={PEER_LENGTHS.map((m) => ({ id: m, label: fmtMinutes(m) }))} />
          </Setting>
          <div className="p-4 flex flex-col gap-2">
            <label htmlFor="brief" className="text-[14px] font-medium text-fg">
              Note for the interviewer <span className="text-subtle font-normal">(optional)</span>
            </label>
            <p className="text-[13px] text-muted">
              {seat === "candidate" ? "Tell your peer what to push on, e.g. \"Go deep on React state, I keep blanking on it.\"" : "A reminder for yourself, e.g. \"Push on trade-offs in the design question.\""} Only the interviewer sees it.
            </p>
            <textarea id="brief" value={brief} onChange={(e) => onBrief(e.target.value)} rows={3} maxLength={1000} className={textareaCls} placeholder="Optional" />
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" aria-hidden /> Who sees what
          </h3>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <Seat who={seat === "interviewer" ? `${userName?.split(" ")[0] || "You"} (interviewer)` : "Your peer (interviewer)"} what="The questions, reference answers, your note, the timer and a scorecard." />
            <Seat who={seat === "candidate" ? `${userName?.split(" ")[0] || "You"} (candidate)` : "Your peer (candidate)"} what="The shared editor, whiteboard and any question the interviewer chooses to show." />
          </div>
          <p className="text-xs text-subtle">Swap seats next time by setting up a new room with the other seat.</p>
        </aside>
      </div>
    </>
  );
}

function Seat({ who, what }: { who: string; what: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 px-3 py-2.5">
      <p className="font-medium text-fg">{who}</p>
      <p className="text-muted mt-0.5">{what}</p>
    </div>
  );
}

function Setting({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-fg">{label}</p>
        <p className="text-[13px] text-muted mt-0.5">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Li({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="w-5 h-5 rounded-full bg-panel border border-border text-[11px] font-semibold text-fg flex items-center justify-center shrink-0 tabular-nums">{n}</span>
      <span>{children}</span>
    </li>
  );
}

/* ── Peer room created ───────────────────────────────────────────────────── */

function PeerReady({ created, seat, title, picks, minutes }: { created: Created; seat: PeerSeat; title: string; picks: MockPick[]; minutes: number }) {
  const reduce = useReducedMotion();
  // Only ever rendered in the browser, after the room is created.
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [copied, setCopied] = useState<string | null>(null);
  const peerLink = `${origin}/interview/${created.id}?token=${created.shareToken}`;
  const other = seat === "candidate" ? "interviewer" : "candidate";

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Could not copy. Select the text and copy it instead.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 sm:px-6 py-12">
      <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center gap-3 border-b border-border">
          <span className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center">
            <Check className="w-6 h-6" strokeWidth={3} aria-hidden />
          </span>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Your room is ready</h1>
          <p className="text-[14px] text-muted max-w-[460px]">
            {title} mock, {picks.length} question{picks.length === 1 ? "" : "s"}, {fmtMinutes(minutes)}. Send this link to the developer who will be the {other}.
          </p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs text-subtle mb-1.5">Link for your peer ({other})</p>
            <div className="flex gap-2">
              <input readOnly value={peerLink} onFocus={(e) => e.currentTarget.select()} aria-label="Link for your peer" className="flex-1 min-w-0 h-10 rounded-lg border border-border bg-bg px-3 text-[13px] text-fg font-mono" />
              <button type="button" onClick={() => copy(peerLink, "link")} className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-border-strong text-[13px] font-medium text-fg hover:bg-panel shrink-0">
                {copied === "link" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copied === "link" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          {created.shortCode && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg/40 px-3.5 py-3">
              <div>
                <p className="text-xs text-subtle">Or they can join with this code</p>
                <p className="text-[22px] font-semibold tracking-[0.3em] text-fg tabular-nums">{created.shortCode}</p>
              </div>
              <button type="button" onClick={() => copy(created.shortCode!, "code")} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[13px] text-fg hover:bg-panel">
                {copied === "code" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copied === "code" ? "Copied" : "Copy code"}
              </button>
            </div>
          )}
          <p className="text-[13px] text-muted">
            {seat === "candidate"
              ? "Your peer sees the question guide with reference answers. You do not, so no peeking."
              : "You will find the questions and reference answers under Interviewer guide in the room."}
          </p>
        </div>
        <div className="px-6 py-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <Link href="/candidate/interview" className="text-[13px] text-muted hover:text-fg">
            Back to the practice arena
          </Link>
          <Link href={`/interview/${created.id}`} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-accent text-accent-ink text-[14px] font-semibold hover:brightness-105">
            <DoorOpen className="w-4 h-4" /> Open the room
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
