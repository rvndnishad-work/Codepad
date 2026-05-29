"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Plus, X, Clock, Layers, Beaker, Brain,
  Users, Send, GripVertical, Trophy,
} from "lucide-react";
import { bulkCreateTakeHomeSessions } from "../../candidates/actions";

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
type TimelineItem = { id: string; kind: Kind; title: string; minutes: number; meta?: string };

const DEFAULT_MIN = 30;

const diffBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
};

export default function TakeHomeBuilder({
  slug, workspaceName, challenges, prompts, playgrounds, candidates,
}: {
  slug: string; workspaceName: string;
  challenges: CurationChallenge[]; prompts: CurationPrompt[];
  playgrounds: CurationPlayground[]; candidates: PickCandidate[];
}) {
  const router = useRouter();
  const [source, setSource] = useState<Kind>("challenge");
  const [search, setSearch] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [title, setTitle] = useState("Take-home assessment");
  const [daysToExpire, setDaysToExpire] = useState(7);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pasted, setPasted] = useState("");
  const [candSearch, setCandSearch] = useState("");
  const [creating, startCreating] = useTransition();

  const inTimeline = useMemo(() => new Set(timeline.map((t) => `${t.kind}:${t.id}`)), [timeline]);

  function add(kind: Kind, id: string, title: string, minutes: number, meta?: string) {
    if (inTimeline.has(`${kind}:${id}`)) return;
    setTimeline((p) => [...p, { id, kind, title, minutes: minutes || DEFAULT_MIN, meta }]);
  }
  function remove(kind: Kind, id: string) {
    setTimeline((p) => p.filter((t) => !(t.kind === kind && t.id === id)));
  }
  function setMinutes(kind: Kind, id: string, minutes: number) {
    setTimeline((p) => p.map((t) => (t.kind === kind && t.id === id ? { ...t, minutes } : t)));
  }

  const q = search.trim().toLowerCase();
  const availChallenges = challenges.filter((c) => !inTimeline.has(`challenge:${c.id}`) &&
    (!q || c.title.toLowerCase().includes(q) || (c.category ?? "").toLowerCase().includes(q)));
  const availPrompts = prompts.filter((p) => !inTimeline.has(`prompt:${p.id}`) &&
    (!q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
  const availPlaygrounds = playgrounds.filter((p) => !inTimeline.has(`playground:${p.id}`) &&
    (!q || p.title.toLowerCase().includes(q) || p.template.toLowerCase().includes(q)));

  // ── Candidate picker ──
  const visibleCands = useMemo(() => {
    const s = candSearch.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter((c) =>
      c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.stage.toLowerCase().includes(s));
  }, [candidates, candSearch]);
  const allVisiblePicked = visibleCands.length > 0 && visibleCands.every((c) => picked.has(c.id));
  function toggleAllVisible() {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allVisiblePicked) visibleCands.forEach((c) => next.delete(c.id));
      else visibleCands.forEach((c) => next.add(c.id));
      return next;
    });
  }
  function toggleCand(id: string) {
    setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const pastedRecipients = useMemo(() => {
    const out: { name: string; email: string }[] = [];
    for (const line of pasted.split(/\r?\n/)) {
      const s = line.trim(); if (!s) continue;
      const m1 = s.match(/^(.+?)\s*<\s*([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)\s*>$/);
      if (m1) { out.push({ name: m1[1].trim().replace(/^["']|["']$/g, ""), email: m1[2] }); continue; }
      const m2 = s.match(/^(.+?)\s*,\s*([^\s,]+@[^\s,]+\.[^\s,]+)$/);
      if (m2) { out.push({ name: m2[1].trim(), email: m2[2] }); continue; }
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) { out.push({ name: s.split("@")[0], email: s }); continue; }
      out.push({ name: "", email: s });
    }
    return out;
  }, [pasted]);

  const recipients = useMemo(() => {
    const seen = new Set<string>(); const list: { name: string; email: string }[] = [];
    for (const c of candidates) {
      if (!picked.has(c.id)) continue;
      const k = c.email.toLowerCase(); if (seen.has(k)) continue;
      seen.add(k); list.push({ name: c.name, email: c.email });
    }
    for (const r of pastedRecipients) {
      const k = (r.email ?? "").toLowerCase(); if (!k || seen.has(k)) continue;
      seen.add(k); list.push({ name: r.name || k.split("@")[0], email: r.email });
    }
    return list;
  }, [candidates, picked, pastedRecipients]);

  const totalMin = timeline.reduce((s, t) => s + (t.minutes || 0), 0);
  const canSend = timeline.length > 0 && recipients.length > 0 && !creating;

  function send() {
    if (!canSend) return;
    startCreating(async () => {
      try {
        const curation = {
          challengeIds: timeline.filter((t) => t.kind === "challenge").map((t) => t.id),
          playgroundIds: timeline.filter((t) => t.kind === "playground").map((t) => t.id),
          promptScenarioIds: timeline.filter((t) => t.kind === "prompt").map((t) => t.id),
          perQuestionMinutes: Object.fromEntries(timeline.map((t) => [t.id, t.minutes])),
        };
        const res = await bulkCreateTakeHomeSessions(slug, { title, curation, recipients, daysToExpire });
        toast.success(
          `Created ${res.created} take-home${res.created === 1 ? "" : "s"} — ${res.emailed} invite${res.emailed === 1 ? "" : "s"} emailed.`,
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
          Curate a set of questions and send to selected candidates — each gets their own
          tokenized link, with a separate timer per question.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT — question curation */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center gap-1.5 bg-panel p-1 border border-border rounded-lg w-fit">
              {([["challenge", "DSA", Layers], ["playground", "Playgrounds", Beaker], ["prompt", "Prompts", Brain]] as const).map(
                ([k, label, Icon]) => (
                  <button key={k} type="button" onClick={() => setSource(k)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      source === k ? "bg-accent text-bg" : "text-muted hover:text-fg"}`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…"
                className="w-full pl-9 pr-3 py-2 rounded-md bg-panel border border-border text-xs text-fg outline-none focus:border-accent/40" />
            </div>
            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {source === "challenge" && availChallenges.map((c) => (
                <PoolRow key={c.id} title={c.title} workspaceOwned={c.workspaceOwned}
                  badge={<span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${diffBg[c.difficulty]}`}>{c.difficulty}</span>}
                  sub={`${c.estimatedMinutes}m · ${c.category ?? "general"}`}
                  onAdd={() => add("challenge", c.id, c.title, c.estimatedMinutes, c.category ?? undefined)} />
              ))}
              {source === "prompt" && availPrompts.map((p) => (
                <PoolRow key={p.id} title={p.title} workspaceOwned={p.workspaceOwned}
                  badge={<span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-indigo-500/30 text-indigo-500">{p.difficulty}</span>}
                  sub={`${p.estimatedMinutes}m · ${p.category}`}
                  onAdd={() => add("prompt", p.id, p.title, p.estimatedMinutes, p.category)} />
              ))}
              {source === "playground" && availPlaygrounds.map((p) => (
                <PoolRow key={p.id} title={p.title}
                  badge={<span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-border text-muted">{p.isTemplate ? "Template" : "Snippet"}</span>}
                  sub={p.template}
                  onAdd={() => add("playground", p.id, p.title, DEFAULT_MIN, p.template)} />
              ))}
              {((source === "challenge" && availChallenges.length === 0) ||
                (source === "prompt" && availPrompts.length === 0) ||
                (source === "playground" && availPlaygrounds.length === 0)) && (
                <div className="text-center text-xs text-muted py-8">Nothing to add here.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — timeline + settings + candidates */}
        <div className="lg:col-span-5 space-y-4">
          {/* Timeline */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-accent" /> Questions</h3>
              <span className="text-[10px] text-muted tabular-nums">{timeline.length} · {totalMin}m total</span>
            </div>
            {timeline.length === 0 ? (
              <div className="text-center text-xs text-muted py-6 border border-dashed border-border rounded-lg">Add questions from the left.</div>
            ) : (
              <ul className="space-y-2">
                {timeline.map((t, i) => (
                  <li key={`${t.kind}:${t.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-panel/40">
                    <GripVertical className="w-3.5 h-3.5 text-muted/50 shrink-0" />
                    <span className="text-[10px] font-bold text-muted tabular-nums w-4">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-fg truncate">{t.title}</div>
                      <div className="text-[10px] text-muted uppercase tracking-wider">{t.kind}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="number" min={5} max={1440} value={t.minutes}
                        onChange={(e) => setMinutes(t.kind, t.id, Math.max(5, Math.min(1440, Number(e.target.value) || DEFAULT_MIN)))}
                        className="w-14 px-1.5 py-1 rounded bg-bg border border-border text-xs text-fg text-right outline-none focus:border-accent/40" />
                      <Clock className="w-3 h-3 text-muted/50" />
                    </div>
                    <button type="button" onClick={() => remove(t.kind, t.id)} className="text-muted hover:text-rose-400 shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-panel border border-border text-xs text-fg outline-none focus:border-accent/40" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Candidates must start within</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={90} value={daysToExpire}
                  onChange={(e) => setDaysToExpire(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
                  className="w-20 px-3 py-2 rounded-md bg-panel border border-border text-xs text-fg outline-none focus:border-accent/40" />
                <span className="text-xs text-muted">days</span>
              </div>
            </div>
          </div>

          {/* Candidate picker */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-500" /> Candidates</h3>
              <span className="text-[10px] text-muted tabular-nums">{recipients.length} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={candSearch} onChange={(e) => setCandSearch(e.target.value)} placeholder="Search candidates…"
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-panel border border-border text-xs text-fg outline-none focus:border-accent/40" />
              </div>
              {visibleCands.length > 0 && (
                <button type="button" onClick={toggleAllVisible}
                  className="px-2.5 py-2 rounded-md border border-border bg-panel/40 hover:bg-panel text-[10px] font-bold uppercase tracking-wider text-fg shrink-0">
                  {allVisiblePicked ? "Clear" : `Select all (${visibleCands.length})`}
                </button>
              )}
            </div>
            <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
              {visibleCands.length === 0 ? (
                <div className="text-center text-xs text-muted py-4">No candidates — paste emails below.</div>
              ) : visibleCands.map((c) => (
                <label key={c.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-panel/40 cursor-pointer">
                  <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggleCand(c.id)} className="accent-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-fg truncate">{c.name}</div>
                    <div className="text-[10px] text-muted truncate">{c.email}</div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted/70 shrink-0">{c.stage}</span>
                </label>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Or paste more (one per line)</label>
              <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={3}
                placeholder={"Name <email@co.com>\nemail@co.com"}
                className="w-full px-3 py-2 rounded-md bg-panel border border-border text-xs text-fg outline-none focus:border-accent/40 font-mono" />
            </div>
          </div>

          <button type="button" onClick={send} disabled={!canSend}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-bg text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity">
            <Send className="w-4 h-4" />
            {creating ? "Sending…" : `Send to ${recipients.length} candidate${recipients.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PoolRow({ title, badge, sub, onAdd, workspaceOwned }: {
  title: string; badge: React.ReactNode; sub: string; onAdd: () => void; workspaceOwned?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-panel/30 hover:bg-panel/60 transition-colors">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          {workspaceOwned && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 tracking-wider">Workspace</span>}
          {badge}
        </div>
        <div className="text-xs font-semibold text-fg truncate">{title}</div>
        <div className="text-[10px] text-muted truncate">{sub}</div>
      </div>
      <button type="button" onClick={onAdd}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-bg hover:border-accent/40 text-[11px] font-semibold text-fg shrink-0">
        <Plus className="w-3 h-3" /> Add
      </button>
    </div>
  );
}
