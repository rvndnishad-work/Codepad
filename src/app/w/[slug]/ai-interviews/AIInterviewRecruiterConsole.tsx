"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Award,
  Crown,
  Search,
  Plus,
  Copy,
  Bot,
  FileCode,
  CheckCircle2,
  Trash2,
  ExternalLink,
  TrendingUp,
  Cpu,
  FolderOpen,
  Coins,
  X,
  ShoppingCart,
  Loader2,
  Plug,
  ShieldAlert,
  Layers,
  AlertTriangle,
  Info,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAIInterviewSessionAction,
  updateExtensionPolicyAction,
  createCreditPackCheckoutAction,
  createCustomTemplateAction,
  deleteCustomTemplateAction,
  bindExternalMcpToTemplateAction,
  unbindExternalMcpFromTemplateAction,
} from "./actions";
import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credits";
import { getScreeningVerdict } from "@/lib/ai-interview/verdict";
import type { FileDiff, DiffStats } from "@/lib/ai-interview/diff";
import dynamic from "next/dynamic";
import ScreeningWizard from "./ScreeningWizard";

const RunPreview = dynamic(() => import("./RunPreview"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-border bg-bg h-[420px] flex items-center justify-center text-muted text-xs">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading sandbox…
    </div>
  ),
});

export interface TemplateChoice {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  custom: boolean;
  /** Stack metadata — lets the question picker filter/rank by round paradigm. */
  kind?: "frontend" | "backend" | "dsa";
  language?: string;
  frameworkLabel?: string;
  /** Phase 4.1: external MCP server ids bound to this template. */
  boundExternalMcpServerIds: string[];
}

export interface ExternalMcpServerOption {
  id: string;
  name: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

interface RoundSummary {
  id: string;
  order: number;
  paradigm: string;
  language: string | null;
  frameworkLabel: string | null;
  sourceKind: string;
  score: number | null;
  status: string;
  ratings: { CodeQuality: number; ProblemSolving: number; Communication: number } | null;
  filesJson: Record<string, string>;
}

interface RecruiterSession {
  id: string;
  inviteToken: string;
  /** CRM candidate this screening belongs to (null for legacy/practice rows). */
  candidateId: string | null;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  status: string;
  templateId: string;
  /** Revamp: batch this session belongs to (null for legacy single invites). */
  batchId: string | null;
  batchTitle: string | null;
  score: number | null;
  aiSummary: string | null;
  aiSuspicionScore: number | null;
  /** Phase 4.1: how many outbound MCP calls the interviewer made during this session. */
  outboundCallCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  chatHistory: ChatMsg[];
  filesJson: Record<string, string>;
  ratings: {
    CodeQuality: number;
    ProblemSolving: number;
    Communication: number;
  };
  /** Per-round breakdown (empty for legacy single-round sessions). */
  rounds: RoundSummary[];
  /** Starter-vs-submitted diffs (null when starter unknown / no submissions). */
  fileDiffs: FileDiff[] | null;
  changeStats: DiffStats | null;
  /** Accumulated seconds the candidate spent in the workspace. */
  timeSpentSec: number;
  /** Time-extension policy + usage (candidate's "+N min" button). */
  extensionPolicy: {
    extraMinutes: number;
    used: number;
    max: number;
    minutesEach: number;
  };
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  totalSessions: number;
  pageSize: number;
}

export interface CandidateOption {
  id: string;
  name: string;
  email: string;
  stage: string;
}

interface ConsoleProps {
  workspaceSlug: string;
  initialSessions: RecruiterSession[];
  candidates: CandidateOption[];
  totalScreened: number;
  avgScore: number;
  credits: number;
  usedThisMonth: number;
  canCreate: boolean;
  templates: TemplateChoice[];
  availableExternalMcpServers: ExternalMcpServerOption[];
  workspaceAllowExternalMcp: boolean;
  pagination: PaginationInfo;
  /** Deep-link filter from the candidate board (?candidate=<id>). */
  initialCandidateId?: string | null;
  initialSearch?: string;
  initialStatus?: string;
  initialBatch?: string;
  initialSort?: string;
}

export default function AIInterviewRecruiterConsole({
  workspaceSlug,
  initialSessions,
  candidates,
  totalScreened,
  avgScore,
  credits,
  usedThisMonth,
  canCreate,
  templates,
  availableExternalMcpServers,
  workspaceAllowExternalMcp,
  pagination,
  initialCandidateId,
  initialSearch = "",
  initialStatus = "ALL",
  initialBatch = "ALL",
  initialSort = "newest",
}: ConsoleProps) {
  const [sessions, setSessions] = useState<RecruiterSession[]>(initialSessions);
  const router = useRouter();
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Sync when server sends new filtered page (search/status/batch/sort/pagination)
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  // Auto-refresh for HR: no manual reload needed when candidate submits.
  // Server-driven polling every 15s + instant on tab focus. Toggle with Live button.
  useEffect(() => {
    if (!isLive) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setLastRefresh(new Date());
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    const poll = setInterval(() => {
      router.refresh();
      setLastRefresh(new Date());
    }, 15_000);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(poll);
    };
  }, [router, isLive]);
  // Deep-link (?candidate=<id>) opens straight onto that candidate's session.
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(() => {
    if (initialCandidateId) {
      const first = initialSessions.find((s) => s.candidateId === initialCandidateId);
      if (first) return first.id;
    }
    return initialSessions.length > 0 ? initialSessions[0].id : null;
  });
  const [templateChoices, setTemplateChoices] = useState<TemplateChoice[]>(templates);

  // Derived lookup so the candidate list and detail drawer can show readable
  // template titles regardless of whether the id refers to a builtin or a
  // custom workspace template.
  const templateLabelById = templateChoices.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.title;
    return acc;
  }, {});

  // Search & Filter State — server-driven for 100s scale (URL query params)
  // This keeps search/status/batch/sort consistent across pagination and shareable via URL.
  const [search, setSearch] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [filterBatch, setFilterBatch] = useState<string>(initialBatch);
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [density, setDensity] = useState<"cozy" | "compact">("cozy");
  // Candidate deep-link (from the candidate activity board). Pre-filtered so
  // the recruiter lands on exactly this candidate's screenings.
  const [filterCandidate, setFilterCandidate] = useState<string>(
    initialCandidateId ?? "ALL"
  );
  const filteredCandidateName = candidates.find((c) => c.id === filterCandidate)?.name;

  // Distinct batches present in the loaded sessions (for the batch filter).
  const batchOptions = Array.from(
    new Map(
      sessions
        .filter((s) => s.batchId && s.batchTitle)
        .map((s) => [s.batchId as string, s.batchTitle as string])
    ).entries()
  );

  // Keep local inputs in sync when server navigates (back/forward)
  useEffect(() => {
    setSearch(initialSearch);
    setFilterStatus(initialStatus);
    setFilterBatch(initialBatch);
    setSortBy(initialSort);
  }, [initialSearch, initialStatus, initialBatch, initialSort]);

  const updateQuery = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === "" || v === "ALL" || (k === "sort" && v === "newest")) params.delete(k);
      else params.set(k, v);
    });
    // Reset to page 1 when filters change
    if ("search" in patch || "status" in patch || "batch" in patch || "sort" in patch) params.delete("page");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?");
  };

  // Inline create-screening wizard (replaces the old popup + single-invite form).
  const [view, setView] = useState<"list" | "create">("list");
  const [wizardQuickAdd, setWizardQuickAdd] = useState(false);

  // Buy-credits modal state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);

  // Custom templates manager state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);

  const activeSession = sessions.find((s) => s.id === selectedSessionId);

  // Server already filters by search/status/batch/sort for 100s scale.
  // Client only applies the candidate deep-link filter.
  const processedSessions = sessions.filter((s) => {
    const matchCandidate = filterCandidate === "ALL" || s.candidateId === filterCandidate;
    return matchCandidate;
  });

  const completedSessionsSorted = [...sessions]
    .filter((s) => s.status === "COMPLETED")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Rank a candidate against peers IN THE SAME BATCH (compare-within-batch).
  // Legacy/single sessions (no batch) fall back to the workspace-wide pool.
  const rankPoolFor = (session: RecruiterSession) =>
    [...sessions]
      .filter(
        (s) =>
          s.status === "COMPLETED" &&
          (session.batchId ? s.batchId === session.batchId : !s.batchId)
      )
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const getCandidateBadge = (session: RecruiterSession) => {
    if (session.status !== "COMPLETED") return null;

    // ABSOLUTE verdict first — being #1 of a weak batch means nothing at 10%.
    // Relative crowns below only apply once the score clears the hiring bar.
    const verdict = getScreeningVerdict(session.score);
    const rankIndex = rankPoolFor(session).findIndex((s) => s.id === session.id);

    if (verdict && !verdict.passed) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${verdict.className}`}
          title={verdict.guidance}
        >
          <AlertTriangle className="w-3 h-3" />
          {verdict.label} · {session.score ?? 0}%
        </span>
      );
    }

    if (rankIndex === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
          <Crown className="w-3.5 h-3.5 fill-current" />
          Best Fit Candidate
        </span>
      );
    }
    if (rankIndex === 1 || rankIndex === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30">
          <Award className="w-3.5 h-3.5" />
          Backup Offer #{rankIndex + 1}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/5 border border-indigo-500/20">
        Qualified Pipeline
      </span>
    );
  };

  // Prepend freshly invited (PENDING) batch sessions to the pipeline list and
  // return to the list view.
  const handleBatchCreated = (
    positionTitle: string,
    newSessions: { id: string; inviteToken: string; candidateName: string }[]
  ) => {
    const mapped: RecruiterSession[] = newSessions.map((s) => ({
      id: s.id,
      inviteToken: s.inviteToken,
      candidateId: null, // fresh batch rows get their CRM link on next load
      candidateName: s.candidateName,
      candidateEmail: "",
      positionTitle,
      status: "PENDING",
      templateId: "batch",
      batchId: "new",
      batchTitle: positionTitle,
      score: null,
      aiSummary: null,
      aiSuspicionScore: null,
      outboundCallCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      chatHistory: [],
      filesJson: {},
      fileDiffs: null,
      changeStats: null,
      timeSpentSec: 0,
      extensionPolicy: { extraMinutes: 0, used: 0, max: 1, minutesEach: 5 },
      ratings: { CodeQuality: 0, ProblemSolving: 0, Communication: 0 },
      rounds: [],
    }));
    setSessions((prev) => [...mapped, ...prev]);
    if (mapped.length > 0) setSelectedSessionId(mapped[0].id);
    setView("list");
  };

  const openWizard = (quickAdd: boolean) => {
    setWizardQuickAdd(quickAdd);
    setView("create");
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = confirm("Are you sure you want to delete this candidate session?");
    if (!confirmDelete) return;

    try {
      const res = await deleteAIInterviewSessionAction(workspaceSlug, id);
      if (res.success) {
        toast.success("Session deleted successfully.");
        const nextSessions = sessions.filter((s) => s.id !== id);
        setSessions(nextSessions);
        if (selectedSessionId === id) {
          setSelectedSessionId(nextSessions.length > 0 ? nextSessions[0].id : null);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Candidate invitation link copied to clipboard!");
  };

  const handleBuyPack = async (packId: string) => {
    setPurchasingPackId(packId);
    try {
      const res = await createCreditPackCheckoutAction(workspaceSlug, packId);
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout.");
      setPurchasingPackId(null);
    }
  };

  const outOfCredits = credits <= 0;

  // Inline full-takeover create flow — replaces the old single-invite form and
  // batch-wizard popups with a single animated 3-step page.
  if (view === "create") {
    return (
      <ScreeningWizard
        workspaceSlug={workspaceSlug}
        candidates={candidates}
        templates={templateChoices}
        credits={credits}
        initialQuickAdd={wizardQuickAdd}
        onClose={() => setView("list")}
        onCreated={handleBatchCreated}
      />
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-fg flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-accent animate-pulse" /> AI Screening
            </h1>
            <p className="text-sm text-muted/80 mt-1 max-w-xl leading-relaxed">
              Screen hundreds of candidates automatically. The AI Interviewer guides applicants through React/DSA sandboxes and builds unified score sheets. <span className="text-fg">1 credit per completed screening.</span>
            </p>
          </div>

          {canCreate && (
            <div className="flex gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => setShowTemplatesModal(true)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-border bg-surface hover:bg-elevated text-fg text-xs font-bold uppercase tracking-wider transition shrink-0"
                title="Manage custom screening templates"
              >
                <FileCode className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
              </button>
              <button
                onClick={() => openWizard(true)}
                disabled={outOfCredits}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-border bg-surface hover:bg-elevated text-fg text-xs font-bold uppercase tracking-wider transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title={outOfCredits ? "Workspace is out of credits" : "Invite a single candidate"}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Single invite</span>
              </button>
              <button
                onClick={() => openWizard(false)}
                disabled={outOfCredits}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md flex-1 md:flex-initial text-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                title={outOfCredits ? "Workspace is out of credits" : "Screen a batch of candidates"}
              >
                <Sparkles className="w-4 h-4" />
                <span>{outOfCredits ? "Out of credits" : "New Screening"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {outOfCredits && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-xs text-amber-300 flex items-start gap-3">
          <Coins className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-bold uppercase tracking-wider">Out of credits</div>
            <div className="text-amber-200/80 leading-relaxed">
              You can still view existing screenings, but generating new invites is paused until credits are added.
            </div>
          </div>
          <button
            onClick={() => setShowBuyModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-bg text-[10px] font-black uppercase tracking-wider transition shrink-0"
          >
            <ShoppingCart className="w-3 h-3" /> Buy credits
          </button>
        </div>
      )}

      {showBuyModal && (
        <BuyCreditsModal
          packs={AI_CREDIT_PACKS}
          purchasingPackId={purchasingPackId}
          onPick={handleBuyPack}
          onClose={() => setShowBuyModal(false)}
        />
      )}

      {showTemplatesModal && (
        <CustomTemplatesModal
          workspaceSlug={workspaceSlug}
          templates={templateChoices}
          availableExternalMcpServers={availableExternalMcpServers}
          workspaceAllowExternalMcp={workspaceAllowExternalMcp}
          onClose={() => setShowTemplatesModal(false)}
          onChange={setTemplateChoices}
        />
      )}

      {/* Stats row — credits, completed, avg score, top match */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 flex items-center gap-3 relative">
          <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Credit Balance</span>
            <div className="text-2xl font-black text-fg mt-0.5 tabular-nums">{credits}</div>
            <span className="text-[10px] text-muted/70 block">{usedThisMonth} used this month</span>
          </div>
          <button
            onClick={() => setShowBuyModal(true)}
            className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-[9px] font-black uppercase tracking-wider transition"
            title="Buy more credits"
          >
            <Plus className="w-3 h-3" />
            Buy
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 flex items-center gap-3">
          <div className="w-11 h-11 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Completed Screenings</span>
            <div className="text-2xl font-black text-fg mt-0.5">{totalScreened}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Pipeline Avg Score</span>
            <div className="text-2xl font-black text-fg mt-0.5">{avgScore}%</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Top Match</span>
            <div className="text-sm font-black text-fg mt-0.5 truncate">
              {completedSessionsSorted.length > 0 ? completedSessionsSorted[0].candidateName : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted">
                {pagination.totalSessions} candidate{pagination.totalSessions === 1 ? "" : "s"} · {pagination.page}/{pagination.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsLive((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider transition ${isLive ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-bg border-border/40 text-muted"}`}
                  title={isLive ? `Live · updated ${lastRefresh.toLocaleTimeString()}` : "Live paused — click to resume auto-refresh"}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-muted/40"}`} />
                  {isLive ? "Live" : "Paused"}
                </button>
                <div className="hidden sm:flex items-center gap-0.5 rounded-md border border-border/40 bg-bg p-0.5">
                  <button type="button" onClick={() => setDensity("cozy")} className={`px-2 py-1 text-[9px] font-bold rounded ${density === "cozy" ? "bg-accent/15 text-accent" : "text-muted"}`}>Cozy</button>
                  <button type="button" onClick={() => setDensity("compact")} className={`px-2 py-1 text-[9px] font-bold rounded ${density === "compact" ? "bg-accent/15 text-accent" : "text-muted"}`}>Compact</button>
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
              <input
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearch(v);
                  // Debounced server search for 100s scale
                  const t = (window as any).__aiSearchTimer;
                  if (t) clearTimeout(t);
                  (window as any).__aiSearchTimer = setTimeout(() => updateQuery({ search: v }), 400);
                }}
                placeholder="Search candidate name, email, role... (server-side)"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto">
              {["ALL", "COMPLETED", "ACTIVE", "PENDING"].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status);
                    updateQuery({ status });
                  }}
                  className={`flex-1 whitespace-nowrap px-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    filterStatus === status
                      ? "bg-accent/15 border-accent/30 text-accent"
                      : "bg-bg border-border/40 text-muted hover:text-fg"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {batchOptions.length > 0 && (
                <select
                  value={filterBatch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterBatch(v);
                    updateQuery({ batch: v });
                  }}
                  className="px-3 py-2 rounded-lg border border-border bg-bg text-[11px] text-fg focus:outline-none focus:border-accent"
                  title="Filter by screening batch"
                >
                  <option value="ALL">All batches</option>
                  {batchOptions.map(([id, title]) => (
                    <option key={id} value={id}>
                      {title}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => {
                  const v = e.target.value;
                  setSortBy(v);
                  updateQuery({ sort: v });
                }}
                className="px-3 py-2 rounded-lg border border-border bg-bg text-[11px] text-fg focus:outline-none focus:border-accent"
                title="Sort candidates"
              >
                <option value="newest">Newest</option>
                <option value="score_desc">Score ↓</option>
                <option value="score_asc">Score ↑</option>
                <option value="name_asc">Name A→Z</option>
              </select>
            </div>

            {/* Candidate deep-link chip (arrives via ?candidate=<id> from the
                candidate activity board). Dismiss to see everyone. */}
            {filterCandidate !== "ALL" && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/10 text-[11px] font-bold text-accent">
                <span className="truncate">
                  Filtered: {filteredCandidateName ?? "candidate"}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterCandidate("ALL")}
                  className="shrink-0 hover:text-fg transition-colors cursor-pointer"
                  title="Clear candidate filter"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className={`space-y-2 overflow-y-auto pr-1 scrollbar-thin ${density === "compact" ? "max-h-[68vh]" : "max-h-[600px]"}`}>
            {processedSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-8 text-center text-xs text-muted">
                No matching candidate sessions found. {search || filterStatus !== "ALL" || filterBatch !== "ALL" ? "Try clearing filters." : ""}
              </div>
            ) : (
              processedSessions.map((session) => {
                const isSelected = session.id === selectedSessionId;
                const isCompleted = session.status === "COMPLETED";
                const isActive = session.status === "ACTIVE";

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`rounded-2xl border cursor-pointer transition-all flex flex-col relative overflow-hidden ${density === "compact" ? "p-3 gap-2" : "p-4 gap-3"} ${
                      isSelected
                        ? "bg-surface/90 border-accent/50 shadow-md shadow-accent/5"
                        : "bg-surface border-border/40 hover:bg-surface/30 hover:border-border"
                    }`}
                  >
                    {isSelected && isCompleted && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                    )}

                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="font-bold text-xs text-fg flex items-center gap-1.5">
                          {session.candidateName}
                          {getCandidateBadge(session)}
                        </div>
                        <div className="text-[10px] text-muted/70 mt-0.5 font-mono">{session.candidateEmail}</div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border tracking-wider ${
                            isCompleted
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : isActive
                              ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                              : "text-muted bg-bg border-border"
                          }`}
                        >
                          {session.status}
                        </span>

                        {isCompleted && (
                          <span
                            className={`text-sm font-black tracking-tight ${
                              (session.score ?? 0) >= 80
                                ? "text-emerald-400"
                                : (session.score ?? 0) >= 60
                                ? "text-amber-400"
                                : "text-rose-500"
                            }`}
                          >
                            {session.score}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/40 pt-2 mt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-fg shrink-0">{session.positionTitle}</span>
                        <span className="text-muted/30">•</span>
                        <span className="truncate">
                          {session.rounds.length > 0
                            ? `${session.rounds.length} round${session.rounds.length === 1 ? "" : "s"}`
                            : templateLabelById[session.templateId] || session.templateId}
                        </span>
                        {session.batchTitle && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-wider shrink-0">
                            batch
                          </span>
                        )}
                      </div>

                      {canCreate && (
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="text-muted hover:text-rose-500 transition p-1 rounded-md hover:bg-rose-500/5 shrink-0"
                          title="Delete session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {pagination.totalPages > 1 && (
            <PaginationFooter info={pagination} workspaceSlug={workspaceSlug} />
          )}
        </div>

        <div className="lg:col-span-7">
          {activeSession ? (
            <div className="rounded-3xl border border-border bg-surface p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-5 gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-accent tracking-widest block">Candidate Screening Profile</span>
                  <h2 className="text-xl font-black text-fg mt-0.5">{activeSession.candidateName}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted mt-1.5 flex-wrap">
                    <span className="font-bold text-fg">{activeSession.positionTitle}</span>
                    <span className="text-muted/30">•</span>
                    <span className="font-mono">{activeSession.candidateEmail}</span>
                    <span className="text-muted/30">•</span>
                    <span
                      className="tabular-nums"
                      title="Accumulated time the candidate spent in the interview workspace"
                    >
                      ⏱ {formatMinutes(activeSession.timeSpentSec)} spent
                      {activeSession.extensionPolicy.extraMinutes > 0 && (
                        <> · +{activeSession.extensionPolicy.extraMinutes}m extended</>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <Link
                    href={`/ai-interview/${activeSession.inviteToken}`}
                    target="_blank"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border hover:bg-elevated text-xs font-bold transition text-fg"
                  >
                    <span>View Workpad</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Time-extension policy — recruiter decides how many times and
                  how many minutes the candidate may self-extend. */}
              {activeSession.status !== "COMPLETED" && (
                <ExtensionPolicyEditor session={activeSession} workspaceSlug={workspaceSlug} />
              )}

              {activeSession.status === "COMPLETED" ? (
                <div className="space-y-6">
                  {/* 2/2 split — the old 1/3 starved the score tile and forced
                      its badges into vertical letter-stacks. */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="md:col-span-2 p-4 rounded-2xl bg-bg border border-border text-center flex flex-col justify-center items-center h-full min-w-0 relative">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-black uppercase text-muted tracking-wider">Composite Score</span>
                        <button
                          type="button"
                          onClick={() => setShowBenchmark(true)}
                          className="w-5 h-5 rounded-full bg-muted/10 hover:bg-accent/20 border border-border/40 flex items-center justify-center text-muted hover:text-accent transition"
                          title="How is score calculated? — benchmark"
                          aria-label="Scoring benchmark"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                      <div
                        className={`text-4xl font-black tracking-tight ${
                          (activeSession.score ?? 0) >= 80
                            ? "text-emerald-400"
                            : (activeSession.score ?? 0) >= 60
                            ? "text-amber-400"
                            : "text-rose-500"
                        }`}
                      >
                        {activeSession.score}%
                      </div>
                      <span className="text-[9px] text-muted/60 mt-1 block">AI Weighted Rubric</span>
                      {(() => {
                        const v = getScreeningVerdict(activeSession.score);
                        return v ? (
                          <span
                            className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${v.className}`}
                            title={v.guidance}
                          >
                            {v.label}
                          </span>
                        ) : null;
                      })()}
                      {activeSession.aiSuspicionScore !== null && (
                        <SuspicionBadge score={activeSession.aiSuspicionScore} />
                      )}
                      {activeSession.outboundCallCount > 0 && (
                        <span
                          className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                          title="Number of times the AI interviewer called into an external MCP server during this screening"
                        >
                          <Plug className="w-2.5 h-2.5" />
                          External MCP × {activeSession.outboundCallCount}
                        </span>
                      )}
                    </div>

                    <div className="md:col-span-3 space-y-3.5 bg-bg/40 border border-border p-4 rounded-2xl min-w-0">
                      <RatingBar
                        icon={<FileCode className="w-3.5 h-3.5" />}
                        label="Code Architecture"
                        value={activeSession.ratings.CodeQuality}
                        color="bg-violet-500"
                      />
                      <RatingBar
                        icon={<Cpu className="w-3.5 h-3.5" />}
                        label="Problem Solving & logic"
                        value={activeSession.ratings.ProblemSolving}
                        color="bg-accent"
                      />
                      <RatingBar
                        icon={<Bot className="w-3.5 h-3.5" />}
                        label="Conversational telemetry"
                        value={activeSession.ratings.Communication}
                        color="bg-emerald-400"
                      />
                    </div>
                  </div>

                  {showBenchmark && (
                    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBenchmark(false)}>
                      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-bg/50 flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-accent" /> Scoring Benchmark
                          </h3>
                          <button onClick={() => setShowBenchmark(false)} className="p-1 rounded-md hover:bg-elevated text-muted hover:text-fg"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                          <p className="text-[11px] leading-relaxed text-muted">
                            Score is <span className="font-bold text-fg">candidate-authored diff only</span> — boilerplate (`/package.json` auto-format, Sandpack base) and untouched starter are ignored. `5%` = started but wrote `0` meaningful lines (not an error).
                          </p>
                          <div className="rounded-xl border border-border overflow-hidden">
                            <div className="grid grid-cols-12 gap-0 bg-bg/80 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-muted">
                              <span className="col-span-5">Candidate action</span>
                              <span className="col-span-3 text-center">Score</span>
                              <span className="col-span-4 text-right">Signal</span>
                            </div>
                            {[
                              ["Immediate submit — 0 lines", "5%", "No code authored"],
                              ["1 meaningful line (trivial)", "7%", "e.g. const x=1;"],
                              ["2 lines", "9%", "Still trivial"],
                              ["3–4 lines", "10–16%", "Low effort"],
                              ["5–9 lines", "18–34%", "Partial"],
                              ["10–15 lines + logic", "35–58%", "Solid slice"],
                              ["16+ lines + task signals", "60–100%", "Strong/Good fit"],
                            ].map(([action, score, signal]) => (
                              <div key={action} className="grid grid-cols-12 gap-0 px-3 py-2.5 text-[11px] border-t border-border/40 items-center">
                                <span className="col-span-5 text-fg font-medium">{action}</span>
                                <span className={`col-span-3 text-center font-black ${score.startsWith("5") || score.startsWith("7") || score.startsWith("9") ? "text-rose-400" : score.includes("16") || score.includes("34") ? "text-amber-400" : "text-emerald-400"}`}>{score}</span>
                                <span className="col-span-4 text-right text-muted text-[10px]">{signal}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-fg">Rubric (5-point each, capped by effort)</h4>
                            <ul className="text-[11px] leading-relaxed text-muted space-y-1 list-disc pl-4">
                              <li><span className="font-bold text-fg">Code Architecture</span> — React hooks, file structure, signal gates (`useState` needs ≥3 lines, `slice` ≥6)</li>
                              <li><span className="font-bold text-fg">Problem Solving</span> — task signals (pagination `slice`, stack `push/pop`, memo `cache`) + meaningful line tiers</li>
                              <li><span className="font-bold text-fg">Conversational telemetry</span> — chat turns, but capped: `1 line` caps at `2/5` even if chatty</li>
                              <li className="text-muted/70">`package.json` / boilerplate never counts — only code files (`/App.js`, `/components/*`, etc.)</li>
                            </ul>
                          </div>
                          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[10px] leading-relaxed text-amber-200">
                            <span className="font-black uppercase tracking-wider text-amber-300">For founders:</span> `5%` = verified zero contribution — quick filter `NOT A FIT`. Use `DIFF VS STARTER` to audit exactly what was written. Real hire bar is `60%+` (`GOOD FIT`).
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSession.rounds.length > 0 && (
                    <RoundBreakdown rounds={activeSession.rounds} />
                  )}

                  {activeSession.aiSummary && (
                    <div className="space-y-3 bg-panel/40 border border-border p-5 rounded-2xl">
                      <h3 className="text-xs font-black uppercase text-accent tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> AI Grading Rubrics Summary
                      </h3>
                      <div className="divide-y divide-border/40 text-xs leading-relaxed space-y-3">
                        <div className="whitespace-pre-line text-muted pt-1">
                          {activeSession.aiSummary.split("\n").map((line, idx) => {
                            const isStrength = line.startsWith("+");
                            const isFlaw = line.startsWith("-");
                            return (
                              <div key={idx} className="flex gap-2 py-1 items-start">
                                {isStrength ? (
                                  <span className="text-emerald-400 font-extrabold shrink-0">✔</span>
                                ) : isFlaw ? (
                                  <span className="text-rose-500 font-extrabold shrink-0">✘</span>
                                ) : (
                                  <span className="text-indigo-400 shrink-0">•</span>
                                )}
                                <span>{line.replace(/^([+-]\s*\[.*?\]|[+-])/g, "").trim()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {activeSession.chatHistory.length > 0 && (
                      <details className="rounded-2xl border border-border bg-bg overflow-hidden group">
                        <summary className="px-5 py-3 cursor-pointer flex items-center justify-between bg-elevated/30 hover:bg-elevated/50 transition list-none">
                          <span className="text-xs font-bold text-fg flex items-center gap-2">
                            <Bot className="w-4 h-4 text-accent" /> Review Candidate Interview Chat Logs ({activeSession.chatHistory.length})
                          </span>
                          <span className="text-[10px] text-muted group-open:rotate-90 transition">❯</span>
                        </summary>
                        <div className="p-4 border-t border-border bg-surface max-h-[350px] overflow-y-auto space-y-3">
                          {activeSession.chatHistory.map((chat, idx) => {
                            const isAI = chat.role === "assistant";
                            return (
                              <div key={idx} className={`flex gap-2.5 items-start ${isAI ? "" : "flex-row-reverse"}`}>
                                <div
                                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    isAI ? "bg-accent/15 text-accent" : "bg-border text-muted"
                                  }`}
                                >
                                  {isAI ? "AI" : "C"}
                                </div>
                                <div
                                  className={`p-3 rounded-xl border text-[11px] max-w-[80%] leading-relaxed ${
                                    isAI
                                      ? "bg-surface border-border text-fg"
                                      : "bg-bg border-border/40 text-muted"
                                  }`}
                                >
                                  <div className="whitespace-pre-line">{chat.text}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}

                    {Object.keys(activeSession.filesJson).length > 0 && (
                      <SubmittedWorkReview session={activeSession} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-bg p-8 text-center flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/25 rounded-full flex items-center justify-center text-amber-400">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-fg uppercase tracking-wider">Candidate Screening Pending</h4>
                    <p className="text-xs text-muted max-w-sm">
                      The workspace invitation is generated. As soon as the candidate enters the workpad workspace and submits, their scoring metrics will appear here instantly. <span className="text-amber-300">1 credit is charged on the candidate&apos;s first message.</span>
                    </p>
                  </div>

                  <div className="p-3 bg-surface border border-border rounded-xl text-left w-full max-w-sm space-y-1">
                    <span className="text-[9px] font-black uppercase text-accent tracking-widest block">Target Test Scaffold</span>
                    <span className="text-xs font-bold text-fg block">
                      {templateLabelById[activeSession.templateId] || activeSession.templateId}
                    </span>
                    <span className="text-[10px] text-muted block mt-1">
                      Link: <span className="font-mono text-fg select-all break-all">{typeof window !== "undefined" ? `${window.location.origin}/ai-interview/${activeSession.inviteToken}` : ""}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const origin = typeof window !== "undefined" ? window.location.origin : "";
                      copyToClipboard(`${origin}/ai-interview/${activeSession.inviteToken}`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Invitation Link</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center text-xs text-muted flex flex-col justify-center items-center h-full min-h-[400px]">
              Select a candidate from the recruitment pipeline list to view their scorecard diagnostic and AI evaluation profiles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Per-template external MCP server bindings. Rendered inside each custom
 * template's row in the Templates modal. Checking a box binds the server
 * via TemplateExternalMcp; unchecking deletes the row.
 *
 * The third gate (workspace.allowExternalMcp) is visualized here — when
 * disabled, the section is dimmed with a "kill-switch off" note. This is
 * deliberately not hidden: admins still see the bindings they've configured
 * and can prepare; they just need to flip the workspace switch to activate.
 */
function TemplateBindings({
  workspaceSlug,
  template,
  availableServers,
  workspaceAllowExternalMcp,
  onChange,
}: {
  workspaceSlug: string;
  template: TemplateChoice;
  availableServers: ExternalMcpServerOption[];
  workspaceAllowExternalMcp: boolean;
  onChange: (boundIds: string[]) => void;
}) {
  // Local bound-set so the checkbox toggle feels instant; reconciled with
  // server state when the action resolves.
  const [boundSet, setBoundSet] = useState<Set<string>>(
    new Set(template.boundExternalMcpServerIds)
  );

  const toggle = async (serverId: string, nextChecked: boolean) => {
    // Optimistic update — flip locally, fire action, roll back on error.
    const before = new Set(boundSet);
    const next = new Set(boundSet);
    if (nextChecked) next.add(serverId);
    else next.delete(serverId);
    setBoundSet(next);
    onChange(Array.from(next));

    try {
      if (nextChecked) {
        await bindExternalMcpToTemplateAction(workspaceSlug, template.id, serverId);
      } else {
        await unbindExternalMcpFromTemplateAction(workspaceSlug, template.id, serverId);
      }
    } catch (err) {
      // Roll back so the UI never lies about persisted state.
      setBoundSet(before);
      onChange(Array.from(before));
      toast.error(err instanceof Error ? err.message : "Binding update failed.");
    }
  };

  if (availableServers.length === 0) {
    return (
      <div className="text-[10px] text-muted/60 italic px-2 py-1.5 rounded-md border border-dashed border-border/40">
        <Plug className="w-3 h-3 inline mr-1" />
        No external MCP servers configured. Add and enable one on the{" "}
        <Link
          href={`/w/${workspaceSlug}/external-mcp`}
          target="_blank"
          className="underline underline-offset-2 hover:text-fg"
        >
          External MCP
        </Link>{" "}
        page to bind it here.
      </div>
    );
  }

  return (
    <div
      className={`space-y-1.5 ${workspaceAllowExternalMcp ? "" : "opacity-60"}`}
    >
      <div className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
        <Plug className="w-3 h-3" />
        External MCP bindings
        {!workspaceAllowExternalMcp && (
          <span
            className="inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[8px] font-bold normal-case tracking-normal"
            title="Workspace kill-switch is off — bindings exist but no outbound calls will happen until you enable it."
          >
            <ShieldAlert className="w-2.5 h-2.5" />
            kill-switch off
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {availableServers.map((s) => {
          const isBound = boundSet.has(s.id);
          return (
            <label
              key={s.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-[11px] cursor-pointer transition ${
                isBound
                  ? "border-accent/40 bg-accent/[0.06] text-fg"
                  : "border-border bg-surface text-muted hover:text-fg"
              }`}
            >
              <input
                type="checkbox"
                checked={isBound}
                onChange={(e) => toggle(s.id, e.target.checked)}
                className="accent-accent"
              />
              <span className="truncate font-medium">{s.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CustomTemplatesModal({
  workspaceSlug,
  templates,
  availableExternalMcpServers,
  workspaceAllowExternalMcp,
  onClose,
  onChange,
}: {
  workspaceSlug: string;
  templates: TemplateChoice[];
  availableExternalMcpServers: ExternalMcpServerOption[];
  workspaceAllowExternalMcp: boolean;
  onClose: () => void;
  onChange: (next: TemplateChoice[]) => void;
}) {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [isPending, startTransition] = useTransition();

  // Form state for the create mode.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("30");
  const [starterFilesJson, setStarterFilesJson] = useState(
    `{\n  "/App.js": "// candidate starts here\\nexport default function App() { return null; }\\n"\n}`
  );
  const [testsCode, setTestsCode] = useState("");
  const [kind, setKind] = useState<"frontend" | "backend" | "dsa">("frontend");
  const [language, setLanguage] = useState("python");
  const [frameworkLabel, setFrameworkLabel] = useState("");

  const customs = templates.filter((t) => t.custom);
  const builtins = templates.filter((t) => !t.custom);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await createCustomTemplateAction(workspaceSlug, {
          title,
          description,
          estimatedMinutes: Number(estimatedMinutes),
          starterFilesJson,
          testsCode,
          kind,
          language: kind === "frontend" ? undefined : language,
          frameworkLabel: frameworkLabel || undefined,
        });
        // Optimistic add — server returns new id.
        onChange([
          {
            id: res.id,
            title,
            description,
            estimatedMinutes: Number(estimatedMinutes),
            custom: true,
            boundExternalMcpServerIds: [],
          },
          ...templates,
        ]);
        toast.success(`Template "${title}" created.`);
        // Reset and return to list.
        setTitle("");
        setDescription("");
        setEstimatedMinutes("30");
        setStarterFilesJson(`{\n  "/App.js": "// candidate starts here\\nexport default function App() { return null; }\\n"\n}`);
        setTestsCode("");
        setKind("frontend");
        setLanguage("python");
        setFrameworkLabel("");
        setMode("list");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create template.");
      }
    });
  };

  const handleDelete = async (id: string, deleteTitle: string) => {
    if (!confirm(`Delete custom template "${deleteTitle}"? Existing sessions using it remain unaffected.`)) return;
    try {
      await deleteCustomTemplateAction(workspaceSlug, id);
      onChange(templates.filter((t) => t.id !== id));
      toast.success("Template deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-surface border border-border rounded-3xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
              <FileCode className="w-4 h-4 text-violet-400" /> Screening Templates
            </h3>
            <p className="text-[11px] text-muted/70 mt-1">
              Custom templates layer on top of the builtins. Candidates see exactly what you author.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-elevated text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === "list" ? (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Workspace customs ({customs.length})</span>
                <button
                  onClick={() => setMode("create")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 text-accent border border-accent/25 hover:bg-accent/20 text-[10px] font-bold uppercase tracking-wider transition"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              {customs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-bg p-5 text-center text-xs text-muted">
                  No custom templates yet. Builtins will be used until you add one.
                </div>
              ) : (
                <div className="space-y-2">
                  {customs.map((t) => (
                    <div key={t.id} className="rounded-xl border border-border bg-bg p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-fg truncate">{t.title}</div>
                          <div className="text-[10px] text-muted/70 truncate">{t.description}</div>
                          <div className="text-[9px] text-muted/50 font-mono mt-1">{t.estimatedMinutes} min</div>
                        </div>
                        <button
                          onClick={() => handleDelete(t.id, t.title)}
                          className="p-1.5 rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <TemplateBindings
                        workspaceSlug={workspaceSlug}
                        template={t}
                        availableServers={availableExternalMcpServers}
                        workspaceAllowExternalMcp={workspaceAllowExternalMcp}
                        onChange={(boundIds) => {
                          // Update local state so the UI reflects toggles
                          // without a full re-fetch.
                          onChange(
                            templates.map((row) =>
                              row.id === t.id
                                ? { ...row, boundExternalMcpServerIds: boundIds }
                                : row
                            )
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Builtins ({builtins.length})</div>
              <div className="space-y-1">
                {builtins.map((t) => (
                  <div key={t.id} className="px-3 py-2 rounded-lg border border-border/40 bg-bg/40 text-[11px] flex items-center justify-between">
                    <span className="text-fg font-medium truncate">{t.title}</span>
                    <span className="text-muted/60 font-mono text-[9px] shrink-0">{t.estimatedMinutes}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode("list")}
              className="text-[10px] font-bold text-muted hover:text-fg uppercase tracking-wider"
            >
              ← Back to list
            </button>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={80}
                placeholder="e.g. Vue 3 Composition API drag-drop"
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
                Description (shown to candidate as the AI Interviewer&apos;s framing)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Estimated minutes</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg tabular-nums focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Surface</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "frontend" | "backend" | "dsa")}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
                >
                  <option value="frontend">Frontend (Sandpack)</option>
                  <option value="backend">Backend (console)</option>
                  <option value="dsa">DSA (console)</option>
                </select>
              </div>
            </div>

            {kind !== "frontend" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
                  >
                    {["node", "typescript", "python", "go", "java", "cpp", "rust"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
                    Framework label <span className="font-normal normal-case text-muted/60">(optional, not executed)</span>
                  </label>
                  <input
                    type="text"
                    value={frameworkLabel}
                    onChange={(e) => setFrameworkLabel(e.target.value)}
                    placeholder="e.g. Express, Django"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
                Starter files (JSON map of path → code)
              </label>
              <textarea
                value={starterFilesJson}
                onChange={(e) => setStarterFilesJson(e.target.value)}
                required
                rows={6}
                spellCheck={false}
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-[10px] font-mono text-fg focus:outline-none focus:border-accent"
              />
              <div className="text-[10px] text-muted/60">Paths must begin with /. Example: <code className="text-fg">{"\"{ \"/App.js\": \"...\" }\""}</code></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
                Grader hints (free-text scoring guidance for the AI grader)
              </label>
              <textarea
                value={testsCode}
                onChange={(e) => setTestsCode(e.target.value)}
                rows={3}
                placeholder="e.g. Look for proper composition API usage, drag/drop events, list mutation."
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-[11px] text-fg focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setMode("list")}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted hover:text-fg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Template"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

function PaginationFooter({
  info,
  workspaceSlug,
}: {
  info: PaginationInfo;
  workspaceSlug: string;
}) {
  const { page, totalPages, totalSessions, pageSize } = info;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalSessions);
  const base = `/w/${workspaceSlug}/ai-interviews`;
  return (
    <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-muted">
      <span className="tabular-nums">
        Showing {first}–{last} of {totalSessions}
      </span>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={page === 2 ? base : `${base}?page=${page - 1}`}
            className="px-2 py-1 rounded-md border border-border hover:bg-elevated text-fg font-bold"
          >
            ← Prev
          </Link>
        ) : (
          <span className="px-2 py-1 rounded-md border border-border/40 text-muted/40">← Prev</span>
        )}
        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={`${base}?page=${page + 1}`}
            className="px-2 py-1 rounded-md border border-border hover:bg-elevated text-fg font-bold"
          >
            Next →
          </Link>
        ) : (
          <span className="px-2 py-1 rounded-md border border-border/40 text-muted/40">Next →</span>
        )}
      </div>
    </div>
  );
}

function SuspicionBadge({ score }: { score: number }) {
  const tier =
    score >= 60 ? "high" : score >= 30 ? "med" : "low";
  const cls = {
    high: "text-rose-300 bg-rose-500/15 border-rose-500/35",
    med: "text-amber-300 bg-amber-500/15 border-amber-500/30",
    low: "text-emerald-300/80 bg-emerald-500/10 border-emerald-500/25",
  }[tier];
  // Short labels — the long forms wrapped into vertical letter-stacks inside
  // the narrow composite-score tile.
  const label = {
    high: "Cheat risk",
    med: "Flags",
    low: "Clean",
  }[tier];
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border whitespace-nowrap max-w-full ${cls}`}
      title={`Integrity suspicion: ${score}/100 (heuristic from paste/blur events)`}
    >
      {label}
      <span className="tabular-nums opacity-70">{score}</span>
    </span>
  );
}

function RatingBar({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-muted flex items-center gap-1">{icon} {label}</span>
        <span className="text-fg">{value} / 5</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );
}

/** Per-round scorecard breakdown shown in a completed multi-round session. */
function RoundBreakdown({ rounds }: { rounds: RoundSummary[] }) {
  const label = (r: RoundSummary) => {
    const p = r.paradigm.charAt(0).toUpperCase() + r.paradigm.slice(1);
    const tech = r.language || r.frameworkLabel;
    return tech ? `${p} · ${tech}` : p;
  };
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-black uppercase text-accent tracking-widest flex items-center gap-1.5">
        <Layers className="w-4 h-4" /> Round breakdown ({rounds.length})
      </h3>
      <div className="space-y-1.5">
        {rounds.map((r, i) => {
          const fileCount = Object.keys(r.filesJson).length;
          return (
            <details key={r.id} className="rounded-xl border border-border bg-bg overflow-hidden group">
              <summary className="px-4 py-2.5 cursor-pointer flex items-center gap-3 list-none hover:bg-elevated/30">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-accent/10 text-accent text-[10px] font-black shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-fg truncate">{label(r)}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted/70">
                    {r.status} · {fileCount} file{fileCount === 1 ? "" : "s"}
                  </div>
                </div>
                {r.score != null && (
                  <span
                    className={`text-sm font-black ${
                      r.score >= 80 ? "text-emerald-400" : r.score >= 60 ? "text-amber-400" : "text-rose-500"
                    }`}
                  >
                    {r.score}%
                  </span>
                )}
                <span className="text-[10px] text-muted group-open:rotate-90 transition shrink-0">❯</span>
              </summary>
              <div className="p-3 border-t border-border bg-surface space-y-3">
                {r.ratings && (
                  <div className="grid grid-cols-3 gap-2">
                    <RoundStat label="Code" value={r.ratings.CodeQuality} />
                    <RoundStat label="Problem" value={r.ratings.ProblemSolving} />
                    <RoundStat label="Comm" value={r.ratings.Communication} />
                  </div>
                )}
                {fileCount === 0 ? (
                  <p className="text-[10px] text-muted/50">No files submitted for this round.</p>
                ) : (
                  Object.entries(r.filesJson).map(([path, code]) => (
                    <div key={path} className="space-y-1">
                      <div className="text-[10px] font-mono font-bold text-fg bg-bg px-2 py-1 rounded border border-border">
                        {path}
                      </div>
                      <pre className="text-[10px] font-mono text-muted/90 bg-bg/80 p-2 overflow-x-auto leading-relaxed rounded max-h-[180px] border border-border/20">
                        {code || "(empty)"}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function RoundStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-bg border border-border px-2 py-1.5 text-center">
      <div className="text-[8px] uppercase tracking-wider text-muted">{label}</div>
      <div className="text-xs font-black text-fg">{value}/5</div>
    </div>
  );
}

function BuyCreditsModal({
  packs,
  purchasingPackId,
  onPick,
  onClose,
}: {
  packs: typeof AI_CREDIT_PACKS;
  purchasingPackId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface border border-border rounded-3xl p-6 space-y-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" /> Buy AI Screening Credits
            </h3>
            <p className="text-[11px] text-muted/70 mt-1">Credits never expire. 1 credit covers one completed screening.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-elevated text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packs.map((pack) => {
            const isLoading = purchasingPackId === pack.id;
            const perCredit = pack.priceCents / pack.credits / 100;
            const featured = "badge" in pack && pack.badge;
            return (
              <div
                key={pack.id}
                className={`rounded-2xl border p-5 flex flex-col gap-4 relative ${
                  featured
                    ? "border-accent/50 bg-surface/80 shadow-md shadow-accent/5"
                    : "border-border bg-bg"
                }`}
              >
                {featured && (
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent text-bg">
                    {pack.badge}
                  </span>
                )}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">{pack.label}</div>
                  <div className="text-3xl font-black text-fg tabular-nums mt-1">
                    {pack.credits}
                    <span className="text-xs text-muted/70 font-bold ml-1">credits</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xl font-black text-fg tabular-nums">
                    ${(pack.priceCents / 100).toFixed(0)}
                  </div>
                  <div className="text-[10px] text-muted/70">
                    ≈ ${perCredit.toFixed(2)} / screening
                  </div>
                </div>
                <button
                  onClick={() => onPick(pack.id)}
                  disabled={!!purchasingPackId}
                  className={`mt-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition disabled:opacity-50 ${
                    featured
                      ? "bg-accent text-bg hover:bg-accent-soft"
                      : "bg-fg/10 text-fg border border-border hover:bg-fg/15"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    `Buy ${pack.label}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted/60 text-center leading-relaxed">
          Secure checkout via Stripe. Only workspace owners and admins can purchase.
        </p>
      </div>
    </div>,
    document.body
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/** Compact human duration for the time-spent readout. */
function formatMinutes(sec: number | null | undefined): string {
  const m = Math.max(0, Math.round((sec ?? 0) / 60));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * Recruiter review surface for a candidate's submitted workspace.
 *
 * Three views:
 *   - Diff (default): starter-vs-submitted unified diff — shows EXACTLY what
 *     the candidate authored. Mirrors what the grader consumed, so the score
 *     is auditable against visible changes.
 *   - Code: raw final files (legacy view).
 *   - Run: live Sandpack execution of the submitted code.
 */
function SubmittedWorkReview({ session }: { session: RecruiterSession }) {
  const [view, setView] = useState<"diff" | "code" | "run">("diff");
  const diffs = session.fileDiffs;
  const stats = session.changeStats;
  const hasDiffData = !!diffs && diffs.length > 0;

  return (
    <details className="rounded-2xl border border-border bg-bg overflow-hidden group" open>
      <summary className="px-5 py-3 cursor-pointer flex items-center justify-between bg-elevated/30 hover:bg-elevated/50 transition list-none">
        <span className="text-xs font-bold text-fg flex items-center gap-2">
          <FileCode className="w-4 h-4 text-violet-400" />
          Review Submitted Workspace Files ({Object.keys(session.filesJson).length})
          {stats && stats.filesChanged > 0 && (
            <span
              className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${
                stats.addedLines === 0
                  ? "text-rose-400 bg-rose-500/[0.08] border-rose-500/25"
                  : "text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/25"
              }`}
            >
              {stats.filesChanged} changed · +{stats.addedLines} −{stats.removedLines}
            </span>
          )}
          {stats && stats.filesChanged === 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/[0.08] border-rose-500/25">
              No code written
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted group-open:rotate-90 transition">❯</span>
      </summary>

      {/* View toggle */}
      <div className="px-4 pt-3 flex items-center gap-1.5 border-t border-border bg-surface">
        {([
          { key: "diff", label: `Diff vs starter${hasDiffData ? "" : " (n/a)"}`, disabled: !hasDiffData },
          { key: "code", label: "Final code", disabled: false },
          { key: "run", label: "Run it", disabled: false },
        ] as const).map(({ key, label, disabled }) => (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && setView(key)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition cursor-pointer ${
              view === key
                ? "bg-accent/15 border-accent/40 text-accent"
                : disabled
                ? "bg-bg border-border/30 text-muted/30 cursor-not-allowed"
                : "bg-bg border-border/40 text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-surface max-h-[480px] overflow-y-auto space-y-4">
        {view === "run" ? (
          <RunPreview files={session.filesJson} />
        ) : view === "code" ? (
          Object.entries(session.filesJson).map(([path, code]) => (
            <div key={path} className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-fg bg-bg px-3 py-1.5 rounded-lg border border-border flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
                  {path}
                </span>
                <span className="text-muted/65 text-[9px]">{code.split(/\r?\n/).length} lines</span>
              </div>
              <pre className="text-[10px] font-mono text-muted/90 bg-bg/80 p-3 overflow-x-auto leading-relaxed rounded-xl max-h-[260px] border border-border/20">
                {code || "(empty)"}
              </pre>
            </div>
          ))
        ) : hasDiffData ? (
          <>
            {stats && (
              <p className="text-[11px] text-muted">
                Candidate changes vs starter template:{" "}
                <span className="font-bold text-fg">{stats.filesChanged}</span> file(s) changed,{" "}
                <span className="font-bold text-emerald-400">+{stats.addedLines}</span> /{" "}
                <span className="font-bold text-rose-400">−{stats.removedLines}</span> lines. Grading
                is based on exactly this diff.
              </p>
            )}
            {(diffs ?? [])
              .filter((d) => d.added.length > 0 || d.removed.length > 0)
              .map((d) => (
                <FileDiffCard key={d.path} diff={d} />
              ))}
          </>
        ) : (
          <p className="text-xs text-muted p-4 text-center">
            Starter template unknown for this session — showing raw files instead. Use the
            &ldquo;Final code&rdquo; view.
          </p>
        )}
      </div>
    </details>
  );
}

/** One file's colored unified diff. */
function FileDiffCard({ diff }: { diff: FileDiff }) {
  const MAX_LINES = 200;

  if (diff.isDeleted) {
    return (
      <div className="space-y-1.5">
        <div className="text-[10px] font-mono font-bold text-rose-400 bg-bg px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5" /> {diff.path}
          <span className="ml-auto text-[9px] uppercase tracking-wider">deleted by candidate</span>
        </div>
      </div>
    );
  }

  const lines: { sign: "+" | "-" | " "; text: string }[] = [];
  if (diff.isNew) {
    for (const l of diff.added.slice(0, MAX_LINES)) lines.push({ sign: "+", text: l });
  } else {
    // Interleave removed then added per file (simple unified order).
    for (const l of diff.removed.slice(0, MAX_LINES)) lines.push({ sign: "-", text: l });
    for (const l of diff.added.slice(0, MAX_LINES)) lines.push({ sign: "+", text: l });
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-mono font-bold text-fg bg-bg px-3 py-1.5 rounded-lg border border-border flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <FolderOpen className={`w-3.5 h-3.5 ${diff.isNew ? "text-emerald-400" : "text-violet-400"}`} />
          {diff.path}
        </span>
        <span className="flex items-center gap-2 text-[9px]">
          {diff.isNew ? (
            <span className="text-emerald-400 font-black uppercase tracking-wider">new file</span>
          ) : (
            <>
              <span className="text-emerald-400">+{diff.added.length}</span>
              <span className="text-rose-400">−{diff.removed.length}</span>
            </>
          )}
        </span>
      </div>
      <div className="rounded-xl border border-border/20 bg-bg/80 p-3 max-h-[300px] overflow-auto">
        {lines.length === 0 ? (
          <p className="text-[10px] text-muted italic">No changes in this file.</p>
        ) : (
          <pre className="text-[10px] font-mono leading-relaxed">
            {lines.map((l, i) => (
              <div
                key={i}
                className={`px-2 py-px whitespace-pre-wrap break-all ${
                  l.sign === "+"
                    ? "bg-emerald-500/[0.08] text-emerald-300"
                    : l.sign === "-"
                    ? "bg-rose-500/[0.08] text-rose-300"
                    : "text-muted/70"
                }`}
              >
                <span className="select-none opacity-60 mr-2">{l.sign}</span>
                {l.text || " "}
              </div>
            ))}
            {((diff.isNew ? diff.added.length : diff.added.length + diff.removed.length) > MAX_LINES) && (
              <div className="px-2 pt-1 text-muted/60 italic">…[truncated]</div>
            )}
          </pre>
        )}
      </div>
    </div>
  );
}

/**
 * Recruiter control for a session's time-extension policy: how many times the
 * candidate may self-extend and how many minutes each extension grants.
 * Persists via updateExtensionPolicyAction; takes effect immediately on the
 * candidate's workspace.
 */
function ExtensionPolicyEditor({
  session,
  workspaceSlug,
}: {
  session: RecruiterSession;
  workspaceSlug: string;
}) {
  const [maxExt, setMaxExt] = useState(session.extensionPolicy.max);
  const [minEach, setMinEach] = useState(session.extensionPolicy.minutesEach);
  const [savedMax, setSavedMax] = useState(session.extensionPolicy.max);
  const [savedMin, setSavedMin] = useState(session.extensionPolicy.minutesEach);
  const [isPending, startTransition] = useTransition();

  const dirty = maxExt !== savedMax || minEach !== savedMin;

  const save = () => {
    startTransition(async () => {
      try {
        const res = await updateExtensionPolicyAction(workspaceSlug, {
          sessionId: session.id,
          maxExtensions: maxExt,
          extensionMinutes: minEach,
        });
        setSavedMax(res.maxExtensions);
        setSavedMin(res.extensionMinutes);
        toast.success(`Extension policy updated — candidate gets ${res.maxExtensions} × ${res.extensionMinutes}m`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update policy");
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-panel/50 p-3 flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted block">
          Candidate extensions allowed
        </span>
        <input
          type="number"
          min={0}
          max={5}
          value={maxExt}
          onChange={(e) => setMaxExt(Number(e.target.value))}
          className="w-20 px-2.5 py-1.5 rounded-lg border border-border bg-bg text-xs text-fg tabular-nums focus:outline-none focus:border-accent"
          title="How many times the candidate may extend"
        />
      </div>
      <div className="space-y-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted block">
          Minutes per extension
        </span>
        <input
          type="number"
          min={1}
          max={60}
          value={minEach}
          onChange={(e) => setMinEach(Number(e.target.value))}
          className="w-20 px-2.5 py-1.5 rounded-lg border border-border bg-bg text-xs text-fg tabular-nums focus:outline-none focus:border-accent"
          title="Minutes granted per extension"
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={!dirty || isPending}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
          dirty && !isPending
            ? "bg-accent text-bg hover:bg-accent-soft cursor-pointer"
            : "bg-surface text-muted border border-border cursor-not-allowed opacity-60"
        }`}
      >
        {isPending ? "Saving…" : dirty ? "Save policy" : "Saved"}
      </button>

      {/* Usage readout */}
      <span className="ml-auto text-[10px] font-bold text-muted tabular-nums">
        Used: {session.extensionPolicy.used}/{savedMax} · granted {session.extensionPolicy.extraMinutes}m
      </span>
    </div>
  );
}
