"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
// Pure permission helpers only (no server-only imports) so this client
// component can resolve a member's effective permissions locally.
import { resolveEffective, asOverrides } from "@/lib/permissions/resolve";
import { WORKSPACE_PERMISSIONS } from "@/lib/permissions/permissions";
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
  Brain,
  Copy,
  X,
  Search,
  Video,
  FileCode2,
  ClipboardList,
} from "lucide-react";
import { describeExecution } from "@/lib/exec-result";
import { postExecute } from "@/lib/execute-client";
import { bulkCreateTakeHomeSessions } from "./candidates/actions";
import WorkspaceOverview from "./WorkspaceOverview";
import SubTabs from "./SubTabs";
import { humanize, type PlanDisplay } from "@/lib/workspace/display";

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
  createdAt?: string;
  challengeId?: string;
  challengeTitle: string;
  challengeDifficulty?: string;
  attemptId: string | null;
  score: number | null;
  attemptStartedAt?: string | null;
  candidateId?: string | null;
  candidateStage?: string | null;
};

type Member = {
  id: string;
  userId: string;
  role: string;
  /** Per-member permission override delta (Json from the DB), or null. */
  permissions?: unknown;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

/** Workspace roles assignable from the members UI, in privilege order. */
const WORKSPACE_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "RECRUITER", label: "Recruiter" },
  { value: "INTERVIEWER", label: "Interviewer" },
  { value: "VIEWER", label: "Viewer" },
];

/** Human-readable labels for each workspace permission, grouped by resource,
 *  for the per-member override editor. */
const PERMISSION_LABELS: Record<string, string> = {
  "candidate:read": "View candidates",
  "candidate:write": "Edit candidates",
  "candidate:delete": "Delete candidates",
  "candidate:manage_pipeline": "Manage pipeline",
  "challenge:read": "View challenges",
  "challenge:write": "Edit challenges",
  "takehome:read": "View take-homes",
  "takehome:create": "Create take-homes",
  "interview:read": "View interviews",
  "interview:conduct": "Conduct interviews",
  "interview:manage": "Manage interviews",
  "member:read": "View members",
  "member:invite": "Invite members",
  "member:remove": "Remove members",
  "member:set_role": "Change member roles",
  "billing:read": "View billing",
  "billing:manage": "Manage billing",
  "integration:read": "View integrations",
  "integration:manage": "Manage integrations",
  "email:read": "View email log",
  "audit:read": "View audit log",
  "workspace:manage": "Manage workspace",
};

function roleBadgeClass(role: string): string {
  switch (role) {
    case "OWNER":
      return "text-secondary border-secondary/25 bg-secondary/[0.08]";
    case "ADMIN":
      return "text-secondary border-secondary/25 bg-secondary/[0.08]";
    case "RECRUITER":
      return "text-secondary border-secondary/25 bg-secondary/[0.08]";
    case "VIEWER":
      return "text-muted border-border bg-panel";
    default: // INTERVIEWER + any custom role
      return "text-muted border-border bg-panel/50";
  }
}

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
  scheduledAt: string | null;
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
  /** Pipeline stage (APPLIED … HIRED/REJECTED) — see src/lib/crm/stages.ts. */
  stage: string;
  stageChangedAt: string | null;
  tags: string[];
  takeHomeCount: number;
  sessionCount: number;
  updatedAt: string;
  createdAt: string;
};

type PromptScenario = {
  id: string;
  slug: string;
  title: string;
  description: string;
  objective: string;
  expectedTraits: string;
  difficulty: string;
  category: string;
  estimatedMinutes: number;
  workspaceId: string | null;
  published: boolean;
};

type PromptAttemptItem = {
  id: string;
  promptText: string;
  charCount: number;
  tokenEstimate: number;
  score: number | null;
  rubricScores: string | null;
  feedback: string | null;
  graderType: string | null;
  sessionId: string | null;
  userId: string | null;
  durationSec: number | null;
  createdAt: string;
  scenarioTitle: string;
  scenarioCategory: string;
  scenarioDifficulty: string;
};

type TakeHomeSession = {
  id: string;
  title: string;
  candidateName: string | null;
  candidateEmail: string | null;
  status: string;
  deadlineAt: string | null;
  candidateAccessToken: string | null;
  questionCount: number;
  createdAt: string;
  finishedAt: string | null;
  candidateId: string | null;
  candidateStage: string | null;
};

type AIInterviewSessionItem = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  status: string;
  score: number | null;
  candidateId: string | null;
  candidateStage: string | null;
  inviteToken: string;
  templateId: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type Props = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    planName: string;
  };
  firstName: string | null;
  plan: PlanDisplay;
  seatLimit: number | null;
  challenges: Challenge[];
  pipelineChallenges?: any[];
  takeHomes: TakeHome[];
  takeHomeSessions?: TakeHomeSession[];
  aiInterviewSessions?: AIInterviewSessionItem[];
  members: Member[];
  currentUserId: string | null;
  /** Role key → its concrete workspace permissions (wildcards pre-expanded),
   *  used to resolve effective permissions for the members UI. */
  roleBasePermissions: Record<string, string[]>;
  sessions: InterviewSessionItem[];
  candidates: CandidateItem[];
  promptScenarios?: PromptScenario[];
  promptAttempts?: PromptAttemptItem[];
  pendingInvites?: PendingInvite[];
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

const SECTION_TITLES: Record<string, { title: string; body: string }> = {
  assessments: { title: "Assessments", body: "Live interviews, take-homes, AI screenings and their replays." },
  library: { title: "Question library", body: "Challenges and prompt scenarios your team can assign." },
  members: { title: "Members", body: "Who can see candidates and act on them in this workspace." },
  billing: { title: "Billing and plan", body: "Your plan, seats and invoices." },
  integrations: { title: "Integrations", body: "Connect your ATS and try code in the sandbox." },
};

type TabId =
  | "assessments"
  | "library"
  | "members"
  | "billing"
  | "integrations";

const PLAN_BADGES: Record<string, string> = {
  FREE: "text-warning border-warning/25 bg-warning/[0.06]",
  GROWTH: "text-secondary border-secondary/25 bg-secondary/[0.08]",
  ENTERPRISE: "text-success border-success/25 bg-success/[0.06]",
  LOCKED: "text-danger border-danger/25 bg-danger/[0.06]",
};

export default function WorkspaceDashboardClient({
  workspace,
  firstName,
  plan,
  seatLimit,
  challenges,
  pipelineChallenges = [],
  takeHomes,
  takeHomeSessions = [],
  aiInterviewSessions = [],
  members,
  currentUserId,
  roleBasePermissions,
  sessions,
  candidates,
  promptScenarios = [],
  promptAttempts = [],
  pendingInvites = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const viewParam = searchParams.get("view");
  
  const validSections: TabId[] = ["assessments", "library", "members", "billing", "integrations"];
  const activeTab: TabId | "overview" = (sectionParam && validSections.includes(sectionParam as TabId))
    ? (sectionParam as TabId)
    : "overview";

  const assessmentSubTab = (activeTab === "assessments" && viewParam) ? viewParam : "interviews";

  const [interviewSubTab, setInterviewSubTab] = useState<"sessions" | "attempts" | "scenarios">("sessions");
  const [currentPromptScenarios, setCurrentPromptScenarios] = useState<PromptScenario[]>(promptScenarios);
  const [currentPromptAttempts, setCurrentPromptAttempts] = useState<PromptAttemptItem[]>(promptAttempts);
  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [scenarioObjective, setScenarioObjective] = useState("");
  const [scenarioCategory, setScenarioCategory] = useState("code-generation");
  const [scenarioDifficulty, setScenarioDifficulty] = useState("intermediate");
  const [scenarioEstMin, setScenarioEstMin] = useState("10");
  const [scenarioKeywords, setScenarioKeywords] = useState("");
  const [scenarioFormat, setScenarioFormat] = useState("");
  const [scenarioConstraints, setScenarioConstraints] = useState("");
  const [creatingScenario, setCreatingScenario] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  // Overview quick-action: send a one-off take-home without leaving the
  // dashboard (same form/handler as the Assessments → Take-Homes tab).
  const [quickTakeHomeOpen, setQuickTakeHomeOpen] = useState(false);

  
  // Lists data in state so client can append newly created ones instantly
  // Legacy single-challenge assignments — read-only history now that all new
  // take-homes are session-backed (the creation API is gone).
  const currentTakeHomes = takeHomes;
  const [currentMembers, setCurrentMembers] = useState<Member[]>(members);
  // Which member's "Advanced permissions" panel is expanded (id) or null.
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // Resolve a member's effective workspace permissions (role base ± overrides).
  function memberEffective(m: Member): Set<string> {
    return resolveEffective(
      [roleBasePermissions[m.role] ?? []],
      asOverrides(m.permissions),
    );
  }

  // The caller's own effective permissions drive what member controls show.
  const myEffective = useMemo(() => {
    const me = currentMembers.find((m) => m.userId === currentUserId);
    return me ? memberEffective(me) : new Set<string>();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMembers, currentUserId, roleBasePermissions]);
  const canSetRoles = myEffective.has("member:set_role");
  const canRemoveMembers = myEffective.has("member:remove");
  const iAmOwner =
    currentMembers.find((m) => m.userId === currentUserId)?.role === "OWNER";
  
  // Generating Take-Home state. The quick picker offers the same catalog as
  // the multi-question builder (global published + workspace challenges), not
  // just workspace-authored ones.
  const quickChallenges: { id: string; title: string; difficulty?: string }[] =
    pipelineChallenges.length > 0 ? pipelineChallenges : challenges;
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState(quickChallenges[0]?.id || "");
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
        // Secrets are write-only on the API; the disabled inputs show a
        // masked placeholder while connected.
        setAtsApiKey("");
        setAtsWebhookSecret("");
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

  // Load once, in the browser, the first time the Integrations section opens.
  // (A useState initialiser ran this during SSR, where a relative fetch URL
  // throws.)
  useEffect(() => {
    if (activeTab !== "integrations" || fetchedIntegrations) return;
    setFetchedIntegrations(true);
    loadIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchedIntegrations]);

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

  async function handleRunSandbox() {
    if (!sandboxCode.trim()) return;

    setSandboxRunning(true);
    setSandboxOutput("Executing script on secure container pool...\n");
    try {
      const { status, data } = await postExecute({
        language: sandboxLang,
        code: sandboxCode,
        stdin: sandboxInput,
      });

      const output = describeExecution(status, data)
        .map((line) => (line.method === "error" ? `[stderr] ${line.text}` : line.text))
        .join("\n");
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

  // PATCH a member's role and/or permission overrides, then sync local state
  // from the server's authoritative response.
  async function patchMember(
    memberId: string,
    body: { role?: string; permissions?: Record<string, boolean> | null },
  ) {
    setSavingMemberId(memberId);
    try {
      const res = await fetch(`/api/w/${workspace.slug}/members`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, ...body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setCurrentMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, role: data.member.role, permissions: data.member.permissions ?? null }
            : m,
        ),
      );
      return true;
    } catch (err) {
      toast.error("Failed to update teammate", {
        description: err instanceof Error ? err.message : String(err),
      });
      return false;
    } finally {
      setSavingMemberId(null);
    }
  }

  async function handleChangeRole(memberId: string, role: string) {
    if (await patchMember(memberId, { role })) {
      toast.success("Role updated.");
    }
  }

  // Toggle one permission override for a member. We store a *delta*: if the new
  // value matches the role's default we drop the key (back to pure role), else
  // we record the grant/revoke. Sending null when empty clears the column.
  async function handleToggleOverride(m: Member, permission: string, nextValue: boolean) {
    const base = new Set(roleBasePermissions[m.role] ?? []);
    const current = asOverrides(m.permissions) ?? {};
    const next: Record<string, boolean> = { ...current };
    if (base.has(permission) === nextValue) {
      delete next[permission]; // matches role default → no override needed
    } else {
      next[permission] = nextValue;
    }
    const payload = Object.keys(next).length ? next : null;
    if (await patchMember(m.id, { permissions: payload })) {
      toast.success("Permissions updated.");
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
      // One-off invites are 1-question take-home sessions — same model, runner,
      // and review surface as the multi-question builder (no legacy writes).
      const picked = quickChallenges.find((c) => c.id === selectedChallengeId);
      const res = await bulkCreateTakeHomeSessions(workspace.slug, {
        title: picked ? `Take-home: ${picked.title}` : "Take-home assessment",
        curation: {
          challengeIds: [selectedChallengeId],
          playgroundIds: [],
          promptScenarioIds: [],
          perQuestionMinutes: { [selectedChallengeId]: timeLimitMin },
        },
        recipients: [{ name: candidateName.trim(), email: candidateEmail.trim() }],
        daysToExpire,
      });

      if (res.created === 0) {
        const first = res.details[0];
        throw new Error(
          (first && "reason" in first ? first.reason : undefined) ??
            "Failed to create the take-home.",
        );
      }

      toast.success("Take-home sent!", {
        description:
          res.emailed > 0
            ? `Invitation emailed to ${candidateEmail.trim()}.`
            : "Created — the invite email could not be sent, copy the link from the list instead.",
      });

      // Reset form + close the overview quick-action modal if it was the caller
      setCandidateName("");
      setCandidateEmail("");
      setQuickTakeHomeOpen(false);
      // Session list comes from the server payload — refresh to show the new row.
      router.refresh();
    } catch (err) {
      toast.error("Failed to send take-home", {
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

      // IP-73: invites are now pending until accepted — no instant membership.
      toast.success("Invitation sent!", {
        description: `${teammateEmail.trim()} will get an email to join as ${teammateRole.toLowerCase()}.`,
      });

      // Reset form + refresh so the pending-invite list reflects the new invite.
      setTeammateEmail("");
      router.refresh();
    } catch (err) {
      toast.error("Failed to send invite", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setInviting(false);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!window.confirm("Revoke this pending invite?")) return;
    try {
      const res = await fetch(`/api/w/${workspace.slug}/members`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      toast.success("Invite revoked.");
      router.refresh();
    } catch (err) {
      toast.error("Failed to revoke invite", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleCreateScenario(e: React.FormEvent) {
    e.preventDefault();
    if (!scenarioTitle.trim() || !scenarioDesc.trim() || !scenarioObjective.trim()) {
      toast.error("Please fill in the title, description, and objective.");
      return;
    }

    setCreatingScenario(true);
    try {
      const keywords = scenarioKeywords.split(",").map(k => k.trim()).filter(Boolean);
      const constraints = scenarioConstraints.split("\n").map(c => c.trim()).filter(Boolean);
      const expectedTraits = {
        keywords,
        format: scenarioFormat.trim(),
        constraints
      };

      const res = await fetch(`/api/prompt-challenges`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: scenarioTitle,
          description: scenarioDesc,
          objective: scenarioObjective,
          expectedTraits,
          difficulty: scenarioDifficulty,
          category: scenarioCategory,
          estimatedMinutes: parseInt(scenarioEstMin, 10) || 10,
          workspaceId: workspace.id,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("Prompt scenario created successfully!");
      
      if (data.scenario) {
        setCurrentPromptScenarios([data.scenario, ...currentPromptScenarios]);
      }

      // Reset form & close
      setScenarioTitle("");
      setScenarioDesc("");
      setScenarioObjective("");
      setScenarioKeywords("");
      setScenarioFormat("");
      setScenarioConstraints("");
      setScenarioEstMin("10");
      setCreatePromptOpen(false);
    } catch (err) {
      toast.error("Failed to create prompt scenario", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreatingScenario(false);
    }
  }

  async function handleDeleteScenario(id: string) {
    if (!confirm("Are you sure you want to delete this custom scenario?")) return;
    try {
      const res = await fetch(`/api/prompt-challenges/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Scenario deleted successfully!");
      setCurrentPromptScenarios(currentPromptScenarios.filter(s => s.id !== id));
    } catch (err) {
      toast.error("Failed to delete scenario", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const difficultyColor: Record<string, string> = {
    easy: "text-success bg-success/[0.06] border-success/20",
    medium: "text-warning bg-warning/[0.06] border-warning/20",
    hard: "text-danger bg-danger/[0.06] border-danger/20",
  };

  const statusBadgeColor: Record<string, string> = {
    PENDING: "text-warning border-warning/25 bg-warning/[0.06]",
    ACTIVE: "text-secondary border-secondary/25 bg-secondary/[0.08]",
    SUBMITTED: "text-success border-success/25 bg-success/[0.06]",
    EXPIRED: "text-danger border-danger/25 bg-danger/[0.06]",
  };

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

  const currentStats = useMemo(() => {
    switch (activeTab) {
      case "assessments":
        return [
          { label: "Interviews", value: sessions.length + aiInterviewSessions.length },
          { label: "Take-homes", value: currentTakeHomes.length + takeHomeSessions.length },
          { label: "Live now", value: sessions.filter(s => !!s.startedAt && !s.finishedAt).length + aiInterviewSessions.filter(s => !!s.startedAt && !s.finishedAt).length },
          { label: "Completed", value: sessions.filter(s => !!s.finishedAt).length + aiInterviewSessions.filter(s => !!s.finishedAt).length + currentTakeHomes.filter(t => t.status === 'SUBMITTED').length + takeHomeSessions.filter(t => !!t.finishedAt).length },
          { label: "Pending", value: sessions.filter(s => !s.startedAt).length + aiInterviewSessions.filter(s => !s.startedAt && s.status === "PENDING").length + currentTakeHomes.filter(t => t.status === 'PENDING').length + takeHomeSessions.filter(t => t.status === "scheduled" || !t.finishedAt).length },
        ];
      case "library":
        return [
          { label: "Workspace challenges", value: challenges.length },
          { label: "AI scenarios", value: currentPromptScenarios.length },
          { label: "Published", value: challenges.filter(c => c.published).length + currentPromptScenarios.filter(c => c.published).length },
          { label: "Drafts", value: challenges.filter(c => !c.published).length + currentPromptScenarios.filter(c => !c.published).length },
          { label: "Shared templates", value: pipelineChallenges.length },
        ];
      case "members":
      case "billing":
      case "integrations":
      case "overview":
      default:
        return [
          { label: "Challenges", value: Math.max(challenges.length, pipelineChallenges.length) },
          { label: "Interviews", value: sessions.length + aiInterviewSessions.length },
          { label: "Take-homes", value: currentTakeHomes.length + takeHomeSessions.length },
          { label: "Candidates", value: candidates.length },
          { label: "Members", value: currentMembers.length },
        ];
    }
  }, [activeTab, challenges, pipelineChallenges, sessions, aiInterviewSessions, currentTakeHomes, takeHomeSessions, candidates, currentMembers, currentPromptScenarios]);

  return (
    <div className="space-y-6">
      {activeTab !== "overview" && (
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">{SECTION_TITLES[activeTab].title}</h1>
          <p className="text-[15px] text-muted">{SECTION_TITLES[activeTab].body}</p>
        </div>
      )}

      {/* Stat strip for the list sections: one bordered row, numbers in the
          foreground colour; status colour is kept for status, not decoration. */}
      {(activeTab === "assessments" || activeTab === "library") && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden grid grid-cols-2 md:grid-cols-5">
          {currentStats.map((stat, i) => (
            <div
              key={stat.label}
              className={`px-5 py-4 border-border ${i < currentStats.length - 1 ? "md:border-r" : ""} ${
                i % 2 === 0 ? "border-r md:border-r" : ""
              } ${i < currentStats.length - 1 ? "border-b md:border-b-0" : ""} ${i === 4 ? "col-span-2 md:col-span-1" : ""}`}
            >
              <div className="text-[13px] text-muted">{stat.label}</div>
              <div className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums mt-1 text-fg">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Section content — driven by ?section= search param from sidebar */}
      <div className="space-y-5">

        {/* Section Content */}
        <div>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <WorkspaceOverview
              slug={workspace.slug}
              firstName={firstName}
              plan={plan}
              seatLimit={seatLimit}
              setup={{
                assessments: challenges.length + currentTakeHomes.length + takeHomeSessions.length + sessions.length,
                members: currentMembers.length,
                pendingInvites: pendingInvites.length,
              }}
              candidates={candidates}
              sessions={sessions}
              takeHomes={currentTakeHomes}
              takeHomeSessions={takeHomeSessions}
              aiInterviewSessions={aiInterviewSessions}
              onAddCandidate={() => router.push(`/w/${workspace.slug}/candidates?add=1`)}
              onBulkImport={() => router.push(`/w/${workspace.slug}/candidates?import=1`)}
              onSendTakeHome={() => setQuickTakeHomeOpen(true)}
            />
          )}

          {/* LIBRARY */}
          {activeTab === "library" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-fg tracking-tight">Workspace challenges</h3>
                  <p className="text-xs text-muted mt-0.5">Custom challenges created by your team.</p>
                </div>
                <Link
                  href="/admin/challenges/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New challenge</span>
                </Link>
              </div>

              {challenges.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning mx-auto mb-3">
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
                      className="p-4 rounded-xl border border-border bg-surface hover:border-secondary/30 transition-colors group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${difficultyColor[c.difficulty]}`}>
                            {humanize(c.difficulty)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-panel/50 border border-border text-xs font-medium text-muted">
                            {c.template}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-fg truncate group-hover:text-secondary transition-colors">
                          {c.title}
                        </h4>
                      </div>
                      <div className="flex justify-between items-center gap-2 pt-3 mt-3 border-t border-border">
                        <span className="text-xs text-muted font-mono truncate">/{c.slug}</span>
                        <Link
                          href={`/challenges/${c.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline shrink-0"
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

          {/* ASSESSMENTS */}
          {activeTab === "assessments" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <SubTabs
                  label="Assessment views"
                  active={assessmentSubTab}
                  tabs={[
                    { id: "interviews", label: "Interviews", icon: Video },
                    { id: "attempts", label: "Attempts", icon: FileCode2 },
                    { id: "take-homes", label: "Take-homes", icon: ClipboardList },
                    { id: "replays", label: "Replays", icon: Play },
                    { id: "scenarios", label: "Prompt scenarios", icon: Brain },
                  ].map((t) => ({ ...t, href: `/w/${workspace.slug}?section=assessments&view=${t.id}` }))}
                />

                {assessmentSubTab === "interviews" && (
                  <Link
                    href={`/interview/new?workspaceSlug=${workspace.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New interview</span>
                  </Link>
                )}

                {assessmentSubTab === "scenarios" && (
                  <button
                    onClick={() => setCreatePromptOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors shrink-0 animate-fade-in"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create custom scenario</span>
                  </button>
                )}
              </div>

              {/* INTERVIEWS (Live Sessions) */}
              {assessmentSubTab === "interviews" && (
                <>
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-fg tracking-tight">Live interviews</h3>
                      <p className="text-xs text-muted mt-0.5">Real-time pair-programming sessions scheduled by your team.</p>
                    </div>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="rounded-xl border border-border bg-surface p-12 text-center">
                      <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mx-auto mb-3">
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
                          <tr className="bg-elevated/60 border-b border-border text-muted text-xs ">
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
                              ? "text-success border-success/25 bg-success/[0.06]"
                              : isLive
                              ? "text-secondary border-secondary/25 bg-secondary/[0.08]"
                              : "text-warning border-warning/25 bg-warning/[0.06]";
                            const statusLabel = isDone ? "Completed" : isLive ? "Live" : "Scheduled";

                            return (
                              <tr key={s.id} className="hover:bg-panel/30 transition-colors">
                                <td className="px-4 py-3 align-middle">
                                  <div className="font-semibold text-fg text-sm truncate">{s.title}</div>
                                  <div className="text-xs text-muted mt-0.5 font-mono">
                                    {Math.round(s.totalSec / 60)} min · {humanize(s.type)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 align-middle text-xs text-fg">
                                  {s.candidateName || <span className="text-muted/60 italic">—</span>}
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  <div className="text-xs text-fg">{s.interviewerName || "Unknown"}</div>
                                  <div className="text-xs text-muted font-mono mt-0.5">{s.interviewerEmail}</div>
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                  {s.verdict && (
                                    <div className="text-xs text-muted mt-1 capitalize">{s.verdict.replace(/_/g, " ")}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 align-middle font-mono text-xs text-fg">
                                  {s.shortCode || <span className="text-muted/60">—</span>}
                                </td>
                                <td className="px-4 py-3 align-middle text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    {isDone ? (
                                      <Link
                                        href={`/interview/${s.shareToken}`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/10 border border-secondary/25 text-xs font-semibold text-secondary hover:bg-secondary/15 transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                        Review
                                      </Link>
                                    ) : (
                                      <Link
                                        href={`/interview/${s.shareToken}`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-panel/40 border border-border hover:border-secondary/40 text-xs font-semibold text-muted hover:text-fg transition-colors"
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
                </>
              )}

              {/* CANDIDATE ATTEMPTS */}
              {assessmentSubTab === "attempts" && (
                <PromptAttemptsSection
                  promptAttempts={currentPromptAttempts}
                  onSelectAttempt={setSelectedAttempt}
                  sessions={sessions}
                />
              )}

              {/* SCENARIO LIBRARY */}
              {assessmentSubTab === "scenarios" && (
                <ScenarioLibrarySection
                  promptScenarios={currentPromptScenarios}
                  workspaceId={workspace.id}
                  slug={workspace.slug}
                  onOpenCreateModal={() => setCreatePromptOpen(true)}
                  onDeleteScenario={handleDeleteScenario}
                />
              )}

          {/* TAKE-HOMES */}
          {assessmentSubTab === "take-homes" && (
            <div className="space-y-6">
              {/* Invite candidate form */}
              <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-secondary" /> Invite candidate
                    </h3>
                    <p className="text-xs text-muted mt-0.5">Generate a secure expiring invitation link.</p>
                  </div>
                  {/* Primary entry point — the multi-question take-home builder
                      (curate a question set + send to many candidates). The
                      single form below stays for quick one-off invites. */}
                  <Link
                    href={`/w/${workspace.slug}/take-homes/new`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-bg text-xs font-bold shrink-0 hover:opacity-90 transition-opacity"
                  >
                    <Users className="w-3.5 h-3.5" />
                    New take-home →
                  </Link>
                </div>

                <form onSubmit={handleGenerateTakeHome} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Candidate name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="candidate@example.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Challenge</label>
                    <select
                      value={selectedChallengeId}
                      onChange={(e) => setSelectedChallengeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                    >
                      {quickChallenges.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}{c.difficulty ? ` (${humanize(c.difficulty)})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={generating || quickChallenges.length === 0}
                    className="w-full px-3 py-2 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? "Sending…" : "Send invite"}
                  </button>
                </form>
              </div>

              {/* Session-backed take-homes (IP-89) — output of the multi-question builder. */}
              {takeHomeSessions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-secondary" /> Take-home assessments
                    </h3>
                    <span className="text-xs text-muted">{takeHomeSessions.length} sent</span>
                  </div>
                  <div className="rounded-xl border border-border bg-surface overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-elevated/60 border-b border-border text-muted text-xs ">
                          <th className="px-4 py-3 font-semibold">Candidate</th>
                          <th className="px-4 py-3 font-semibold">Assessment</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Deadline</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {takeHomeSessions.map((s) => {
                          const deadline = s.deadlineAt ? new Date(s.deadlineAt) : null;
                          // Stored "expired" (hourly cron) with an in-memory
                          // fallback for rows the sweep hasn't reached yet.
                          const expired =
                            s.status === "expired" ||
                            (!!deadline && Date.now() > deadline.getTime() && s.status !== "completed" && s.status !== "in_progress");
                          const { label, cls } =
                            s.status === "completed"
                              ? { label: "Completed", cls: "text-success border-success/25 bg-success/[0.06]" }
                              : expired
                              ? { label: "Expired", cls: "text-danger border-danger/25 bg-danger/[0.06]" }
                              : s.status === "in_progress"
                              ? { label: "In progress", cls: "text-secondary border-secondary/25 bg-secondary/[0.08]" }
                              : { label: "Sent", cls: "text-warning border-warning/25 bg-warning/[0.06]" };
                          return (
                            <tr key={s.id} className="hover:bg-panel/30 transition-colors">
                              <td className="px-4 py-3 align-middle">
                                <div className="text-xs font-semibold text-fg truncate">{s.candidateName || "—"}</div>
                                <div className="text-xs text-muted font-mono truncate">{s.candidateEmail}</div>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <div className="text-xs text-fg truncate max-w-[240px]">{s.title}</div>
                                <div className="text-xs text-muted">{s.questionCount} question{s.questionCount === 1 ? "" : "s"}</div>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${cls}`}>{label}</span>
                              </td>
                              <td className="px-4 py-3 align-middle text-xs text-muted whitespace-nowrap">{deadline ? deadline.toLocaleDateString() : "—"}</td>
                              <td className="px-4 py-3 align-middle text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!s.candidateAccessToken) return;
                                      navigator.clipboard?.writeText(`${window.location.origin}/take-home/s/${s.candidateAccessToken}`);
                                      toast.success("Candidate link copied");
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-panel/40 border border-border hover:border-secondary/40 text-xs font-semibold text-muted hover:text-fg transition-colors"
                                  >
                                    <Link2 className="w-3 h-3" /> Copy link
                                  </button>
                                  <Link
                                    href={`/w/${workspace.slug}/take-homes/${s.id}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/10 border border-secondary/25 text-xs font-semibold text-secondary hover:bg-secondary/15 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" /> Review
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pipeline */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-fg">Candidate pipeline</h3>

                {currentTakeHomes.length === 0 ? (
                  <div className="rounded-xl border border-border bg-surface p-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mx-auto mb-3">
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
                        <tr className="bg-elevated/60 border-b border-border text-muted text-xs ">
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
                              <div className="text-xs text-muted font-mono mt-0.5">{th.candidateEmail}</div>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-fg">{th.challengeTitle}</td>
                            <td className="px-4 py-3 align-middle">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${statusBadgeColor[th.status]}`}>
                                {humanize(th.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-muted tabular-nums">{th.timeLimitMin} min</td>
                            <td className="px-4 py-3 align-middle">
                              {th.status === "SUBMITTED" && th.score !== null ? (
                                th.attemptId ? (
                                  <Link
                                    href={`/w/${workspace.slug}/attempts/${th.attemptId}`}
                                    className="inline-flex items-center gap-1 text-success font-semibold text-xs hover:underline"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span className="tabular-nums">{th.score}%</span>
                                  </Link>
                                ) : (
                                  <div className="inline-flex items-center gap-1 text-success font-semibold text-xs">
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
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/10 border border-secondary/25 text-xs font-semibold text-secondary hover:bg-secondary/15 transition-colors"
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
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-panel/40 border border-border text-xs font-semibold text-muted hover:text-fg hover:border-secondary/40 transition-colors cursor-pointer"
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

          {/* REPLAYS */}
          {assessmentSubTab === "replays" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-fg tracking-tight">Session replays</h3>
                <p className="text-xs text-muted mt-0.5">
                  Re-watch candidate sessions — keystrokes, code states, and final submissions.
                </p>
              </div>

              {replayItems.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mx-auto mb-3">
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
                      <tr className="bg-elevated/60 border-b border-border text-muted text-xs ">
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
                          ? "text-secondary border-secondary/25 bg-secondary/[0.06]"
                          : "text-secondary border-secondary/25 bg-secondary/[0.08]";
                        return (
                          <tr key={`${r.kind}-${r.id}`} className="hover:bg-panel/30 transition-colors">
                            <td className="px-4 py-3 align-middle">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${sourceColor}`}>
                                {r.kind === "take-home" ? "Take-home" : "Interview"}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-fg">{r.candidate}</td>
                            <td className="px-4 py-3 align-middle text-xs text-fg truncate max-w-[260px]">{r.title}</td>
                            <td className="px-4 py-3 align-middle text-xs text-muted">{tsLabel}</td>
                            <td className="px-4 py-3 align-middle">
                              {r.score !== null ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/10 border border-secondary/25 text-xs font-semibold text-secondary hover:bg-secondary/15 transition-colors"
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
            </div>
          )}


          {/* MEMBERS */}
          {activeTab === "members" && (
            <div className="space-y-6">
              {/* Invite teammate form */}
              <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-secondary" /> Invite teammate
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Add a colleague to this workspace.</p>
                </div>

                <form onSubmit={handleInviteTeammate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Email</label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 w-3.5 h-3.5 text-muted/50" />
                      <input
                        type="email"
                        required
                        placeholder="colleague@company.com"
                        value={teammateEmail}
                        onChange={(e) => setTeammateEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Role</label>
                    <select
                      value={teammateRole}
                      onChange={(e) => setTeammateRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="RECRUITER">Recruiter</option>
                      <option value="INTERVIEWER">Interviewer</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="w-full px-3 py-2 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {inviting ? "Inviting…" : "Invite"}
                  </button>
                </form>
              </div>

              {/* Pending invites (IP-73) — sent but not yet accepted. */}
              {pendingInvites.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-fg">
                    Pending invites ({pendingInvites.length})
                  </h3>
                  <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
                    {pendingInvites.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-fg truncate">{inv.email}</div>
                            <div className="text-xs text-muted ">
                              {inv.role.toLowerCase()} · invited, awaiting acceptance
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:border-danger/40 text-xs font-semibold text-muted hover:text-danger transition-colors shrink-0"
                        >
                          <X className="w-3 h-3" /> Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members listing */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-fg">Teammates ({currentMembers.length})</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentMembers.map((m) => {
                    const isExpanded = expandedMemberId === m.id;
                    const saving = savingMemberId === m.id;
                    const effective = isExpanded ? memberEffective(m) : null;
                    const base = isExpanded
                      ? new Set(roleBasePermissions[m.role] ?? [])
                      : null;
                    return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-border bg-surface p-3.5 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {m.user.image ? (
                            <img
                              src={m.user.image}
                              alt={m.user.name || "Member"}
                              className="w-9 h-9 rounded-lg border border-border bg-bg shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary text-xs font-semibold shrink-0">
                              {m.user.name?.substring(0, 1).toUpperCase() || "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-fg truncate">
                              {m.user.name || "Pending invite"}
                            </div>
                            <div className="text-xs text-muted truncate font-mono mt-0.5">{m.user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {canSetRoles ? (
                            <select
                              value={m.role}
                              disabled={saving}
                              onChange={(e) => handleChangeRole(m.id, e.target.value)}
                              className="px-2 py-1 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 disabled:opacity-50"
                              title="Change role"
                            >
                              {WORKSPACE_ROLE_OPTIONS.map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  disabled={
                                    opt.value === "OWNER" && !iAmOwner && m.role !== "OWNER"
                                  }
                                >
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${roleBadgeClass(m.role)}`}
                            >
                              {humanize(m.role)}
                            </span>
                          )}
                          {canSetRoles && (
                            <button
                              type="button"
                              onClick={() => setExpandedMemberId(isExpanded ? null : m.id)}
                              className={`w-7 h-7 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                                isExpanded
                                  ? "text-secondary bg-secondary/10"
                                  : "text-muted hover:text-fg hover:bg-panel"
                              }`}
                              title="Advanced permissions"
                            >
                              <ChevronRight
                                className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              />
                            </button>
                          )}
                          {canRemoveMembers && m.role !== "OWNER" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTeammate(m.id)}
                              className="w-7 h-7 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer flex items-center justify-center"
                              title="Remove teammate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && effective && base && (
                        <div className="border-t border-border pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-muted">
                              Permissions
                            </span>
                            <span className="text-xs text-muted">
                              Overrides the <span className="font-semibold text-fg">{m.role}</span> defaults
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                            {WORKSPACE_PERMISSIONS.map((perm) => {
                              const checked = effective.has(perm);
                              const overridden = checked !== base.has(perm);
                              return (
                                <label
                                  key={perm}
                                  className="flex items-center gap-2 text-xs text-fg cursor-pointer select-none"
                                  title={perm}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={saving}
                                    onChange={(e) => handleToggleOverride(m, perm, e.target.checked)}
                                    className="accent-secondary w-3.5 h-3.5 disabled:opacity-50"
                                  />
                                  <span className={overridden ? "font-semibold text-secondary" : ""}>
                                    {PERMISSION_LABELS[perm] ?? perm}
                                  </span>
                                  {overridden && (
                                    <span className="text-xs text-secondary" title="Differs from role default">●</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
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
                      <span className="text-xs font-semibold text-muted">Current plan</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${
                          PLAN_BADGES[workspace.planName] || PLAN_BADGES.FREE
                        }`}
                      >
                        {humanize(workspace.planName)}
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
                    className="px-4 py-2 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors shrink-0 disabled:opacity-50"
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
                      <p className="text-xs text-muted mt-0.5">Active billable seats.</p>
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
                            seat <= currentMembers.length ? "bg-secondary" : "bg-panel"
                          }`}
                        />
                      ))
                    ) : (
                      <div className="h-full w-full bg-secondary rounded-full" />
                    )}
                  </div>

                  {workspace.planName === "FREE" ? (
                    <p className="text-xs text-muted flex items-start gap-1.5 leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-warning mt-0.5" />
                      <span>Free workspaces are limited to 3 seats. Upgrade to scale beyond.</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted flex items-start gap-1.5 leading-relaxed">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-secondary mt-0.5" />
                      <span>Growth billing scales with active seats at <span className="text-fg font-semibold">$49 / seat / month</span>.</span>
                    </p>
                  )}
                </div>

                {/* Features list */}
                <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-fg">Growth tier features</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-muted">
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
                        <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
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
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-fg">Applicant Tracking System</h4>
                      <p className="text-xs text-muted">Sync take-home invitations from your ATS.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveAts} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Provider</label>
                      <select
                        value={atsProvider}
                        onChange={(e) => setAtsProvider(e.target.value as any)}
                        disabled={atsActive}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 disabled:opacity-60"
                      >
                        <option value="GREENHOUSE">Greenhouse</option>
                        <option value="LEVER">Lever</option>
                        <option value="ASHBY">Ashby</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">API key</label>
                      <input
                        type="password"
                        placeholder={atsActive ? "••••••••••••••••" : "Paste your ATS API token"}
                        value={atsApiKey}
                        onChange={(e) => setAtsApiKey(e.target.value)}
                        disabled={atsActive}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Webhook secret <span className="text-muted/60 font-normal">(optional)</span></label>
                      <input
                        type="password"
                        placeholder={atsActive ? "••••••••••••••••" : "Webhook signature secret"}
                        value={atsWebhookSecret}
                        onChange={(e) => setAtsWebhookSecret(e.target.value)}
                        disabled={atsActive}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 disabled:opacity-60"
                      />
                    </div>

                    {!atsActive ? (
                      <button
                        type="submit"
                        disabled={atsLoading}
                        className="w-full py-2 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {atsLoading ? "Connecting…" : "Connect"}
                      </button>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="px-3 py-2 rounded-md bg-success/[0.06] border border-success/20 text-success text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Connected</span>
                        </div>

                        {atsSavedUrl && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted">Webhook endpoint URL</span>
                            <div className="px-2.5 py-2 rounded-md border border-border bg-bg font-mono text-xs text-fg select-all break-all">
                              {atsSavedUrl}
                            </div>
                            <span className="text-xs text-muted/70 block mt-1">Add this URL to your ATS webhooks to trigger tests automatically.</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleDisconnectAts}
                          disabled={atsLoading}
                          className="w-full py-2 rounded-md bg-danger/[0.06] border border-danger/25 hover:bg-danger/[0.1] text-danger text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {atsLoading ? "Disconnecting…" : "Disconnect"}
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Scheduling — the real flow lives in interview creation now
                    (IP-90); this card explains it instead of hosting the old
                    disconnected demo form. */}
                <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-fg">Interview scheduling</h4>
                      <p className="text-xs text-muted">Built into interview creation — no separate sync step.</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      Pick a date &amp; time when you create the interview — the candidate gets an
                      invite email with the join link, access code, and scheduled slot.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      Candidates with an Interviewpad account also get an in-app notification.
                    </li>
                  </ul>
                  <Link
                    href={`/interview/new?workspaceSlug=${workspace.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Schedule an interview
                  </Link>
                </div>
              </div>

              {/* Sandbox */}
              <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-fg">Code sandbox</h4>
                    <p className="text-xs text-muted">Run Python, Go, Java, or JS code in a sandboxed runtime.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Language</label>
                      <select
                        value={sandboxLang}
                        onChange={(e) => handleLangChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                      >
                        <option value="python">Python 3.11</option>
                        <option value="go">Go 1.21</option>
                        <option value="java">Java OpenJDK 17</option>
                        <option value="javascript">JavaScript (Node)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Stdin input <span className="text-muted/60 font-normal">(optional)</span></label>
                      <textarea
                        placeholder="Input for the program's stdin…"
                        value={sandboxInput}
                        onChange={(e) => setSandboxInput(e.target.value)}
                        className="w-full h-[80px] p-3 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 resize-none"
                      />
                    </div>

                    <button
                      onClick={handleRunSandbox}
                      disabled={sandboxRunning}
                      className="w-full py-2 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {sandboxRunning ? "Running…" : "Run"}
                    </button>
                  </div>

                  <div className="md:col-span-8 flex flex-col gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-muted">Code</label>
                      <textarea
                        value={sandboxCode}
                        onChange={(e) => setSandboxCode(e.target.value)}
                        className="w-full min-h-[160px] flex-1 p-3 rounded-md border border-border bg-bg text-fg font-mono text-xs focus:outline-none focus:border-secondary/40 leading-relaxed resize-y whitespace-pre"
                      />
                    </div>

                    {sandboxOutput && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted">Output</span>
                        <pre className="font-mono text-xs text-success bg-bg border border-border rounded-md p-3 max-h-[140px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
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

      {/* Quick Send Take-Home modal (overview quick action). Same state +
          handler as the Assessments → Take-Homes invite form. */}
      {quickTakeHomeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setQuickTakeHomeOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-panel/30">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-secondary" />
                <h2 className="text-base font-semibold text-fg">Send take-home assessment</h2>
              </div>
              <button
                onClick={() => setQuickTakeHomeOpen(false)}
                className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateTakeHome} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Candidate name</label>
                  <input
                    type="text"
                    required
                    placeholder="Candidate name"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="candidate@example.com"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Challenge</label>
                <select
                  value={selectedChallengeId}
                  onChange={(e) => setSelectedChallengeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                >
                  {quickChallenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}{c.difficulty ? ` (${humanize(c.difficulty)})` : ""}
                    </option>
                  ))}
                </select>
                {quickChallenges.length === 0 && (
                  <p className="text-xs text-warning pt-1">
                    No challenges available yet — use the multi-question builder below, or create a challenge first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Time limit (min)</label>
                  <input
                    type="number"
                    min={10}
                    max={480}
                    value={timeLimitMin}
                    onChange={(e) => setTimeLimitMin(parseInt(e.target.value, 10) || 60)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Expires in (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={daysToExpire}
                    onChange={(e) => setDaysToExpire(parseInt(e.target.value, 10) || 7)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || quickChallenges.length === 0}
                className="w-full px-3 py-2.5 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "Sending…" : "Send take-home invite"}
              </button>

              <div className="text-center pt-1 border-t border-border">
                <Link
                  href={`/w/${workspace.slug}/take-homes/new`}
                  className="inline-flex items-center gap-1 pt-3 text-xs font-semibold text-secondary hover:underline"
                >
                  Need multiple questions? Open the full take-home builder
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Prompt Scenario Creation Modal */}
      {createPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-panel/30">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-secondary animate-pulse" />
                <h2 className="text-base font-semibold text-fg">Create custom prompt scenario</h2>
              </div>
              <button
                onClick={() => setCreatePromptOpen(false)}
                className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateScenario} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Scenario title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Write a Rest API Spec Generator prompt"
                    value={scenarioTitle}
                    onChange={(e) => setScenarioTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Estimated Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={scenarioEstMin}
                    onChange={(e) => setScenarioEstMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Category</label>
                  <select
                    value={scenarioCategory}
                    onChange={(e) => setScenarioCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  >
                    <option value="code-generation">Code generation</option>
                    <option value="debugging">Debugging</option>
                    <option value="api-design">API Design</option>
                    <option value="data-analysis">Data analysis</option>
                    <option value="system-design">System design</option>
                    <option value="creative">Creative / Docs</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Difficulty</label>
                  <select
                    value={scenarioDifficulty}
                    onChange={(e) => setScenarioDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Scenario Description (Markdown support)</label>
                <p className="text-xs text-muted -mt-0.5">Describe the context, the system setting, or the background information.</p>
                <textarea
                  required
                  placeholder="Provide background context here..."
                  value={scenarioDesc}
                  onChange={(e) => setScenarioDesc(e.target.value)}
                  className="w-full h-24 p-3 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Objective / Task Goal</label>
                <p className="text-xs text-muted -mt-0.5">Explain exactly what the user's prompt needs to achieve.</p>
                <textarea
                  required
                  placeholder="State the objective clearly..."
                  value={scenarioObjective}
                  onChange={(e) => setScenarioObjective(e.target.value)}
                  className="w-full h-20 p-3 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 resize-y"
                />
              </div>

              <div className="border-t border-border/60 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-fg flex items-center gap-1.5 text-secondary">
                  <Sparkles className="w-3.5 h-3.5" /> Grading Helper Traits (Keywords & Constraints)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Expected Keywords (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., sort, filter, pagination, typescript"
                      value={scenarioKeywords}
                      onChange={(e) => setScenarioKeywords(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Output format expectation</label>
                    <input
                      type="text"
                      placeholder="e.g., JSON, markdown codeblock, yaml"
                      value={scenarioFormat}
                      onChange={(e) => setScenarioFormat(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Negative Constraints (One per line)</label>
                  <p className="text-xs text-muted -mt-0.5">Things the prompt must avoid or instruct the AI not to do.</p>
                  <textarea
                    placeholder="e.g., No external styling libraries&#10;Do not use inline styles"
                    value={scenarioConstraints}
                    onChange={(e) => setScenarioConstraints(e.target.value)}
                    className="w-full h-16 p-3 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 resize-y"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setCreatePromptOpen(false)}
                  className="px-4 py-2 rounded-md border border-border text-xs font-medium text-muted hover:text-fg hover:bg-panel transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingScenario}
                  className="px-4 py-2 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {creatingScenario ? "Creating..." : "Create scenario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Attempt Feedback Review Modal */}
      {selectedAttempt && (() => {
        const rubric = selectedAttempt.rubricScores
          ? (typeof selectedAttempt.rubricScores === "string"
              ? JSON.parse(selectedAttempt.rubricScores)
              : selectedAttempt.rubricScores)
          : { clarity: 0, specificity: 0, efficiency: 0, context: 0, constraints: 0, edgeCases: 0 };
        
        const candidateName = getCandidateNameFromSession(selectedAttempt, sessions);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-panel/30">
                <div className="flex items-center gap-2.5">
                  <Brain className="w-5 h-5 text-secondary animate-pulse" />
                  <div>
                    <h2 className="text-base font-semibold text-fg">Prompt evaluation review</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Candidate: <span className="text-fg font-medium">{candidateName}</span> &bull; Scenario: <span className="text-fg font-medium">{selectedAttempt.scenarioTitle}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Score Summary Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left: Overall score circle */}
                  <div className="bg-panel/20 border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-xs font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" /> {selectedAttempt.graderType === "ai" ? "Gemini AI" : "Rules grader"}
                    </div>
                    
                    <span className="text-xs font-bold text-muted ">Overall score</span>
                    <div className="relative flex items-center justify-center my-2">
                      <div className="text-4xl font-semibold text-secondary">{selectedAttempt.score ?? 0}</div>
                      <div className="text-xs text-muted/60 self-end mb-1">/100</div>
                    </div>
                    <span className="text-xs text-muted mt-1">
                      {selectedAttempt.durationSec ? `${Math.round(selectedAttempt.durationSec / 60)}m taken` : "Untimed"} &bull; {selectedAttempt.tokenEstimate} tokens
                    </span>
                  </div>

                  {/* Right: Dimension rubric breakdowns */}
                  <div className="md:col-span-2 bg-panel/10 border border-border/40 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-fg tracking-wide">6-Dimension Rubric Evaluation</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      {Object.entries({
                        Clarity: rubric.clarity,
                        Specificity: rubric.specificity,
                        Efficiency: rubric.efficiency,
                        Context: rubric.context,
                        Constraints: rubric.constraints,
                        "Edge Cases": rubric.edgeCases
                      }).map(([key, val]) => {
                        const score = Number(val || 0);
                        let barColor = "bg-danger";
                        if (score >= 75) barColor = "bg-success";
                        else if (score >= 50) barColor = "bg-warning";
                        
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted font-medium">{key}</span>
                              <span className="text-fg font-semibold">{score}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* AI Feedback */}
                {selectedAttempt.feedback && (
                  <div className="bg-secondary/[0.03] border border-secondary/20 rounded-xl p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Evaluator Feedback Insights
                    </h3>
                    <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedAttempt.feedback}
                    </p>
                  </div>
                )}

                {/* Submitted Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-fg">Candidate's Prompt</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedAttempt.promptText);
                        toast.success("Prompt copied to clipboard!");
                      }}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg hover:bg-panel px-2 py-1 rounded border border-border/40 transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy Prompt
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-fg leading-relaxed bg-bg border border-border rounded-lg p-4 max-h-[220px] overflow-y-auto whitespace-pre-wrap select-text selection:bg-secondary/25">
                    {selectedAttempt.promptText}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end bg-panel/30 border-t border-border px-6 py-4">
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="px-4 py-2 bg-secondary hover:brightness-110 text-bg rounded-md text-xs font-semibold transition-colors"
                >
                  Close review
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function getCandidateNameFromSession(attempt: PromptAttemptItem, sessions: any[]) {
  if (attempt.sessionId) {
    const session = sessions.find((s) => s.id === attempt.sessionId);
    if (session?.candidateName) return session.candidateName;
  }
  return "Practice User / Developer";
}

interface PromptAttemptsSectionProps {
  promptAttempts: PromptAttemptItem[];
  onSelectAttempt: (attempt: PromptAttemptItem) => void;
  sessions: any[];
}

export function PromptAttemptsSection({
  promptAttempts,
  onSelectAttempt,
  sessions,
}: PromptAttemptsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredAttempts = useMemo(() => {
    return promptAttempts.filter((a) => {
      const name = getCandidateNameFromSession(a, sessions).toLowerCase();
      const title = a.scenarioTitle.toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || title.includes(term);
    });
  }, [promptAttempts, searchTerm, sessions]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Prompt evaluation roster</h3>
          <p className="text-xs text-muted mt-0.5">Review submissions from candidates and developers.</p>
        </div>
        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search candidate or scenario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
          />
          <Search className="w-3.5 h-3.5 text-muted/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {filteredAttempts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-panel text-muted/40">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-fg">No attempts found</h4>
            <p className="text-xs text-muted mt-1 max-w-[280px] mx-auto leading-relaxed">
              When candidates complete prompt engineering rounds, their detailed scores and feedback will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-panel/30 text-xs font-semibold text-muted select-none">
                  <th className="px-4 py-3 align-middle font-semibold">Candidate</th>
                  <th className="px-4 py-3 align-middle font-semibold">Scenario</th>
                  <th className="px-4 py-3 align-middle font-semibold">Score</th>
                  <th className="px-4 py-3 align-middle font-semibold">Tokens</th>
                  <th className="px-4 py-3 align-middle font-semibold">Grader</th>
                  <th className="px-4 py-3 align-middle font-semibold">Submitted at</th>
                  <th className="px-4 py-3 align-middle text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAttempts.map((a) => {
                  const name = getCandidateNameFromSession(a, sessions);
                  const isSession = !!a.sessionId;
                  
                  // Score styling
                  const score = a.score ?? 0;
                  let scoreColor = "text-danger bg-danger/10 border-danger/20";
                  if (score >= 75) scoreColor = "text-success bg-success/10 border-success/20";
                  else if (score >= 50) scoreColor = "text-warning bg-warning/10 border-warning/20";

                  return (
                    <tr key={a.id} className="hover:bg-panel/10 text-xs transition-colors group">
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold text-fg group-hover:text-secondary transition-colors">{name}</span>
                          <span className="text-xs text-muted mt-0.5 font-mono">
                            {isSession ? "Interview session" : "Practice mode"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium text-fg">{a.scenarioTitle}</span>
                          <span className="text-xs text-muted mt-0.5 capitalize">
                            {a.scenarioCategory.replace("-", " ")} &bull; {a.scenarioDifficulty}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-bold ${scoreColor}`}>
                          {a.score !== null ? `${a.score}%` : "Ungraded"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle font-mono text-xs text-muted">
                        {a.tokenEstimate}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {a.graderType === "ai" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
                            <Sparkles className="w-2.5 h-2.5" /> Gemini AI
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Rules engine</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-muted">
                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right">
                        <button
                          onClick={() => onSelectAttempt(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/10 border border-secondary/25 text-xs font-semibold text-secondary hover:bg-secondary/15 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface ScenarioLibrarySectionProps {
  promptScenarios: PromptScenario[];
  workspaceId: string;
  slug: string;
  onOpenCreateModal: () => void;
  onDeleteScenario?: (id: string) => void;
}

export function ScenarioLibrarySection({
  promptScenarios,
  workspaceId,
  slug,
  onOpenCreateModal,
  onDeleteScenario,
}: ScenarioLibrarySectionProps) {
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredScenarios = useMemo(() => {
    return promptScenarios.filter((s) => {
      const matchDiff = difficultyFilter === "all" || s.difficulty === difficultyFilter;
      const matchCat = categoryFilter === "all" || s.category === categoryFilter;
      return matchDiff && matchCat;
    });
  }, [promptScenarios, difficultyFilter, categoryFilter]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Prompt challenges library</h3>
          <p className="text-xs text-muted mt-0.5">Manage custom challenges or review platform built-in ones.</p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create custom scenario
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-panel/10 p-2 border border-border/40 rounded-lg">
        <span className="text-xs font-bold text-muted px-2">Filters:</span>
        
        {/* Difficulty */}
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-2 py-1 bg-bg border border-border rounded text-xs text-muted focus:outline-none"
        >
          <option value="all">All difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2 py-1 bg-bg border border-border rounded text-xs text-muted focus:outline-none"
        >
          <option value="all">All categories</option>
          <option value="code-generation">Code generation</option>
          <option value="debugging">Debugging</option>
          <option value="api-design">API Design</option>
          <option value="data-analysis">Data analysis</option>
          <option value="system-design">System design</option>
          <option value="creative">Creative / Docs</option>
        </select>

        <span className="text-xs text-muted/60 ml-auto pr-2 font-mono">
          Showing {filteredScenarios.length} scenarios
        </span>
      </div>

      {filteredScenarios.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-panel text-muted/40">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-fg">No scenarios match your filters</h4>
            <p className="text-xs text-muted mt-1">Try adjusting your filters or create a custom one.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredScenarios.map((s) => {
            const isCustom = s.workspaceId !== null;
            
            // Diff badge
            let diffColor = "text-success bg-success/10 border-success/20";
            if (s.difficulty === "intermediate") diffColor = "text-warning bg-warning/10 border-warning/20";
            else if (s.difficulty === "advanced") diffColor = "text-danger bg-danger/10 border-danger/20";

            return (
              <div
                key={s.id}
                className="group relative flex flex-col bg-surface border border-border hover:border-secondary/40 rounded-xl p-5 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${diffColor}`}>
                      {humanize(s.difficulty)}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-panel/60 border border-border text-muted ">
                      {s.category.replace("-", " ")}
                    </span>
                  </div>
                  
                  {isCustom ? (
                    <span className="text-xs font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/20 animate-pulse">
                      Custom
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted bg-panel px-1.5 py-0.5 rounded border border-border ">
                      Platform Built-in
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-fg group-hover:text-secondary transition-colors mt-3">
                  {s.title}
                </h4>

                <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed">
                  {s.description}
                </p>

                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-muted/60" />
                    <span>Est. {s.estimatedMinutes} mins</span>
                  </div>

                  {isCustom && onDeleteScenario && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScenario(s.id);
                      }}
                      className="inline-flex items-center gap-1 text-danger hover:text-danger hover:bg-danger/10 px-2 py-1 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

