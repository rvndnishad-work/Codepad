"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, X, Clock, Users, Send, Layers, Beaker, Brain, Search, Trash2,
  ChevronDown, Sparkles, FileText, CalendarClock, Check, Mail, Monitor, Eye, Info,
  Lock, Shield, AlertCircle, ArrowRight, Sparkle, Settings
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
type Group = { id: string; questions: QItem[]; candidateIds: Set<string>; pasted: string; pickerOpen: boolean; candSearch: string };

const DEFAULT_MIN = 30;
let gid = 1;
const newGroup = (): Group => ({ id: `g${gid++}`, questions: [], candidateIds: new Set(), pasted: "", pickerOpen: false, candSearch: "" });

const KIND = {
  challenge: { Icon: Layers, label: "DSA", text: "text-indigo-500 dark:text-indigo-400", chip: "bg-indigo-500/10 border-indigo-500/25", color: "indigo" },
  playground: { Icon: Beaker, label: "Playground", text: "text-sky-500 dark:text-sky-400", chip: "bg-sky-500/10 border-sky-500/25", color: "sky" },
  prompt: { Icon: Brain, label: "Prompt", text: "text-fuchsia-500 dark:text-fuchsia-400", chip: "bg-fuchsia-500/10 border-fuchsia-500/25", color: "fuchsia" },
} as const;

const THEMES = [
  { badge: "from-indigo-500 via-purple-500 to-pink-500", text: "text-indigo-500 dark:text-indigo-400", ring: "hover:ring-indigo-500/30", soft: "bg-indigo-500/[0.03]", bar: "bg-indigo-500", pill: "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20" },
  { badge: "from-fuchsia-500 via-pink-500 to-rose-500", text: "text-fuchsia-500 dark:text-fuchsia-400", ring: "hover:ring-fuchsia-500/30", soft: "bg-fuchsia-500/[0.03]", bar: "bg-fuchsia-500", pill: "bg-fuchsia-500/10 text-fuchsia-500 dark:text-fuchsia-400 border-fuchsia-500/20" },
  { badge: "from-emerald-500 via-teal-500 to-cyan-500", text: "text-emerald-500 dark:text-emerald-400", ring: "hover:ring-emerald-500/30", soft: "bg-emerald-500/[0.03]", bar: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20" },
  { badge: "from-amber-500 via-orange-500 to-red-500", text: "text-amber-500 dark:text-amber-400", ring: "hover:ring-amber-500/30", soft: "bg-amber-500/[0.03]", bar: "bg-amber-500", pill: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20" },
  { badge: "from-sky-500 via-blue-500 to-indigo-500", text: "text-sky-500 dark:text-sky-400", ring: "hover:ring-sky-500/30", soft: "bg-sky-500/[0.03]", bar: "bg-sky-500", pill: "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20" },
];

const AVATARS = [
  "from-indigo-500 to-purple-500",
  "from-fuchsia-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-blue-500",
  "from-rose-500 to-red-500"
];

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
  const [title, setTitle] = useState("Take-home assessment");
  const [daysToExpire, setDaysToExpire] = useState(7);
  const [groups, setGroups] = useState<Group[]>([newGroup()]);
  const [creating, startCreating] = useTransition();

  // Preview Panel States
  const [previewTab, setPreviewTab] = useState<"email" | "lobby">("email");
  const [previewGroupIndex, setPreviewGroupIndex] = useState<number>(0);

  // Sync active group preview if index gets out of bounds
  useEffect(() => {
    if (previewGroupIndex >= groups.length) {
      setPreviewGroupIndex(Math.max(0, groups.length - 1));
    }
  }, [groups.length, previewGroupIndex]);

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
    setGroups((gs) => [...gs, newGroup()]);
    setPreviewGroupIndex(groups.length);
  }
  function removeGroup(id: string) { 
    setGroups((gs) => (gs.length <= 1 ? gs : gs.filter((g) => g.id !== id))); 
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
          { description: res.skipped || res.errored ? `${res.skipped} skipped, ${res.errored} errored.` : undefined }
        );
        router.push(`/w/${slug}?section=assessments&view=take-homes`);
      } catch (err) {
        toast.error((err as Error).message ?? "Failed to create take-homes.");
      }
    });
  }

  // Active Cohort details for the live preview simulation panel
  const activeGroup = groups[previewGroupIndex] || groups[0];
  const activeGroupRecipients = activeGroup ? recipientsOf(activeGroup) : [];
  const totalActiveMinutes = activeGroup ? activeGroup.questions.reduce((sum, q) => sum + q.minutes, 0) : 0;
  const sampleCandidateName = activeGroupRecipients[0]?.name || "Candidate Name";

  return (
    <div className="relative pb-32">
      {/* Ambient background glows */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-bg">
        <div className="absolute -top-36 right-0 w-[55vw] h-[55vw] rounded-full blur-[160px] bg-violet-600/10 dark:bg-violet-500/15 animate-pulse duration-10000" />
        <div className="absolute -bottom-20 -left-20 w-[45vw] h-[45vw] rounded-full blur-[150px] bg-indigo-500/10 dark:bg-indigo-600/10" />
        <div className="absolute top-1/4 left-1/3 w-[35vw] h-[35vw] rounded-full blur-[180px] bg-fuchsia-500/[0.05] dark:bg-fuchsia-500/[0.08]" />
      </div>

      {/* Modern Workflow Progress Header */}
      <div className="pb-6 mb-8 border-b border-border/80 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
        <div>
          <Link href={`/w/${slug}?section=assessments&view=take-homes`}
            className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-fg transition-all">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back to assessments
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Design a take-home
          </h1>
          <p className="text-xs text-muted mt-2 max-w-2xl leading-relaxed">
            Create tailored, high-integrity take-home assessments. Build custom cohorts by grouping specific challenges with target candidates. Each receives a highly secured private workspace with dynamic test tracking.
          </p>
        </div>

        {/* Dynamic Timeline Workflow Stepper */}
        <div className="flex items-center gap-2 bg-panel/60 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2 text-[10px] uppercase tracking-wider font-bold shrink-0 shadow-sm">
          <span className="text-accent flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> 1. Base details</span>
          <span className="text-muted/40">/</span>
          <span className="text-fg flex items-center gap-1.5"><Sparkle className="w-3.5 h-3.5 text-accent animate-spin" /> 2. Cohorts ({groups.length})</span>
          <span className="text-muted/40">/</span>
          <span className={`transition-all ${canSend ? "text-accent" : "text-muted/50"}`}>3. Dispatch</span>
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Configurator Column (60% width on Desktop) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Base Configuration Settings */}
          <div className="rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl shadow-md p-6 space-y-5 animate-fade-in relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/5 to-transparent rounded-bl-full pointer-events-none" />
            
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Settings className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-fg">Global Branding & Limits</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="sm:col-span-2 space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  <FileText className="w-3.5 h-3.5 text-accent" /> Campaign Title — Visible to candidates
                </label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-panel/75 border border-border focus:border-accent/40 focus:ring-1 focus:ring-accent/20 text-xs font-semibold text-fg placeholder:text-muted/40 outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  <CalendarClock className="w-3.5 h-3.5 text-accent" /> Start Deadline
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={90} value={daysToExpire}
                    onChange={(e) => setDaysToExpire(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
                    className="w-full px-4 py-3 rounded-xl bg-panel/75 border border-border focus:border-accent/40 focus:ring-1 focus:ring-accent/20 text-xs font-semibold text-fg text-center outline-none transition-all shadow-inner" />
                  <span className="text-xs font-bold text-muted uppercase">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Cohort Group Managers */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-muted/80">Assessment cohorts</h2>
              <div className="text-[10px] font-bold text-muted bg-panel border border-border/50 px-2 py-0.5 rounded-lg">
                Group {previewGroupIndex + 1} Selected for Preview
              </div>
            </div>
            
            {groups.map((g, gi) => (
              <GroupCard
                key={g.id} group={g} index={gi} canRemove={groups.length > 1}
                challenges={challenges} prompts={prompts} playgrounds={playgrounds} candidates={candidates}
                assignedTo={assignedTo} stats={groupStats.find((s) => s.id === g.id)!}
                isActivePreview={previewGroupIndex === gi}
                onSelectPreview={() => setPreviewGroupIndex(gi)}
                onPatch={(fn) => patch(g.id, fn)} onRemove={() => removeGroup(g.id)}
                onAddQuestion={(key) => addQuestion(g.id, key)} onRemoveQuestion={(key) => removeQuestion(g.id, key)}
                onSetMinutes={(key, m) => setMinutes(g.id, key, m)} onToggleCand={(cid) => toggleCand(g.id, cid)}
              />
            ))}

            <button type="button" onClick={addGroup}
              className="group w-full inline-flex items-center justify-center gap-3 px-5 py-4 rounded-2xl border border-dashed border-border/80 hover:border-accent/50 hover:bg-accent/[0.02] text-xs font-bold uppercase tracking-wider text-muted hover:text-accent transition-all active:scale-[0.99] shadow-sm">
              <span className="w-7 h-7 rounded-full border border-current grid place-items-center group-hover:rotate-90 transition-all duration-300">
                <Plus className="w-4 h-4" />
              </span>
              Add another cohort group
            </button>
          </div>
        </div>

        {/* Right Preview Simulation Column (40% width on Desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-6">
          <div className="rounded-2xl border border-border/80 bg-surface/40 backdrop-blur-xl shadow-lg p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/5 to-transparent rounded-bl-full pointer-events-none" />

            {/* Simulated Desktop Header / Tab selector */}
            <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[10px] font-bold text-muted/70 uppercase tracking-widest ml-1">Live Candidate Experience</span>
              </div>
              <div className="flex gap-1 bg-panel/80 p-0.5 rounded-xl border border-border/50 shadow-sm shrink-0">
                <button type="button" onClick={() => setPreviewTab("email")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${previewTab === "email" ? "bg-bg text-accent shadow-xs border border-border/40" : "text-muted hover:text-fg"}`}>
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button type="button" onClick={() => setPreviewTab("lobby")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${previewTab === "lobby" ? "bg-bg text-accent shadow-xs border border-border/40" : "text-muted hover:text-fg"}`}>
                  <Monitor className="w-3.5 h-3.5" /> Lobby
                </button>
              </div>
            </div>

            {/* SIMULATED CANVAS */}
            <div className="bg-bg/90 rounded-xl border border-border/40 min-h-[380px] p-6 shadow-inner relative overflow-hidden transition-all duration-300">
              
              {previewTab === "email" ? (
                /* INVITATION EMAIL SIMULATOR */
                <div className="space-y-4 text-left animate-fade-in">
                  <div className="bg-panel/40 p-3 rounded-lg border border-border/30 text-[10px] space-y-1 font-mono text-muted/90 select-none">
                    <div><span className="font-bold text-fg">From:</span> invites@interviewpad.com</div>
                    <div><span className="font-bold text-fg">To:</span> {sampleCandidateName}</div>
                    <div className="truncate"><span className="font-bold text-fg">Subject:</span> Take-home invitation from {workspaceName}</div>
                  </div>

                  <div className="border-t border-border/30 pt-4 space-y-4">
                    {/* Simulated Company Brand Block */}
                    <div className="flex items-center gap-2 border-b border-border/20 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-extrabold grid place-items-center text-xs shadow-xs">
                        {workspaceName[0]}
                      </div>
                      <span className="text-xs font-black tracking-tight text-fg">{workspaceName}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <p className="text-muted leading-relaxed">Hi <span className="font-bold text-fg">{sampleCandidateName}</span>,</p>
                      <p className="text-muted leading-relaxed">
                        The engineering team at <span className="font-bold text-fg">{workspaceName}</span> has invited you to complete their take-home challenge:
                      </p>
                      <div className="my-3 p-3.5 rounded-xl border border-accent/20 bg-accent/[0.02] space-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 bg-accent h-full" />
                        <h4 className="font-extrabold text-fg text-xs">{title}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-accent" /> {totalActiveMinutes} minutes</span>
                          <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-accent" /> {activeGroup?.questions.length || 0} tasks</span>
                        </div>
                      </div>
                      <p className="text-muted leading-relaxed">
                        Please start this challenge before the deadline. Ensure you have a quiet environment and a solid internet connection.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/20 flex flex-col items-center">
                      <button type="button" disabled
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:shadow-lg shadow-indigo-500/10 cursor-not-allowed select-none">
                        Open Assessment Lobby <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] text-muted/60 mt-2 font-mono">Link expires in {daysToExpire} days</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ASSESSMENT LOBBY PORTAL SIMULATOR */
                <div className="space-y-4 text-left animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border/30 pb-3">
                    <span className="text-[10px] font-black text-fg tracking-tight">Interviewpad</span>
                    <span className="text-[9px] text-muted flex items-center gap-1 bg-panel px-2 py-0.5 rounded-lg border border-border/40"><Clock className="w-3 h-3 text-accent" /> Expiring soon</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-fg leading-tight">{title}</h3>
                      <div className="text-[9px] text-muted">Curated by {workspaceName}</div>
                    </div>

                    {/* What to Expect Card */}
                    <div className="p-4 rounded-xl border border-border bg-panel/30 space-y-3">
                      <div className="text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-accent" /> Before you start
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-bg p-2 rounded-lg border border-border/40">
                          <span className="block text-[8px] uppercase text-muted font-bold">Total Duration</span>
                          <span className="font-extrabold text-fg text-xs tabular-nums">{totalActiveMinutes} mins</span>
                        </div>
                        <div className="bg-bg p-2 rounded-lg border border-border/40">
                          <span className="block text-[8px] uppercase text-muted font-bold">Assessments</span>
                          <span className="font-extrabold text-fg text-xs tabular-nums">{activeGroup?.questions.length || 0} questions</span>
                        </div>
                      </div>

                      {/* Proctoring telemetry disclaimer */}
                      <div className="flex gap-2 p-2.5 rounded-lg bg-accent/[0.03] border border-accent/10">
                        <Shield className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                        <div className="text-[9px] leading-relaxed text-muted font-semibold">
                          <span className="text-fg font-extrabold">Secure Proctoring Active:</span> Paste tracking, tab change monitor, and key replay telemetry will be logged to verify authentication.
                        </div>
                      </div>
                    </div>

                    {/* Questions Overview List */}
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase tracking-wider text-muted">Tasks included:</div>
                      {activeGroup?.questions.length === 0 ? (
                        <div className="text-center text-[10px] text-muted py-3 bg-panel/20 rounded-lg border border-dashed border-border/40">
                          No questions configured for this cohort yet.
                        </div>
                      ) : (
                        <ul className="space-y-1.5">
                          {activeGroup?.questions.map((q, qi) => {
                            const k = KIND[q.kind];
                            return (
                              <li key={q.key} style={{ animationDelay: `${qi * 30}ms` }}
                                className="flex items-center justify-between p-2 rounded-xl border border-border/40 bg-panel/30 animate-pop-in">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-5 h-5 rounded-md grid place-items-center ${k.chip} ${k.text} shrink-0`}>
                                    <k.Icon className="w-3 h-3" />
                                  </span>
                                  <span className="text-xs font-bold text-fg truncate">{q.title}</span>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-muted shrink-0 bg-bg px-1.5 py-0.5 rounded border border-border/20 tabular-nums">
                                  {q.minutes} min
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <button type="button" disabled
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md hover:shadow-lg shadow-teal-500/10 cursor-not-allowed select-none animate-pulse">
                      <Lock className="w-3.5 h-3.5" /> Start Timer & Accept Challenge
                    </button>
                  </div>
                </div>
              )}
              
            </div>
            
            <p className="text-[10px] text-muted text-center mt-3 flex items-center justify-center gap-1.5 font-semibold">
              <Eye className="w-3.5 h-3.5 text-accent" /> Changes update here in real-time
            </p>
          </div>
        </div>
      </div>

      {/* Glassmorphic Floating Summary Control Center */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,680px)] animate-slide-up">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl shadow-[0_16px_50px_rgba(0,0,0,0.22)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.65)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 transition-all duration-300 border ${canSend ? "bg-accent/15 border-accent/25 text-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)] animate-pulse" : "bg-panel border-border/40 text-muted"}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-xl font-black text-fg tabular-nums tracking-tight">{totalSessions}</div>
              <div className="text-[9px] uppercase tracking-widest font-black text-muted flex items-center gap-1.5">
                <span>take-home{totalSessions === 1 ? "" : "s"}</span>
                <span className="text-muted/40">•</span>
                <span>{validGroups} cohort{validGroups === 1 ? "" : "s"} configured</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={send} disabled={!canSend}
            className={`relative overflow-hidden inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              canSend ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5" : "bg-panel text-muted border border-border/50"
            }`}>
            {canSend && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer" />}
            <Send className="w-4 h-4 relative" />
            <span className="relative font-bold">{creating ? "Sending invites…" : `Send Invites (${totalSessions || 0})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface GroupCardProps {
  group: Group;
  index: number;
  canRemove: boolean;
  challenges: CurationChallenge[];
  prompts: CurationPrompt[];
  playgrounds: CurationPlayground[];
  candidates: PickCandidate[];
  assignedTo: Map<string, string>;
  stats: { questions: number; recipients: number };
  isActivePreview: boolean;
  onSelectPreview: () => void;
  onPatch: (fn: (g: Group) => Group) => void;
  onRemove: () => void;
  onAddQuestion: (key: string) => void;
  onRemoveQuestion: (key: string) => void;
  onSetMinutes: (key: string, m: number) => void;
  onToggleCand: (cid: string) => void;
}

function GroupCard({
  group: g, index, canRemove, challenges, prompts, playgrounds, candidates, assignedTo, stats, isActivePreview,
  onSelectPreview, onPatch, onRemove, onAddQuestion, onRemoveQuestion, onSetMinutes, onToggleCand,
}: GroupCardProps) {
  const theme = THEMES[index % THEMES.length];
  const inGroup = new Set(g.questions.map((q) => q.key));
  const sessions = stats.questions > 0 ? stats.recipients : 0;

  const candFilter = g.candSearch.trim().toLowerCase();
  const visibleCands = candidates.filter((c) =>
    !candFilter || c.name.toLowerCase().includes(candFilter) || c.email.toLowerCase().includes(candFilter) || c.stage.toLowerCase().includes(candFilter));
  const availableHere = visibleCands.filter((c) => { const a = assignedTo.get(c.id); return !a || a === g.id; });
  const allAvailPicked = availableHere.length > 0 && availableHere.every((c) => g.candidateIds.has(c.id));

  // Custom opt popover selector states
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerTab, setPickerTab] = useState<"all" | "dsa" | "playground" | "prompt">("all");

  // Candidates parsing warnings
  const pastedRecipients = useMemo(() => {
    const seen = new Set<string>(); const out: { name: string; email: string; raw: string; valid: boolean }[] = [];
    for (const line of g.pasted.split(/\r?\n/)) {
      const s = line.trim(); if (!s) continue;
      let name = "", email = "", valid = false;
      const m1 = s.match(/^(.+?)\s*<\s*([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)\s*>$/);
      const m2 = s.match(/^(.+?)\s*,\s*([^\s,]+@[^\s,]+\.[^\s,]+)$/);
      if (m1) { name = m1[1].trim().replace(/^["']|["']$/g, ""); email = m1[2]; valid = true; }
      else if (m2) { name = m2[1].trim(); email = m2[2]; valid = true; }
      else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) { email = s; name = s.split("@")[0]; valid = true; }
      else { name = s; email = ""; valid = false; }
      
      const key = (email || name).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: name || email.split("@")[0], email, raw: s, valid });
    }
    return out;
  }, [g.pasted]);

  const pastedWarningsCount = pastedRecipients.filter(r => !r.valid).length;

  // Filter challenges & prompts for Custom Picker popover
  const filteredCurationList = useMemo(() => {
    const q = pickerQuery.toLowerCase().trim();
    const list: { key: string; title: string; kind: Kind; detail: string; difficulty?: string; owned?: boolean }[] = [];
    
    if (pickerTab === "all" || pickerTab === "dsa") {
      challenges.forEach(c => {
        if (inGroup.has(`challenge:${c.id}`)) return;
        if (q && !c.title.toLowerCase().includes(q)) return;
        list.push({ key: `challenge:${c.id}`, title: c.title, kind: "challenge", difficulty: c.difficulty, owned: c.workspaceOwned, detail: c.category || "General Algorithms" });
      });
    }

    if (pickerTab === "all" || pickerTab === "playground") {
      playgrounds.forEach(p => {
        if (inGroup.has(`playground:${p.id}`)) return;
        if (q && !p.title.toLowerCase().includes(q)) return;
        list.push({ key: `playground:${p.id}`, title: p.title, kind: "playground", detail: p.isTemplate ? "Sandpack Template" : "Custom Snippet" });
      });
    }

    if (pickerTab === "all" || pickerTab === "prompt") {
      prompts.forEach(p => {
        if (inGroup.has(`prompt:${p.id}`)) return;
        if (q && !p.title.toLowerCase().includes(q)) return;
        list.push({ key: `prompt:${p.id}`, title: p.title, kind: "prompt", difficulty: p.difficulty, owned: p.workspaceOwned, detail: p.category || "AI Evaluation Prompt" });
      });
    }

    return list;
  }, [challenges, prompts, playgrounds, pickerQuery, pickerTab, inGroup]);

  // Tab controller for Candidate Selection
  const [candidateSourceTab, setCandidateSourceTab] = useState<"directory" | "paste">("directory");

  return (
    <div onClick={onSelectPreview}
      className={`group/card relative overflow-hidden rounded-2xl border bg-surface/60 backdrop-blur-xl shadow-md ring-2 transition-all duration-300 hover:shadow-xl animate-slide-up cursor-pointer ${
        isActivePreview ? "ring-accent border-accent/60 shadow-[0_8px_30px_rgba(var(--accent-rgb),0.06)]" : "ring-transparent border-border hover:border-accent/40"
      }`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.bar}`} />
      <div className={`absolute inset-0 -z-10 ${theme.soft}`} />

      {/* Cohort Highlight indicator */}
      {isActivePreview && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent animate-ping pointer-events-none" />
      )}

      <div className="p-5 space-y-6">
        {/* Header Block */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.badge} text-white text-xs font-black grid place-items-center shadow-md animate-pop-in`}>
              {index + 1}
            </span>
            <div>
              <h3 className="text-xs font-black text-fg leading-none flex items-center gap-2">
                Cohort Group {index + 1}
                {isActivePreview && <span className="text-[9px] uppercase tracking-widest text-accent bg-accent/10 px-1.5 py-0.5 rounded font-black border border-accent/25">Preview Active</span>}
              </h3>
              <div className="text-[10px] text-muted/80 mt-1 font-semibold">
                {stats.questions} question{stats.questions === 1 ? "" : "s"} · {stats.recipients} candidate{stats.recipients === 1 ? "" : "s"} configured
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1 rounded-full border text-[9px] font-extrabold tracking-wider uppercase tabular-nums select-none ${theme.pill}`}>
              {sessions} Take-home{sessions === 1 ? "" : "s"}
            </span>
            {canRemove && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="w-8 h-8 grid place-items-center rounded-xl text-muted hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-300"
                title="Remove group">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* SECTION 1: QUESTION CURATION BANK */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
            <span>Assessment curation</span>
            <span className="text-[9px] font-mono lowercase text-muted/60">{stats.questions} added</span>
          </div>
          
          {g.questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-panel/20 px-4 py-6 text-center text-xs text-muted/80 flex flex-col items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent/50 animate-pulse" />
              <div>No questions configured. Add DSA algorithms, dynamic playgrounds, or prompts.</div>
            </div>
          ) : (
            <ul className="space-y-2">
              {g.questions.map((q, qi) => {
                const k = KIND[q.kind];
                return (
                  <li key={q.key} style={{ animationDelay: `${qi * 35}ms` }}
                    className="group/q flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-panel/40 hover:bg-panel/75 transition-all duration-200 animate-pop-in shadow-xs relative overflow-hidden">
                    
                    <span className={`w-8 h-8 rounded-lg grid place-items-center border shrink-0 ${k.chip} ${k.text}`}>
                      <k.Icon className="w-4 h-4" />
                    </span>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${k.chip} ${k.text}`}>{k.label}</span>
                        <span className="text-xs font-bold text-fg truncate">{q.title}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-bg border border-border/60 rounded-xl px-2 py-1 shadow-xs hover:border-accent/40 transition-colors">
                      <input type="number" min={5} max={1440} value={q.minutes}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onSetMinutes(q.key, Math.max(5, Math.min(1440, Number(e.target.value) || DEFAULT_MIN)))}
                        className="w-10 bg-transparent text-xs font-bold text-fg text-right outline-none tabular-nums" />
                      <Clock className="w-3.5 h-3.5 text-muted/40" />
                      <span className="text-[10px] text-muted/60 lowercase font-semibold">min</span>
                    </div>

                    <button type="button" 
                      onClick={(e) => { e.stopPropagation(); onRemoveQuestion(q.key); }} 
                      className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-300 shrink-0 md:opacity-0 md:group-hover/q:opacity-100">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ADVANCED QUESTION POP-UP EXPLORER PICKER */}
          <div className="relative">
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setPickerOpen(!pickerOpen); }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                pickerOpen ? "border-accent bg-panel text-accent shadow-inner ring-2 ring-accent/15" : "border-border/80 bg-panel/60 hover:border-accent/50 hover:bg-panel hover:text-accent"
              }`}>
              <span className="flex items-center gap-2">
                <Plus className={`w-4 h-4 transition-transform duration-300 ${pickerOpen ? "rotate-45 text-accent" : ""}`} />
                Curate Challenge Bank...
              </span>
              <ChevronDown className={`w-4 h-4 text-muted/70 transition-transform duration-300 ${pickerOpen ? "rotate-180 text-accent" : ""}`} />
            </button>

            {pickerOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 mt-2 z-20 rounded-2xl border border-border bg-surface/95 backdrop-blur-2xl shadow-xl p-4 space-y-4 animate-scale-in origin-top">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search query box */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="Search challenge title, tags..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-panel border border-border/80 focus:border-accent/40 text-xs text-fg outline-none transition-all shadow-inner" />
                  </div>
                  {/* Curation type filter tabs */}
                  <div className="flex bg-panel p-0.5 rounded-xl border border-border/50 shadow-xs shrink-0 self-start">
                    {(["all", "dsa", "playground", "prompt"] as const).map(tab => (
                      <button key={tab} type="button" onClick={() => setPickerTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${pickerTab === tab ? "bg-bg text-accent shadow-xs border border-border/40" : "text-muted hover:text-fg"}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtered Curation List Grid */}
                <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {filteredCurationList.length === 0 ? (
                    <div className="text-center text-xs text-muted/80 py-8">
                      No matching templates or challenges found.
                    </div>
                  ) : (
                    filteredCurationList.map(item => {
                      const k = KIND[item.kind];
                      return (
                        <button key={item.key} type="button"
                          onClick={() => { onAddQuestion(item.key); setPickerOpen(false); }}
                          className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/40 hover:border-accent/35 bg-panel/30 hover:bg-accent/[0.02] text-left transition-all duration-200 group/pickerItem animate-fade-in">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-7 h-7 rounded-lg grid place-items-center ${k.chip} ${k.text} shrink-0`}>
                              <k.Icon className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-fg truncate group-hover/pickerItem:text-accent transition-colors flex items-center gap-1.5">
                                {item.owned && <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 rounded shrink-0">workspace</span>}
                                {item.title}
                              </span>
                              <span className="block text-[10px] text-muted/70 truncate font-semibold mt-0.5">{item.detail}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.difficulty && (
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                item.difficulty === "easy" || item.difficulty === "beginner" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                                item.difficulty === "medium" || item.difficulty === "intermediate" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              }`}>
                                {item.difficulty}
                              </span>
                            )}
                            <span className="w-6 h-6 rounded-lg bg-bg border border-border/60 text-muted group-hover/pickerItem:text-accent group-hover/pickerItem:border-accent/40 grid place-items-center transition-all duration-200">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: PARTICIPANTS CONFIGURATION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
            <span>Target Candidates</span>
            {candidateSourceTab === "paste" && pastedWarningsCount > 0 && (
              <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {pastedWarningsCount} invalid
              </span>
            )}
          </div>

          <div className="bg-panel/40 border border-border/80 rounded-2xl p-4 space-y-4">
            {/* Database Directory vs Text Area Paste Selector */}
            <div className="flex bg-panel p-0.5 rounded-xl border border-border/50 shadow-xs w-full sm:w-auto self-start">
              <button type="button" onClick={() => setCandidateSourceTab("directory")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${candidateSourceTab === "directory" ? "bg-bg text-accent shadow-xs border border-border/40" : "text-muted hover:text-fg"}`}>
                <Search className="w-3.5 h-3.5 inline mr-1" /> Directory Search
              </button>
              <button type="button" onClick={() => setCandidateSourceTab("paste")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${candidateSourceTab === "paste" ? "bg-bg text-accent shadow-xs border border-border/40" : "text-muted hover:text-fg"}`}>
                <Mail className="w-3.5 h-3.5 inline mr-1" /> Paste emails ({pastedRecipients.length})
              </button>
            </div>

            {candidateSourceTab === "directory" ? (
              /* DIRECTORY SELECTOR BOARD */
              <div className="space-y-3">
                <button type="button" onClick={(e) => { e.stopPropagation(); onPatch((gr) => ({ ...gr, pickerOpen: !gr.pickerOpen })); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    g.pickerOpen ? "border-accent bg-panel text-accent shadow-inner ring-2 ring-accent/15" : "border-border/80 bg-panel/60 hover:border-accent/50 hover:bg-panel hover:text-accent"
                  }`}>
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent shrink-0" />
                    {g.candidateIds.size > 0
                      ? <span className="font-extrabold text-fg">{g.candidateIds.size} Candidate{g.candidateIds.size === 1 ? "" : "s"} Chosen</span>
                      : <span className="font-semibold text-muted/70">Select directories...</span>}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted/70 transition-transform duration-300 ${g.pickerOpen ? "rotate-180 text-accent" : ""}`} />
                </button>

                {g.candidateIds.size > 0 && (
                  <div className="flex flex-wrap gap-2 animate-fade-in">
                    {[...g.candidateIds].map((cid) => {
                      const c = candidates.find((x) => x.id === cid); if (!c) return null;
                      return (
                        <span key={cid} className="group/chip inline-flex items-center gap-2 pl-1 pr-2.5 py-0.5 rounded-full bg-bg border border-border text-[11px] font-bold text-fg animate-pop-in hover:border-accent/40 transition-colors">
                          <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarOf(c.name)} text-white text-[9px] font-black grid place-items-center shadow-xs`}>
                            {initialsOf(c.name)}
                          </span>
                          {c.name}
                          <button type="button" onClick={(e) => { e.stopPropagation(); onToggleCand(cid); }}
                            className="text-muted hover:text-rose-500 transition-colors shrink-0 ml-0.5">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {g.pickerOpen && (
                  <div className="rounded-2xl border border-border bg-surface/90 backdrop-blur-xl p-4 space-y-3.5 animate-scale-in origin-top max-h-[360px] overflow-hidden flex flex-col">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-muted/60 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={g.candSearch} onClick={(e) => e.stopPropagation()} onChange={(e) => onPatch((gr) => ({ ...gr, candSearch: e.target.value }))} placeholder="Search names, email addresses..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-panel border border-border/80 focus:border-accent/40 text-xs text-fg outline-none transition-all shadow-inner" />
                      </div>
                      {availableHere.length > 0 && (
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); onPatch((gr) => { const n = new Set(gr.candidateIds); if (allAvailPicked) availableHere.forEach((c) => n.delete(c.id)); else availableHere.forEach((c) => n.add(c.id)); return { ...gr, candidateIds: n }; }); }}
                          className="px-3 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel hover:border-accent/40 text-[9px] font-black uppercase tracking-wider text-fg shrink-0 transition-all active:scale-95 shadow-sm">
                          {allAvailPicked ? "Clear" : `All (${availableHere.length})`}
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {availableHere.length === 0 ? (
                        <div className="text-center text-xs text-muted/80 py-8">
                          {visibleCands.length === 0 ? "No candidates found." : "Everyone is already configured in another cohort."}
                        </div>
                      ) : availableHere.map((c) => {
                        const checked = g.candidateIds.has(c.id);
                        return (
                          <button key={c.id} type="button" onClick={(e) => { e.stopPropagation(); onToggleCand(c.id); }}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all duration-200 border border-transparent ${checked ? "bg-accent/[0.04] border-accent/10" : "hover:bg-panel/50"}`}>
                            <span className={`w-5 h-5 rounded-lg border grid place-items-center shrink-0 transition-all duration-200 ${checked ? "bg-accent border-accent text-bg" : "border-border/80 bg-bg"}`}>
                              {checked && <Check className="w-3.5 h-3.5" strokeWidth={3.5} />}
                            </span>
                            <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarOf(c.name)} text-white text-[9px] font-black grid place-items-center shrink-0 shadow-xs`}>
                              {initialsOf(c.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-black text-fg truncate">{c.name}</span>
                              <span className="block text-[10px] text-muted/70 truncate font-semibold">{c.email}</span>
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-border-strong/15 text-muted shrink-0">
                              {c.stage}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* BATCH PASTED EMAIL CONTAINER */
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted/70">
                    <span>Email list parser</span>
                    <span className="text-accent/80 font-mono text-[8px] lowercase select-none">Format: John Doe &lt;john@net.com&gt; or name, email@site.com</span>
                  </div>
                  <textarea value={g.pasted} onClick={(e) => e.stopPropagation()} onChange={(e) => onPatch((gr) => ({ ...gr, pasted: e.target.value }))} rows={3}
                    placeholder="John Doe <john@net.com>&#10;jane@domain.com"
                    className="w-full px-4 py-3 rounded-xl bg-bg border border-border/80 focus:border-accent/40 focus:ring-1 focus:ring-accent/15 text-xs text-fg placeholder:text-muted/40 outline-none transition-all font-mono shadow-inner leading-relaxed" />
                </div>

                {pastedRecipients.length > 0 && (
                  <div className="space-y-2 border-t border-border/30 pt-3 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Recognized recipients ({pastedRecipients.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {pastedRecipients.map((c, ci) => (
                        <span key={ci} className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full border text-[10px] font-bold animate-pop-in ${
                          c.valid ? "bg-bg border-border text-fg" : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                        }`}>
                          <span className={`w-4 h-4 rounded-full text-[8px] font-black text-white grid place-items-center ${
                            c.valid ? `bg-gradient-to-br ${avatarOf(c.name)}` : "bg-rose-500"
                          }`}>
                            {c.valid ? initialsOf(c.name) : "!"}
                          </span>
                          <span className="truncate max-w-[120px]">{c.name}</span>
                          {!c.valid && <span className="text-[8px] font-black text-rose-500/70 uppercase font-mono">invalid format</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
