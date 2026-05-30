"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, X, Clock, Users, Send, Layers, Beaker, Brain, Search, Trash2,
  ChevronDown, Sparkles, FileText, CalendarClock, Check, Eye, Mail, Laptop,
  ShieldCheck, CheckCircle2, AlertCircle, Sparkle, RefreshCw
} from "lucide-react";
import { createTakeHomeGroups } from "../../candidates/actions";

export type CurationChallenge = {
  id: string; slug: string; title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number; category: string | null; workspaceOwned?: boolean;
};
export type CurationPrompt = {
  id: string; slug: string; title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number; category: string; workspaceOwned?: boolean;
};
export type CurationPlayground = { id: string; title: string; template: string; isTemplate: boolean };
export type PickCandidate = { id: string; name: string; email: string; stage: string };

type Kind = "challenge" | "playground" | "prompt";
type QItem = { key: string; kind: Kind; id: string; title: string; minutes: number };
type Group = {
  id: string;
  questions: QItem[];
  candidateIds: Set<string>;
  pasted: string;
  pickerOpen: boolean;
  candSearch: string;
};

const DEFAULT_MIN = 30;
let gid = 1;
const newGroup = (): Group => ({
  id: `g${gid++}`,
  questions: [],
  candidateIds: new Set(),
  pasted: "",
  pickerOpen: false,
  candSearch: "",
});

const KIND = {
  challenge: { Icon: Layers, label: "DSA", text: "text-indigo-500 dark:text-indigo-400", chip: "bg-indigo-500/10 border-indigo-500/25" },
  playground: { Icon: Beaker, label: "Playground", text: "text-sky-500 dark:text-sky-400", chip: "bg-sky-500/10 border-sky-500/25" },
  prompt: { Icon: Brain, label: "Prompt", text: "text-fuchsia-500 dark:text-fuchsia-400", chip: "bg-fuchsia-500/10 border-fuchsia-500/25" },
} as const;

// Enhanced themes with background gradients, vibrant shadows, and glowing active states.
const THEMES = [
  {
    badge: "from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500",
    text: "text-indigo-500 dark:text-indigo-400",
    ring: "hover:ring-2 hover:ring-indigo-500/30",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.08)] dark:shadow-[0_0_30px_rgba(99,102,241,0.12)]",
    soft: "bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05]",
    bar: "bg-indigo-500",
    pill: "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20",
    border: "border-indigo-500/20"
  },
  {
    badge: "from-fuchsia-600 to-pink-600 dark:from-fuchsia-500 dark:to-pink-500",
    text: "text-fuchsia-500 dark:text-fuchsia-400",
    ring: "hover:ring-2 hover:ring-fuchsia-500/30",
    glow: "shadow-[0_0_20px_rgba(217,70,239,0.08)] dark:shadow-[0_0_30px_rgba(217,70,239,0.12)]",
    soft: "bg-fuchsia-500/[0.03] dark:bg-fuchsia-500/[0.05]",
    bar: "bg-fuchsia-500",
    pill: "bg-fuchsia-500/10 text-fuchsia-500 dark:text-fuchsia-400 border-fuchsia-500/20",
    border: "border-fuchsia-500/20"
  },
  {
    badge: "from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500",
    text: "text-emerald-500 dark:text-emerald-400",
    ring: "hover:ring-2 hover:ring-emerald-500/30",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.08)] dark:shadow-[0_0_30px_rgba(16,185,129,0.12)]",
    soft: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]",
    bar: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20",
    border: "border-emerald-500/20"
  },
  {
    badge: "from-amber-600 to-orange-600 dark:from-amber-500 dark:to-orange-500",
    text: "text-amber-500 dark:text-amber-400",
    ring: "hover:ring-2 hover:ring-amber-500/30",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.08)] dark:shadow-[0_0_30px_rgba(245,158,11,0.12)]",
    soft: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
    bar: "bg-amber-500",
    pill: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20",
    border: "border-amber-500/20"
  },
  {
    badge: "from-sky-600 to-cyan-600 dark:from-sky-500 dark:to-cyan-500",
    text: "text-sky-500 dark:text-sky-400",
    ring: "hover:ring-2 hover:ring-sky-500/30",
    glow: "shadow-[0_0_20px_rgba(14,165,233,0.08)] dark:shadow-[0_0_30px_rgba(14,165,233,0.12)]",
    soft: "bg-sky-500/[0.03] dark:bg-sky-500/[0.05]",
    bar: "bg-sky-500",
    pill: "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20",
    border: "border-sky-500/20"
  },
];

const AVATARS = ["from-indigo-500 to-violet-500", "from-fuchsia-500 to-pink-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-sky-500 to-cyan-500", "from-rose-500 to-red-500"];
function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function avatarOf(name: string) { return AVATARS[hash(name) % AVATARS.length]; }
function initialsOf(name: string) { return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?"; }

export default function TakeHomeBuilder({
  slug, workspaceName, challenges, prompts, playgrounds, candidates,
}: {
  slug: string; workspaceName: string;
  challenges: CurationChallenge[]; prompts: CurationPrompt[];
  playgrounds: CurationPlayground[]; candidates: PickCandidate[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("Senior Full-stack Engineering Assessment");
  const [daysToExpire, setDaysToExpire] = useState(7);
  const [groups, setGroups] = useState<Group[]>([newGroup()]);
  const [creating, startCreating] = useTransition();

  // Preview Simulator State
  const [previewTab, setPreviewTab] = useState<"email" | "lobby">("lobby");
  const [previewGroupIndex, setPreviewGroupIndex] = useState(0);

  const library = useMemo(() => {
    const m = new Map<string, { kind: Kind; id: string; title: string; minutes: number }>();
    for (const c of challenges) m.set(`challenge:${c.id}`, { kind: "challenge", id: c.id, title: c.title, minutes: c.estimatedMinutes || DEFAULT_MIN });
    for (const p of playgrounds) m.set(`playground:${p.id}`, { kind: "playground", id: p.id, title: p.title, minutes: DEFAULT_MIN });
    for (const p of prompts) m.set(`prompt:${p.id}`, { kind: "prompt", id: p.id, title: p.title, minutes: p.estimatedMinutes || DEFAULT_MIN });
    return m;
  }, [challenges, prompts, playgrounds]);

  const assignedTo = useMemo(() => {
    const m = new Map<string, string>();
    groups.forEach((g) => g.candidateIds.forEach((cid) => m.set(cid, g.id)));
    return m;
  }, [groups]);
  const candById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  function patch(id: string, fn: (g: Group) => Group) { setGroups((gs) => gs.map((g) => (g.id === id ? fn(g) : g))); }
  function addGroup() {
    setGroups((gs) => {
      const ng = newGroup();
      // Auto-focus preview on the newly created group
      setPreviewGroupIndex(gs.length);
      return [...gs, ng];
    });
  }
  function removeGroup(id: string) {
    setGroups((gs) => {
      if (gs.length <= 1) return gs;
      const filtered = gs.filter((g) => g.id !== id);
      setPreviewGroupIndex((prev) => Math.max(0, Math.min(prev, filtered.length - 1)));
      return filtered;
    });
  }
  function addQuestion(groupId: string, key: string) {
    const lib = library.get(key); if (!lib) return;
    patch(groupId, (g) => (g.questions.some((q) => q.key === key) ? g : { ...g, questions: [...g.questions, { key, kind: lib.kind, id: lib.id, title: lib.title, minutes: lib.minutes }] }));
  }
  function removeQuestion(groupId: string, key: string) { patch(groupId, (g) => ({ ...g, questions: g.questions.filter((q) => q.key !== key) })); }
  function setMinutes(groupId: string, key: string, minutes: number) { patch(groupId, (g) => ({ ...g, questions: g.questions.map((q) => (q.key === key ? { ...q, minutes } : q)) })); }
  function toggleCand(groupId: string, cid: string) { patch(groupId, (g) => { const n = new Set(g.candidateIds); n.has(cid) ? n.delete(cid) : n.add(cid); return { ...g, candidateIds: n }; }); }

  function recipientsOf(g: Group): { name: string; email: string }[] {
    const seen = new Set<string>(); const out: { name: string; email: string }[] = [];
    for (const cid of g.candidateIds) { const c = candById.get(cid); if (!c) continue; const k = c.email.toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push({ name: c.name, email: c.email }); }
    for (const line of g.pasted.split(/\r?\n/)) {
      const s = line.trim(); if (!s) continue; let name = "", email = "";
      const m1 = s.match(/^(.+?)\s*<\s*([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)\s*>$/);
      const m2 = s.match(/^(.+?)\s*,\s*([^\s,]+@[^\s,]+\.[^\s,]+)$/);
      if (m1) { name = m1[1].trim().replace(/^["']|["']$/g, ""); email = m1[2]; }
      else if (m2) { name = m2[1].trim(); email = m2[2]; }
      else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) { email = s; name = s.split("@")[0]; }
      else continue;
      const k = email.toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push({ name: name || k.split("@")[0], email });
    }
    return out;
  }

  const groupStats = groups.map((g) => ({ id: g.id, questions: g.questions.length, recipients: recipientsOf(g).length }));
  const totalSessions = groupStats.reduce((s, gs) => s + (gs.questions > 0 ? gs.recipients : 0), 0);
  const validGroups = groupStats.filter((gs) => gs.questions > 0 && gs.recipients > 0).length;
  const canSend = validGroups > 0 && !creating;

  const currentPreviewGroup = groups[Math.min(previewGroupIndex, groups.length - 1)] || groups[0];
  const currentPreviewRecipients = useMemo(() => recipientsOf(currentPreviewGroup), [currentPreviewGroup]);

  function send() {
    if (!canSend) return;
    startCreating(async () => {
      try {
        const payload = {
          title, daysToExpire,
          groups: groups.map((g) => ({
            curation: {
              challengeIds: g.questions.filter((q) => q.kind === "challenge").map((q) => q.id),
              playgroundIds: g.questions.filter((q) => q.kind === "playground").map((q) => q.id),
              promptScenarioIds: g.questions.filter((q) => q.kind === "prompt").map((q) => q.id),
              perQuestionMinutes: Object.fromEntries(g.questions.map((q) => [q.id, q.minutes])),
            },
            recipients: recipientsOf(g),
          })),
        };
        const res = await createTakeHomeGroups(slug, payload);
        toast.success(
          `Created ${res.created} take-home${res.created === 1 ? "" : "s"} across ${res.groups} group${res.groups === 1 ? "" : "s"} — ${res.emailed} emailed.`,
          { description: res.skipped || res.errored ? `${res.skipped} skipped, ${res.errored} errored.` : undefined },
        );
        router.push(`/w/${slug}?section=assessments&view=take-homes`);
      } catch (err) {
        toast.error((err as Error).message ?? "Failed to create take-homes.");
      }
    });
  }

  return (
    <div className="relative pb-32">
      {/* Ambient glassmorphic backgrounds */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-[-10vw] w-[50vw] h-[50vw] rounded-full blur-[160px] bg-violet-600/[0.08] dark:bg-violet-500/[0.12] animate-float" />
        <div className="absolute bottom-[-10vw] left-[-10vw] w-[50vw] h-[50vw] rounded-full blur-[170px] bg-indigo-600/[0.08] dark:bg-indigo-500/[0.08]" />
        <div className="absolute top-[30%] left-[40%] w-[35vw] h-[35vw] rounded-full blur-[180px] bg-fuchsia-500/[0.04] dark:bg-fuchsia-500/[0.05]" />
      </div>

      {/* Recruiter Stepper / Navigation Header */}
      <div className="pb-6 mb-8 border-b border-border/80 flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-fade-in">
        <div>
          <Link href={`/w/${slug}?section=assessments&view=take-homes`}
            className="group inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to assessments
          </Link>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent grid place-items-center animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Design a take-home
            </h1>
          </div>
          <p className="text-xs text-muted mt-2 max-w-xl leading-relaxed">
            Create high-fidelity cohort assessment campaigns. Distribute custom pipelines of coding challenges, prompts, and playgrounds with live tracking metrics.
          </p>
        </div>

        {/* Stepper progress indicator */}
        <div className="flex items-center gap-2 shrink-0 select-none bg-panel/30 border border-border/40 px-3.5 py-2 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-accent text-[10px] font-bold text-bg flex items-center justify-center shadow-sm">1</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg">Campaign Details</span>
          </div>
          <div className="w-4 border-t border-dashed border-border" />
          <div className="flex items-center gap-1.5 opacity-80">
            <span className="w-5 h-5 rounded-full bg-border-strong/50 text-[10px] font-bold text-fg flex items-center justify-center">2</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Cohorts</span>
          </div>
          <div className="w-4 border-t border-dashed border-border" />
          <div className="flex items-center gap-1.5 opacity-80">
            <span className="w-5 h-5 rounded-full bg-border-strong/50 text-[10px] font-bold text-fg flex items-center justify-center">3</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Disseminate</span>
          </div>
        </div>
      </div>

      {/* Main Dual-pane desktop layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left configurator column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Campaign details config */}
          <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-fg">Campaign Core Settings</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/20 text-[9px] font-bold uppercase tracking-wider text-accent">Active Recruiter Config</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted/90 block">
                  Assessment Campaign Title
                </label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Full-stack Engineer Assessment"
                  className="w-full px-4 py-3 rounded-xl bg-panel/50 border border-border focus:border-accent/40 focus:ring-2 focus:ring-accent/10 text-sm text-fg placeholder:text-muted/40 outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted/90 block">
                  Assessment Link Expiry
                </label>
                <div className="relative flex items-center">
                  <input type="number" min={1} max={90} value={daysToExpire}
                    onChange={(e) => setDaysToExpire(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-panel/50 border border-border focus:border-accent/40 focus:ring-2 focus:ring-accent/10 text-sm text-fg text-left outline-none transition-all shadow-inner font-mono font-bold" />
                  <span className="absolute right-4 text-xs font-semibold text-muted">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Groups list */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-fg">Target Cohorts ({groups.length})</h2>
              </div>
              <span className="text-[10px] font-medium text-muted">Each cohort receives a customized curation set</span>
            </div>

            <div className="space-y-6">
              {groups.map((g, gi) => (
                <div key={g.id} onClick={() => setPreviewGroupIndex(gi)} className="cursor-pointer">
                  <GroupCard
                    group={g} index={gi} canRemove={groups.length > 1}
                    challenges={challenges} prompts={prompts} playgrounds={playgrounds} candidates={candidates}
                    assignedTo={assignedTo} stats={groupStats.find((s) => s.id === g.id)!}
                    isActive={previewGroupIndex === gi}
                    onPatch={(fn) => patch(g.id, fn)} onRemove={() => removeGroup(g.id)}
                    onAddQuestion={(key) => addQuestion(g.id, key)} onRemoveQuestion={(key) => removeQuestion(g.id, key)}
                    onSetMinutes={(key, m) => setMinutes(g.id, key, m)} onToggleCand={(cid) => toggleCand(g.id, cid)}
                  />
                </div>
              ))}
            </div>

            <button type="button" onClick={addGroup}
              className="group w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border border-dashed border-border bg-surface/10 hover:bg-accent/[0.02] text-xs font-bold uppercase tracking-wider text-muted hover:text-accent hover:border-accent/40 transition-all active:scale-[0.99] duration-300">
              <span className="w-6 h-6 rounded-full border border-current grid place-items-center group-hover:rotate-90 transition-transform"><Plus className="w-4 h-4" /></span>
              Add another cohort group
            </button>
          </div>
        </div>

        {/* Right Preview Simulator Column */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="rounded-2xl border border-border bg-surface/30 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden animate-slide-up">
            
            {/* Simulation Header */}
            <div className="p-4 border-b border-border/50 bg-panel/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-fg">Candidate View Simulator</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Previewing: Group {previewGroupIndex + 1}
              </div>
            </div>

            {/* Preview Selector Tabs */}
            <div className="px-4 pt-3 flex gap-2 border-b border-border/20 bg-surface/10">
              <button
                type="button"
                onClick={() => setPreviewTab("email")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  previewTab === "email"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-fg"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Invite Email
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("lobby")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  previewTab === "lobby"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-fg"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                Candidate Lobby
              </button>
            </div>

            {/* Simulation Area */}
            <div className="p-5 bg-panel/10 min-h-[460px] flex items-center justify-center">
              
              {/* Tab 1: Simulated Invite Email */}
              {previewTab === "email" && (
                <div className="w-full max-w-sm rounded-xl border border-border/80 bg-bg p-5 shadow-lg relative animate-scale-in">
                  <div className="absolute top-3 right-3 text-[9px] font-bold uppercase text-muted tracking-wider flex items-center gap-1 bg-panel px-2 py-0.5 rounded">
                    📬 INBOX PREVIEW
                  </div>
                  
                  {/* Email envelope details */}
                  <div className="border-b border-border/50 pb-3 mb-4 text-[10px] text-muted space-y-1">
                    <div><span className="font-semibold text-fg">From:</span> {workspaceName} via <span className="font-mono text-accent">Interviewpad Invites</span></div>
                    <div><span className="font-semibold text-fg">To:</span> {currentPreviewRecipients.length > 0 ? `${currentPreviewRecipients[0].name} <${currentPreviewRecipients[0].email}>` : "candidate@talentpool.net"}</div>
                    <div><span className="font-semibold text-fg">Subject:</span> Coding assessment invitation for {workspaceName}</div>
                  </div>

                  {/* Brand header */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center">I</span>
                    <span className="text-xs font-black tracking-tight text-fg">Interviewpad</span>
                  </div>

                  {/* Email message body */}
                  <div className="space-y-3.5">
                    <h3 className="text-sm font-bold text-fg">Hi {currentPreviewRecipients.length > 0 ? currentPreviewRecipients[0].name.split(" ")[0] : "Developer"},</h3>
                    
                    <p className="text-[11px] text-muted leading-relaxed">
                      We are excited to move forward with your application. <span className="font-bold text-fg">{workspaceName}</span> has invited you to complete a take-home assessment:
                    </p>

                    {/* Invitation Card */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-panel/30 text-left space-y-2">
                      <div className="text-xs font-extrabold text-fg">{title || "Technical Skills Assessment"}</div>
                      <div className="flex flex-wrap gap-2 text-[10px] text-muted">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-accent" /> {currentPreviewGroup.questions.reduce((sum, q) => sum + q.minutes, 0)} mins total</span>
                        <span>•</span>
                        <span>{currentPreviewGroup.questions.length} challenge{currentPreviewGroup.questions.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted leading-relaxed">
                      You can complete this assessment in your browser at any time over the next <span className="font-bold text-fg">{daysToExpire} days</span>. It features a private IDE environment with multiple language options.
                    </p>

                    {/* Email Action button */}
                    <div className="pt-2">
                      <div className="w-full text-center py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/10 cursor-pointer">
                        Get Started
                      </div>
                    </div>

                    <p className="text-[9px] text-muted/60 leading-normal text-center pt-2">
                      Need help? Reply to this email or contact support@interviewpad.co.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Simulated Assessment Lobby */}
              {previewTab === "lobby" && (
                <div className="w-full max-w-sm rounded-xl border border-border/80 bg-bg overflow-hidden shadow-lg relative animate-scale-in">
                  
                  {/* Lobby header banner */}
                  <div className="h-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600" />
                  
                  <div className="p-5 space-y-4">
                    {/* Brand line */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center">I</span>
                        <span className="text-[10px] font-bold text-fg">Interviewpad Workspace Lobby</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[8px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                        Pending Start
                      </span>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-fg tracking-tight">{title || "Technical Skills Assessment"}</h3>
                      <div className="text-[10px] text-muted flex items-center gap-2">
                        <span>Invited by <span className="font-semibold text-fg">{workspaceName}</span></span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5"><CalendarClock className="w-3 h-3 text-accent" /> {daysToExpire} days left</span>
                      </div>
                    </div>

                    {/* Rules panel */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-panel/30 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Integrity Check Rules
                      </div>
                      <p className="text-[10px] text-muted leading-relaxed">
                        To maintain candidate fairness, focus changes (tab blur), clipboard actions, and AI code generation detections are actively logged during active timers.
                      </p>
                    </div>

                    {/* Curation List */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted/80">
                        Assessment Syllabus ({currentPreviewGroup.questions.length})
                      </div>
                      {currentPreviewGroup.questions.length === 0 ? (
                        <div className="text-center py-4 rounded-xl border border-dashed border-border bg-panel/10 text-[10px] text-muted italic">
                          No challenges added to this cohort.
                        </div>
                      ) : (
                        <ul className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {currentPreviewGroup.questions.map((q, qi) => {
                            const k = KIND[q.kind];
                            return (
                              <li key={q.key} className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-panel/20 text-[11px]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-5 h-5 rounded grid place-items-center ${k.chip} ${k.text}`}><k.Icon className="w-3 h-3" /></span>
                                  <span className="font-bold text-fg truncate">{q.title}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-border-strong/30 font-mono font-bold text-fg">{q.minutes}m</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {/* Start Action button */}
                    <div className="pt-2">
                      <button type="button" disabled
                        className="w-full text-center py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/10 cursor-not-allowed opacity-80 flex items-center justify-center gap-1.5">
                        I'm ready — start the timer
                      </button>
                      <span className="block text-[8px] text-muted text-center mt-1.5">
                        * Clicking above commits active state. Individual timers run per task.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action control bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,640px)] animate-slide-up">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface/85 backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_48px_rgba(0,0,0,0.4)] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 transition-colors ${canSend ? "bg-accent/15 text-accent animate-pulse" : "bg-panel text-muted"}`}>
              <Sparkle className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-xl font-black text-fg tabular-nums flex items-baseline gap-1">
                {totalSessions}
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">invitation{totalSessions === 1 ? "" : "s"}</span>
              </div>
              <div className="text-[10px] font-semibold text-muted">{validGroups} Active Campaign Cohort{validGroups === 1 ? "" : "s"}</div>
            </div>
          </div>
          <button type="button" onClick={send} disabled={!canSend}
            className={`relative overflow-hidden inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed duration-300 ${
              canSend ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5" : "bg-panel text-muted border border-border"
            }`}>
            {canSend && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent bg-[length:200%_100%] animate-shimmer" />}
            <Send className="w-3.5 h-3.5 relative" />
            <span className="relative">{creating ? "Disseminating…" : `Send Invites (${totalSessions})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupCard({
  group: g, index, canRemove, challenges, prompts, playgrounds, candidates, assignedTo, stats, isActive,
  onPatch, onRemove, onAddQuestion, onRemoveQuestion, onSetMinutes, onToggleCand,
}: {
  group: Group; index: number; canRemove: boolean;
  challenges: CurationChallenge[]; prompts: CurationPrompt[]; playgrounds: CurationPlayground[]; candidates: PickCandidate[];
  assignedTo: Map<string, string>; stats: { questions: number; recipients: number }; isActive: boolean;
  onPatch: (fn: (g: Group) => Group) => void; onRemove: () => void;
  onAddQuestion: (key: string) => void; onRemoveQuestion: (key: string) => void;
  onSetMinutes: (key: string, m: number) => void; onToggleCand: (cid: string) => void;
}) {
  const theme = THEMES[index % THEMES.length];
  const inGroup = new Set(g.questions.map((q) => q.key));
  const sessions = stats.questions > 0 ? stats.recipients : 0;

  const candFilter = g.candSearch.trim().toLowerCase();
  const visibleCands = candidates.filter((c) =>
    !candFilter || c.name.toLowerCase().includes(candFilter) || c.email.toLowerCase().includes(candFilter) || c.stage.toLowerCase().includes(candFilter));
  const availableHere = visibleCands.filter((c) => { const a = assignedTo.get(c.id); return !a || a === g.id; });
  const allAvailPicked = availableHere.length > 0 && availableHere.every((c) => g.candidateIds.has(c.id));

  // Custom searchable popover state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTab, setPickerTab] = useState<"all" | "dsa" | "playground" | "prompt">("all");

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(pickerSearch.toLowerCase());
      const notInGroup = !inGroup.has(`challenge:${c.id}`);
      return matchSearch && notInGroup;
    });
  }, [challenges, pickerSearch, inGroup]);

  const filteredPlaygrounds = useMemo(() => {
    return playgrounds.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(pickerSearch.toLowerCase());
      const notInGroup = !inGroup.has(`playground:${p.id}`);
      return matchSearch && notInGroup;
    });
  }, [playgrounds, pickerSearch, inGroup]);

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(pickerSearch.toLowerCase());
      const notInGroup = !inGroup.has(`prompt:${p.id}`);
      return matchSearch && notInGroup;
    });
  }, [prompts, pickerSearch, inGroup]);

  const totalFilteredCount = filteredChallenges.length + filteredPlaygrounds.length + filteredPrompts.length;

  return (
    <div className={`group/card relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm ${theme.ring} ${
      isActive 
        ? `border-fg/30 bg-surface/80 ${theme.glow} ring-2 ring-accent/20` 
        : "border-border bg-surface/50 hover:bg-surface/70"
    } animate-slide-up`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.bar}`} />
      <div className={`absolute inset-0 -z-10 ${theme.soft}`} />

      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${theme.badge} text-white text-xs font-black grid place-items-center shadow-md`}>{index + 1}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase text-fg leading-none tracking-wider">Cohort {index + 1}</h3>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                )}
              </div>
              <div className="text-[10px] text-muted/80 mt-1 font-semibold">{stats.questions} question{stats.questions === 1 ? "" : "s"} · {stats.recipients} candidate{stats.recipients === 1 ? "" : "s"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wider uppercase tabular-nums ${theme.pill}`}>{sessions} campaign invitation{sessions === 1 ? "" : "s"}</span>
            {canRemove && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Remove group"><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>

        {/* Questions Curation Area */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted/85">Configure Syllabus</div>
          {g.questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-panel/10 px-4 py-6 text-center text-xs text-muted/80">
              No challenges mapped yet. Choose from the repository index below.
            </div>
          ) : (
            <ul className="space-y-2">
              {g.questions.map((q, qi) => {
                const k = KIND[q.kind];
                return (
                  <li key={q.key} style={{ animationDelay: `${qi * 30}ms` }}
                    className="group/q flex items-center gap-2.5 p-3 rounded-xl border border-border/80 bg-panel/30 hover:bg-panel/60 transition-all hover:border-fg/10 animate-pop-in">
                    <span className={`w-8 h-8 rounded-lg grid place-items-center border shrink-0 ${k.chip} ${k.text}`}><k.Icon className="w-4 h-4" /></span>
                    <span className={`text-[9px] font-black uppercase tracking-widest w-16 shrink-0 ${k.text}`}>{k.label}</span>
                    <span className="text-xs font-bold text-fg truncate flex-1">{q.title}</span>
                    
                    {/* Time limit configuration */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-bg rounded-lg border border-border/60 px-2 py-1">
                      <input type="number" min={5} max={1440} value={q.minutes}
                        onChange={(e) => onSetMinutes(q.key, Math.max(5, Math.min(1440, Number(e.target.value) || DEFAULT_MIN)))}
                        className="w-10 bg-transparent text-xs text-fg font-bold font-mono text-right outline-none" />
                      <span className="text-[9px] font-bold uppercase text-muted">mins</span>
                      <Clock className="w-3 h-3 text-muted/40" />
                    </div>
                    <button type="button" onClick={() => onRemoveQuestion(q.key)} className="w-6 h-6 grid place-items-center rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/q:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Premium Searchable Question Picker Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border/80 bg-panel hover:border-accent/40 text-xs font-bold tracking-wide text-fg/80 hover:text-fg transition-all"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" />
                Add questions from repo...
              </span>
              <ChevronDown className={`w-4 h-4 text-muted transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
            </button>

            {pickerOpen && (
              <div className="absolute top-[105%] left-0 right-0 z-20 rounded-xl border border-border/90 bg-surface shadow-xl p-3.5 space-y-3 animate-scale-in origin-top">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search database by title..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg border border-border focus:border-accent/40 text-xs text-fg outline-none transition-all"
                  />
                </div>

                {/* Question Type Filter Segment Control */}
                <div className="flex gap-1 bg-panel p-1 rounded-lg">
                  {(["all", "dsa", "playground", "prompt"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPickerTab(tab)}
                      className={`flex-1 text-[9px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-all ${
                        pickerTab === tab ? "bg-bg text-fg shadow-sm" : "text-muted hover:text-fg"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Filtered list rendering */}
                <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                  {totalFilteredCount === 0 ? (
                    <div className="text-center py-6 text-xs text-muted italic">
                      No matching uncurated items found.
                    </div>
                  ) : (
                    <>
                      {/* DSA Challenges category */}
                      {(pickerTab === "all" || pickerTab === "dsa") && filteredChallenges.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { onAddQuestion(`challenge:${c.id}`); setPickerSearch(""); }}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-panel/30 hover:bg-accent/[0.04] text-left transition-colors border border-border/30 hover:border-accent/20"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="block text-xs font-bold text-fg truncate">{c.workspaceOwned ? "★ " : ""}{c.title}</span>
                            <span className="text-[9px] font-bold text-indigo-500 uppercase">DSA · {c.category || "General"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                              c.difficulty === "easy" 
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                : c.difficulty === "hard" 
                                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>
                              {c.difficulty}
                            </span>
                            <span className="text-[9px] font-mono text-muted font-bold">{c.estimatedMinutes}m</span>
                          </div>
                        </button>
                      ))}

                      {/* Playgrounds category */}
                      {(pickerTab === "all" || pickerTab === "playground") && filteredPlaygrounds.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { onAddQuestion(`playground:${p.id}`); setPickerSearch(""); }}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-panel/30 hover:bg-accent/[0.04] text-left transition-colors border border-border/30 hover:border-accent/20"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="block text-xs font-bold text-fg truncate">{p.title}</span>
                            <span className="text-[9px] font-bold text-sky-500 uppercase">Playground Template</span>
                          </div>
                          <span className="text-[9px] font-mono text-muted font-bold shrink-0">{DEFAULT_MIN}m</span>
                        </button>
                      ))}

                      {/* Prompts category */}
                      {(pickerTab === "all" || pickerTab === "prompt") && filteredPrompts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { onAddQuestion(`prompt:${p.id}`); setPickerSearch(""); }}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-panel/30 hover:bg-accent/[0.04] text-left transition-colors border border-border/30 hover:border-accent/20"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="block text-xs font-bold text-fg truncate">{p.workspaceOwned ? "★ " : ""}{p.title}</span>
                            <span className="text-[9px] font-bold text-fuchsia-500 uppercase">AI Prompt · {p.category}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                              p.difficulty === "beginner" 
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                : p.difficulty === "advanced" 
                                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>
                              {p.difficulty}
                            </span>
                            <span className="text-[9px] font-mono text-muted font-bold">{p.estimatedMinutes}m</span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Candidates Panel */}
        <div className="space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted/85">Candidate Allocations</div>
          <button type="button" onClick={() => onPatch((gr) => ({ ...gr, pickerOpen: !gr.pickerOpen }))}
            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              g.pickerOpen ? "border-accent/50 bg-panel shadow-inner" : "border-border bg-panel hover:border-accent/40"
            }`}>
            <span className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-accent shrink-0" />
              {g.candidateIds.size > 0
                ? <span className="text-fg">{g.candidateIds.size} Candidate{g.candidateIds.size === 1 ? "" : "s"} Selected</span>
                : <span className="font-semibold text-muted/60">Choose campaign invitees...</span>}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform duration-300 ${g.pickerOpen ? "rotate-180" : ""}`} />
          </button>

          {g.candidateIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[...g.candidateIds].map((cid) => {
                const c = candidates.find((x) => x.id === cid); if (!c) return null;
                return (
                  <span key={cid} className="group/chip inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-panel/80 border border-border text-[10px] font-bold text-fg animate-pop-in">
                    <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarOf(c.name)} text-white text-[8px] font-black grid place-items-center`}>{initialsOf(c.name)}</span>
                    {c.name}
                    <button type="button" onClick={() => onToggleCand(cid)} className="text-muted hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
            </div>
          )}

          {g.pickerOpen && (
            <div className="rounded-xl border border-border bg-panel/30 p-3.5 space-y-3.5 animate-scale-in origin-top">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={g.candSearch} onChange={(e) => onPatch((gr) => ({ ...gr, candSearch: e.target.value }))} placeholder="Search names, email addresses..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg border border-border focus:border-accent/40 text-xs text-fg outline-none transition-all" />
                </div>
                {availableHere.length > 0 && (
                  <button type="button"
                    onClick={() => onPatch((gr) => { const n = new Set(gr.candidateIds); if (allAvailPicked) availableHere.forEach((c) => n.delete(c.id)); else availableHere.forEach((c) => n.add(c.id)); return { ...gr, candidateIds: n }; })}
                    className="px-3 py-2 rounded-lg border border-border bg-bg hover:bg-panel hover:border-accent/40 text-[9px] font-black uppercase tracking-wider text-fg shrink-0 transition-all active:scale-95">
                    {allAvailPicked ? "Clear" : `All (${availableHere.length})`}
                  </button>
                )}
              </div>

              {/* Selection checklist */}
              <div className="max-h-[180px] overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                {availableHere.length === 0 ? (
                  <div className="text-center text-xs text-muted py-4">
                    {visibleCands.length === 0 ? "No candidates found." : "Everyone is already assigned to a cohort group."}
                  </div>
                ) : availableHere.map((c) => {
                  const checked = g.candidateIds.has(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => onToggleCand(c.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${checked ? "bg-accent/[0.04] border border-accent/15" : "hover:bg-bg border border-transparent"}`}>
                      <span className={`w-4 h-4 rounded-[5px] border grid place-items-center shrink-0 transition-colors ${checked ? "bg-accent border-accent text-bg" : "border-border"}`}>
                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarOf(c.name)} text-white text-[9px] font-bold grid place-items-center shrink-0`}>{initialsOf(c.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-fg truncate">{c.name}</span>
                        <span className="block text-[9px] text-muted truncate">{c.email}</span>
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-border-strong/20 text-muted shrink-0">{c.stage}</span>
                    </button>
                  );
                })}
              </div>

              {/* Paste multi-email textarea parser */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-muted/70">
                  <span>Fast Batch Paste Parser</span>
                  <span className="text-accent">e.g. John Doe, john@net.com</span>
                </div>
                <textarea value={g.pasted} onChange={(e) => onPatch((gr) => ({ ...gr, pasted: e.target.value }))} rows={2}
                  placeholder="Or paste emails — one per line (Name <email@domain.com> or email@domain.com)"
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border focus:border-accent/40 text-xs text-fg outline-none transition-all font-mono" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
