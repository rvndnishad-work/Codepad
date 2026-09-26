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
  Mail,
  UserPlus,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronRight,
  X,
} from "lucide-react";
import { describeExecution } from "@/lib/exec-result";
import { postExecute } from "@/lib/execute-client";
import WorkspaceOverview from "./WorkspaceOverview";
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
  members: { title: "Members", body: "Who can see candidates and act on them in this workspace." },
  billing: { title: "Billing and plan", body: "Your plan, seats and invoices." },
  integrations: { title: "Integrations", body: "Connect your ATS and try code in the sandbox." },
};

type TabId =
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
  takeHomes,
  takeHomeSessions = [],
  aiInterviewSessions = [],
  members,
  currentUserId,
  roleBasePermissions,
  sessions,
  candidates,
  pendingInvites = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  
  const validSections: TabId[] = ["members", "billing", "integrations"];
  const activeTab: TabId | "overview" = (sectionParam && validSections.includes(sectionParam as TabId))
    ? (sectionParam as TabId)
    : "overview";

  // Legacy single-challenge assignments, read only; the overview counts them.
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




  return (
    <div className="space-y-6">
      {activeTab !== "overview" && (
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">{SECTION_TITLES[activeTab].title}</h1>
          <p className="text-[15px] text-muted">{SECTION_TITLES[activeTab].body}</p>
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
              onSendTakeHome={() => router.push(`/w/${workspace.slug}/take-homes/new`)}
            />
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
                    href={`/w/${workspace.slug}/interviews/new`}
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

    </div>
  );}
