"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
} from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sparkles,
  Search,
  Users,
  Layers,
  ChevronRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  Trash2,
  Loader2,
  Monitor,
  Server,
  Binary,
  GripVertical,
  UserPlus,
  Clock,
  Coins,
  Briefcase,
  Sliders,
  CheckCircle2,
  Gauge,
  Eye,
  Radio,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { createScreeningBatchAction, quickAddCandidateAction } from "./actions";
import type { RoundSpecInput } from "@/lib/ai-interview/rounds";
import {
  FRONTEND_FRAMEWORKS,
  BACKEND_LANGUAGES,
  DSA_LANGUAGES,
  DSA_LANGUAGE_LABELS,
  BACKEND_FRAMEWORK_LABELS,
  curateRoundSpecs,
  isStackEmpty,
  type TechStack,
  type CuratableChallenge,
} from "@/lib/interview/stack";
import type { TemplateChoice, CandidateOption } from "./AIInterviewRecruiterConsole";

// ─── shared helpers ──────────────────────────────────────────────────────────

const toggleId = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

const PARADIGM_META: Record<
  string,
  { label: string; icon: React.ReactNode; tone: string; dot: string }
> = {
  frontend: {
    label: "Frontend",
    icon: <Monitor className="w-3.5 h-3.5" />,
    tone: "text-sky-500 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  backend: {
    label: "Backend",
    icon: <Server className="w-3.5 h-3.5" />,
    tone: "text-emerald-500 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  dsa: {
    label: "DSA",
    icon: <Binary className="w-3.5 h-3.5" />,
    tone: "text-violet-500 dark:text-violet-400",
    dot: "bg-violet-500",
  },
};

/** Human label for a curated/override round (e.g. "React" / "Python + Django"). */
function roundTech(r: RoundSpecInput): string {
  if (r.paradigm === "frontend") return r.frameworkLabel ?? "Frontend";
  if (r.paradigm === "backend") {
    const lang = BACKEND_LANGUAGES.find((b) => b.id === r.language)?.label ?? r.language ?? "Backend";
    return r.frameworkLabel ? `${lang} + ${r.frameworkLabel}` : lang;
  }
  return DSA_LANGUAGE_LABELS[r.language ?? ""] ?? r.language ?? "DSA";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Live interviewer presence. Costs MIRROR the server source of truth in
// `lib/ai-interview/credits.ts` (AI_ENGAGEMENT_CREDIT_COST) — keep in sync. We
// can't import that module here (it pulls in prisma), so the values are
// duplicated for display only; the server is authoritative when charging.
type EngagementLevel = "REACTIVE" | "OBSERVER" | "COACH";

const ENGAGEMENT_OPTIONS: {
  id: EngagementLevel;
  label: string;
  desc: string;
  cost: number;
  icon: React.ReactNode;
}[] = [
  {
    id: "REACTIVE",
    label: "Reactive",
    desc: "Replies only when the candidate messages it. Classic Q&A.",
    cost: 1,
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  {
    id: "OBSERVER",
    label: "Observer",
    desc: "Watches quietly and nudges only when something's notable.",
    cost: 2,
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  {
    id: "COACH",
    label: "Coach",
    desc: "Actively present — reacts to progress in near real-time.",
    cost: 3,
    icon: <Radio className="w-3.5 h-3.5" />,
  },
];

const COST_BY_LEVEL: Record<EngagementLevel, number> = {
  REACTIVE: 1,
  OBSERVER: 2,
  COACH: 3,
};

const STEPS = [
  { n: 1 as const, label: "Candidates", hint: "Who are you screening?", icon: Users },
  { n: 2 as const, label: "Tech stack", hint: "What should they prove?", icon: Layers },
  { n: 3 as const, label: "Questions", hint: "Tune the rounds & send.", icon: Sliders },
];

type Step = 1 | 2 | 3;

// ─── main component ──────────────────────────────────────────────────────────

export default function ScreeningWizard({
  workspaceSlug,
  candidates: initialCandidates,
  templates,
  credits,
  initialQuickAdd,
  onClose,
  onCreated,
}: {
  workspaceSlug: string;
  candidates: CandidateOption[];
  templates: TemplateChoice[];
  credits: number;
  /** Open the quick-add panel immediately (the "Single invite" entry point). */
  initialQuickAdd?: boolean;
  onClose: () => void;
  onCreated: (
    positionTitle: string,
    sessions: { id: string; inviteToken: string; candidateName: string }[]
  ) => void;
}) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState<1 | -1>(1);

  // Candidate pool can grow as recruiters quick-add new people.
  const [pool, setPool] = useState<CandidateOption[]>(initialCandidates);
  const [positionTitle, setPositionTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Stack selection (mirrors the practice StackWizard engine).
  const [frontend, setFrontend] = useState<string[]>([]);
  const [backendLangs, setBackendLangs] = useState<string[]>([]);
  const [backendFw, setBackendFw] = useState<string[]>([]);
  const [dsaLangs, setDsaLangs] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(30);

  // Live interviewer presence (Step 3). Drives proactive behavior + credit cost.
  const [engagementLevel, setEngagementLevel] = useState<EngagementLevel>("REACTIVE");

  // Curatable challenge pool, fetched once for DSA round binding.
  const [challengePool, setChallengePool] = useState<CuratableChallenge[] | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);

  // Shared + per-candidate rounds (snapshotted when entering review).
  const [sharedRounds, setSharedRounds] = useState<RoundSpecInput[]>([]);
  const [overrides, setOverrides] = useState<Record<string, RoundSpecInput[]>>({});

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interview/stack-pool", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load the challenge bank."))))
      .then((d: { challenges: CuratableChallenge[] }) => {
        if (!cancelled) setChallengePool(d.challenges);
      })
      .catch((e: unknown) => {
        if (!cancelled) setPoolError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stack: TechStack = useMemo(() => {
    const s: TechStack = {};
    if (frontend.length) s.frontend = { frameworks: frontend };
    if (backendLangs.length) s.backend = { languages: backendLangs, frameworkLabels: backendFw };
    if (dsaLangs.length) s.dsa = { languages: dsaLangs };
    return s;
  }, [frontend, backendLangs, backendFw, dsaLangs]);

  const emptyStack = isStackEmpty(stack);

  const selectedCandidates = useMemo(
    () => selectedIds.map((id) => pool.find((c) => c.id === id)).filter(Boolean) as CandidateOption[],
    [selectedIds, pool]
  );

  const goto = (next: Step) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const goReview = () => {
    if (emptyStack) {
      toast.error("Pick at least one technology for the question set.");
      return;
    }
    if (!challengePool) {
      toast.error(poolError ?? "Still loading the challenge bank — try again in a moment.");
      return;
    }
    const rounds = curateRoundSpecs(stack, { challenges: challengePool }, { defaultMinutes: minutes });
    if (rounds.length === 0) {
      toast.error("No matching rounds for that stack.", {
        description:
          "DSA rounds need a matching challenge in the bank — try a different language or add a frontend/backend round.",
      });
      return;
    }
    setSharedRounds(rounds);
    setOverrides({});
    goto(3);
  };

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const res = await createScreeningBatchAction(workspaceSlug, {
        positionTitle,
        candidateIds: selectedIds,
        sharedRounds,
        overrides,
        engagementLevel,
      });
      if (res.success) {
        toast.success(`Screening batch created — ${res.sessions.length} invite(s) sent.`);
        onCreated(positionTitle.trim(), res.sessions);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create the batch.");
    } finally {
      setSubmitting(false);
    }
  };

  const step1Valid = positionTitle.trim().length > 0 && selectedIds.length > 0;
  const estRoundCount = sharedRounds.length;
  const estTotalMinutes = sharedRounds.reduce((sum, r) => sum + (r.estimatedMinutes ?? minutes), 0);

  // Slide animation for step transitions.
  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 36 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -36 }),
  };

  return (
    <div className="font-sans">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onClose}
          className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-elevated text-fg text-xs font-bold transition"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Pipeline
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-fg flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> New AI Screening
          </h1>
          <p className="text-[11px] text-muted hidden sm:block">{STEPS[step - 1].hint}</p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] text-amber-500 text-xs font-black tabular-nums">
          <Coins className="w-3.5 h-3.5" />
          {credits}
        </div>
      </div>

      {/* ── Animated stepper ──────────────────────────────────────────────── */}
      <Stepper step={step} onJump={(n) => n < step && goto(n)} />

      {/* ── Body: step content + live summary rail ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-8 min-h-[420px]">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 1 && (
                <StepCandidates
                  workspaceSlug={workspaceSlug}
                  pool={pool}
                  setPool={setPool}
                  positionTitle={positionTitle}
                  setPositionTitle={setPositionTitle}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  initialQuickAdd={initialQuickAdd}
                />
              )}
              {step === 2 && (
                <StepStack
                  frontend={frontend}
                  setFrontend={setFrontend}
                  backendLangs={backendLangs}
                  setBackendLangs={setBackendLangs}
                  backendFw={backendFw}
                  setBackendFw={setBackendFw}
                  dsaLangs={dsaLangs}
                  setDsaLangs={setDsaLangs}
                  minutes={minutes}
                  setMinutes={setMinutes}
                  poolError={poolError}
                />
              )}
              {step === 3 && (
                <StepRounds
                  sharedRounds={sharedRounds}
                  setSharedRounds={setSharedRounds}
                  templates={templates}
                  selectedCandidates={selectedCandidates}
                  overrides={overrides}
                  setOverrides={setOverrides}
                  engagementLevel={engagementLevel}
                  setEngagementLevel={setEngagementLevel}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Live summary rail */}
        <div className="lg:col-span-4">
          <SummaryRail
            positionTitle={positionTitle}
            selectedCandidates={selectedCandidates}
            stack={stack}
            frontend={frontend}
            backendLangs={backendLangs}
            dsaLangs={dsaLangs}
            roundCount={estRoundCount}
            totalMinutes={estTotalMinutes}
            step={step}
            creditPerCandidate={COST_BY_LEVEL[engagementLevel]}
            engagementLabel={ENGAGEMENT_OPTIONS.find((o) => o.id === engagementLevel)?.label ?? "Reactive"}
          />
        </div>
      </div>

      {/* ── Footer nav ────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 mt-6 -mx-1 px-1">
        <div className="rounded-2xl border border-border bg-surface/90 backdrop-blur-md px-5 py-3.5 flex items-center justify-between gap-3 shadow-lg">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : goto((step - 1) as Step))}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted hover:text-fg hover:bg-elevated transition"
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </>
            )}
          </button>

          <div className="text-[11px] text-muted hidden sm:block tabular-nums">
            {selectedIds.length > 0 && (
              <span>
                <span className="text-fg font-bold">{selectedIds.length}</span> candidate
                {selectedIds.length === 1 ? "" : "s"}
                {step === 3 && estRoundCount > 0 && (
                  <>
                    {" · "}
                    <span className="text-fg font-bold">{estRoundCount}</span> round
                    {estRoundCount === 1 ? "" : "s"}
                  </>
                )}
              </span>
            )}
          </div>

          {step === 1 && (
            <NextButton disabled={!step1Valid} onClick={() => goto(2)}>
              Tech stack
            </NextButton>
          )}
          {step === 2 && (
            <NextButton disabled={emptyStack || !challengePool} onClick={goReview}>
              {challengePool ? "Build rounds" : "Loading bank…"}
            </NextButton>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={submitting || sharedRounds.length === 0}
              onClick={handleGenerate}
              className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-widest hover:bg-accent-soft transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              )}
              {submitting ? "Creating…" : `Send ${selectedIds.length} invite${selectedIds.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NextButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-widest hover:bg-accent-soft transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-accent/20"
    >
      {children}
      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ step, onJump }: { step: Step; onJump: (n: Step) => void }) {
  return (
    <LayoutGroup>
      <div className="relative flex items-center justify-between">
        {/* Track */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-border -z-0" />
        <motion.div
          className="absolute left-0 top-5 h-0.5 bg-accent -z-0"
          initial={false}
          animate={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {STEPS.map((s) => {
          const done = step > s.n;
          const active = step === s.n;
          const Icon = s.icon;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => onJump(s.n)}
              disabled={s.n >= step}
              className="relative z-10 flex flex-col items-center gap-2 group"
            >
              <motion.span
                layout
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  active
                    ? "bg-accent border-accent text-bg shadow-md shadow-accent/30"
                    : done
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-surface border-border text-muted"
                } ${s.n < step ? "cursor-pointer hover:border-accent/60" : "cursor-default"}`}
                whileHover={s.n < step ? { scale: 1.08 } : undefined}
                whileTap={s.n < step ? { scale: 0.95 } : undefined}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="w-5 h-5" strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span key="icon" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                      <Icon className="w-[18px] h-[18px]" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
              <div className="text-center">
                <div
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    active ? "text-fg" : done ? "text-accent/80" : "text-muted"
                  }`}
                >
                  {s.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

// ─── Step 1: candidates (drag/drop transfer) ─────────────────────────────────

function StepCandidates({
  workspaceSlug,
  pool,
  setPool,
  positionTitle,
  setPositionTitle,
  selectedIds,
  setSelectedIds,
  initialQuickAdd,
}: {
  workspaceSlug: string;
  pool: CandidateOption[];
  setPool: React.Dispatch<React.SetStateAction<CandidateOption[]>>;
  positionTitle: string;
  setPositionTitle: (v: string) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  initialQuickAdd?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(!!initialQuickAdd);
  const [qName, setQName] = useState("");
  const [qEmail, setQEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const available = useMemo(() => {
    const q = query.toLowerCase().trim();
    return pool
      .filter((c) => !selectedIds.includes(c.id))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [pool, selectedIds, query]);

  const selected = useMemo(
    () => selectedIds.map((id) => pool.find((c) => c.id === id)).filter(Boolean) as CandidateOption[],
    [selectedIds, pool]
  );

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (e.over?.id === "selected-zone" && typeof e.active.id === "string") {
      setSelectedIds((p) => (p.includes(e.active.id as string) ? p : [...p, e.active.id as string]));
    }
  };

  const handleQuickAdd = async () => {
    if (!qName.trim() || !qEmail.trim()) {
      toast.error("Enter a name and email.");
      return;
    }
    setAdding(true);
    try {
      const res = await quickAddCandidateAction(workspaceSlug, { name: qName, email: qEmail });
      if (res.success) {
        const c = res.candidate;
        setPool((p) => (p.some((x) => x.id === c.id) ? p : [c, ...p]));
        setSelectedIds((p) => (p.includes(c.id) ? p : [...p, c.id]));
        toast.success(`${c.name} added to the screening.`);
        setQName("");
        setQEmail("");
        setQuickOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add candidate.");
    } finally {
      setAdding(false);
    }
  };

  const activeCandidate = activeId ? pool.find((c) => c.id === activeId) : null;

  return (
    <div className="space-y-5">
      {/* Position title — floating accent field */}
      <FloatingField
        icon={<Briefcase className="w-4 h-4" />}
        label="Position you're hiring for"
        value={positionTitle}
        onChange={setPositionTitle}
        placeholder="e.g. Senior Frontend Engineer"
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Talent pool */}
          <div className="rounded-2xl border border-border bg-surface/50 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Talent pool
              </span>
              <button
                type="button"
                onClick={() => setQuickOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-accent hover:underline"
              >
                <UserPlus className="w-3 h-3" /> Invite new
              </button>
            </div>

            {/* Quick-add inline panel */}
            <AnimatePresence initial={false}>
              {quickOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mb-2.5 rounded-xl border border-accent/30 bg-accent/[0.05] p-3 space-y-2">
                    <input
                      value={qName}
                      onChange={(e) => setQName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
                    />
                    <input
                      type="email"
                      value={qEmail}
                      onChange={(e) => setQEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                      placeholder="email@company.com"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAdd}
                      disabled={adding}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-bg text-[11px] font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-50"
                    >
                      {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add & select
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative mb-2.5">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the pipeline…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {pool.length === 0 ? (
                <EmptyHint>
                  No candidates with an email yet. Use{" "}
                  <span className="text-accent font-bold">Invite new</span> above, or add people to your{" "}
                  <Link href={`/w/${workspaceSlug}/candidates`} target="_blank" className="text-accent underline">
                    pipeline
                  </Link>
                  .
                </EmptyHint>
              ) : available.length === 0 ? (
                <EmptyHint>Everyone matching is already selected. 🎉</EmptyHint>
              ) : (
                <AnimatePresence initial={false}>
                  {available.map((c) => (
                    <DraggableCandidate
                      key={c.id}
                      candidate={c}
                      onAdd={() => setSelectedIds((p) => [...p, c.id])}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Selected drop zone */}
          <SelectedZone
            selected={selected}
            onRemove={(id) => setSelectedIds((p) => p.filter((x) => x !== id))}
            onClear={() => setSelectedIds([])}
            isDragging={!!activeId}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCandidate ? <CandidateCardVisual candidate={activeCandidate} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DraggableCandidate({ candidate, onAdd }: { candidate: CandidateOption; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: candidate.id });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.18 }}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={onAdd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onAdd()}
        className="group flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-bg hover:border-accent/50 hover:bg-accent/[0.04] cursor-grab active:cursor-grabbing transition select-none"
      >
        <GripVertical className="w-3.5 h-3.5 text-muted/40 group-hover:text-muted shrink-0" />
        <Avatar name={candidate.name} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-fg truncate">{candidate.name}</div>
          <div className="text-[10px] text-muted/70 font-mono truncate">{candidate.email}</div>
        </div>
        <span className="opacity-0 group-hover:opacity-100 transition text-accent">
          <Plus className="w-4 h-4" />
        </span>
      </div>
    </motion.div>
  );
}

function SelectedZone({
  selected,
  onRemove,
  onClear,
  isDragging,
}: {
  selected: CandidateOption[];
  onRemove: (id: string) => void;
  onClear: () => void;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "selected-zone" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 p-3 flex flex-col transition-colors ${
        isOver
          ? "border-accent bg-accent/[0.08]"
          : isDragging
          ? "border-dashed border-accent/50 bg-accent/[0.03]"
          : "border-border bg-surface/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Screening ({selected.length})
        </span>
        {selected.length > 0 && (
          <button type="button" onClick={onClear} className="text-[10px] font-bold text-muted hover:text-fg">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 min-h-[200px] max-h-[400px] overflow-y-auto pr-1">
        {selected.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center gap-2 rounded-xl border border-dashed border-border/60">
            <motion.div
              animate={isDragging ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ repeat: isDragging ? Infinity : 0, duration: 1 }}
              className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent"
            >
              <UserPlus className="w-5 h-5" />
            </motion.div>
            <p className="text-[11px] text-muted max-w-[180px]">
              {isDragging ? "Drop to add to the screening" : "Drag or tap candidates from the pool"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {selected.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                >
                  <div className="group flex items-center gap-2.5 px-3 py-2 rounded-xl border border-accent/30 bg-accent/[0.06]">
                    <Avatar name={c.name} accent />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-fg truncate">{c.name}</div>
                      <div className="text-[10px] text-muted/70 font-mono truncate">{c.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(c.id)}
                      className="p-1 rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateCardVisual({ candidate, dragging }: { candidate: CandidateOption; dragging?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-surface ${
        dragging ? "border-accent shadow-2xl shadow-accent/20 rotate-1" : "border-border"
      }`}
    >
      <Avatar name={candidate.name} accent />
      <div className="min-w-0">
        <div className="text-xs font-bold text-fg truncate">{candidate.name}</div>
        <div className="text-[10px] text-muted/70 font-mono truncate">{candidate.email}</div>
      </div>
    </div>
  );
}

function Avatar({ name, accent }: { name: string; accent?: boolean }) {
  return (
    <span
      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black ${
        accent ? "bg-accent/20 text-accent" : "bg-elevated text-muted"
      }`}
    >
      {initials(name)}
    </span>
  );
}

// ─── Step 2: tech stack ──────────────────────────────────────────────────────

function StepStack({
  frontend,
  setFrontend,
  backendLangs,
  setBackendLangs,
  backendFw,
  setBackendFw,
  dsaLangs,
  setDsaLangs,
  minutes,
  setMinutes,
  poolError,
}: {
  frontend: string[];
  setFrontend: React.Dispatch<React.SetStateAction<string[]>>;
  backendLangs: string[];
  setBackendLangs: React.Dispatch<React.SetStateAction<string[]>>;
  backendFw: string[];
  setBackendFw: React.Dispatch<React.SetStateAction<string[]>>;
  dsaLangs: string[];
  setDsaLangs: React.Dispatch<React.SetStateAction<string[]>>;
  minutes: number;
  setMinutes: (n: number) => void;
  poolError: string | null;
}) {
  const availableBackendFw = useMemo(
    () => [...new Set(backendLangs.flatMap((l) => BACKEND_FRAMEWORK_LABELS[l] ?? []))],
    [backendLangs]
  );

  return (
    <div className="space-y-4">
      <StackCard
        tone="sky"
        icon={<Monitor className="w-4 h-4" />}
        title="Frontend frameworks"
        count={frontend.length}
      >
        <ChipGrid
          tone="sky"
          options={FRONTEND_FRAMEWORKS.map((f) => ({ id: f.id, label: f.label }))}
          selected={frontend}
          onToggle={(v) => setFrontend((p) => toggleId(p, v))}
        />
      </StackCard>

      <StackCard
        tone="emerald"
        icon={<Server className="w-4 h-4" />}
        title="Backend languages"
        count={backendLangs.length}
      >
        <ChipGrid
          tone="emerald"
          options={BACKEND_LANGUAGES.map((b) => ({ id: b.id, label: b.label }))}
          selected={backendLangs}
          onToggle={(v) => setBackendLangs((p) => toggleId(p, v))}
        />
        <AnimatePresence initial={false}>
          {availableBackendFw.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted/70 mt-3 mb-1.5">
                Framework focus <span className="font-normal normal-case">(steers AI questions — not executed)</span>
              </p>
              <ChipGrid
                tone="emerald"
                small
                options={availableBackendFw.map((f) => ({ id: f, label: f }))}
                selected={backendFw}
                onToggle={(v) => setBackendFw((p) => toggleId(p, v))}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </StackCard>

      <StackCard tone="violet" icon={<Binary className="w-4 h-4" />} title="DSA languages" count={dsaLangs.length}>
        <ChipGrid
          tone="violet"
          options={DSA_LANGUAGES.map((l) => ({ id: l, label: DSA_LANGUAGE_LABELS[l] ?? l }))}
          selected={dsaLangs}
          onToggle={(v) => setDsaLangs((p) => toggleId(p, v))}
        />
        <p className="mt-2 text-[10px] text-muted/60">
          Fullstack = pick a frontend framework <span className="text-fg/70">+</span> a backend language together.
        </p>
      </StackCard>

      <div className="rounded-2xl border border-border bg-surface/50 p-4">
        <TimeSlider minutes={minutes} setMinutes={setMinutes} />
      </div>

      {poolError && <div className="text-[11px] text-rose-400">{poolError}</div>}
    </div>
  );
}

const TONE: Record<string, { ring: string; chip: string; head: string; bar: string }> = {
  sky: {
    ring: "border-sky-500/30",
    chip: "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400",
    head: "text-sky-500 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  emerald: {
    ring: "border-emerald-500/30",
    chip: "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
    head: "text-emerald-500 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  violet: {
    ring: "border-violet-500/30",
    chip: "bg-violet-500/15 border-violet-500/40 text-violet-600 dark:text-violet-400",
    head: "text-violet-500 dark:text-violet-400",
    bar: "bg-violet-500",
  },
};

function StackCard({
  tone,
  icon,
  title,
  count,
  children,
}: {
  tone: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className={`rounded-2xl border bg-surface/50 p-4 transition-colors ${count > 0 ? t.ring : "border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${t.head}`}>
          {icon}
          {title}
        </div>
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${t.chip}`}
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {children}
    </div>
  );
}

function ChipGrid({
  options,
  selected,
  onToggle,
  tone,
  small,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  tone: string;
  small?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <motion.button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            whileTap={{ scale: 0.92 }}
            className={`inline-flex items-center gap-1.5 rounded-full border font-bold transition-colors ${
              small ? "px-2.5 py-1 text-[10px]" : "px-3.5 py-1.5 text-[11px]"
            } ${on ? t.chip : "bg-transparent border-border text-muted hover:border-border-strong hover:text-fg"}`}
          >
            <AnimatePresence initial={false}>
              {on && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="overflow-hidden inline-flex"
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function TimeSlider({ minutes, setMinutes }: { minutes: number; setMinutes: (n: number) => void }) {
  const min = 15;
  const max = 120;
  const pct = ((minutes - min) / (max - min)) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Time per round
        </label>
        <motion.span
          key={minutes}
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-sm font-black text-accent tabular-nums"
        >
          {minutes} min
        </motion.span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-border" />
        <div className="absolute left-0 h-1.5 rounded-full bg-accent" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={15}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="absolute left-0 right-0 w-full appearance-none bg-transparent cursor-pointer accent-accent
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg"
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted/60 tabular-nums">
        <span>15m</span>
        <span>120m</span>
      </div>
    </div>
  );
}

// ─── Step 3: rounds (sortable) + per-candidate overrides ─────────────────────

function StepRounds({
  sharedRounds,
  setSharedRounds,
  templates,
  selectedCandidates,
  overrides,
  setOverrides,
  engagementLevel,
  setEngagementLevel,
}: {
  sharedRounds: RoundSpecInput[];
  setSharedRounds: React.Dispatch<React.SetStateAction<RoundSpecInput[]>>;
  templates: TemplateChoice[];
  selectedCandidates: CandidateOption[];
  overrides: Record<string, RoundSpecInput[]>;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, RoundSpecInput[]>>>;
  engagementLevel: EngagementLevel;
  setEngagementLevel: (l: EngagementLevel) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return (
    <div className="space-y-5">
      {/* Interviewer presence — drives proactive behavior + credit cost. */}
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5 mb-1">
          <Gauge className="w-3.5 h-3.5" /> Interviewer presence
        </div>
        <p className="text-[11px] text-muted mb-3">
          How present the AI is while the candidate codes. More presence = richer signal, more credits per candidate.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {ENGAGEMENT_OPTIONS.map((o) => {
            const on = engagementLevel === o.id;
            return (
              <motion.button
                key={o.id}
                type="button"
                onClick={() => setEngagementLevel(o.id)}
                whileTap={{ scale: 0.97 }}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  on ? "border-accent bg-accent/[0.07]" : "border-border bg-bg hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-black ${on ? "text-fg" : "text-muted"}`}>
                    <span className={on ? "text-accent" : "text-muted"}>{o.icon}</span>
                    {o.label}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-500 tabular-nums">
                    <Coins className="w-3 h-3" />
                    {o.cost}
                  </span>
                </div>
                <p className="text-[10px] text-muted leading-snug">{o.desc}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5 mb-1">
          <Layers className="w-3.5 h-3.5" /> Shared question set
        </div>
        <p className="text-[11px] text-muted mb-3">
          Drag to reorder — candidates run rounds top-to-bottom. Override any round with a custom scaffold.
        </p>
        <SortableRounds initial={sharedRounds} onChange={setSharedRounds} templates={templates} />
      </div>

      {selectedCandidates.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-elevated/30 transition"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Per-candidate overrides
              {Object.keys(overrides).length > 0 && (
                <span className="text-accent">({Object.keys(overrides).length})</span>
              )}
            </span>
            <ChevronRight className={`w-4 h-4 text-muted transition-transform ${advancedOpen ? "rotate-90" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-1 space-y-1.5 border-t border-border/60">
                  <p className="text-[10px] text-muted/70 py-2">
                    Everyone gets the shared set unless overridden here.
                  </p>
                  {selectedCandidates.map((c) => (
                    <OverrideRow
                      key={c.id}
                      candidate={c}
                      sharedRounds={sharedRounds}
                      override={overrides[c.id]}
                      templates={templates}
                      onSet={(rounds) =>
                        setOverrides((p) => {
                          if (!rounds) {
                            const n = { ...p };
                            delete n[c.id];
                            return n;
                          }
                          return { ...p, [c.id]: rounds };
                        })
                      }
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function OverrideRow({
  candidate,
  sharedRounds,
  override,
  templates,
  onSet,
}: {
  candidate: CandidateOption;
  sharedRounds: RoundSpecInput[];
  override: RoundSpecInput[] | undefined;
  templates: TemplateChoice[];
  onSet: (rounds: RoundSpecInput[] | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const overridden = !!override;
  return (
    <div className="rounded-xl border border-border bg-bg">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Avatar name={candidate.name} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-fg truncate">{candidate.name}</div>
          <div className="text-[10px] text-muted/70 truncate">
            {overridden ? `${override!.length} custom round${override!.length === 1 ? "" : "s"}` : "Shared set"}
          </div>
        </div>
        {overridden && (
          <button type="button" onClick={() => onSet(null)} className="text-[10px] font-bold text-muted hover:text-fg">
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (!overridden) onSet(sharedRounds.map((r) => ({ ...r })));
            setExpanded((v) => !v);
          }}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-accent hover:underline"
        >
          {expanded ? "Done" : "Customize"}
          <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && override && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-border/60 pt-2.5">
              <SortableRounds initial={override} onChange={(rounds) => onSet(rounds)} templates={templates} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Internal display row: carries a stable key (so drag reorder is smooth) and a
// `_base` snapshot of the curated round so "Auto" can cleanly revert a scaffold
// override. Both `_key`/`_base` are stripped before emitting clean specs — and
// the server's sanitizeRoundSpec drops any extras anyway.
type Row = RoundSpecInput & { _key: string; _base: RoundSpecInput };

let _rowSeq = 0;

function SortableRounds({
  initial,
  onChange,
  templates,
  compact,
}: {
  initial: RoundSpecInput[];
  onChange: (rounds: RoundSpecInput[]) => void;
  templates: TemplateChoice[];
  compact?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r) => ({ ...r, _key: `row-${_rowSeq++}`, _base: r }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const commit = (next: Row[]) => {
    setRows(next);
    onChange(next.map(({ _key, _base, ...r }) => r));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r._key === active.id);
    const to = rows.findIndex((r) => r._key === over.id);
    if (from < 0 || to < 0) return;
    commit(arrayMove(rows, from, to));
  };

  const setScaffold = (i: number, templateId: string | null) => {
    commit(
      rows.map((r, idx) => {
        if (idx !== i) return r;
        if (!templateId) {
          // Revert to the curated round we snapshotted on mount.
          return { ...r._base, _key: r._key, _base: r._base };
        }
        return { ...r, sourceKind: "scaffold", templateId };
      })
    );
  };

  const removeRow = (i: number) => commit(rows.filter((_, idx) => idx !== i));

  if (rows.length === 0) {
    return <EmptyHint>No rounds. Pick at least one technology in the previous step.</EmptyHint>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={rows.map((r) => r._key)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <SortableRound
              key={r._key}
              id={r._key}
              index={i}
              round={r}
              templates={templates}
              onScaffold={(tid) => setScaffold(i, tid)}
              onRemove={() => removeRow(i)}
              compact={compact}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRound({
  id,
  index,
  round,
  templates,
  onScaffold,
  onRemove,
  compact,
}: {
  id: string;
  index: number;
  round: RoundSpecInput;
  templates: TemplateChoice[];
  onScaffold: (templateId: string | null) => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const meta = PARADIGM_META[round.paradigm];
  const isScaffold = round.sourceKind === "scaffold";

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 rounded-xl border bg-bg p-2.5 ${
        isDragging ? "border-accent shadow-xl shadow-accent/10" : "border-border"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 -ml-1 text-muted/40 hover:text-muted cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-accent/10 text-accent text-[11px] font-black shrink-0">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-fg truncate flex items-center gap-1.5">
          <span className={meta?.tone}>{meta?.icon}</span>
          {meta?.label} · {roundTech(round)}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-muted/70">
          {isScaffold ? "Custom scaffold" : `Auto · ${round.sourceKind}`} · {round.estimatedMinutes ?? 30}m
        </div>
      </div>

      {!compact && (
        <select
          value={isScaffold ? round.templateId : "__auto__"}
          onChange={(e) => onScaffold(e.target.value === "__auto__" ? null : e.target.value)}
          className="px-2 py-1 rounded-lg border border-border bg-surface text-[10px] text-fg focus:outline-none focus:border-accent max-w-[150px]"
          title="Override this round with a custom scaffold"
        >
          <option value="__auto__">Auto (curated)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
        title="Remove round"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Live summary rail ───────────────────────────────────────────────────────

function SummaryRail({
  positionTitle,
  selectedCandidates,
  stack,
  frontend,
  backendLangs,
  dsaLangs,
  roundCount,
  totalMinutes,
  step,
  creditPerCandidate,
  engagementLabel,
}: {
  positionTitle: string;
  selectedCandidates: CandidateOption[];
  stack: TechStack;
  frontend: string[];
  backendLangs: string[];
  dsaLangs: string[];
  roundCount: number;
  totalMinutes: number;
  step: Step;
  creditPerCandidate: number;
  engagementLabel: string;
}) {
  const totalCredits = selectedCandidates.length * creditPerCandidate;
  const stackChips: { label: string; tone: string }[] = [
    ...frontend.map((id) => ({
      label: FRONTEND_FRAMEWORKS.find((f) => f.id === id)?.label ?? id,
      tone: "sky",
    })),
    ...backendLangs.map((id) => ({
      label: BACKEND_LANGUAGES.find((b) => b.id === id)?.label ?? id,
      tone: "emerald",
    })),
    ...dsaLangs.map((id) => ({ label: DSA_LANGUAGE_LABELS[id] ?? id, tone: "violet" })),
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5 lg:sticky lg:top-4 space-y-5">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
        <Sparkles className="w-3.5 h-3.5 text-accent" /> Screening summary
      </div>

      <SummaryBlock label="Position" filled={!!positionTitle.trim()}>
        {positionTitle.trim() || <span className="text-muted/50">Not set yet</span>}
      </SummaryBlock>

      <SummaryBlock label={`Candidates (${selectedCandidates.length})`} filled={selectedCandidates.length > 0}>
        {selectedCandidates.length === 0 ? (
          <span className="text-muted/50">None selected</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <LayoutGroup>
              <AnimatePresence initial={false}>
                {selectedCandidates.slice(0, 8).map((c) => (
                  <motion.span
                    key={c.id}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    title={c.name}
                    className="w-7 h-7 rounded-lg bg-accent/15 text-accent text-[10px] font-black flex items-center justify-center"
                  >
                    {initials(c.name)}
                  </motion.span>
                ))}
              </AnimatePresence>
            </LayoutGroup>
            {selectedCandidates.length > 8 && (
              <span className="w-7 h-7 rounded-lg bg-elevated text-muted text-[10px] font-black flex items-center justify-center">
                +{selectedCandidates.length - 8}
              </span>
            )}
          </div>
        )}
      </SummaryBlock>

      <SummaryBlock label="Tech stack" filled={!isStackEmpty(stack)}>
        {stackChips.length === 0 ? (
          <span className="text-muted/50">Step 2</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {stackChips.map((c, i) => (
              <span
                key={`${c.label}-${i}`}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${TONE[c.tone].chip}`}
              >
                {c.label}
              </span>
            ))}
          </div>
        )}
      </SummaryBlock>

      <SummaryBlock label="Rounds" filled={roundCount > 0}>
        {roundCount === 0 ? (
          <span className="text-muted/50">{step < 3 ? "Built in step 3" : "—"}</span>
        ) : (
          <span className="text-fg font-bold tabular-nums">
            {roundCount} round{roundCount === 1 ? "" : "s"}{" "}
            <span className="text-muted font-normal">· ~{totalMinutes} min</span>
          </span>
        )}
      </SummaryBlock>

      <div className="pt-4 border-t border-border space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted">Credits on completion</span>
          <span className="inline-flex items-center gap-1 text-sm font-black text-amber-500 tabular-nums">
            <Coins className="w-3.5 h-3.5" />
            {totalCredits}
          </span>
        </div>
        {selectedCandidates.length > 0 && (
          <div className="text-[10px] text-muted/70 tabular-nums text-right">
            {selectedCandidates.length} × {creditPerCandidate} ({engagementLabel})
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryBlock({
  label,
  filled,
  children,
}: {
  label: string;
  filled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors ${filled ? "bg-accent" : "bg-border-strong"}`}
        />
        <span className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</span>
      </div>
      <div className="text-xs text-fg pl-3">{children}</div>
    </div>
  );
}

// ─── small shared bits ───────────────────────────────────────────────────────

function FloatingField({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  const id = useRef(`ff-${Math.random().toString(36).slice(2)}`).current;
  return (
    <div
      className={`relative rounded-2xl border bg-surface/50 transition-colors ${
        focused ? "border-accent" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3 px-4 pt-5 pb-2">
        <span className={`shrink-0 transition-colors ${active ? "text-accent" : "text-muted"}`}>{icon}</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={active ? placeholder : ""}
          className="w-full bg-transparent text-sm font-bold text-fg focus:outline-none placeholder:text-muted/40 placeholder:font-normal"
        />
      </div>
      <label
        htmlFor={id}
        className={`absolute left-11 pointer-events-none transition-all ${
          active
            ? "top-2 text-[9px] font-black uppercase tracking-widest text-accent"
            : "top-1/2 -translate-y-1/2 text-sm text-muted"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-bg/40 p-5 text-center text-[11px] text-muted leading-relaxed">
      {children}
    </div>
  );
}
