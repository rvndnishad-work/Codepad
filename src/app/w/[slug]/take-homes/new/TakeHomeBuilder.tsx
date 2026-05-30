"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, X, Clock, Users, Send, Layers, Beaker, Brain, Search, Trash2,
  ChevronDown, Sparkles, FileText, CalendarClock, Check,
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
  challenge: { Icon: Layers, label: "DSA", text: "text-indigo-500 dark:text-indigo-400", chip: "bg-indigo-500/10 border-indigo-500/25" },
  playground: { Icon: Beaker, label: "Playground", text: "text-sky-500 dark:text-sky-400", chip: "bg-sky-500/10 border-sky-500/25" },
  prompt: { Icon: Brain, label: "Prompt", text: "text-fuchsia-500 dark:text-fuchsia-400", chip: "bg-fuchsia-500/10 border-fuchsia-500/25" },
} as const;

// Each group gets a distinct accent so cohorts are visually separable.
const THEMES = [
  { badge: "from-indigo-500 to-violet-500", text: "text-indigo-500 dark:text-indigo-400", ring: "hover:ring-indigo-500/30", soft: "bg-indigo-500/[0.04]", bar: "bg-indigo-500", pill: "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/25" },
  { badge: "from-fuchsia-500 to-pink-500", text: "text-fuchsia-500 dark:text-fuchsia-400", ring: "hover:ring-fuchsia-500/30", soft: "bg-fuchsia-500/[0.04]", bar: "bg-fuchsia-500", pill: "bg-fuchsia-500/10 text-fuchsia-500 dark:text-fuchsia-400 border-fuchsia-500/25" },
  { badge: "from-emerald-500 to-teal-500", text: "text-emerald-500 dark:text-emerald-400", ring: "hover:ring-emerald-500/30", soft: "bg-emerald-500/[0.04]", bar: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25" },
  { badge: "from-amber-500 to-orange-500", text: "text-amber-500 dark:text-amber-400", ring: "hover:ring-amber-500/30", soft: "bg-amber-500/[0.04]", bar: "bg-amber-500", pill: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/25" },
  { badge: "from-sky-500 to-cyan-500", text: "text-sky-500 dark:text-sky-400", ring: "hover:ring-sky-500/30", soft: "bg-sky-500/[0.04]", bar: "bg-sky-500", pill: "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/25" },
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
          { description: res.skipped || res.errored ? `${res.skipped} skipped, ${res.errored} errored.` : undefined },
        );
        router.push(`/w/${slug}?section=assessments&view=take-homes`);
      } catch (err) {
        toast.error((err as Error).message ?? "Failed to create take-homes.");
      }
    });
  }

  return (
    <div className="relative pb-28">
      {/* Ambient atmosphere */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 right-0 w-[42vw] h-[42vw] rounded-full blur-[150px] bg-violet-500/10 dark:bg-violet-500/15" />
        <div className="absolute bottom-0 -left-20 w-[46vw] h-[46vw] rounded-full blur-[160px] bg-indigo-500/10 dark:bg-indigo-500/10" />
        <div className="absolute top-1/3 left-1/2 w-[28vw] h-[28vw] rounded-full blur-[170px] bg-fuchsia-500/[0.06]" />
      </div>

      {/* Hero */}
      <div className="pb-6 mb-6 border-b border-border animate-fade-in">
        <Link href={`/w/${slug}?section=assessments&view=take-homes`}
          className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-fg transition-colors">
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> Back to assessments
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Design a take-home
        </h1>
        <p className="text-xs text-muted mt-2 max-w-2xl leading-relaxed">
          Build <span className="text-fg font-semibold">assignment groups</span> — each pairs a set of questions with a set of
          candidates, so different cohorts get tailored assessments. Every candidate receives a private link with a separate
          timer per question.
        </p>
      </div>

      {/* Global settings */}
      <div className="rounded-2xl border border-border bg-surface/70 backdrop-blur-xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted/80">
            <FileText className="w-3 h-3 text-accent" /> Title — shown to every candidate
          </label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-panel border border-border focus:border-accent/50 text-sm text-fg placeholder:text-muted/50 outline-none transition-all shadow-inner" />
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted/80">
            <CalendarClock className="w-3 h-3 text-accent" /> Start within
          </label>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={90} value={daysToExpire}
              onChange={(e) => setDaysToExpire(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
              className="w-20 px-3.5 py-2.5 rounded-xl bg-panel border border-border focus:border-accent/50 text-sm text-fg text-center outline-none transition-all shadow-inner" />
            <span className="text-sm text-muted">days</span>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-5 mt-5">
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
          className="group w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-dashed border-border text-xs font-bold uppercase tracking-wider text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/[0.03] transition-all active:scale-[0.99]">
          <span className="w-6 h-6 rounded-full border border-current grid place-items-center group-hover:rotate-90 transition-transform"><Plus className="w-3.5 h-3.5" /></span>
          Add another group
        </button>
      </div>

      {/* Floating send bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,640px)] animate-slide-up">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/90 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 transition-colors ${canSend ? "bg-accent/15 text-accent" : "bg-panel text-muted"}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-extrabold text-fg tabular-nums">{totalSessions}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted">take-home{totalSessions === 1 ? "" : "s"} · {validGroups} group{validGroups === 1 ? "" : "s"}</div>
            </div>
          </div>
          <button type="button" onClick={send} disabled={!canSend}
            className={`relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              canSend ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5" : "bg-panel text-muted border border-border"
            }`}>
            {canSend && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer" />}
            <Send className="w-4 h-4 relative" />
            <span className="relative">{creating ? "Sending…" : `Send ${totalSessions || ""}`.trim()}</span>
          </button>
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
  const sessions = stats.questions > 0 ? stats.recipients : 0;

  const candFilter = g.candSearch.trim().toLowerCase();
  const visibleCands = candidates.filter((c) =>
    !candFilter || c.name.toLowerCase().includes(candFilter) || c.email.toLowerCase().includes(candFilter) || c.stage.toLowerCase().includes(candFilter));
  const availableHere = visibleCands.filter((c) => { const a = assignedTo.get(c.id); return !a || a === g.id; });
  const allAvailPicked = availableHere.length > 0 && availableHere.every((c) => g.candidateIds.has(c.id));

  return (
    <div className={`group/card relative overflow-hidden rounded-2xl border border-border bg-surface/70 backdrop-blur-xl shadow-sm ring-1 ring-transparent ${theme.ring} transition-all duration-300 hover:shadow-lg animate-slide-up`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.bar}`} />
      <div className={`absolute inset-0 -z-10 ${theme.soft}`} />

      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${theme.badge} text-white text-sm font-extrabold grid place-items-center shadow-md`}>{index + 1}</span>
            <div>
              <h3 className="text-sm font-bold text-fg leading-none">Group {index + 1}</h3>
              <div className="text-[10px] text-muted mt-1">{stats.questions} question{stats.questions === 1 ? "" : "s"} · {stats.recipients} candidate{stats.recipients === 1 ? "" : "s"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tabular-nums ${theme.pill}`}>{sessions} take-home{sessions === 1 ? "" : "s"}</span>
            {canRemove && (
              <button type="button" onClick={onRemove} className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Remove group"><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Questions</div>
          {g.questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-panel/30 px-4 py-5 text-center text-[11px] text-muted">
              No questions yet — add one below.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {g.questions.map((q, qi) => {
                const k = KIND[q.kind];
                return (
                  <li key={q.key} style={{ animationDelay: `${qi * 30}ms` }}
                    className="group/q flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-panel/50 hover:bg-panel transition-colors animate-pop-in">
                    <span className={`w-7 h-7 rounded-lg grid place-items-center border shrink-0 ${k.chip} ${k.text}`}><k.Icon className="w-3.5 h-3.5" /></span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider w-16 shrink-0 ${k.text}`}>{k.label}</span>
                    <span className="text-xs font-semibold text-fg truncate flex-1">{q.title}</span>
                    <div className="flex items-center gap-1 shrink-0 bg-bg rounded-lg border border-border px-1.5 py-1">
                      <input type="number" min={5} max={1440} value={q.minutes}
                        onChange={(e) => onSetMinutes(q.key, Math.max(5, Math.min(1440, Number(e.target.value) || DEFAULT_MIN)))}
                        className="w-10 bg-transparent text-xs text-fg text-right outline-none tabular-nums" />
                      <Clock className="w-3 h-3 text-muted/50" />
                    </div>
                    <button type="button" onClick={() => onRemoveQuestion(q.key)} className="w-6 h-6 grid place-items-center rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/q:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="relative">
            <Plus className="w-3.5 h-3.5 text-accent absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value="" onChange={(e) => { if (e.target.value) onAddQuestion(e.target.value); }}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-panel border border-border hover:border-accent/40 focus:border-accent/50 text-xs font-medium text-fg outline-none transition-all appearance-none cursor-pointer">
              <option value="">Add a question…</option>
              <optgroup label="DSA challenges">
                {challenges.filter((c) => !inGroup.has(`challenge:${c.id}`)).map((c) => <option key={c.id} value={`challenge:${c.id}`}>{c.workspaceOwned ? "★ " : ""}{c.title} · {c.difficulty}</option>)}
              </optgroup>
              <optgroup label="Playgrounds">
                {playgrounds.filter((p) => !inGroup.has(`playground:${p.id}`)).map((p) => <option key={p.id} value={`playground:${p.id}`}>{p.title}</option>)}
              </optgroup>
              <optgroup label="Prompt challenges">
                {prompts.filter((p) => !inGroup.has(`prompt:${p.id}`)).map((p) => <option key={p.id} value={`prompt:${p.id}`}>{p.workspaceOwned ? "★ " : ""}{p.title} · {p.difficulty}</option>)}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Candidates */}
        <div className="space-y-2.5">
          <button type="button" onClick={() => onPatch((gr) => ({ ...gr, pickerOpen: !gr.pickerOpen }))}
            className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted/80 hover:text-fg transition-colors">
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Candidates · {g.candidateIds.size} selected</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${g.pickerOpen ? "rotate-180" : ""}`} />
          </button>

          {g.candidateIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[...g.candidateIds].map((cid) => {
                const c = candidates.find((x) => x.id === cid); if (!c) return null;
                return (
                  <span key={cid} className="group/chip inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-panel border border-border text-[11px] text-fg animate-pop-in">
                    <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarOf(c.name)} text-white text-[8px] font-bold grid place-items-center`}>{initialsOf(c.name)}</span>
                    {c.name}
                    <button type="button" onClick={() => onToggleCand(cid)} className="text-muted hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
            </div>
          )}

          {g.pickerOpen && (
            <div className="rounded-xl border border-border bg-panel/40 p-3 space-y-2.5 animate-scale-in origin-top">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={g.candSearch} onChange={(e) => onPatch((gr) => ({ ...gr, candSearch: e.target.value }))} placeholder="Search candidates…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg border border-border focus:border-accent/40 text-xs text-fg outline-none transition-all" />
                </div>
                {availableHere.length > 0 && (
                  <button type="button"
                    onClick={() => onPatch((gr) => { const n = new Set(gr.candidateIds); if (allAvailPicked) availableHere.forEach((c) => n.delete(c.id)); else availableHere.forEach((c) => n.add(c.id)); return { ...gr, candidateIds: n }; })}
                    className="px-3 py-2 rounded-lg border border-border bg-bg hover:bg-panel hover:border-accent/40 text-[10px] font-bold uppercase tracking-wider text-fg shrink-0 transition-all active:scale-95">
                    {allAvailPicked ? "Clear" : `All (${availableHere.length})`}
                  </button>
                )}
              </div>
              <div className="max-h-[220px] overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                {visibleCands.length === 0 ? (
                  <div className="text-center text-xs text-muted py-4">No candidates — paste emails below.</div>
                ) : visibleCands.map((c) => {
                  const otherGroup = assignedTo.get(c.id);
                  const lockedElsewhere = !!otherGroup && otherGroup !== g.id;
                  const checked = g.candidateIds.has(c.id);
                  return (
                    <button key={c.id} type="button" disabled={lockedElsewhere} onClick={() => onToggleCand(c.id)}
                      className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg text-left transition-colors ${lockedElsewhere ? "opacity-40 cursor-not-allowed" : checked ? "bg-accent/[0.06]" : "hover:bg-bg"}`}>
                      <span className={`w-4 h-4 rounded-[5px] border grid place-items-center shrink-0 transition-colors ${checked ? "bg-accent border-accent text-bg" : "border-border"}`}>
                        {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                      <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarOf(c.name)} text-white text-[9px] font-bold grid place-items-center shrink-0`}>{initialsOf(c.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-fg truncate">{c.name}</span>
                        <span className="block text-[10px] text-muted truncate">{c.email}</span>
                      </span>
                      {lockedElsewhere
                        ? <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 shrink-0">in a group</span>
                        : <span className="text-[9px] font-bold uppercase tracking-wider text-muted/60 shrink-0">{c.stage}</span>}
                    </button>
                  );
                })}
              </div>
              <textarea value={g.pasted} onChange={(e) => onPatch((gr) => ({ ...gr, pasted: e.target.value }))} rows={2} placeholder="Or paste emails — one per line"
                className="w-full px-3 py-2 rounded-lg bg-bg border border-border focus:border-accent/40 text-xs text-fg outline-none transition-all font-mono" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
