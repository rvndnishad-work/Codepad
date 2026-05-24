"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Trophy,
  Users,
  Clock,
  Mail,
  UserPlus,
  Link2,
  Calendar,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  CreditCard,
  Trash2,
  Briefcase,
  FileVideo,
  UserCircle2,
  Play,
  Eye,
  ChevronRight,
  Upload,
} from "lucide-react";
import AddCandidateDialog from "./AddCandidateDialog";
import BulkAddCandidatesDialog from "./BulkAddCandidatesDialog";

type Challenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  template: string;
  published: boolean;
};

type TakeHome = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  token: string;
  status: string;
  expiresAt: string;
  timeLimitMin: number;
  startedAt: string | null;
  submittedAt: string | null;
  challengeTitle: string;
  attemptId: string | null;
  score: number | null;
};

type Member = {
  id: string;
  role: string;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type InterviewSessionItem = {
  id: string;
  title: string;
  candidateName: string | null;
  candidateId: string | null;
  type: string;
  status: string;
  verdict: string | null;
  shortCode: string | null;
  shareToken: string;
  totalSec: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  interviewerName: string | null;
  interviewerEmail: string | null;
};

type CandidateItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  tags: string[];
  takeHomeCount: number;
  sessionCount: number;
  updatedAt: string;
  createdAt: string;
};

type Props = {
  workspace: {
    name: string;
    slug: string;
    planName: string;
  };
  challenges: Challenge[];
  takeHomes: TakeHome[];
  members: Member[];
  sessions: InterviewSessionItem[];
  candidates: CandidateItem[];
};

type TabId =
  | "challenges"
  | "interviews"
  | "take-homes"
  | "candidates"
  | "replays"
  | "members"
  | "billing"
  | "integrations";

const PLAN_BADGES: Record<string, string> = {
  FREE: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
  GROWTH: "text-indigo-600 dark:text-indigo-300 border-indigo-500/25 bg-indigo-500/[0.08]",
  ENTERPRISE: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
  LOCKED: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
};

export default function WorkspaceDashboardClient({
  workspace,
  challenges,
  takeHomes,
  members,
  sessions,
  candidates,
}: Props) {
  const router = useRouter();
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [candidateSort, setCandidateSort] = useState<"recent" | "name" | "status" | "take-homes" | "interviews">("recent");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<string>("all");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const validSections: TabId[] = ["challenges", "interviews", "take-homes", "candidates", "replays", "members", "billing", "integrations"];
  const activeTab: TabId | "overview" = (sectionParam && validSections.includes(sectionParam as TabId))
    ? (sectionParam as TabId)
    : "overview";
  
  // Lists data in state so client can append newly created ones instantly
  const [currentTakeHomes, setCurrentTakeHomes] = useState<TakeHome[]>(takeHomes);
  const [currentMembers, setCurrentMembers] = useState<Member[]>(members);
  
  // Generating Take-Home state
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState(challenges[0]?.id || "");
  const [timeLimitMin, setTimeLimitMin] = useState(60);
  const [daysToExpire, setDaysToExpire] = useState(7);
  const [generating, setGenerating] = useState(false);

  // Inviting Teammate state
  const [teammateEmail, setTeammateEmail] = useState("");
  const [teammateRole, setTeammateRole] = useState("INTERVIEWER");
  const [inviting, setInviting] = useState(false);

  // Billing Portal & Teammate Removal states
  const [billingLoading, setBillingLoading] = useState(false);

  // Integrations state hooks
  const [atsProvider, setAtsProvider] = useState<"GREENHOUSE" | "LEVER" | "ASHBY">("GREENHOUSE");
  const [atsApiKey, setAtsApiKey] = useState("");
  const [atsWebhookSecret, setAtsWebhookSecret] = useState("");
  const [atsSavedUrl, setAtsSavedUrl] = useState("");
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsActive, setAtsActive] = useState(false);

  // Scheduling state hooks
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleCandidate, setScheduleCandidate] = useState("");
  const [scheduleInterviewer, setScheduleInterviewer] = useState("");
  const [scheduleSessionId, setScheduleSessionId] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<string | null>(null);

  // Code Sandbox state hooks
  const [sandboxLang, setSandboxLang] = useState("python");
  const [sandboxCode, setSandboxCode] = useState("print('Hello from Python sandboxed container!')");
  const [sandboxInput, setSandboxInput] = useState("");
  const [sandboxOutput, setSandboxOutput] = useState("");
  const [sandboxRunning, setSandboxRunning] = useState(false);

  // Fetch integration settings on tab focus or mount
  const [fetchedIntegrations, setFetchedIntegrations] = useState(false);

  async function loadIntegrations() {
    try {
      const res = await fetch(`/api/w/${workspace.slug}/integrations`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.atsIntegration) {
        setAtsProvider(data.atsIntegration.provider);
        setAtsApiKey("••••••••••••••••••••••••"); // Obfuscated on load for safety
        setAtsWebhookSecret(data.atsIntegration.webhookSecret || "");
        setAtsActive(true);
        if (typeof window !== "undefined") {
          setAtsSavedUrl(`${window.location.origin}/api/integrations/webhooks/${data.atsIntegration.provider.toLowerCase()}?workspaceId=${data.workspaceId}`);
        }
      } else if (res.ok && data?.workspaceId) {
        if (typeof window !== "undefined") {
          setAtsSavedUrl(`${window.location.origin}/api/integrations/webhooks/greenhouse?workspaceId=${data.workspaceId}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Effect to load once
  useState(() => {
    if (!fetchedIntegrations) {
      setFetchedIntegrations(true);
      loadIntegrations();
    }
    return undefined;
  });

  function handleLangChange(lang: string) {
    setSandboxLang(lang);
    if (lang === "python") {
      setSandboxCode("print('Hello from Python sandboxed container!')");
    } else if (lang === "javascript") {
      setSandboxCode("console.log('Hello from Javascript sandboxed runtime!');");
    } else if (lang === "go") {
      setSandboxCode(`package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go execution sandbox!")\n}`);
    } else if (lang === "java") {
      setSandboxCode(`public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java runtime virtual machine!");\n    }\n}`);
    }
  }

  async function handleSaveAts(e: React.FormEvent) {
    e.preventDefault();
    if (!atsApiKey.trim()) {
      toast.error("Please enter a valid API key.");
      return;
    }

    setAtsLoading(true);
    try {
      const res = await fetch(`/api/w/${workspace.slug}/integrations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: atsProvider,
          apiKey: atsApiKey,
          webhookSecret: atsWebhookSecret || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("ATS Provider connected successfully!");
      setAtsActive(true);
      if (typeof window !== "undefined") {
        setAtsSavedUrl(`${window.location.origin}/api/integrations/webhooks/${atsProvider.toLowerCase()}?workspaceId=${data.integration.workspaceId || data.integration.id}`);
      }
      loadIntegrations();
    } catch (err) {
      toast.error("Failed to connect ATS provider", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAtsLoading(false);
    }
  }

  async function handleDisconnectAts() {
    if (!window.confirm("Are you sure you want to disconnect this ATS provider integration?")) {
      return;
    }

    setAtsLoading(true);
    try {
      const res = await fetch(`/api/w/${workspace.slug}/integrations`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Disconnect request failed");

      toast.success("ATS Provider disconnected.");
      setAtsApiKey("");
      setAtsWebhookSecret("");
      setAtsActive(false);
    } catch (err) {
      toast.error("Failed to disconnect", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAtsLoading(false);
    }
  }

  async function handleScheduleCalendar(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleSessionId.trim() || !scheduleStartTime || !scheduleEndTime) {
      toast.error("Please fill in all panel scheduling parameters.");
      return;
    }

    setScheduleLoading(true);
    setScheduleResult(null);
    try {
      const res = await fetch(`/api/interview/${scheduleSessionId}/schedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startTime: scheduleStartTime,
          endTime: scheduleEndTime,
          candidateEmail: scheduleCandidate || "candidate@company.com",
          interviewerEmail: scheduleInterviewer || "interviewer@company.com",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("Interview session scheduled successfully!");
      
      // Auto-trigger .ics file download trigger for single-click calendar sync
      const blob = new Blob([data.icsContent], { type: "text/calendar;charset=utf-8" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute("download", `interview_schedule_${scheduleSessionId.substring(0,8)}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setScheduleResult(JSON.stringify(data.googleCalendarPayload, null, 2));
    } catch (err) {
      toast.error("Scheduling sync failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleRunSandbox() {
    if (!sandboxCode.trim()) return;

    setSandboxRunning(true);
    setSandboxOutput("Executing script on secure container pool...\n");
    try {
      const res = await fetch(`/api/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: sandboxLang,
          code: sandboxCode,
          stdin: sandboxInput,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      let output = "";
      if (data.stdout) output += data.stdout;
      if (data.stderr) output += `[Stderr Error]\n${data.stderr}`;
      if (!data.stdout && !data.stderr) output += `[Process exited with code ${data.exitCode}]`;
      if (data.fallbackUsed) output += `\n\n* Emulated execution environment active.`;

      setSandboxOutput(output);
    } catch (err) {
      setSandboxOutput(`Sandbox execution error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSandboxRunning(false);
    }
  }

  async function handleTriggerBilling() {
    setBillingLoading(true);
    try {
      const res = await fetch(`/api/w/${workspace.slug}/billing/session`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirection URL returned from server.");
      }
    } catch (err) {
      toast.error("Billing portal error", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleRemoveTeammate(memberId: string) {
    if (!window.confirm("Are you sure you want to remove this teammate from the workspace?")) {
      return;
    }

    try {
      const res = await fetch(`/api/w/${workspace.slug}/members`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("Teammate removed successfully.");
      setCurrentMembers(currentMembers.filter((m) => m.id !== memberId));
    } catch (err) {
      toast.error("Failed to remove teammate", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleGenerateTakeHome(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateName.trim() || !candidateEmail.trim() || !selectedChallengeId) {
      toast.error("Please fill in all candidate invitation details.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`/api/w/${workspace.slug}/take-home`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateName,
          candidateEmail,
          challengeId: selectedChallengeId,
          timeLimitMin,
          daysToExpire,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("Take-home invitation generated successfully!");
      
      // Prepend the new take-home invitation to the list
      setCurrentTakeHomes([data.takeHome, ...currentTakeHomes]);
      
      // Reset form
      setCandidateName("");
      setCandidateEmail("");
    } catch (err) {
      toast.error("Failed to generate invitation", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleInviteTeammate(e: React.FormEvent) {
    e.preventDefault();
    if (!teammateEmail.trim()) {
      toast.error("Please enter a valid teammate email address.");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch(`/api/w/${workspace.slug}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: teammateEmail,
          role: teammateRole,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("Teammate enrolled successfully!");
      
      // Prepend the newly added member to the list
      setCurrentMembers([data.member, ...currentMembers]);
      
      // Reset form
      setTeammateEmail("");
    } catch (err) {
      toast.error("Failed to enroll teammate", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setInviting(false);
    }
  }

  const difficultyColor: Record<string, string> = {
    easy: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.06] border-emerald-500/20",
    medium: "text-amber-600 dark:text-amber-400 bg-amber-500/[0.06] border-amber-500/20",
    hard: "text-rose-600 dark:text-rose-400 bg-rose-500/[0.06] border-rose-500/20",
  };

  const statusBadgeColor: Record<string, string> = {
    PENDING: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
    ACTIVE: "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]",
    SUBMITTED: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
    EXPIRED: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
  };

  // Candidate roster comes directly from the first-class Candidate model
  // (server-fetched). This includes "parked" candidates with no assignments yet.
  // Apply client-side status filter + sort over the server payload.
  const STATUS_PIPELINE_ORDER: Record<string, number> = {
    active: 0,
    future_hire: 1,
    do_not_hire: 2,
    hired: 3,
    rejected: 4,
    archived: 5,
  };
  const candidateRoster = useMemo(() => {
    const filtered = candidateStatusFilter === "all"
      ? candidates
      : candidates.filter((c) => c.status === candidateStatusFilter);

    const sorted = [...filtered].sort((a, b) => {
      switch (candidateSort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return (STATUS_PIPELINE_ORDER[a.status] ?? 99) - (STATUS_PIPELINE_ORDER[b.status] ?? 99);
        case "take-homes":
          return b.takeHomeCount - a.takeHomeCount;
        case "interviews":
          return b.sessionCount - a.sessionCount;
        case "recent":
        default:
          return a.updatedAt > b.updatedAt ? -1 : 1;
      }
    });
    return sorted;
  }, [candidates, candidateStatusFilter, candidateSort]);

  // Statuses with counts for the filter pill row
  const statusCounts = useMemo(() => {
    const acc: Record<string, number> = { all: candidates.length };
    candidates.forEach((c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; });
    return acc;
  }, [candidates]);

  function toggleCandidateSelected(id: string) {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSelected() {
    if (selectedCandidateIds.size === candidateRoster.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(candidateRoster.map((c) => c.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedCandidateIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedCandidateIds.size} candidate${selectedCandidateIds.size === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/w/${workspace.slug}/candidates/bulk`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedCandidateIds) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      toast.success(`Deleted ${data.deleted} candidate${data.deleted === 1 ? "" : "s"}`);
      setSelectedCandidateIds(new Set());
      router.refresh();
    } catch (err) {
      toast.error("Failed to delete candidates", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBulkDeleting(false);
    }
  }

  // Replays = completed take-homes (with attempt) + finished interview sessions
  const replayItems = [
    ...currentTakeHomes
      .filter((th) => th.status === "SUBMITTED" && th.attemptId)
      .map((th) => ({
        kind: "take-home" as const,
        id: th.attemptId!,
        title: th.challengeTitle,
        candidate: th.candidateName,
        timestamp: th.submittedAt ?? th.startedAt ?? th.expiresAt,
        score: th.score,
        href: `/w/${workspace.slug}/attempts/${th.attemptId}/replay`,
      })),
    ...sessions
      .filter((s) => s.status === "completed" || s.status === "finished" || !!s.finishedAt)
      .map((s) => ({
        kind: "interview" as const,
        id: s.id,
        title: s.title,
        candidate: s.candidateName || "Unknown candidate",
        timestamp: s.finishedAt ?? s.startedAt ?? s.createdAt,
        score: null as number | null,
        href: `/interview/${s.shareToken}`,
      })),
  ].sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));


  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Challenges</span>
            <div className="w-7 h-7 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">{challenges.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Interviews</span>
            <div className="w-7 h-7 rounded-lg border border-violet-500/20 bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">{sessions.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Take-homes</span>
            <div className="w-7 h-7 rounded-lg border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">{currentTakeHomes.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Candidates</span>
            <div className="w-7 h-7 rounded-lg border border-purple-500/20 bg-purple-500/10 flex items-center justify-center text-purple-500">
              <UserCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">{candidates.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Members</span>
            <div className="w-7 h-7 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">{currentMembers.length}</div>
        </div>
      </div>

      {/* Section content — driven by ?section= search param from sidebar */}
      <div className="space-y-5">

        {/* Section Content */}
        <div>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-fg tracking-tight">Overview</h3>
                <p className="text-xs text-muted mt-0.5">Recent activity across your workspace.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recent take-homes */}
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Recent take-homes</h4>
                    </div>
                    <Link
                      href={`/w/${workspace.slug}?section=take-homes`}
                      className="text-[11px] font-semibold text-accent hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  {currentTakeHomes.length === 0 ? (
                    <div className="p-6 text-xs text-muted/60 italic text-center">No take-homes scheduled.</div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {currentTakeHomes.slice(0, 5).map((th) => (
                        <li key={th.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-panel/30 transition-colors">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-fg truncate">{th.candidateName}</div>
                            <div className="text-[11px] text-muted truncate">{th.challengeTitle}</div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider shrink-0 ${statusBadgeColor[th.status]}`}>
                            {th.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Recent interviews */}
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-violet-500" />
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Recent interviews</h4>
                    </div>
                    <Link
                      href={`/w/${workspace.slug}?section=interviews`}
                      className="text-[11px] font-semibold text-accent hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  {sessions.length === 0 ? (
                    <div className="p-6 text-xs text-muted/60 italic text-center">No interviews scheduled.</div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {sessions.slice(0, 5).map((s) => {
                        const isDone = !!s.finishedAt;
                        const isLive = !!s.startedAt && !isDone;
                        const statusColor = isDone
                          ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]"
                          : isLive
                          ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]"
                          : "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]";
                        return (
                          <li key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-panel/30 transition-colors">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-fg truncate">{s.candidateName || "Unknown"}</div>
                              <div className="text-[11px] text-muted truncate">{s.title}</div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider shrink-0 ${statusColor}`}>
                              {isDone ? "Done" : isLive ? "Live" : "Scheduled"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHALLENGES */}
          {activeTab === "challenges" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-fg tracking-tight">Workspace challenges</h3>
                  <p className="text-xs text-muted mt-0.5">Custom challenges created by your team.</p>
                </div>
                <Link
                  href="/admin/challenges/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New challenge</span>
                </Link>
              </div>

              {challenges.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-3">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-fg">No challenges yet</p>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    Create your first private challenge to send out as a take-home.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {challenges.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-border bg-surface hover:border-accent/30 transition-colors group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${difficultyColor[c.difficulty]}`}>
                            {c.difficulty}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-panel/50 border border-border text-[10px] font-medium text-muted">
                            {c.template}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-fg truncate group-hover:text-accent transition-colors">
                          {c.title}
                        </h4>
                      </div>
                      <div className="flex justify-between items-center gap-2 pt-3 mt-3 border-t border-border">
                        <span className="text-[11px] text-muted font-mono truncate">/{c.slug}</span>
                        <Link
                          href={`/challenges/${c.slug}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline shrink-0"
                        >
                          Preview <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INTERVIEWS */}
          {activeTab === "interviews" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-fg tracking-tight">Live interviews</h3>
                  <p className="text-xs text-muted mt-0.5">Real-time pair-programming sessions scheduled by your team.</p>
                </div>
                <Link
                  href="/interview/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New interview</span>
                </Link>
              </div>

              {sessions.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 mx-auto mb-3">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-fg">No interviews yet</p>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    Schedule a live pair-programming round with a candidate.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                        <th className="px-4 py-3 font-semibold">Session</th>
                        <th className="px-4 py-3 font-semibold">Candidate</th>
                        <th className="px-4 py-3 font-semibold">Interviewer</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Code</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sessions.map((s) => {
                        const isDone = !!s.finishedAt || s.status === "completed" || s.status === "finished";
                        const isLive = !!s.startedAt && !isDone;
                        const statusColor = isDone
                          ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]"
                          : isLive
                          ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]"
                          : "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]";
                        const statusLabel = isDone ? "Completed" : isLive ? "Live" : "Scheduled";

                        return (
                          <tr key={s.id} className="hover:bg-panel/30 transition-colors">
                            <td className="px-4 py-3 align-middle">
                              <div className="font-semibold text-fg text-sm truncate">{s.title}</div>
                              <div className="text-[11px] text-muted mt-0.5 font-mono">
                                {Math.round(s.totalSec / 60)} min · {s.type}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-fg">
                              {s.candidateName || <span className="text-muted/60 italic">—</span>}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <div className="text-xs text-fg">{s.interviewerName || "Unknown"}</div>
                              <div className="text-[11px] text-muted font-mono mt-0.5">{s.interviewerEmail}</div>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
                                {statusLabel}
                              </span>
                              {s.verdict && (
                                <div className="text-[10px] text-muted mt-1 capitalize">{s.verdict.replace(/_/g, " ")}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-middle font-mono text-[11px] text-fg">
                              {s.shortCode || <span className="text-muted/60">—</span>}
                            </td>
                            <td className="px-4 py-3 align-middle text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {isDone ? (
                                  <Link
                                    href={`/interview/${s.shareToken}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/25 text-[11px] font-semibold text-accent hover:bg-accent/15 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Review
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/interview/${s.shareToken}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-panel/40 border border-border hover:border-accent/40 text-[11px] font-semibold text-muted hover:text-fg transition-colors"
                                  >
                                    <Play className="w-3 h-3" />
                                    Open
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAKE-HOMES */}
          {activeTab === "take-homes" && (
            <div className="space-y-6">
              {/* Invite candidate form */}
              <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-500" /> Invite candidate
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Generate a secure expiring invitation link.</p>
                </div>

                <form onSubmit={handleGenerateTakeHome} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Candidate name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="candidate@example.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Challenge</label>
                    <select
                      value={selectedChallengeId}
                      onChange={(e) => setSelectedChallengeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                    >
                      {challenges.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.difficulty})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={generating || challenges.length === 0}
                    className="w-full px-3 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? "Generating…" : "Generate link"}
                  </button>
                </form>
              </div>

              {/* Pipeline */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-fg">Candidate pipeline</h3>

                {currentTakeHomes.length === 0 ? (
                  <div className="rounded-xl border border-border bg-surface p-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mx-auto mb-3">
                      <Clock className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-fg">No take-homes scheduled</p>
                    <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                      Invite a candidate above to send them an automated take-home assessment.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-surface overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                          <th className="px-4 py-3 font-semibold">Candidate</th>
                          <th className="px-4 py-3 font-semibold">Challenge</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Time limit</th>
                          <th className="px-4 py-3 font-semibold">Score</th>
                          <th className="px-4 py-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {currentTakeHomes.map((th) => (
                          <tr key={th.id} className="hover:bg-panel/30 transition-colors">
                            <td className="px-4 py-3 align-middle">
                              <div className="font-semibold text-fg text-sm">{th.candidateName}</div>
                              <div className="text-[11px] text-muted font-mono mt-0.5">{th.candidateEmail}</div>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-fg">{th.challengeTitle}</td>
                            <td className="px-4 py-3 align-middle">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${statusBadgeColor[th.status]}`}>
                                {th.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-muted tabular-nums">{th.timeLimitMin} min</td>
                            <td className="px-4 py-3 align-middle">
                              {th.status === "SUBMITTED" && th.score !== null ? (
                                th.attemptId ? (
                                  <Link
                                    href={`/w/${workspace.slug}/attempts/${th.attemptId}`}
                                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs hover:underline"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span className="tabular-nums">{th.score}%</span>
                                  </Link>
                                ) : (
                                  <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                    <Award className="w-3.5 h-3.5" />
                                    <span className="tabular-nums">{th.score}%</span>
                                  </div>
                                )
                              ) : (
                                <span className="text-muted/50">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-middle text-right">
                              {th.status === "SUBMITTED" && th.attemptId ? (
                                <Link
                                  href={`/w/${workspace.slug}/attempts/${th.attemptId}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/25 text-[11px] font-semibold text-accent hover:bg-accent/15 transition-colors"
                                >
                                  <Award className="w-3 h-3" />
                                  <span>Review</span>
                                </Link>
                              ) : (
                                <button
                                  onClick={() => {
                                    const url = `${window.location.origin}/take-home/${th.token}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success("Invitation link copied", { description: "Send this link to your candidate." });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-panel/40 border border-border text-[11px] font-semibold text-muted hover:text-fg hover:border-accent/40 transition-colors cursor-pointer"
                                >
                                  <Link2 className="w-3 h-3" />
                                  <span>Copy link</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CANDIDATES */}
          {activeTab === "candidates" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold text-fg tracking-tight">Candidates</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Your workspace candidate roster — sourced manually or from take-homes/interviews.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBulkAddOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-panel/40 border border-border hover:border-accent/40 text-muted hover:text-fg text-[11px] font-semibold uppercase tracking-wider transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Bulk add</span>
                  </button>
                  <button
                    onClick={() => setAddCandidateOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add candidate</span>
                  </button>
                </div>
              </div>

              {/* Filter + sort toolbar */}
              {candidates.length > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Status filter pills */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {(["all", "active", "future_hire", "do_not_hire", "hired", "rejected", "archived"] as const).map((s) => {
                      const isActive = candidateStatusFilter === s;
                      const count = statusCounts[s] ?? 0;
                      const label = s === "all" ? "All"
                        : s === "future_hire" ? "Future hire"
                        : s === "do_not_hire" ? "Do not hire"
                        : s.charAt(0).toUpperCase() + s.slice(1);
                      const activeStyle =
                        s === "future_hire" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : s === "do_not_hire" ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40"
                        : s === "hired" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : s === "rejected" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                        : s === "archived" ? "bg-panel/60 text-muted border-border"
                        : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/25";
                      return (
                        <button
                          key={s}
                          onClick={() => setCandidateStatusFilter(s)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                            isActive ? activeStyle : "border-border text-muted hover:text-fg hover:bg-panel/40"
                          }`}
                        >
                          <span>{label}</span>
                          {count > 0 && (
                            <span className={`text-[10px] tabular-nums ${isActive ? "" : "text-muted/60"}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Sort</span>
                    <select
                      value={candidateSort}
                      onChange={(e) => setCandidateSort(e.target.value as typeof candidateSort)}
                      className="px-2.5 py-1 rounded-md border border-border bg-bg text-fg text-[11px] font-semibold focus:outline-none focus:border-accent/40"
                    >
                      <option value="recent">Recent activity</option>
                      <option value="status">Pipeline stage</option>
                      <option value="name">Name A–Z</option>
                      <option value="take-homes">Take-homes (desc)</option>
                      <option value="interviews">Interviews (desc)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Bulk selection bar */}
              {selectedCandidateIds.size > 0 && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-md border border-accent/30 bg-accent/10 animate-in slide-in-from-top-1 duration-150">
                  <span className="text-[12px] font-semibold text-fg">
                    {selectedCandidateIds.size} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCandidateIds(new Set())}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-muted hover:text-fg transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {bulkDeleting ? "Deleting…" : "Delete selected"}
                    </button>
                  </div>
                </div>
              )}

              {candidateRoster.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mx-auto mb-3">
                    <UserCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-fg">
                    {candidates.length === 0 ? "No candidates yet" : "No candidates match this filter"}
                  </p>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    {candidates.length === 0
                      ? "Add a candidate manually, or invite one via the take-home or interview flow."
                      : "Try clearing the status filter or adding new candidates."}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                        <th className="pl-4 pr-2 py-3 w-px">
                          <input
                            type="checkbox"
                            checked={selectedCandidateIds.size === candidateRoster.length && candidateRoster.length > 0}
                            ref={(el) => {
                              if (el) el.indeterminate = selectedCandidateIds.size > 0 && selectedCandidateIds.size < candidateRoster.length;
                            }}
                            onChange={toggleAllSelected}
                            className="w-3.5 h-3.5 rounded border-border bg-bg accent-accent cursor-pointer"
                            aria-label="Select all"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold">Candidate</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Source</th>
                        <th className="px-4 py-3 font-semibold">Activity</th>
                        <th className="px-4 py-3 font-semibold">Last updated</th>
                        <th className="px-4 py-3 font-semibold w-px" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {candidateRoster.map((c) => {
                        const last = new Date(c.updatedAt);
                        const lastLabel = last.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                        const statusColor =
                          c.status === "hired" ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]"
                          : c.status === "rejected" ? "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]"
                          : c.status === "do_not_hire" ? "text-rose-700 dark:text-rose-400 border-rose-500/40 bg-rose-500/[0.10]"
                          : c.status === "future_hire" ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/[0.08]"
                          : c.status === "archived" ? "text-muted/80 border-border bg-panel/50"
                          : "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]";
                        const statusLabel =
                          c.status === "future_hire" ? "Future hire"
                          : c.status === "do_not_hire" ? "Do not hire"
                          : c.status.charAt(0).toUpperCase() + c.status.slice(1);
                        const isSelected = selectedCandidateIds.has(c.id);
                        const alertStripe =
                          c.status === "do_not_hire" ? "bg-rose-500"
                          : c.status === "future_hire" ? "bg-amber-500"
                          : null;
                        return (
                          <tr
                            key={c.id}
                            className={`group hover:bg-panel/30 transition-colors ${
                              isSelected ? "bg-accent/[0.04]" : ""
                            }`}
                          >
                            <td className="pl-4 pr-2 py-3 align-middle relative" onClick={(e) => e.stopPropagation()}>
                              {alertStripe && (
                                <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${alertStripe}`} aria-hidden />
                              )}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCandidateSelected(c.id)}
                                className="w-3.5 h-3.5 rounded border-border bg-bg accent-accent cursor-pointer"
                                aria-label={`Select ${c.name}`}
                              />
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <Link href={`/w/${workspace.slug}/candidates/${c.id}`} className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-[11px] font-semibold shrink-0">
                                  {c.name.substring(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-fg text-sm truncate group-hover:text-accent transition-colors flex items-center gap-1.5">
                                    {c.name}
                                    {c.status === "do_not_hire" && (
                                      <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                    )}
                                  </div>
                                  {c.email && (
                                    <div className="text-[11px] text-muted/70 font-mono mt-0.5 truncate">{c.email}</div>
                                  )}
                                </div>
                              </Link>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-[11px] text-muted capitalize">
                              {c.source || "—"}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-3 text-[11px]">
                                <span className="inline-flex items-center gap-1 text-fg">
                                  <Clock className="w-3 h-3 text-purple-500/80" />
                                  <span className="tabular-nums">{c.takeHomeCount}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-fg">
                                  <Briefcase className="w-3 h-3 text-violet-500/80" />
                                  <span className="tabular-nums">{c.sessionCount}</span>
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-muted">{lastLabel}</td>
                            <td className="px-4 py-3 align-middle">
                              <ChevronRight className="w-4 h-4 text-muted/40 group-hover:text-accent transition-colors" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* REPLAYS */}
          {activeTab === "replays" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-fg tracking-tight">Session replays</h3>
                <p className="text-xs text-muted mt-0.5">
                  Re-watch candidate sessions — keystrokes, code states, and final submissions.
                </p>
              </div>

              {replayItems.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mx-auto mb-3">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-fg">No replays yet</p>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    Replays appear here once candidates complete take-homes or finish interviews.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                        <th className="px-4 py-3 font-semibold">Source</th>
                        <th className="px-4 py-3 font-semibold">Candidate</th>
                        <th className="px-4 py-3 font-semibold">Title</th>
                        <th className="px-4 py-3 font-semibold">Recorded</th>
                        <th className="px-4 py-3 font-semibold">Score</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {replayItems.map((r) => {
                        const ts = new Date(r.timestamp);
                        const tsLabel = ts.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                        const sourceColor = r.kind === "take-home"
                          ? "text-purple-600 dark:text-purple-400 border-purple-500/25 bg-purple-500/[0.06]"
                          : "text-violet-600 dark:text-violet-400 border-violet-500/25 bg-violet-500/[0.08]";
                        return (
                          <tr key={`${r.kind}-${r.id}`} className="hover:bg-panel/30 transition-colors">
                            <td className="px-4 py-3 align-middle">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${sourceColor}`}>
                                {r.kind === "take-home" ? "Take-home" : "Interview"}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-fg">{r.candidate}</td>
                            <td className="px-4 py-3 align-middle text-xs text-fg truncate max-w-[260px]">{r.title}</td>
                            <td className="px-4 py-3 align-middle text-xs text-muted">{tsLabel}</td>
                            <td className="px-4 py-3 align-middle">
                              {r.score !== null ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  <Award className="w-3.5 h-3.5" />
                                  <span className="tabular-nums">{r.score}%</span>
                                </span>
                              ) : (
                                <span className="text-muted/50">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-middle text-right">
                              <Link
                                href={r.href}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/25 text-[11px] font-semibold text-accent hover:bg-accent/15 transition-colors"
                              >
                                <Play className="w-3 h-3" />
                                Watch
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MEMBERS */}
          {activeTab === "members" && (
            <div className="space-y-6">
              {/* Invite teammate form */}
              <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-indigo-500" /> Invite teammate
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Add a colleague to this workspace.</p>
                </div>

                <form onSubmit={handleInviteTeammate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Email</label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 w-3.5 h-3.5 text-muted/50" />
                      <input
                        type="email"
                        required
                        placeholder="colleague@company.com"
                        value={teammateEmail}
                        onChange={(e) => setTeammateEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Role</label>
                    <select
                      value={teammateRole}
                      onChange={(e) => setTeammateRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                    >
                      <option value="INTERVIEWER">Interviewer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="w-full px-3 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {inviting ? "Inviting…" : "Invite"}
                  </button>
                </form>
              </div>

              {/* Members listing */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-fg">Teammates ({currentMembers.length})</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentMembers.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-border bg-surface p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {m.user.image ? (
                          <img
                            src={m.user.image}
                            alt={m.user.name || "Member"}
                            className="w-9 h-9 rounded-lg border border-border bg-bg shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xs font-semibold shrink-0">
                            {m.user.name?.substring(0, 1).toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-fg truncate">
                            {m.user.name || "Pending invite"}
                          </div>
                          <div className="text-[11px] text-muted truncate font-mono mt-0.5">{m.user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${
                            m.role === "OWNER"
                              ? "text-violet-600 dark:text-violet-400 border-violet-500/25 bg-violet-500/[0.08]"
                              : m.role === "ADMIN"
                              ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]"
                              : "text-muted border-border bg-panel/50"
                          }`}
                        >
                          {m.role}
                        </span>
                        {m.role !== "OWNER" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTeammate(m.id)}
                            className="w-7 h-7 rounded-md text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center justify-center"
                            title="Remove teammate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BILLING */}
          {activeTab === "billing" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-fg tracking-tight">Billing &amp; seats</h3>
                <p className="text-xs text-muted mt-0.5">Manage your subscription plan, invoices, and seat allocation.</p>
              </div>

              {/* Subscription summary card */}
              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Current plan</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${
                          PLAN_BADGES[workspace.planName] || PLAN_BADGES.FREE
                        }`}
                      >
                        {workspace.planName}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-fg">
                      {workspace.planName === "GROWTH" ? "Growth · metered seats" : "Free trial"}
                    </h4>
                    <p className="text-xs text-muted max-w-xl leading-relaxed">
                      {workspace.planName === "GROWTH"
                        ? "Full access to evaluation rubrics, candidate replays, integrity alerts, and unlimited take-homes."
                        : "Upgrade to unlock custom rubrics, replays, AI integrity scoring, and unlimited candidates — billed per active seat."}
                    </p>
                  </div>

                  <button
                    onClick={handleTriggerBilling}
                    disabled={billingLoading}
                    className="px-4 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-50"
                  >
                    {billingLoading ? "Loading…" : workspace.planName === "GROWTH" ? "Manage billing" : "Upgrade plan"}
                  </button>
                </div>
              </div>

              {/* Seats + Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seat utilization */}
                <div className="rounded-xl border border-border bg-surface p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-fg">Seat allocation</h4>
                      <p className="text-[11px] text-muted mt-0.5">Active billable seats.</p>
                    </div>
                    <span className="text-lg font-semibold text-fg tabular-nums">
                      {currentMembers.length}
                      {workspace.planName === "FREE" && <span className="text-muted/60 font-medium"> / 3</span>}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full overflow-hidden bg-panel flex gap-0.5">
                    {workspace.planName === "FREE" ? (
                      [1, 2, 3].map((seat) => (
                        <div
                          key={seat}
                          className={`h-full flex-1 transition-all ${
                            seat <= currentMembers.length ? "bg-indigo-500" : "bg-panel"
                          }`}
                        />
                      ))
                    ) : (
                      <div className="h-full w-full bg-indigo-500 rounded-full" />
                    )}
                  </div>

                  {workspace.planName === "FREE" ? (
                    <p className="text-[11px] text-muted flex items-start gap-1.5 leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                      <span>Free workspaces are limited to 3 seats. Upgrade to scale beyond.</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted flex items-start gap-1.5 leading-relaxed">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-500 mt-0.5" />
                      <span>Growth billing scales with active seats at <span className="text-fg font-semibold">$49 / seat / month</span>.</span>
                    </p>
                  )}
                </div>

                {/* Features list */}
                <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-fg">Growth tier features</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3 text-[11px] text-muted">
                    {[
                      "Unlimited candidates",
                      "Custom rubrics",
                      "Range grading",
                      "Editor replays",
                      "Plagiarism heatmaps",
                      "AI integrity scoring",
                      "PDF dossiers",
                      "ATS & OAuth sync",
                    ].map((feat) => (
                      <li key={feat} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* INTEGRATIONS */}
          {activeTab === "integrations" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-fg tracking-tight">Integrations</h3>
                <p className="text-xs text-muted mt-0.5">Connect your ATS, calendar, and sandbox runtime.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ATS */}
                <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-fg">Applicant Tracking System</h4>
                      <p className="text-[11px] text-muted">Sync take-home invitations from your ATS.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveAts} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Provider</label>
                      <select
                        value={atsProvider}
                        onChange={(e) => setAtsProvider(e.target.value as any)}
                        disabled={atsActive}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40 disabled:opacity-60"
                      >
                        <option value="GREENHOUSE">Greenhouse</option>
                        <option value="LEVER">Lever</option>
                        <option value="ASHBY">Ashby</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">API key</label>
                      <input
                        type="password"
                        placeholder={atsActive ? "••••••••••••••••" : "Paste your ATS API token"}
                        value={atsApiKey}
                        onChange={(e) => setAtsApiKey(e.target.value)}
                        disabled={atsActive}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40 disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Webhook secret <span className="text-muted/60 font-normal">(optional)</span></label>
                      <input
                        type="password"
                        placeholder={atsActive ? "••••••••••••••••" : "Webhook signature secret"}
                        value={atsWebhookSecret}
                        onChange={(e) => setAtsWebhookSecret(e.target.value)}
                        disabled={atsActive}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40 disabled:opacity-60"
                      />
                    </div>

                    {!atsActive ? (
                      <button
                        type="submit"
                        disabled={atsLoading}
                        className="w-full py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        {atsLoading ? "Connecting…" : "Connect"}
                      </button>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="px-3 py-2 rounded-md bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Connected</span>
                        </div>

                        {atsSavedUrl && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Webhook endpoint URL</span>
                            <div className="px-2.5 py-2 rounded-md border border-border bg-bg font-mono text-[10px] text-fg select-all break-all">
                              {atsSavedUrl}
                            </div>
                            <span className="text-[10px] text-muted/70 block mt-1">Add this URL to your ATS webhooks to trigger tests automatically.</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleDisconnectAts}
                          disabled={atsLoading}
                          className="w-full py-2 rounded-md bg-rose-500/[0.06] border border-rose-500/25 hover:bg-rose-500/[0.1] text-rose-600 dark:text-rose-400 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                        >
                          {atsLoading ? "Disconnecting…" : "Disconnect"}
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Calendar */}
                <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-fg">Calendar sync</h4>
                      <p className="text-[11px] text-muted">Send interview invites as .ics files with pad links.</p>
                    </div>
                  </div>

                  <form onSubmit={handleScheduleCalendar} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Session ID</label>
                        <input
                          type="text"
                          required
                          placeholder="clx12…"
                          value={scheduleSessionId}
                          onChange={(e) => setScheduleSessionId(e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Candidate email</label>
                        <input
                          type="email"
                          required
                          placeholder="candidate@company.com"
                          value={scheduleCandidate}
                          onChange={(e) => setScheduleCandidate(e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Start</label>
                        <input
                          type="datetime-local"
                          required
                          value={scheduleStartTime}
                          onChange={(e) => setScheduleStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">End</label>
                        <input
                          type="datetime-local"
                          required
                          value={scheduleEndTime}
                          onChange={(e) => setScheduleEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Interviewer email</label>
                      <input
                        type="email"
                        required
                        placeholder="interviewer@company.com"
                        value={scheduleInterviewer}
                        onChange={(e) => setScheduleInterviewer(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={scheduleLoading}
                      className="w-full py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      {scheduleLoading ? "Scheduling…" : "Schedule & download invite"}
                    </button>

                    {scheduleResult && (
                      <div className="space-y-1 pt-2 border-t border-border">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">Sync log</span>
                        <pre className="font-mono text-[10px] text-fg bg-bg border border-border rounded-md p-3 max-h-[120px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                          {scheduleResult}
                        </pre>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Sandbox */}
              <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-fg">Code sandbox</h4>
                    <p className="text-[11px] text-muted">Run Python, Go, Java, or JS code in a sandboxed runtime.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Language</label>
                      <select
                        value={sandboxLang}
                        onChange={(e) => handleLangChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                      >
                        <option value="python">Python 3.11</option>
                        <option value="go">Go 1.21</option>
                        <option value="java">Java OpenJDK 17</option>
                        <option value="javascript">JavaScript (Node)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Stdin input <span className="text-muted/60 font-normal">(optional)</span></label>
                      <textarea
                        placeholder="Input for the program's stdin…"
                        value={sandboxInput}
                        onChange={(e) => setSandboxInput(e.target.value)}
                        className="w-full h-[80px] p-3 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40 resize-none"
                      />
                    </div>

                    <button
                      onClick={handleRunSandbox}
                      disabled={sandboxRunning}
                      className="w-full py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      {sandboxRunning ? "Running…" : "Run"}
                    </button>
                  </div>

                  <div className="md:col-span-8 flex flex-col gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Code</label>
                      <textarea
                        value={sandboxCode}
                        onChange={(e) => setSandboxCode(e.target.value)}
                        className="w-full min-h-[160px] flex-1 p-3 rounded-md border border-border bg-bg text-fg font-mono text-xs focus:outline-none focus:border-accent/40 leading-relaxed resize-y whitespace-pre"
                      />
                    </div>

                    {sandboxOutput && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Output</span>
                        <pre className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-bg border border-border rounded-md p-3 max-h-[140px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                          {sandboxOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <AddCandidateDialog
        open={addCandidateOpen}
        onClose={() => setAddCandidateOpen(false)}
        workspaceSlug={workspace.slug}
      />

      <BulkAddCandidatesDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        workspaceSlug={workspace.slug}
      />
    </div>
  );
}
