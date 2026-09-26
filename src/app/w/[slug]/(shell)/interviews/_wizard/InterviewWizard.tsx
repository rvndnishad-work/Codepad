"use client";

/**
 * New live interview, one step at a time: format, candidates, interviewers,
 * questions, schedule, review. A collapsible sidebar on the right holds the
 * pickers (candidates, questions) and the summary ticket, and the draft is
 * kept in this browser until it is scheduled.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Library, Loader2, Mail, MailCheck, MailX, ReceiptText, RotateCcw, Sparkles, Users } from "lucide-react";
import type { GuideOption, MemberOption, PersonOption, PublicCategory, RoundOption } from "@/lib/interview/wizard-server";
import {
  STEPS,
  defaultTitle,
  formatOf,
  plansFor,
  candidateKey,
  nextSlot,
  normalizeGuests,
  roomSets,
  setSize,
  stepIssues,
  usesOwnSets,
  suggestedMinutes,
  type FormatDef,
  type StepId,
  type WizardCandidate,
  type WizardRound,
  type WizardState,
} from "@/lib/interview/wizard";
import { Avatar, Btn, useToasts } from "../../candidates/_components/ui";
import { scheduleInterviewsAction, type Scheduled } from "../actions";
import type { DeliveryStatus } from "@/lib/interview/guests";
import { ALL, GuideSets, QuestionSources, type GuideTarget } from "./GuideQuestions";
import SidePanel, { useSideOpen, type SideTab } from "./SidePanel";
import { defaultTools, isToolId } from "@/lib/interview/tools";
import QuestionsPicker from "./QuestionsPicker";
import { CandidateBrowser, CandidatesStep, FORMAT_ICON, FormatStep, PanelStep, ReviewStep, ScheduleStep } from "./Steps";
import { fmtMinutes, fmtWhen, spring } from "./parts";

export type WizardProps = {
  slug: string;
  meId: string;
  people: PersonOption[];
  members: MemberOption[];
  roundOptions: RoundOption[];
  guides: GuideOption[];
  bankCategories: PublicCategory[];
  /** From the URL: candidates, rounds, guide or format to start with. */
  prefill: { candidateIds: string[]; rounds: WizardRound[]; guideId: string | null; format: string | null };
};

const DRAFT_VERSION = 1;

function blankState(meId: string): WizardState {
  return {
    format: null,
    title: "Interview",
    candidates: [],
    noCandidate: false,
    hostId: meId,
    panelIds: [],
    plan: "set",
    rounds: [],
    guideId: null,
    questionsOwnerId: null,
    questionsNote: "",
    minutes: 60,
    times: [],
    brief: "",
    candidateBrief: "",
    sendInvites: true,
  };
}

export default function InterviewWizard({ slug, meId, people, members, roundOptions, guides, bankCategories, prefill }: WizardProps) {
  const reduce = useReducedMotion();
  const draftKey = `interview-wizard:${slug}`;
  const hasPrefill = prefill.candidateIds.length > 0 || prefill.rounds.length > 0 || !!prefill.guideId || !!prefill.format;

  const [state, setState] = useState<WizardState>(() => {
    const s = blankState(meId);
    const f = formatOf(prefill.format) ?? (prefill.rounds.length ? formatOf("coding") : prefill.guideId ? formatOf("discussion") : null);
    if (f) {
      s.format = f.id;
      s.minutes = suggestedMinutes(f, prefill.rounds);
      s.plan = f.plan;
    }
    if (prefill.rounds.length || prefill.guideId) s.plan = "set";
    s.rounds = prefill.rounds;
    s.guideId = prefill.guideId;
    s.candidates = prefill.candidateIds.flatMap((id) => {
      const p = people.find((x) => x.id === id);
      return p ? [{ id: p.id, name: p.name, email: p.email ?? "" }] : [];
    });
    s.title = defaultTitle(f, s.candidates);
    return s;
  });
  const [step, setStep] = useState<StepId>(state.format && hasPrefill ? (state.candidates.length ? "panel" : "candidates") : "format");
  const [dir, setDir] = useState(1);
  const [titleEdited, setTitleEdited] = useState(false);
  const [restored, setRestored] = useState(false);
  const [done, setDone] = useState<{ created: Scheduled[]; guests: DeliveryStatus[] } | null>(null);
  const [sideOpen, setSideOpen] = useSideOpen();
  const [sideTab, setSideTab] = useState("summary");
  const [drawer, setDrawer] = useState(false);
  const [guideTarget, setGuideTarget] = useState<GuideTarget>(ALL);
  const [pending, start] = useTransition();
  const [toasts, toast] = useToasts();
  const [tried, setTried] = useState(false);
  const loaded = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const [far, setFar] = useState(0);

  // Restore a draft once, unless the URL asked for something specific.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (hasPrefill) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as { v: number; state: WizardState; step: StepId; titleEdited: boolean };
      if (d.v !== DRAFT_VERSION || !d.state?.format) return;
      const memberIds = new Set(members.map((m) => m.userId));
      setState({ ...blankState(meId), ...d.state, hostId: memberIds.has(d.state.hostId) ? d.state.hostId : meId });
      const at = STEPS.some((s) => s.id === d.step) ? d.step : "format";
      setStep(at);
      setFar(STEPS.findIndex((s) => s.id === at));
      setTitleEdited(!!d.titleEdited);
      setRestored(true);
    } catch {
      // A broken or blocked draft just means a fresh start.
    }
  }, [draftKey, hasPrefill, meId, members]);

  useEffect(() => {
    if (!loaded.current || done) return;
    try {
      if (state.format) localStorage.setItem(draftKey, JSON.stringify({ v: DRAFT_VERSION, state, step, titleEdited }));
    } catch {
      // Storage full or blocked: the wizard still works, it just will not resume.
    }
  }, [draftKey, state, step, titleEdited, done]);

  const format = formatOf(state.format);
  const autoTitle = defaultTitle(format, state.noCandidate ? [] : state.candidates);

  const patch = useCallback(
    (p: Partial<WizardState>) =>
      setState((s) => {
        const next = { ...s, ...p };
        // Length follows the rounds until someone sets it by hand.
        if (!next.lengthSet && (p.rounds || p.format)) next.minutes = suggestedMinutes(formatOf(next.format), next.plan === "set" ? next.rounds : []);
        if (!titleEdited) next.title = defaultTitle(formatOf(next.format), next.noCandidate ? [] : next.candidates);
        // Keep one time per room when people are added or removed: each
        // person keeps their time, and someone new gets the next slot.
        const rooms = Math.max(1, next.noCandidate ? 1 : next.candidates.length);
        if (next.times.length && (next.times.length !== rooms || (p.candidates && !p.times))) {
          const key = (c: WizardCandidate) => c.id ?? c.email ?? c.name;
          const was = new Map(s.candidates.map((c, i) => [key(c), s.times[i] ?? ""]));
          const times: string[] = [];
          for (let i = 0; i < rooms; i++) {
            const c = next.noCandidate ? undefined : next.candidates[i];
            const kept = c && !p.times ? was.get(key(c)) : next.times[i];
            times.push(kept ?? (i > 0 ? nextSlot(times[i - 1], next.minutes) : ""));
          }
          next.times = times;
        }
        return next;
      }),
    [titleEdited],
  );

  const idx = STEPS.findIndex((s) => s.id === step);
  const issues = stepIssues(state, step);
  const complete = (id: StepId) => stepIssues(state, id).length === 0;
  // A step is reachable once every step before it is complete.
  const reachable = (id: StepId) => STEPS.slice(0, STEPS.findIndex((s) => s.id === id)).every((s) => complete(s.id));

  const goTo = (id: StepId) => {
    if (!reachable(id) && STEPS.findIndex((s) => s.id === id) > idx) return;
    setDir(STEPS.findIndex((s) => s.id === id) >= idx ? 1 : -1);
    setTried(false);
    setStep(id);
    setFar((f) => Math.max(f, STEPS.findIndex((s) => s.id === id)));
    topRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  };
  const next = () => {
    if (issues.length) return setTried(true);
    if (idx < STEPS.length - 1) goTo(STEPS[idx + 1].id);
  };
  const back = () => idx > 0 && goTo(STEPS[idx - 1].id);

  const pickFormat = (f: FormatDef) => {
    const changed = state.format !== f.id;
    patch({
      format: f.id,
      ...(changed
        ? {
            minutes: suggestedMinutes(f, state.rounds),
            plan: plansFor(f).includes(state.plan) && state.format ? state.plan : f.plan,
            rounds: f.coding ? state.rounds : [],
            guideId: f.guide ? state.guideId : null,
          }
        : {}),
    });
    // Choosing is the whole step, so move on.
    setTimeout(() => {
      setDir(1);
      setFar((x) => Math.max(x, 1));
      setStep("candidates");
      topRef.current?.scrollIntoView({ block: "start" });
    }, reduce ? 0 : 260);
  };

  const startOver = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setState(blankState(meId));
    setTitleEdited(false);
    setRestored(false);
    setDir(-1);
    setStep("format");
  };

  const submit = () => {
    const all = stepIssues(state, "review");
    if (all.length) return setTried(true);
    const rooms = state.noCandidate ? [] : state.candidates;
    const own = usesOwnSets(state);
    start(async () => {
      const res = await scheduleInterviewsAction(slug, {
        format: state.format!,
        title: state.title.trim() || autoTitle,
        candidates: rooms.map((c, i) => {
          const set = own ? roomSets(state)[i].set : null;
          return { id: c.id, name: c.name, email: c.email, time: toIso(state.times[i]), ...(set ? { questions: { guideId: set.guideId, bankIds: set.bank.map((b) => b.id) } } : {}) };
        }),
        hostId: state.hostId,
        panelIds: state.panelIds,
        guests: normalizeGuests(state.guests ?? []),
        plan: state.plan,
        rounds: state.rounds.map((r) => ({ kind: r.kind, id: r.id })),
        guideId: state.guideId,
        bankIds: (state.bank ?? []).map((b) => b.id),
        questionsOwnerId: state.questionsOwnerId,
        questionsNote: state.questionsNote,
        minutes: state.minutes,
        brief: state.brief,
        candidateBrief: state.candidateBrief,
        sendInvites: state.sendInvites,
        tools: state.tools ? state.tools.filter(isToolId) : defaultTools(state.format),
      });
      if (!res.ok) return toast(res.error, "error");
      // A one-room setup with no people still keeps its time.
      if (state.noCandidate && res.created[0]) res.created[0].scheduledAt = toIso(state.times[0]);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      setDone({ created: res.created, guests: res.guests });
    });
  };

  // No-candidate rooms send the single time along with the room itself.
  useEffect(() => {
    if (state.noCandidate && state.times.length > 1) setState((s) => ({ ...s, times: s.times.slice(0, 1) }));
  }, [state.noCandidate, state.times.length]);

  // Each step opens the sidebar on its picker, or on the summary.
  const pickerTab = step === "candidates" ? "people" : step === "questions" && state.plan === "set" && format?.guide ? "questions" : null;
  useEffect(() => {
    setSideTab(pickerTab ?? "summary");
    setDrawer(false);
  }, [step, pickerTab]);

  if (done)
    return (
      <DoneView
        slug={slug}
        created={done.created}
        guests={done.guests}
        invitesOn={state.sendInvites}
        title={state.title}
        hostName={members.find((m) => m.userId === state.hostId)?.name ?? ""}
        meIsHost={state.hostId === meId}
      />
    );

  const openSide = (tab: string) => {
    setSideTab(tab);
    setSideOpen(true);
    setDrawer(true);
  };
  // Where the sidebar adds guide questions: the shared set, or one person.
  const own = usesOwnSets(state);
  const target: GuideTarget = own ? (state.candidates.some((c) => candidateKey(c) === guideTarget) ? guideTarget : candidateKey(state.candidates[0])) : ALL;
  const rooms = state.noCandidate ? 1 : Math.max(1, state.candidates.length);
  const sideTabs: SideTab[] = [
    ...(pickerTab === "people"
      ? [{ id: "people", label: "Candidates", icon: Users, count: state.candidates.length, body: <CandidateBrowser state={state} patch={patch} people={people} /> }]
      : []),
    ...(pickerTab === "questions"
      ? [
          {
            id: "questions",
            label: "Questions",
            icon: Library,
            body: <QuestionSources slug={slug} state={state} patch={patch} guides={guides} categories={bankCategories} target={target} onTarget={setGuideTarget} />,
          },
        ]
      : []),
    {
      id: "summary",
      label: "Summary",
      icon: ReceiptText,
      body: (
        <div className="p-3">
          <Ticket state={state} members={members} guides={guides} rooms={rooms} />
        </div>
      ),
    },
  ];

  const stepBody = (() => {
    switch (step) {
      case "format":
        return <FormatStep state={state} onPick={pickFormat} />;
      case "candidates":
        return <CandidatesStep state={state} patch={patch} people={people} onBrowse={() => openSide("people")} />;
      case "panel":
        return <PanelStep state={state} patch={patch} members={members} meId={meId} />;
      case "questions":
        return format ? (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-fg">How are the questions decided?</h2>
              <p className="text-[14px] text-muted mt-1 max-w-[640px]">
                {format.technical
                  ? "Pick them yourself, or hand this part to an engineer. You can schedule either way."
                  : "Use a questionnaire from your library, or run the conversation without one."}
              </p>
            </div>
            <QuestionsPicker
              slug={slug}
              format={format}
              value={state}
              onChange={patch}
              roundOptions={roundOptions}
              guides={guides}
              members={members}
              meId={meId}
              guideSlot={
                <GuideSets state={state} patch={patch} guides={guides} target={target} onTarget={setGuideTarget} onBrowse={() => openSide("questions")} optional={format.coding} />
              }
            />
          </div>
        ) : null;
      case "schedule":
        return <ScheduleStep state={state} patch={patch} />;
      case "review":
        return (
          <ReviewStep
            state={state}
            patch={patch}
            members={members}
            guides={guides}
            titleEdited={titleEdited}
            onTitleEdit={() => setTitleEdited(true)}
            goTo={goTo}
            defaultTitleText={autoTitle}
          />
        );
    }
  })();

  return (
    <div ref={topRef} className="flex flex-col gap-5 scroll-mt-8">
      {/* Title band */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/w/${slug}/interviews`} aria-label="Back to Interviews" className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-fg leading-tight">New interview</h1>
            <p className="text-[13px] text-muted">
              Step {idx + 1} of {STEPS.length}, {STEPS[idx].hint.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {restored && (
              <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-[13px] text-muted">
                Draft restored
              </motion.span>
            )}
          </AnimatePresence>
          <Btn icon={ReceiptText} onClick={() => openSide(pickerTab ?? "summary")} className="lg:hidden">
            {pickerTab === "people" ? "Candidates" : pickerTab === "questions" ? "Questions" : "Summary"}
          </Btn>
          {state.format && (
            <Btn icon={RotateCcw} onClick={startOver}>
              Start over
            </Btn>
          )}
        </div>
      </div>

      {/* Steps */}
      <nav aria-label="Steps" className="relative">
        <ol className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const ok = complete(s.id) && i <= Math.max(far, idx) && i !== idx && s.id !== "review";
            const can = reachable(s.id) || i <= idx;
            return (
              <li key={s.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && (
                  <span aria-hidden className="relative w-6 xl:w-10 h-px bg-border overflow-hidden">
                    <motion.span className="absolute inset-y-0 left-0 bg-secondary" initial={false} animate={{ width: i <= idx ? "100%" : "0%" }} transition={spring} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => goTo(s.id)}
                  disabled={!can}
                  aria-current={active ? "step" : undefined}
                  title={s.hint}
                  className={`relative flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full transition-colors disabled:cursor-not-allowed ${active ? "text-fg" : can ? "text-muted hover:text-fg hover:bg-panel/60" : "text-subtle"}`}
                >
                  {active && <motion.span layoutId="step-pill" transition={spring} className="absolute inset-0 rounded-full bg-panel ring-1 ring-inset ring-border-strong" />}
                  <span
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums border transition-colors ${
                      active ? "bg-secondary border-secondary text-bg" : ok ? "bg-success/15 border-success/40 text-success" : "bg-bg border-border-strong text-subtle"
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {ok && !active ? (
                        <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}>
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </motion.span>
                      ) : (
                        <motion.span key="n" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                          {i + 1}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="relative text-[13px] font-medium whitespace-nowrap">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex gap-6 items-start">
        {/* Step body */}
        <div className="flex-1 min-w-0 relative">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={reduce ? false : { opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: dir * -28 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {stepBody}
            </motion.div>
          </AnimatePresence>
        </div>

        <SidePanel tabs={sideTabs} active={sideTab} onActive={setSideTab} open={sideOpen} onOpen={setSideOpen} drawer={drawer} onDrawer={setDrawer} />
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-30 -mx-4 md:-mx-10 -mb-6 md:-mb-8 mt-2 border-t border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <div className="px-4 md:px-10 h-[68px] flex items-center justify-between gap-3">
          <Btn size="md" icon={ArrowLeft} onClick={back} disabled={idx === 0 || pending}>
            Back
          </Btn>
          <AnimatePresence mode="wait">
            {tried && issues.length > 0 ? (
              <motion.p key="issue" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="flex-1 text-center text-[13px] text-danger truncate">
                {issues[0]}
              </motion.p>
            ) : (
              <motion.p key="sum" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hidden sm:block flex-1 text-center text-[13px] text-subtle truncate">
                {format ? `${format.label}, ${fmtMinutes(state.minutes)}, ${rooms === 1 ? "1 room" : `${rooms} rooms`}` : "Pick a format to begin"}
              </motion.p>
            )}
          </AnimatePresence>
          {step === "review" ? (
            <Btn size="md" variant="primary" onClick={submit} disabled={pending} className="min-w-[180px]">
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Sparkles className="w-3.5 h-3.5" aria-hidden />}
              {pending ? "Scheduling" : rooms > 1 ? `Schedule ${rooms} interviews` : "Schedule interview"}
            </Btn>
          ) : (
            <Btn size="md" variant="primary" onClick={next} className={issues.length ? "opacity-70" : ""}>
              Continue
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Btn>
          )}
        </div>
      </div>
      {toasts}
    </div>
  );
}

function toIso(local: string | undefined): string | null {
  if (!local) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).toISOString();
}

/* ───────────────────────── Summary ticket ───────────────────────── */

function Ticket({ state, members, guides, rooms }: { state: WizardState; members: MemberOption[]; guides: GuideOption[]; rooms: number }) {
  const format = formatOf(state.format);
  const Icon = format ? FORMAT_ICON[format.id] : null;
  const host = members.find((m) => m.userId === state.hostId);
  const panel = state.panelIds.map((id) => members.find((m) => m.userId === id)).filter((m): m is MemberOption => !!m);
  const owner = members.find((m) => m.userId === state.questionsOwnerId);
  const guide = guides.find((g) => g.id === state.guideId);

  const row = (label: string, body: React.ReactNode, key: string) => (
    <motion.div key={key} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex flex-col gap-1 py-3 border-t border-dashed border-border first:border-t-0">
      <span className="text-xs text-subtle">{label}</span>
      <div className="text-[13px] text-fg">{body}</div>
    </motion.div>
  );

  return (
    <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
      <div
        className="px-4 pt-4 pb-3"
        style={{ backgroundImage: "radial-gradient(260px 120px at 0% 0%, rgb(var(--c-accent-2) / 0.22), transparent 70%)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary-soft flex items-center justify-center">
            {Icon ? <Icon className="w-4 h-4" aria-hidden /> : <Sparkles className="w-4 h-4" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-fg truncate">{state.format ? state.title : "Your interview"}</p>
            <p className="text-xs text-subtle">{format ? `${format.label}, ${fmtMinutes(state.minutes)}` : "Fills in as you go"}</p>
          </div>
        </div>
      </div>
      {/* Ticket notch */}
      <div aria-hidden className="relative h-0 border-t border-dashed border-border">
        <span className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-bg border border-border" />
        <span className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-bg border border-border" />
      </div>
      <div className="px-4 pb-2">
        <AnimatePresence initial={false}>
          {(state.candidates.length > 0 || state.noCandidate) &&
            row(
              state.noCandidate ? "Candidate" : `Candidates (${rooms})`,
              state.noCandidate ? (
                <span className="text-muted">Open link, nobody named</span>
              ) : (
                <span className="flex items-center">
                  {state.candidates.slice(0, 6).map((c, i) => (
                    <span key={c.id ?? c.email ?? i} className="-ml-1 first:ml-0 ring-2 ring-surface rounded-full">
                      <Avatar name={c.name} size={28} />
                    </span>
                  ))}
                  <span className="ml-2 truncate">{state.candidates.length === 1 ? state.candidates[0].name : state.candidates.length > 6 ? `+${state.candidates.length - 6} more` : ""}</span>
                </span>
              ),
              "cand",
            )}
          {host &&
            state.format &&
            row(
              "Interviewers",
              <span>
                {host.name} hosts{panel.length ? `, with ${panel.map((p) => p.name.split(" ")[0]).join(", ")}` : ""}
                {(state.guests?.length ?? 0) > 0 && <span className="block text-muted">Details emailed to {state.guests!.length === 1 ? state.guests![0] : `${state.guests!.length} people`}</span>}
              </span>,
              "panel",
            )}
          {format &&
            (state.rounds.length > 0 || state.guideId || (state.bank?.length ?? 0) > 0 || usesOwnSets(state) || state.plan !== "set") &&
            row(
              "Questions",
              state.plan === "later" ? (
                <span className="text-warning">{owner ? `${owner.name} picks later` : "A teammate picks later"}</span>
              ) : state.plan === "open" ? (
                <span className="text-muted">No set questions</span>
              ) : (
                <ol className="flex flex-col gap-1">
                  {state.rounds.map((r, i) => (
                    <li key={r.key} className="flex gap-2">
                      <span className="text-subtle tabular-nums">{i + 1}.</span>
                      <span className="truncate">{r.title}</span>
                    </li>
                  ))}
                  {usesOwnSets(state) ? (
                    roomSets(state).map((r) => (
                      <li key={r.candidate ? candidateKey(r.candidate) : "all"} className="text-muted truncate">
                        {r.candidate?.name.split(" ")[0]}: {setSize(r.set, guides)} questions
                      </li>
                    ))
                  ) : (
                    <>
                      {guide && <li className="text-muted">Guide: {guide.title}</li>}
                      {(state.bank?.length ?? 0) > 0 && <li className="text-muted">{state.bank!.length} public questions</li>}
                    </>
                  )}
                </ol>
              ),
              "q",
            )}
          {state.times.some(Boolean) &&
            row(
              "When",
              rooms > 1 ? (
                <span>
                  {state.times.filter(Boolean).length} of {rooms} timed, first {fmtWhen([...state.times].filter(Boolean).sort()[0])}
                </span>
              ) : (
                <span>{fmtWhen(state.times[0])}</span>
              ),
              "when",
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────── Done ───────────────────────── */

function DeliveryLine({ d, fallback }: { d: DeliveryStatus | null; fallback: string }) {
  if (!d) return <span className="inline-flex items-center gap-1.5 text-xs text-subtle"><Mail className="w-3.5 h-3.5" aria-hidden />{fallback}</span>;
  if (d.status === "sent")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success">
        <MailCheck className="w-3.5 h-3.5" aria-hidden />
        Emailed to {d.to}
      </span>
    );
  if (d.status === "not-configured")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-warning">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        Not emailed: email is not set up on this site
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-danger" title={d.reason}>
      <MailX className="w-3.5 h-3.5" aria-hidden />
      {d.status === "suppressed" ? `Not emailed: ${d.to} bounced before` : `Email to ${d.to} failed${d.reason ? `: ${d.reason}` : ""}`}
    </span>
  );
}

function DoneView({
  slug,
  created,
  guests,
  invitesOn,
  title,
  hostName,
  meIsHost,
}: {
  slug: string;
  created: Scheduled[];
  guests: DeliveryStatus[];
  invitesOn: boolean;
  title: string;
  hostName: string;
  meIsHost: boolean;
}) {
  const all = [...created.flatMap((c) => (c.invite ? [c.invite] : [])), ...guests];
  const notSetUp = all.some((d) => d.status === "not-configured");
  const failed = all.filter((d) => d.status === "failed" || d.status === "suppressed").length;
  const sent = all.filter((d) => d.status === "sent").length;
  const reduce = useReducedMotion();
  const [toasts, toast] = useToasts();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = (c: Scheduled) => `${origin}${c.candidateLink}`;
  const many = created.length > 1;

  return (
    <div className="max-w-[760px] mx-auto flex flex-col items-center gap-6 py-10">
      <motion.div
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative w-20 h-20 rounded-full bg-success/15 flex items-center justify-center"
      >
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-success/50"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        )}
        <motion.svg viewBox="0 0 24 24" className="w-10 h-10 text-success" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }} />
        </motion.svg>
      </motion.div>
      <div className="text-center">
        <h1 className="text-[26px] font-semibold tracking-tight text-fg">{many ? `${created.length} interviews scheduled` : "Interview scheduled"}</h1>
        <p className="text-[15px] text-muted mt-1">
          {title}. {meIsHost ? "You host" : `${hostName} hosts`}. Each candidate gets a private link, below.
        </p>
      </div>
      {all.length > 0 && (
        <div
          role="status"
          className={`w-full rounded-xl border px-4 py-3 flex items-start gap-3 text-[13px] ${
            notSetUp ? "border-warning/40 bg-warning/[0.07]" : failed ? "border-danger/40 bg-danger/[0.06]" : "border-success/35 bg-success/[0.06]"
          }`}
        >
          {notSetUp ? <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden /> : failed ? <MailX className="w-4 h-4 text-danger shrink-0 mt-0.5" aria-hidden /> : <MailCheck className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden />}
          <p className="text-fg">
            {notSetUp
              ? "Email sending is not set up on this site, so no email went out. Copy the links below and send them yourself, or ask an admin to add the email provider key."
              : failed
                ? `${sent} ${sent === 1 ? "email" : "emails"} sent, ${failed} failed. Copy the link for anyone marked below.`
                : `${sent === 1 ? "1 email" : `${sent} emails`} sent. Each person has their link and the time.`}{" "}
            <Link href={`/w/${slug}/emails`} className="text-secondary-soft hover:underline whitespace-nowrap">
              Email activity
            </Link>
          </p>
        </div>
      )}
      <ul className="w-full rounded-xl border border-border bg-surface divide-y divide-border">
        {created.map((c, i) => (
          <motion.li
            key={c.id}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.25 + i * 0.05 }}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <Avatar name={c.name ?? "Open link"} size={32} />
            <span className="flex-1 min-w-[160px]">
              <span className="block text-[14px] font-medium text-fg">{c.name ?? "Open link"}</span>
              <span className="block text-xs text-subtle">
                {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "No time yet"}
              </span>
              <span className="block mt-0.5">
                <DeliveryLine d={c.invite} fallback={!c.name ? "Open link, nobody to email" : invitesOn ? "No email address, copy the link" : "Invite not emailed, copy the link"} />
              </span>
            </span>
            <Btn
              icon={Copy}
              onClick={() => {
                navigator.clipboard?.writeText(link(c));
                toast(`Link for ${c.name ?? "the candidate"} copied`);
              }}
            >
              Copy candidate link
            </Btn>
            {meIsHost && (
              <Btn href={`/w/${slug}/interviews/${c.id}/lobby`}>
                Open lobby <ExternalLink className="w-3.5 h-3.5 text-muted" aria-hidden />
              </Btn>
            )}
          </motion.li>
        ))}
      </ul>
      {guests.length > 0 && (
        <section className="w-full flex flex-col gap-2">
          <h2 className="text-[14px] font-semibold text-fg">Interviewers you emailed</h2>
          <ul className="rounded-xl border border-border bg-surface divide-y divide-border">
            {guests.map((g) => (
              <li key={g.to} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={g.to} size={28} />
                <span className="flex-1 min-w-0 text-[13px] font-medium text-fg truncate">{g.to}</span>
                <DeliveryLine d={g} fallback="" />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Btn size="md" href={`/w/${slug}/interviews`}>
          Back to Interviews
        </Btn>
        <Btn size="md" variant="primary" onClick={() => window.location.assign(`/w/${slug}/interviews/new`)}>
          Schedule another
        </Btn>
      </div>
      {toasts}
    </div>
  );
}
