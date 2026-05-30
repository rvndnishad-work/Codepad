"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, X, Clock, Users, Send, Layers, Beaker, Brain, Search, Trash2, ChevronDown,
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

const KIND_ICON = { challenge: Layers, playground: Beaker, prompt: Brain };
const KIND_LABEL = { challenge: "DSA", playground: "Playground", prompt: "Prompt" };

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

  // Library of all questions, keyed by "kind:id" for lookups when adding.
  const library = useMemo(() => {
    const m = new Map<string, { kind: Kind; id: string; title: string; minutes: number }>();
    for (const c of challenges) m.set(`challenge:${c.id}`, { kind: "challenge", id: c.id, title: c.title, minutes: c.estimatedMinutes || DEFAULT_MIN });
    for (const p of playgrounds) m.set(`playground:${p.id}`, { kind: "playground", id: p.id, title: p.title, minutes: DEFAULT_MIN });
    for (const p of prompts) m.set(`prompt:${p.id}`, { kind: "prompt", id: p.id, title: p.title, minutes: p.estimatedMinutes || DEFAULT_MIN });
    return m;
  }, [challenges, prompts, playgrounds]);

  // Which candidate is assigned to which group (one group each).
  const assignedTo = useMemo(() => {
    const m = new Map<string, string>(); // candidateId -> groupId
    groups.forEach((g) => g.candidateIds.forEach((cid) => m.set(cid, g.id)));
    return m;
  }, [groups]);
  const candById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  function patch(id: string, fn: (g: Group) => Group) {
    setGroups((gs) => gs.map((g) => (g.id === id ? fn(g) : g)));
  }
  function addGroup() { setGroups((gs) => [...gs, newGroup()]); }
  function removeGroup(id: string) { setGroups((gs) => (gs.length <= 1 ? gs : gs.filter((g) => g.id !== id))); }

  function addQuestion(groupId: string, key: string) {
    const lib = library.get(key);
    if (!lib) return;
    patch(groupId, (g) =>
      g.questions.some((q) => q.key === key) ? g : { ...g, questions: [...g.questions, { key, kind: lib.kind, id: lib.id, title: lib.title, minutes: lib.minutes }] });
  }
  function removeQuestion(groupId: string, key: string) {
    patch(groupId, (g) => ({ ...g, questions: g.questions.filter((q) => q.key !== key) }));
  }
  function setMinutes(groupId: string, key: string, minutes: number) {
    patch(groupId, (g) => ({ ...g, questions: g.questions.map((q) => (q.key === key ? { ...q, minutes } : q)) }));
  }
  function toggleCand(groupId: string, cid: string) {
    patch(groupId, (g) => {
      const n = new Set(g.candidateIds);
      n.has(cid) ? n.delete(cid) : n.add(cid);
      return { ...g, candidateIds: n };
    });
  }

  function recipientsOf(g: Group): { name: string; email: string }[] {
    const seen = new Set<string>();
    const out: { name: string; email: string }[] = [];
    for (const cid of g.candidateIds) {
      const c = candById.get(cid);
      if (!c) continue;
      const k = c.email.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); out.push({ name: c.name, email: c.email });
    }
    for (const line of g.pasted.split(/\r?\n/)) {
      const s = line.trim(); if (!s) continue;
      let name = "", email = "";
      const m1 = s.match(/^(.+?)\s*<\s*([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)\s*>$/);
      const m2 = s.match(/^(.+?)\s*,\s*([^\s,]+@[^\s,]+\.[^\s,]+)$/);
      if (m1) { name = m1[1].trim().replace(/^["']|["']$/g, ""); email = m1[2]; }
      else if (m2) { name = m2[1].trim(); email = m2[2]; }
      else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) { email = s; name = s.split("@")[0]; }
      else continue;
      const k = email.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); out.push({ name: name || k.split("@")[0], email });
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
          title,
          daysToExpire,
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
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <Link href={`/w/${slug}?section=assessments&view=take-homes`}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-fg">
          <ArrowLeft className="w-3 h-3" /> Back to assessments
        </Link>
        <h1 className="text-2xl font-semibold text-fg tracking-tight mt-2">New take-home</h1>
        <p className="text-xs text-muted mt-1">
          Build one or more <span className="text-fg font-medium">assignment groups</span> — each pairs a set of
          questions with a set of candidates, so different cohorts can get different questions. Each candidate
          gets their own tokenized link, with a separate timer per question.
        </p>
      </div>

      {/* Global settings */}
      <div className="rounded-xl border border-border bg-surface p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Title (shown to all candidates)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-panel border border-border text-xs text-fg outline-none focus:border-accent/40" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Start within (days)</label>
          <input type="number" min={1} max={90} value={daysToExpire}
            onChange={(e) => setDaysToExpire(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
            className="w-full px-3 py-2 rounded-md bg-panel border border-border text-xs text-fg outline-none focus:border-accent/40" />
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {groups.map((g, gi) => (
          <GroupCard
            key={g.id} group={g} index={gi} canRemove={groups.length > 1}
            challenges={challenges} prompts={prompts} playgrounds={playgrounds} candidates={candidates}
            assignedTo={assignedTo}
            stats={groupStats.find((s) => s.id === g.id)!}
            onPatch={(fn) => patch(g.id, fn)}
            onRemove={() => removeGroup(g.id)}
            onAddQuestion={(key) => addQuestion(g.id, key)}
            onRemoveQuestion={(key) => removeQuestion(g.id, key)}
            onSetMinutes={(key, m) => setMinutes(g.id, key, m)}
            onToggleCand={(cid) => toggleCand(g.id, cid)}
          />
        ))}
        <button type="button" onClick={addGroup}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-xs font-semibold text-muted hover:text-fg hover:border-fg/40 transition-colors">
          <Plus className="w-4 h-4" /> Add another group
        </button>
      </div>

      {/* Send */}
      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/95 backdrop-blur p-3 shadow-lg">
        <div className="text-xs text-muted">
          <span className="text-fg font-semibold tabular-nums">{validGroups}</span> group{validGroups === 1 ? "" : "s"} ·{" "}
          <span className="text-fg font-semibold tabular-nums">{totalSessions}</span> take-home{totalSessions === 1 ? "" : "s"} will be sent
        </div>
        <button type="button" onClick={send} disabled={!canSend}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-bg text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity">
          <Send className="w-4 h-4" /> {creating ? "Sending…" : `Send ${totalSessions} take-home${totalSessions === 1 ? "" : "s"}`}
        </button>
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
  onPatch: (fn: (g: Group) => Group) => void;
  onRemove: () => void;
  onAddQuestion: (key: string) => void;
  onRemoveQuestion: (key: string) => void;
  onSetMinutes: (key: string, m: number) => void;
  onToggleCand: (cid: string) => void;
}) {
  const inGroup = new Set(g.questions.map((q) => q.key));

  // Candidate availability: assigned to ANOTHER group → disabled.
  const candFilter = g.candSearch.trim().toLowerCase();
  const visibleCands = candidates.filter((c) =>
    !candFilter || c.name.toLowerCase().includes(candFilter) || c.email.toLowerCase().includes(candFilter) || c.stage.toLowerCase().includes(candFilter));
  const availableHere = visibleCands.filter((c) => { const a = assignedTo.get(c.id); return !a || a === g.id; });
  const allAvailPicked = availableHere.length > 0 && availableHere.every((c) => g.candidateIds.has(c.id));

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-accent/10 text-accent text-xs font-bold">{index + 1}</span>
          <h3 className="text-sm font-bold text-fg">Group {index + 1}</h3>
          <span className="text-[11px] text-muted">{stats.questions}q × {stats.recipients} candidate{stats.recipients === 1 ? "" : "s"} = <span className="text-fg font-semibold">{stats.questions > 0 ? stats.recipients : 0}</span> take-home{stats.questions > 0 && stats.recipients === 1 ? "" : "s"}</span>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-muted hover:text-rose-400" title="Remove group"><Trash2 className="w-4 h-4" /></button>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Questions</div>
        {g.questions.length > 0 && (
          <ul className="space-y-1.5">
            {g.questions.map((q) => {
              const Icon = KIND_ICON[q.kind];
              return (
                <li key={q.key} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-panel/40">
                  <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted w-16 shrink-0">{KIND_LABEL[q.kind]}</span>
                  <span className="text-xs font-medium text-fg truncate flex-1">{q.title}</span>
                  <input type="number" min={5} max={1440} value={q.minutes}
                    onChange={(e) => onSetMinutes(q.key, Math.max(5, Math.min(1440, Number(e.target.value) || DEFAULT_MIN)))}
                    className="w-14 px-1.5 py-1 rounded bg-bg border border-border text-xs text-fg text-right outline-none focus:border-accent/40" />
                  <Clock className="w-3 h-3 text-muted/50" />
                  <button type="button" onClick={() => onRemoveQuestion(q.key)} className="text-muted hover:text-rose-400"><X className="w-3.5 h-3.5" /></button>
                </li>
              );
            })}
          </ul>
        )}
        {/* add-question select */}
        <select
          value=""
          onChange={(e) => { if (e.target.value) onAddQuestion(e.target.value); }}
          className="w-full px-3 py-2 rounded-md bg-panel border border-border text-xs text-muted outline-none focus:border-accent/40"
        >
          <option value="">+ Add a question…</option>
          <optgroup label="DSA challenges">
            {challenges.filter((c) => !inGroup.has(`challenge:${c.id}`)).map((c) => (
              <option key={c.id} value={`challenge:${c.id}`}>{c.workspaceOwned ? "★ " : ""}{c.title} ({c.difficulty})</option>
            ))}
          </optgroup>
          <optgroup label="Playgrounds">
            {playgrounds.filter((p) => !inGroup.has(`playground:${p.id}`)).map((p) => (
              <option key={p.id} value={`playground:${p.id}`}>{p.title}</option>
            ))}
          </optgroup>
          <optgroup label="Prompt challenges">
            {prompts.filter((p) => !inGroup.has(`prompt:${p.id}`)).map((p) => (
              <option key={p.id} value={`prompt:${p.id}`}>{p.workspaceOwned ? "★ " : ""}{p.title} ({p.difficulty})</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Candidates */}
      <div className="space-y-2">
        <button type="button" onClick={() => onPatch((gr) => ({ ...gr, pickerOpen: !gr.pickerOpen }))}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg">
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Candidates ({g.candidateIds.size})</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${g.pickerOpen ? "rotate-180" : ""}`} />
        </button>

        {/* selected chips */}
        {g.candidateIds.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...g.candidateIds].map((cid) => {
              const c = candidates.find((x) => x.id === cid);
              if (!c) return null;
              return (
                <span key={cid} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[11px] text-fg">
                  {c.name}
                  <button type="button" onClick={() => onToggleCand(cid)} className="text-muted hover:text-rose-400"><X className="w-3 h-3" /></button>
                </span>
              );
            })}
          </div>
        )}

        {g.pickerOpen && (
          <div className="rounded-lg border border-border bg-panel/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={g.candSearch} onChange={(e) => onPatch((gr) => ({ ...gr, candSearch: e.target.value }))}
                  placeholder="Search candidates…"
                  className="w-full pl-9 pr-3 py-1.5 rounded-md bg-bg border border-border text-xs text-fg outline-none focus:border-accent/40" />
              </div>
              {availableHere.length > 0 && (
                <button type="button"
                  onClick={() => onPatch((gr) => {
                    const n = new Set(gr.candidateIds);
                    if (allAvailPicked) availableHere.forEach((c) => n.delete(c.id));
                    else availableHere.forEach((c) => n.add(c.id));
                    return { ...gr, candidateIds: n };
                  })}
                  className="px-2.5 py-1.5 rounded-md border border-border bg-bg hover:bg-panel text-[10px] font-bold uppercase tracking-wider text-fg shrink-0">
                  {allAvailPicked ? "Clear" : `All (${availableHere.length})`}
                </button>
              )}
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-0.5">
              {visibleCands.length === 0 ? (
                <div className="text-center text-xs text-muted py-3">No candidates — paste below.</div>
              ) : visibleCands.map((c) => {
                const otherGroup = assignedTo.get(c.id);
                const lockedElsewhere = !!otherGroup && otherGroup !== g.id;
                return (
                  <label key={c.id} className={`flex items-center gap-2 p-1.5 rounded-md ${lockedElsewhere ? "opacity-40 cursor-not-allowed" : "hover:bg-bg cursor-pointer"}`}>
                    <input type="checkbox" disabled={lockedElsewhere} checked={g.candidateIds.has(c.id)} onChange={() => onToggleCand(c.id)} className="accent-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-fg truncate">{c.name}</div>
                      <div className="text-[10px] text-muted truncate">{c.email}</div>
                    </div>
                    {lockedElsewhere
                      ? <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 shrink-0">in a group</span>
                      : <span className="text-[9px] font-bold uppercase tracking-wider text-muted/70 shrink-0">{c.stage}</span>}
                  </label>
                );
              })}
            </div>
            <textarea value={g.pasted} onChange={(e) => onPatch((gr) => ({ ...gr, pasted: e.target.value }))} rows={2}
              placeholder={"Or paste emails (one per line)"}
              className="w-full px-3 py-2 rounded-md bg-bg border border-border text-xs text-fg outline-none focus:border-accent/40 font-mono" />
          </div>
        )}
      </div>
    </div>
  );
}
