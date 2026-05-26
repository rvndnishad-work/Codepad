"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
  Mail,
  FolderOpen,
  Coins,
  X,
  ShoppingCart,
  Loader2,
  Plug,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAIInterviewSessionAction,
  deleteAIInterviewSessionAction,
  createCreditPackCheckoutAction,
  createCustomTemplateAction,
  deleteCustomTemplateAction,
  bindExternalMcpToTemplateAction,
  unbindExternalMcpFromTemplateAction,
} from "./actions";
import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credits";

export interface TemplateChoice {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  custom: boolean;
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

interface RecruiterSession {
  id: string;
  inviteToken: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  status: string;
  templateId: string;
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
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  totalSessions: number;
  pageSize: number;
}

interface ConsoleProps {
  workspaceSlug: string;
  initialSessions: RecruiterSession[];
  totalScreened: number;
  avgScore: number;
  credits: number;
  usedThisMonth: number;
  canCreate: boolean;
  templates: TemplateChoice[];
  availableExternalMcpServers: ExternalMcpServerOption[];
  workspaceAllowExternalMcp: boolean;
  pagination: PaginationInfo;
}

export default function AIInterviewRecruiterConsole({
  workspaceSlug,
  initialSessions,
  totalScreened,
  avgScore,
  credits,
  usedThisMonth,
  canCreate,
  templates,
  availableExternalMcpServers,
  workspaceAllowExternalMcp,
  pagination,
}: ConsoleProps) {
  const [sessions, setSessions] = useState<RecruiterSession[]>(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessions.length > 0 ? initialSessions[0].id : null
  );
  const [templateChoices, setTemplateChoices] = useState<TemplateChoice[]>(templates);

  // Derived lookup so the candidate list and detail drawer can show readable
  // template titles regardless of whether the id refers to a builtin or a
  // custom workspace template.
  const templateLabelById = templateChoices.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.title;
    return acc;
  }, {});

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Create Invitation Invite Form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [positionTitle, setPositionTitle] = useState("React Engineer");
  const [templateId, setTemplateId] = useState(
    templates[0]?.id ?? "react-todo-pagination"
  );
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Buy-credits modal state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);

  // Custom templates manager state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const activeSession = sessions.find((s) => s.id === selectedSessionId);

  const processedSessions = sessions
    .filter((s) => {
      const matchSearch =
        s.candidateName.toLowerCase().includes(search.toLowerCase()) ||
        s.candidateEmail.toLowerCase().includes(search.toLowerCase()) ||
        s.positionTitle.toLowerCase().includes(search.toLowerCase());

      if (filterStatus === "ALL") return matchSearch;
      return s.status === filterStatus && matchSearch;
    })
    .sort((a, b) => {
      if (a.status === "COMPLETED" && b.status !== "COMPLETED") return -1;
      if (a.status !== "COMPLETED" && b.status === "COMPLETED") return 1;
      if (a.score !== b.score) return (b.score ?? 0) - (a.score ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const completedSessionsSorted = [...sessions]
    .filter((s) => s.status === "COMPLETED")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const getCandidateBadge = (session: RecruiterSession) => {
    if (session.status !== "COMPLETED") return null;
    const rankIndex = completedSessionsSorted.findIndex((s) => s.id === session.id);
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

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !candidateEmail.trim()) {
      toast.error("Please provide candidate name and email.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createAIInterviewSessionAction(workspaceSlug, {
          candidateName,
          candidateEmail,
          positionTitle,
          templateId,
        });

        if (res.success && res.session) {
          toast.success("AI invitation generated. Credit charged on first message.");

          const newSession: RecruiterSession = {
            id: res.session.id,
            inviteToken: res.session.inviteToken,
            candidateName: res.session.candidateName,
            candidateEmail: res.session.candidateEmail,
            positionTitle: res.session.positionTitle,
            status: res.session.status,
            templateId: res.session.templateId,
            score: null,
            aiSummary: null,
            aiSuspicionScore: null,
            outboundCallCount: 0,
            createdAt: res.session.createdAt,
            updatedAt: res.session.updatedAt,
            startedAt: null,
            finishedAt: null,
            chatHistory: [],
            filesJson: {},
            ratings: { CodeQuality: 0, ProblemSolving: 0, Communication: 0 },
          };

          setSessions((prev) => [newSession, ...prev]);
          setSelectedSessionId(res.session.id);

          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const linkUrl = `${origin}/ai-interview/${res.session.inviteToken}`;
          setCreatedInviteUrl(linkUrl);

          setCandidateName("");
          setCandidateEmail("");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate invite.");
      }
    });
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
                onClick={() => {
                  setShowInviteForm(!showInviteForm);
                  setCreatedInviteUrl(null);
                }}
                disabled={outOfCredits}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md flex-1 md:flex-initial text-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                title={outOfCredits ? "Workspace is out of credits" : "Generate a new invite"}
              >
                <Plus className="w-4 h-4" />
                <span>{outOfCredits ? "Out of credits" : "Generate Workpad Invite"}</span>
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

      {showInviteForm && canCreate && !outOfCredits && (
        <div className="rounded-3xl border border-indigo-500/20 bg-surface/60 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden transition-all">
          <div className="absolute top-[-100px] right-[-100px] w-52 h-52 bg-accent/5 rounded-full blur-[96px] pointer-events-none" />

          <h3 className="text-sm font-black text-fg uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-accent" /> Invite Candidate to AI Workpad
          </h3>

          <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Candidate Name</label>
              <input
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Alice Vance"
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Candidate Email</label>
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="e.g. alice@company.com"
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Position Applied</label>
              <input
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="e.g. Frontend Specialist"
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Select Coding Scaffold</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent outline-none"
              >
                {templateChoices.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}{t.custom ? " (custom)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4 flex justify-end gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-fg text-bg text-xs font-black uppercase tracking-wider hover:bg-fg/90 transition shadow active:scale-95 disabled:opacity-50"
              >
                {isPending ? "Generating Invite..." : "Generate Workspace Invitation Link"}
              </button>
            </div>
          </form>

          {createdInviteUrl && (
            <div className="mt-5 p-4 rounded-2xl bg-bg border border-accent/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-accent tracking-widest block">Workpad Link Generated</span>
                <span className="text-xs font-mono text-muted break-all">{createdInviteUrl}</span>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => copyToClipboard(createdInviteUrl)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold transition"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <Link
                  href={createdInviteUrl.replace(typeof window !== "undefined" ? window.location.origin : "", "")}
                  target="_blank"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-surface text-xs font-bold transition text-fg"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Test Link
                </Link>
              </div>
            </div>
          )}
        </div>
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
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate name, email, role..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-1.5">
              {["ALL", "COMPLETED", "ACTIVE", "PENDING"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                    filterStatus === status
                      ? "bg-accent/15 border-accent/30 text-accent"
                      : "bg-bg border-border/40 text-muted hover:text-fg"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {processedSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-8 text-center text-xs text-muted">
                No matching candidate sessions found.
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
                    className={`rounded-2xl border p-4 cursor-pointer transition-all flex flex-col gap-3 relative overflow-hidden ${
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
                        <span className="truncate">{templateLabelById[session.templateId] || session.templateId}</span>
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

              {activeSession.status === "COMPLETED" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="md:col-span-1 p-4 rounded-2xl bg-bg border border-border text-center flex flex-col justify-center items-center h-full">
                      <div className="text-[10px] font-black uppercase text-muted tracking-wider mb-2">Composite Score</div>
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

                    <div className="md:col-span-3 space-y-3.5 bg-bg/40 border border-border p-4 rounded-2xl">
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
                      <details className="rounded-2xl border border-border bg-bg overflow-hidden group">
                        <summary className="px-5 py-3 cursor-pointer flex items-center justify-between bg-elevated/30 hover:bg-elevated/50 transition list-none">
                          <span className="text-xs font-bold text-fg flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-violet-400" /> Review Submitted Workspace Files ({Object.keys(activeSession.filesJson).length})
                          </span>
                          <span className="text-[10px] text-muted group-open:rotate-90 transition">❯</span>
                        </summary>
                        <div className="p-4 border-t border-border bg-surface max-h-[400px] overflow-y-auto space-y-4">
                          {Object.entries(activeSession.filesJson).map(([path, code]) => (
                            <div key={path} className="space-y-1.5">
                              <div className="text-[10px] font-mono font-bold text-fg bg-bg px-3 py-1.5 rounded-lg border border-border flex justify-between items-center">
                                <span className="flex items-center gap-1.5">
                                  <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
                                  {path}
                                </span>
                                <span className="text-muted/65 text-[9px]">{code.split(/\r?\n/).length} lines</span>
                              </div>
                              <pre className="text-[10px] font-mono text-muted/90 bg-bg/80 p-3 overflow-x-auto leading-relaxed rounded-xl max-h-[220px] border border-border/20">
                                {code || "(empty)"}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </details>
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
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
                Description (shown to candidate as the AI Interviewer's framing)
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
            </div>

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
    </div>
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
  const label = {
    high: "High AI-cheat risk",
    med: "Some integrity flags",
    low: "Integrity clean",
  }[tier];
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cls}`}
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
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
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
    </div>
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
