"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, X, Clock, Users, Send, Layers, Beaker, Brain, Search, Trash2,
  ChevronDown, Sparkles, FileText, CalendarClock, Check, LayoutDashboard, Zap
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
type Group = { id: string; questions: QItem[]; candidateIds: Set<string>; pasted: string; pickerOpen: boolean; candSearch: string; isCollapsed: boolean };

const DEFAULT_MIN = 30;
let gid = 1;
const newGroup = (): Group => ({ id: `g${gid++}`, questions: [], candidateIds: new Set(), pasted: "", pickerOpen: false, candSearch: "", isCollapsed: false });

const KIND = {
  challenge: { Icon: Layers, label: "DSA", text: "text-indigo-600 dark:text-indigo-400", chip: "bg-indigo-500/10 border-indigo-500/25" },
  playground: { Icon: Beaker, label: "Playground", text: "text-sky-600 dark:text-sky-400", chip: "bg-sky-500/10 border-sky-500/25" },
  prompt: { Icon: Brain, label: "Prompt", text: "text-fuchsia-600 dark:text-fuchsia-400", chip: "bg-fuchsia-500/10 border-fuchsia-500/25" },
} as const;

const THEMES = [
  { badge: "from-indigo-500 to-violet-500", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-500/40", glow: "shadow-indigo-500/20", soft: "bg-indigo-500/[0.03]", bar: "bg-indigo-500", pill: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25", grad: "from-indigo-500/20 to-violet-500/20" },
  { badge: "from-fuchsia-500 to-pink-500", text: "text-fuchsia-600 dark:text-fuchsia-400", ring: "ring-fuchsia-500/40", glow: "shadow-fuchsia-500/20", soft: "bg-fuchsia-500/[0.03]", bar: "bg-fuchsia-500", pill: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/25", grad: "from-fuchsia-500/20 to-pink-500/20" },
  { badge: "from-emerald-500 to-teal-500", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/40", glow: "shadow-emerald-500/20", soft: "bg-emerald-500/[0.03]", bar: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25", grad: "from-emerald-500/20 to-teal-500/20" },
  { badge: "from-amber-500 to-orange-500", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/40", glow: "shadow-amber-500/20", soft: "bg-amber-500/[0.03]", bar: "bg-amber-500", pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25", grad: "from-amber-500/20 to-orange-500/20" },
  { badge: "from-sky-500 to-cyan-500", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/40", glow: "shadow-sky-500/20", soft: "bg-sky-500/[0.03]", bar: "bg-sky-500", pill: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25", grad: "from-sky-500/20 to-cyan-500/20" },
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
  const [title, setTitle] = useState("Take-home assessment");
  const [daysToExpire, setDaysToExpire] = useState(7);
  const [groups, setGroups] = useState<Group[]>([newGroup()]);
  const [creating, startCreating] = useTransition();


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
  function addGroup() { setGroups((gs) => [...gs, newGroup()]); }
  function removeGroup(id: string) { setGroups((gs) => (gs.length <= 1 ? gs : gs.filter((g) => g.id !== id))); }
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

  // A group needs ≥1 coding challenge to be sendable: completion is keyed on
  // challenge attempts, so a prompt/playground-only take-home could never
  // finish (the server action enforces the same rule).
  const groupStats = groups.map((g) => ({
    id: g.id,
    questions: g.questions.length,
    challenges: g.questions.filter((q) => q.kind === "challenge").length,
    recipients: recipientsOf(g).length,
  }));
  const totalSessions = groupStats.reduce((s, gs) => s + (gs.questions > 0 && gs.challenges > 0 ? gs.recipients : 0), 0);
  const validGroups = groupStats.filter((gs) => gs.questions > 0 && gs.challenges > 0 && gs.recipients > 0).length;
  const needsChallenge = groupStats.some((gs) => gs.questions > 0 && gs.challenges === 0);
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
          { description: res.skipped || res.errored ? `${res.skipped} skipped, ${res.errored} errored.` : undefined },
        );
        router.push(`/w/${slug}?section=assessments&view=take-homes`);
      } catch (err) {
        toast.error((err as Error).message ?? "Failed to create take-homes.");
      }
    });
  }

  return (
    <div className="relative pb-32 min-h-screen">
      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-bg">
        <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vw] rounded-full blur-[120px] bg-indigo-500/10 dark:bg-indigo-500/[0.15] animate-[pulse_6s_ease-in-out_infinite_alternate]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[140px] bg-violet-500/10 dark:bg-violet-500/[0.12] animate-[pulse_8s_ease-in-out_infinite_alternate_reverse]" />
        <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-fuchsia-500/[0.08] animate-[pulse_10s_ease-in-out_infinite_alternate]" />
      </div>

      {/* Sticky Glassmorphic Header (Control Bar) */}
      <div className="sticky top-0 z-40 -mx-4 px-4 py-4 md:-mx-8 md:px-8 bg-bg/95 backdrop-blur-3xl border-b border-border shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href={`/w/${slug}?section=assessments&view=take-homes`}
              className="group inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted hover:text-fg transition-colors">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> Back
            </Link>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-accent" />
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Command Center
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-surface/80 dark:bg-surface/50 backdrop-blur-md border border-border p-2 rounded-2xl shadow-inner">
            <div className="flex items-center gap-2 px-2 border-r border-border">
              <FileText className="w-4 h-4 text-muted shrink-0" />
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Take-home title..."
                className="w-48 bg-transparent text-sm font-semibold text-fg placeholder:text-muted/50 outline-none" />
            </div>
            <div className="flex items-center gap-2 px-2">
              <CalendarClock className="w-4 h-4 text-muted shrink-0" />
              <span className="text-xs font-medium text-muted">Expires in</span>
              <input type="number" min={1} max={90} value={daysToExpire}
                onChange={(e) => setDaysToExpire(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
                className="w-12 bg-panel rounded-lg border border-border px-2 py-1 text-sm font-bold text-fg text-center outline-none focus:border-accent/50 transition-colors" />
              <span className="text-xs font-medium text-muted">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="max-w-6xl mx-auto mt-6 animate-fade-in space-y-6">
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          Design targeted <strong className="text-fg font-semibold">assessment cohorts</strong>. Each module below pairs specific challenges with a set of candidates, creating distinct tracks for your hiring process.
        </p>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {groups.map((g, gi) => (
            <GroupCard
              key={g.id} group={g} index={gi} canRemove={groups.length > 1}
              challenges={challenges} prompts={prompts} playgrounds={playgrounds} candidates={candidates}
              assignedTo={assignedTo} stats={groupStats.find((s) => s.id === g.id)!}
              onPatch={(fn) => patch(g.id, fn)} onRemove={() => removeGroup(g.id)}
              onAddQuestion={(key) => addQuestion(g.id, key)} onRemoveQuestion={(key) => removeQuestion(g.id, key)}
              onSetMinutes={(key, m) => setMinutes(g.id, key, m)} onToggleCand={(cid) => toggleCand(g.id, cid)}
            />
          ))}
          
          <button type="button" onClick={addGroup}
            className="group h-full min-h-[280px] flex flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-border bg-surface/30 backdrop-blur-sm text-muted hover:text-accent hover:border-accent hover:bg-accent/[0.05] transition-all duration-300 active:scale-[0.98]">
            <span className="w-12 h-12 rounded-full border border-current bg-surface grid place-items-center group-hover:rotate-90 group-hover:shadow-lg transition-all duration-300">
              <Plus className="w-6 h-6" />
            </span>
            <span className="text-sm font-extrabold uppercase tracking-widest">Deploy New Cohort</span>
          </button>
        </div>
      </div>

      {/* Launch Console */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md animate-slide-up">
        <div className="relative group">
          {/* Glowing aura when active */}
          {canSend && <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 rounded-full blur-lg opacity-20 dark:opacity-40 group-hover:opacity-40 dark:group-hover:opacity-60 transition duration-500 group-hover:duration-200 animate-pulse pointer-events-none" />}
          
          <div className="relative flex items-center justify-between gap-4 p-2 pl-6 rounded-full border border-border bg-surface/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full grid place-items-center shrink-0 transition-all duration-500 ${canSend ? "bg-accent/15 text-accent" : "bg-panel text-muted"}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-extrabold text-fg tabular-nums">{totalSessions} <span className="font-medium text-sm text-muted">Sessions</span></div>
                <div className="text-[10px] uppercase tracking-wider text-muted font-bold">
                  {needsChallenge
                    ? "Add a coding challenge to each module"
                    : `${validGroups} Active Module${validGroups === 1 ? "" : "s"}`}
                </div>
              </div>
            </div>
            
            <button type="button" onClick={send} disabled={!canSend}
              className={`relative overflow-hidden inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold uppercase tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                canSend ? "bg-gradient-to-r from-violet-600 hover:from-violet-500 to-indigo-600 hover:to-indigo-500 text-white shadow-lg" : "bg-panel text-muted border border-border"
              }`}>
              {canSend && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />}
              <span className="relative z-10 flex items-center gap-2">
                {creating ? "Launching…" : "Launch"} <Send className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupCard({
  group: g, index, canRemove, challenges, prompts, playgrounds, candidates, assignedTo, stats,
  onPatch, onRemove, onAddQuestion, onRemoveQuestion, onSetMinutes, onToggleCand,
}: {
  group: Group; index: number; canRemove: boolean;
  challenges: CurationChallenge[]; prompts: CurationPrompt[]; playgrounds: CurationPlayground[]; candidates: PickCandidate[];
  assignedTo: Map<string, string>; stats: { questions: number; recipients: number };
  onPatch: (fn: (g: Group) => Group) => void; onRemove: () => void;
  onAddQuestion: (key: string) => void; onRemoveQuestion: (key: string) => void;
  onSetMinutes: (key: string, m: number) => void; onToggleCand: (cid: string) => void;
}) {
  const theme = THEMES[index % THEMES.length];
  const inGroup = new Set(g.questions.map((q) => q.key));
  
  const [qPickerOpen, setQPickerOpen] = useState(false);
  const [qTab, setQTab] = useState<"workspace" | "dsa" | "playgrounds" | "prompts">("workspace");
  const qPickerRef = useRef<HTMLDivElement>(null);
  const candPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (qPickerOpen && qPickerRef.current && !qPickerRef.current.contains(event.target as Node)) {
        setQPickerOpen(false);
      }
      if (g.pickerOpen && candPickerRef.current && !candPickerRef.current.contains(event.target as Node)) {
        onPatch(gr => ({ ...gr, pickerOpen: false }));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [qPickerOpen, g.pickerOpen, onPatch]);

  const sessions = stats.questions > 0 ? stats.recipients : 0;

  const candFilter = g.candSearch.trim().toLowerCase();
  const visibleCands = candidates.filter((c) =>
    !candFilter || c.name.toLowerCase().includes(candFilter) || c.email.toLowerCase().includes(candFilter) || c.stage.toLowerCase().includes(candFilter));
  const availableHere = visibleCands.filter((c) => { const a = assignedTo.get(c.id); return !a || a === g.id; });
  const allAvailPicked = availableHere.length > 0 && availableHere.every((c) => g.candidateIds.has(c.id));

  // Determine selected candidate objects for the facepile
  const selectedCands = [...g.candidateIds].map(cid => candidates.find(c => c.id === cid)).filter(Boolean) as PickCandidate[];

  const availChallenges = challenges.filter((c) => !inGroup.has(`challenge:${c.id}`));
  const availPlaygrounds = playgrounds.filter((p) => !inGroup.has(`playground:${p.id}`));
  const availPrompts = prompts.filter((p) => !inGroup.has(`prompt:${p.id}`));

  const workspaceItems = [
    ...availChallenges.filter(c => c.workspaceOwned).map(c => ({ id: c.id, title: c.title, k: `challenge:${c.id}`, icon: Layers, diff: c.difficulty })),
    ...availPrompts.filter(p => p.workspaceOwned).map(p => ({ id: p.id, title: p.title, k: `prompt:${p.id}`, icon: Brain, diff: p.difficulty }))
  ];
  const dsaItems = availChallenges.filter(c => !c.workspaceOwned).map(c => ({ id: c.id, title: c.title, k: `challenge:${c.id}`, icon: Layers, diff: c.difficulty }));
  const playgroundItems = availPlaygrounds.map(p => ({ id: p.id, title: p.title, k: `playground:${p.id}`, icon: Beaker, diff: null }));
  const promptItems = availPrompts.filter(p => !p.workspaceOwned).map(p => ({ id: p.id, title: p.title, k: `prompt:${p.id}`, icon: Brain, diff: p.difficulty }));

  const activeItems = qTab === "workspace" ? workspaceItems : qTab === "dsa" ? dsaItems : qTab === "playgrounds" ? playgroundItems : promptItems;

  return (
    <div 
      className={`relative group/module rounded-[24px] border border-border bg-surface/80 dark:bg-surface/60 backdrop-blur-2xl shadow-sm hover:shadow-xl transition-all duration-500 animate-slide-up flex flex-col ${g.isCollapsed ? 'h-[90px] overflow-hidden' : ''}`}
      style={{ zIndex: (qPickerOpen || g.pickerOpen) ? 30 : 1 }}
    >
      {/* Animated gradient border on hover */}
      <div className={`absolute -inset-[1px] -z-10 rounded-[25px] bg-gradient-to-br ${theme.grad} opacity-0 group-hover/module:opacity-100 transition-opacity duration-500`}></div>
      
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[24px] ${theme.bar} shadow-[0_0_10px_currentColor] opacity-70 group-hover/module:opacity-100 transition-opacity`} />
      
      {/* Header Area */}
      <div className="p-5 flex items-center justify-between gap-3 cursor-pointer select-none" onClick={(e) => {
        // Prevent toggle if clicking buttons
        if ((e.target as HTMLElement).closest('button')) return;
        onPatch(gr => ({ ...gr, isCollapsed: !gr.isCollapsed }));
      }}>
        <div className="flex items-center gap-3 pl-1">
          <span className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${theme.badge} text-white text-base font-extrabold grid place-items-center shadow-md`}>{index + 1}</span>
          <div>
            <h3 className="text-sm font-extrabold text-fg tracking-wide uppercase">Cohort Module {index + 1}</h3>
            <div className="text-[11px] font-medium text-muted mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {stats.questions}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {stats.recipients}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Facepile when collapsed */}
          {g.isCollapsed && selectedCands.length > 0 && (
            <div className="flex -space-x-2 mr-2 animate-fade-in">
              {selectedCands.slice(0, 3).map(c => (
                <div key={c.id} className={`w-7 h-7 rounded-full border-2 border-surface bg-gradient-to-br ${avatarOf(c.name)} text-white text-[9px] font-bold grid place-items-center z-10`} title={c.name}>
                  {initialsOf(c.name)}
                </div>
              ))}
              {selectedCands.length > 3 && (
                <div className="w-7 h-7 rounded-full border-2 border-surface bg-panel text-muted text-[9px] font-bold grid place-items-center z-0">
                  +{selectedCands.length - 3}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {!g.isCollapsed && <span className={`px-3 py-1 rounded-full border text-[11px] font-extrabold tabular-nums tracking-wide ${theme.pill}`}>{sessions} Sessions</span>}
            {canRemove && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-8 h-8 grid place-items-center rounded-xl bg-panel/50 text-muted hover:text-rose-500 hover:bg-rose-500/10 hover:shadow-inner transition-all" title="Delete module"><Trash2 className="w-4 h-4" /></button>
            )}
            <button type="button" className="w-8 h-8 grid place-items-center rounded-xl bg-panel/50 text-muted hover:text-fg transition-colors">
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${g.isCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className={`px-5 pb-5 space-y-6 transition-all duration-500 ease-in-out ${g.isCollapsed ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        
        {/* Questions Section */}
        <div className="space-y-3 relative z-30">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted/80">
            <Layers className="w-3.5 h-3.5" /> Assessment Track
          </div>
          <div className="p-1 rounded-2xl bg-surface/50 border border-border shadow-inner">
            {g.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-panel/30 px-4 py-8 text-center text-xs text-muted flex flex-col items-center gap-2">
                <Sparkles className="w-5 h-5 text-muted/50" />
                Slot questions to build the track.
              </div>
            ) : (
              <ul className="space-y-1 p-1">
                {g.questions.map((q, qi) => {
                  const k = KIND[q.kind];
                  return (
                    <li key={q.key} style={{ animationDelay: `${qi * 40}ms` }}
                      className="group/q flex items-center gap-3 p-2 rounded-xl bg-panel/60 hover:bg-panel hover:shadow-md border border-transparent hover:border-border transition-all duration-300 animate-pop-in">
                      <span className={`w-8 h-8 rounded-xl grid place-items-center border shrink-0 shadow-sm ${k.chip} ${k.text}`}><k.Icon className="w-4 h-4" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-fg truncate">{q.title}</span>
                        <span className={`block text-[9px] font-bold uppercase tracking-wider ${k.text}`}>{k.label}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 bg-surface rounded-lg border border-border px-2 py-1.5 shadow-inner">
                        <Clock className="w-3.5 h-3.5 text-muted" />
                        <input type="number" min={5} max={1440} value={q.minutes}
                          onChange={(e) => onSetMinutes(q.key, Math.max(5, Math.min(1440, Number(e.target.value) || DEFAULT_MIN)))}
                          className="w-10 bg-transparent text-xs font-bold text-fg text-right outline-none tabular-nums" />
                        <span className="text-[10px] text-muted font-medium">m</span>
                      </div>
                      <button type="button" onClick={() => onRemoveQuestion(q.key)} className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover/q:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
            
            <div className="mt-2 relative" ref={qPickerRef}>
              <button type="button" onClick={() => setQPickerOpen(!qPickerOpen)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm transition-all duration-300 ${
                  qPickerOpen ? "border-accent bg-panel shadow-md" : "border-transparent bg-surface hover:bg-panel hover:shadow-sm"
                }`}>
                <span className="flex items-center gap-3 min-w-0">
                  <div className={`w-6 h-6 rounded-md grid place-items-center shrink-0 transition-colors ${qPickerOpen ? "bg-accent text-bg" : "bg-panel text-muted border border-border"}`}>
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-muted/70">Insert Challenge...</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform duration-300 ${qPickerOpen ? "rotate-180 text-accent" : ""}`} />
              </button>

              {qPickerOpen && (
                <div className="mt-1 rounded-xl border border-border bg-surface p-3 space-y-3 animate-slide-up origin-top shadow-2xl absolute w-full z-30">
                  {/* Tabs */}
                  <div className="flex bg-surface p-1 rounded-lg shadow-inner gap-1 overflow-x-auto scrollbar-hide">
                    {(["workspace", "dsa", "playgrounds", "prompts"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setQTab(t)}
                        className={`flex-1 min-w-[70px] px-2 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
                          qTab === t ? "bg-accent text-bg shadow-sm" : "text-muted hover:text-fg hover:bg-panel/50"
                        }`}>
                        {t === "workspace" ? "Internal" : t === "dsa" ? "DSA" : t === "playgrounds" ? "Play" : "Prompt"}
                      </button>
                    ))}
                  </div>
                  
                  {/* List */}
                  <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {activeItems.length === 0 ? (
                      <div className="text-center text-xs text-muted py-6 flex flex-col items-center gap-2">
                        <Layers className="w-6 h-6 text-muted/30" />
                        No items in this category.
                      </div>
                    ) : (
                      activeItems.map((item) => (
                        <button key={item.k} type="button" onClick={() => { onAddQuestion(item.k); setQPickerOpen(false); }}
                          className="w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all duration-200 bg-transparent border border-transparent hover:bg-surface hover:border-border group/opt">
                          <span className="w-8 h-8 rounded-lg bg-surface border border-border grid place-items-center shrink-0 shadow-sm group-hover/opt:text-accent transition-colors">
                            <item.icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-fg truncate">{item.title}</span>
                            <span className="block text-[9px] font-medium text-muted truncate uppercase tracking-widest">
                              {qTab === "workspace" ? (item.k.startsWith("challenge:") ? "DSA" : "Prompt") : qTab}
                            </span>
                          </span>
                          {item.diff && <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted/50 shrink-0 bg-surface px-2 py-1 rounded-md">{item.diff}</span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Candidates Section */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted/80">
            <Users className="w-3.5 h-3.5" /> Target Candidates
          </div>
          
          <div className="p-1 rounded-2xl bg-surface/50 border border-border shadow-inner" ref={candPickerRef}>
            <button type="button" onClick={() => onPatch((gr) => ({ ...gr, pickerOpen: !gr.pickerOpen }))}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm transition-all duration-300 ${
                g.pickerOpen ? "border-accent bg-panel shadow-md" : "border-transparent hover:bg-panel hover:shadow-sm"
              }`}>
              <span className="flex items-center gap-3 min-w-0">
                <div className={`w-6 h-6 rounded-md grid place-items-center shrink-0 transition-colors ${g.candidateIds.size > 0 ? "bg-accent text-bg shadow-sm" : "bg-surface text-muted border border-border"}`}>
                  <Users className="w-3.5 h-3.5" />
                </div>
                {g.candidateIds.size > 0
                  ? <span className="font-bold text-fg tracking-wide">{g.candidateIds.size} Enrolled</span>
                  : <span className="font-semibold text-muted/70">Assign Candidates...</span>}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform duration-300 ${g.pickerOpen ? "rotate-180 text-accent" : ""}`} />
            </button>

            {g.candidateIds.size > 0 && !g.pickerOpen && (
              <div className="flex flex-wrap gap-2 p-3 pt-2">
                {selectedCands.map((c, i) => (
                  <span key={c.id} style={{ animationDelay: `${i * 30}ms` }} className="group/chip inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-surface border border-border shadow-sm text-[11px] font-semibold text-fg animate-pop-in hover:shadow-md hover:border-accent transition-all">
                    <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarOf(c.name)} text-white text-[8px] font-bold grid place-items-center shadow-inner`}>{initialsOf(c.name)}</span>
                    {c.name}
                    <button type="button" onClick={() => onToggleCand(c.id)} className="w-4 h-4 grid place-items-center rounded-full text-muted hover:text-white hover:bg-rose-500 transition-colors ml-1"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            )}

            {g.pickerOpen && (
              <div className="mt-1 rounded-xl border border-border bg-surface p-3 space-y-3 animate-slide-up origin-top shadow-2xl absolute w-full z-30">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={g.candSearch} onChange={(e) => onPatch((gr) => ({ ...gr, candSearch: e.target.value }))} placeholder="Search database..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs font-semibold text-fg outline-none transition-all shadow-inner" />
                  </div>
                  {availableHere.length > 0 && (
                    <button type="button"
                      onClick={() => onPatch((gr) => { const n = new Set(gr.candidateIds); if (allAvailPicked) availableHere.forEach((c) => n.delete(c.id)); else availableHere.forEach((c) => n.add(c.id)); return { ...gr, candidateIds: n }; })}
                      className="px-3 py-2.5 rounded-lg border border-border bg-surface hover:bg-panel hover:border-accent text-[10px] font-extrabold uppercase tracking-wider text-fg shrink-0 transition-all active:scale-95 shadow-sm">
                      {allAvailPicked ? "Clear" : `All (${availableHere.length})`}
                    </button>
                  )}
                </div>
                
                <div className="max-h-[240px] overflow-y-auto space-y-1 pr-2 scrollbar-thin">
                  {availableHere.length === 0 ? (
                    <div className="text-center text-xs text-muted py-6 flex flex-col items-center gap-2">
                      <Users className="w-6 h-6 text-muted/30" />
                      {visibleCands.length === 0 ? "No matches in database. Paste external emails below." : "All matches are already deployed in other cohorts."}
                    </div>
                  ) : availableHere.map((c) => {
                    const checked = g.candidateIds.has(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => onToggleCand(c.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all duration-200 ${checked ? "bg-accent/[0.08] border border-accent/30" : "bg-transparent border border-transparent hover:bg-surface hover:border-border"}`}>
                        <span className={`w-5 h-5 rounded-[6px] border grid place-items-center shrink-0 transition-all ${checked ? "bg-accent border-accent text-bg" : "border-border/80 bg-surface"}`}>
                          {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </span>
                        <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarOf(c.name)} text-white text-[10px] font-bold grid place-items-center shrink-0 shadow-sm`}>{initialsOf(c.name)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-fg truncate">{c.name}</span>
                          <span className="block text-[10px] font-medium text-muted truncate">{c.email}</span>
                        </span>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted/50 shrink-0 bg-surface px-2 py-1 rounded-md">{c.stage}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-border">
                  <textarea value={g.pasted} onChange={(e) => onPatch((gr) => ({ ...gr, pasted: e.target.value }))} rows={2} placeholder="Bulk paste external emails (one per line)..."
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs text-fg outline-none transition-all font-mono shadow-inner resize-none" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
