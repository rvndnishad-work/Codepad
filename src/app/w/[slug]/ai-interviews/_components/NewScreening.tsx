"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, ClipboardPaste, Code2, Coins, Columns2, ListChecks, Mic, Plus, Repeat2, Search, Send, Sparkles, Trash2, X } from "lucide-react";
import type { CreditSummary, PoolCandidate } from "@/lib/ai-interview/console-server";
import type { RoundSpecInput } from "@/lib/ai-interview/rounds";
import {
  BACKEND_FRAMEWORK_LABELS,
  BACKEND_LANGUAGES,
  DSA_LANGUAGE_LABELS,
  DSA_LANGUAGES,
  FRONTEND_FRAMEWORKS,
  curateRoundSpecs,
  type CuratableChallenge,
  type TechStack,
} from "@/lib/interview/stack";
import { templatesById } from "@/lib/templates";
import {
  creditCheck,
  DEFAULT_EXPIRY_DAYS,
  DEFAULT_REMINDER_DAYS,
  EXPIRY_CHOICES,
  expiryDate,
  parsePastedPeople,
  REMINDER_CHOICES,
  ROLE_AREAS,
  ROLE_LEVELS,
  composeRoleTitle,
  parseRoleTitle,
  type RoleLevel,
} from "@/lib/ai-interview/console";
import { AI_ENGAGEMENT_CREDIT_COST, ENGAGEMENT_LABELS, normalizeEngagementLevel, type EngagementLevel } from "@/lib/ai-interview/engagement";
import { paradigmName, roundLabel } from "@/lib/ai-interview/round-label";
import {
  ANSWER_MODE_LABELS,
  DEFAULT_THEORY,
  SECONDS_CHOICES,
  askedCount,
  sanitizeTheory,
  theoryMinutes,
  type TheoryAnswerMode,
  type TheorySettings,
} from "@/lib/ai-interview/theory";
import { plural } from "@/lib/workspace/display";
import { Avatar, Btn, Dialog, StageChip, inputCls, useToasts } from "../../candidates/_components/ui";
import { selectCls } from "./kit";
import { createScreeningAction } from "../actions";

export type QuestionChoice = {
  id: string;
  title: string;
  kind: string;
  label: string;
  minutes: number;
  custom: boolean;
  language: string | null;
  frameworkLabel: string | null;
  /** Questions in a questionnaire (conversation question sets); 0 otherwise. */
  questionCount: number;
};
export type ChallengeChoice = CuratableChallenge & { title: string; difficulty: string; mine: boolean };
export type Prefill = {
  title: string;
  engagementLevel: string;
  expiresAfterDays: number | null;
  reminderAfterDays: number | null;
  rounds: {
    paradigm: string;
    language: string | null;
    frameworkLabel: string | null;
    sourceKind: string;
    sourceId: string | null;
    templateId: string | null;
    estimatedMinutes: number;
    theory?: TheorySettings | null;
    /** Keep this exact challenge even when it is from the public bank (library picks). */
    pinned?: boolean;
  }[];
};

/** What a screening tests: spoken theory questions, coding in the playground, or both. */
type Mode = "theory" | "practical" | "both";

const MODES: { id: Mode; title: string; body: string; icon: typeof Mic }[] = [
  { id: "theory", title: "Theory", body: "The AI reads questions from your questionnaires aloud and listens to each answer. One question at a time.", icon: Mic },
  { id: "practical", title: "Practical", body: "Candidates solve coding tasks in the playground while the AI asks about their code.", icon: Code2 },
  { id: "both", title: "Both", body: "Theory questions first, then coding. One invite, and a score for each part.", icon: Columns2 },
];

/** A theory round: one questionnaire with its settings. */
type TheoryRow = { key: string; templateId: string; settings: TheorySettings };

const MINUTES = [15, 20, 30, 45, 60];
const MAX_ROUNDS = 6;

/** A round's slot in the stack, kept when the stack changes so swaps survive. */
const slotKey = (r: { paradigm: string; language?: string | null; frameworkLabel?: string | null }) =>
  r.paradigm === "frontend" ? `frontend:${r.frameworkLabel ?? ""}` : `${r.paradigm}:${r.language ?? ""}`;

type Row = { key: string; spec: RoundSpecInput; base: RoundSpecInput };

export default function NewScreening({
  slug,
  credits,
  pool,
  preselected,
  questions,
  challenges,
  prefill,
  canBuy,
}: {
  slug: string;
  credits: CreditSummary;
  pool: PoolCandidate[];
  preselected: string[];
  questions: QuestionChoice[];
  challenges: ChallengeChoice[];
  prefill: Prefill | null;
  canBuy: boolean;
}) {
  const router = useRouter();
  const base = `/w/${slug}/ai-interviews`;
  const [sending, start] = useTransition();
  const [toasts, toast] = useToasts();

  // 1. Role: level and area compose the title; typing a title detaches them.
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [roleLevel, setRoleLevel] = useState<RoleLevel | null>(() => parseRoleTitle(prefill?.title ?? "").level);
  const [roleArea, setRoleArea] = useState<string | null>(() => parseRoleTitle(prefill?.title ?? "").area);
  const area = ROLE_AREAS.find((a) => a.id === roleArea) ?? null;

  // 2. What to test. A duplicated screening starts from its stack and swaps.
  const init = useMemo(() => stackFromSpecs(prefill?.rounds ?? [], challenges), [prefill, challenges]);
  const [frontend, setFrontend] = useState<string[]>(init.frontend);
  const [backend, setBackend] = useState<string[]>(init.backend);
  const [backendFw, setBackendFw] = useState<string[]>(init.backendFw);
  const [dsa, setDsa] = useState<string[]>(init.dsa);
  const [minutes, setMinutes] = useState(init.minutes ?? 30);
  const [swaps, setSwaps] = useState<Record<string, string>>(init.swaps);
  const [order, setOrder] = useState<string[]>(init.order);
  const [removed, setRemoved] = useState<string[]>([]);
  const [swapping, setSwapping] = useState<Row | null>(null);
  // Rounds added straight from the question library, on top of the stack.
  const [extra, setExtra] = useState<Row[]>(() => init.extra);
  const [browsing, setBrowsing] = useState(false);
  // Theory rounds (questionnaires) and what the screening tests.
  const [theoryRows, setTheoryRows] = useState<TheoryRow[]>(init.theory);
  const [mode, setMode] = useState<Mode>(() => (!prefill ? "both" : init.theory.length ? (init.order.length ? "both" : "theory") : "practical"));
  const [pickingQuestionnaire, setPickingQuestionnaire] = useState(false);

  // 3. Candidates
  const [picked, setPicked] = useState<string[]>(preselected);
  const [newPeople, setNewPeople] = useState<{ name: string; email: string }[]>([]);
  const [search, setSearch] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // 4. Settings
  const [level, setLevel] = useState<EngagementLevel>(normalizeEngagementLevel(prefill?.engagementLevel));
  const [expiry, setExpiry] = useState<number>(prefill?.expiresAfterDays ?? DEFAULT_EXPIRY_DAYS);
  const [reminder, setReminder] = useState<number>(prefill ? prefill.reminderAfterDays ?? 0 : DEFAULT_REMINDER_DAYS);
  const [extensions, setExtensions] = useState(1);
  const [extMinutes, setExtMinutes] = useState(5);

  const stack: TechStack = useMemo(() => {
    const s: TechStack = {};
    if (frontend.length) s.frontend = { frameworks: frontend };
    if (backend.length) s.backend = { languages: backend, frameworkLabels: backendFw };
    if (dsa.length) s.dsa = { languages: dsa };
    return s;
  }, [frontend, backend, backendFw, dsa]);

  const rows: Row[] = useMemo(() => {
    // Only the public bank feeds automatic picks; library drafts are added by hand.
    const bank = challenges.filter((c) => !c.mine);
    const curated = curateRoundSpecs(stack, { challenges: bank }, { defaultMinutes: minutes }) as RoundSpecInput[];
    const list = curated
      .map((c) => {
        const key = slotKey(c);
        const swap = swaps[key];
        const spec: RoundSpecInput = swap ? { ...c, sourceKind: "scaffold", sourceId: undefined, templateId: swap } : c;
        return { key, spec, base: c };
      })
      .filter((r) => !removed.includes(r.key))
      .concat(extra);
    const rank = (k: string) => {
      const i = order.indexOf(k);
      return i < 0 ? 1000 : i;
    };
    return list.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r.key) - rank(b.r.key) || a.i - b.i).map((x) => x.r);
  }, [stack, challenges, minutes, swaps, removed, order, extra]);

  const questionnaires = useMemo(() => questions.filter((q) => q.custom && q.kind === "conversation"), [questions]);
  const theorySpecs: { row: TheoryRow; spec: RoundSpecInput; title: string; total: number }[] = theoryRows.map((row) => {
    const q = questionnaires.find((x) => x.id === row.templateId);
    const total = q?.questionCount ?? 0;
    return {
      row,
      title: q?.title ?? "Questionnaire",
      total,
      spec: {
        paradigm: "theory",
        sourceKind: "scaffold",
        templateId: row.templateId,
        frameworkLabel: q?.frameworkLabel ?? undefined,
        estimatedMinutes: theoryMinutes(row.settings, total),
        theory: row.settings,
      },
    };
  });
  const showTheory = mode !== "practical";
  const showPractical = mode !== "theory";
  // Theory rounds come first, then the coding rounds.
  const allSpecs: RoundSpecInput[] = [...(showTheory ? theorySpecs.map((t) => t.spec) : []), ...(showPractical ? rows.map((r) => r.spec) : [])];

  const missingDsa = dsa.filter((l) => !challenges.some((c) => c.paradigm === "dsa" && c.languages.map((x) => x.toLowerCase()).includes(l.toLowerCase())));

  const people = picked.length + newPeople.length;
  const check = creditCheck(credits.balance, credits.held, people, level);
  const totalMinutes = allSpecs.reduce((n, r) => n + (r.estimatedMinutes ?? 30), 0);
  const closes = expiryDate(new Date(), expiry);
  const problems = [
    !title.trim() && "Name the role",
    !allSpecs.length && "Pick at least one thing to test",
    mode === "both" && showTheory && !theoryRows.length && "Add a questionnaire for the theory part",
    mode === "both" && !rows.length && "Add a coding round for the practical part",
    allSpecs.length > MAX_ROUNDS && `Keep it to ${MAX_ROUNDS} rounds`,
    !people && "Add at least one candidate",
    people > 0 && !check.ok && "Not enough credits",
  ].filter(Boolean) as string[];

  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, v: string) => set((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]));

  function move(key: string, dir: -1 | 1) {
    const keys = rows.map((r) => r.key);
    const i = keys.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    setOrder(keys);
  }

  function pickLevel(l: RoleLevel) {
    const next = roleLevel === l ? null : l;
    setRoleLevel(next);
    setTitle(composeRoleTitle(next, roleArea));
  }

  function pickArea(id: string) {
    const next = roleArea === id ? null : id;
    setRoleArea(next);
    setTitle(composeRoleTitle(roleLevel, next));
    // A technical area starts the stack for you, only when nothing is picked yet.
    const a = ROLE_AREAS.find((x) => x.id === next);
    const empty = !frontend.length && !backend.length && !dsa.length && !extra.length;
    if (a?.stack && empty) {
      setFrontend(a.stack.frontend ?? []);
      setBackend(a.stack.backend ?? []);
      setDsa(a.stack.dsa ?? []);
    }
    // Technical roles test both by default; other roles answer questions only.
    if (a && empty && !theoryRows.length) setMode(a.technical ? "both" : "theory");
  }

  function addQuestionnaire(id: string) {
    if (theoryRows.some((t) => t.templateId === id)) return;
    setTheoryRows((a) => [...a, { key: `theory:${id}`, templateId: id, settings: { ...DEFAULT_THEORY } }]);
    toast("Questionnaire added");
  }

  function moveTheory(key: string, dir: -1 | 1) {
    setTheoryRows((a) => {
      const i = a.findIndex((t) => t.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= a.length) return a;
      const next = a.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const setTheory = (key: string, patch: Partial<TheorySettings>) =>
    setTheoryRows((a) => a.map((t) => (t.key === key ? { ...t, settings: sanitizeTheory({ ...t.settings, ...patch }) } : t)));

  function addFromLibrary(spec: RoundSpecInput) {
    const key = `lib:${spec.sourceKind}:${spec.sourceId ?? spec.templateId}`;
    if (rows.some((r) => r.key === key)) return;
    setExtra((a) => [...a, { key, spec, base: spec }]);
    toast("Round added");
  }

  function removeRound(key: string) {
    if (key.startsWith("lib:")) setExtra((a) => a.filter((r) => r.key !== key));
    else setRemoved((a) => [...a, key]);
  }

  function addPasted() {
    const found = parsePastedPeople(pasteText);
    if (!found.length) return toast("No email addresses found in that text.", "error");
    const byEmail = new Map(pool.map((c) => [c.email.toLowerCase(), c.id]));
    const ids: string[] = [];
    const fresh: { name: string; email: string }[] = [];
    for (const p of found) {
      const id = byEmail.get(p.email);
      if (id) ids.push(id);
      else if (!newPeople.some((n) => n.email === p.email)) fresh.push(p);
    }
    setPicked((a) => [...new Set([...a, ...ids])]);
    setNewPeople((a) => [...a, ...fresh]);
    setPasteText("");
    setPasting(false);
    toast(`${plural(found.length, "person", "people")} added${fresh.length ? `, ${fresh.length} new to Candidates` : ""}`);
  }

  function send() {
    start(async () => {
      const res = await createScreeningAction(slug, {
        positionTitle: title,
        candidateIds: picked,
        newPeople,
        rounds: allSpecs,
        engagementLevel: level,
        expiresAfterDays: expiry,
        reminderAfterDays: reminder,
        maxExtensions: extensions,
        extensionMinutes: extMinutes,
      });
      if (!res.ok) return toast(res.error, "error");
      toast(res.failed ? `${plural(res.invited, "invite")} created, ${res.failed} ${res.failed === 1 ? "email" : "emails"} failed` : `${plural(res.sent, "invite")} sent`, res.failed ? "error" : "ok");
      router.push(`${base}/screenings/${res.batchId}`);
    });
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? pool.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) : pool;
    return list.slice(0, 8);
  }, [pool, search]);

  const questionTitle = (s: RoundSpecInput) => {
    if (s.sourceKind === "scaffold") return questions.find((q) => q.id === s.templateId)?.title ?? "Team question";
    if (s.sourceKind === "challenge") return challenges.find((c) => c.id === s.sourceId)?.title ?? "Algorithm problem";
    const t = s.sourceId ? templatesById[s.sourceId] : undefined;
    return t ? `${t.title} starter project` : "Starter project";
  };

  return (
    <div className="flex flex-col gap-5">
      <Link href={base} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg w-fit">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> AI screening
      </Link>
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-fg">{prefill?.title ? "Duplicate screening" : "New screening"}</h1>
        <p className="text-[15px] text-muted mt-1">Four short sections. The AI interviewer builds the rounds from what you pick, and you can swap any question.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
          {/* 1. Role */}
          <Section n={1} title="Role" hint="Pick a level and an area, or type any title" done={!!title.trim()}>
            <ChipGroup label="Level">
              {ROLE_LEVELS.map((l) => (
                <Pill key={l} on={roleLevel === l} onClick={() => pickLevel(l)}>
                  {l}
                </Pill>
              ))}
            </ChipGroup>
            <ChipGroup label="Engineering">
              {ROLE_AREAS.filter((a) => a.technical).map((a) => (
                <Pill key={a.id} on={roleArea === a.id} onClick={() => pickArea(a.id)}>
                  {a.label}
                </Pill>
              ))}
            </ChipGroup>
            <ChipGroup label="Business and other roles">
              {ROLE_AREAS.filter((a) => !a.technical).map((a) => (
                <Pill key={a.id} on={roleArea === a.id} onClick={() => pickArea(a.id)}>
                  {a.label}
                </Pill>
              ))}
            </ChipGroup>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-subtle">Job title candidates will see</span>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setRoleLevel(null);
                  setRoleArea(null);
                }}
                placeholder="Senior Frontend Engineer"
                maxLength={120}
                className={`${inputCls} h-10 text-sm`}
              />
            </label>
          </Section>

          {/* 2. What to test */}
          <Section n={2} title="What to test" hint="Spoken theory questions, coding in the playground, or both" done={allSpecs.length > 0}>
            <div role="radiogroup" aria-label="What the screening tests" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODES.map((m) => {
                const on = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setMode(m.id)}
                    className={`flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition ${on ? "border-secondary bg-secondary/[0.07]" : "border-border hover:border-border-strong"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-fg">
                        <m.icon className="w-4 h-4 text-secondary-soft" aria-hidden />
                        {m.title}
                      </span>
                      <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${on ? "border-secondary bg-secondary/30" : "border-border-strong"}`} aria-hidden />
                    </span>
                    <span className="text-xs text-subtle leading-snug">{m.body}</span>
                  </button>
                );
              })}
            </div>

            {showTheory && (
              <div className="flex flex-col gap-3">
                {mode === "both" && <h3 className="text-[13px] font-semibold text-fg">Theory</h3>}
                {theorySpecs.length > 0 ? (
                  <ol className="flex flex-col rounded-xl border border-border divide-y divide-border">
                    {theorySpecs.map((t, i) => (
                      <li key={t.row.key} className="flex flex-col gap-3 px-3.5 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-elevated text-[13px] font-semibold text-fg inline-flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-[180px] flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-fg">{t.title}</span>
                            <span className="text-xs text-subtle">
                              Theory, {plural(askedCount(t.row.settings, t.total), "question")} of {t.total}, about {t.spec.estimatedMinutes} min
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <IconBtn label="Move up" disabled={i === 0} onClick={() => moveTheory(t.row.key, -1)} icon={ArrowUp} />
                            <IconBtn label="Move down" disabled={i === theorySpecs.length - 1} onClick={() => moveTheory(t.row.key, 1)} icon={ArrowDown} />
                            <IconBtn label="Remove round" onClick={() => setTheoryRows((a) => a.filter((x) => x.key !== t.row.key))} icon={Trash2} />
                          </div>
                        </div>
                        <TheorySettingsFields settings={t.row.settings} total={t.total} onChange={(patch) => setTheory(t.row.key, patch)} />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="rounded-lg border border-dashed border-border-strong px-3.5 py-3 text-[13px] text-muted">
                    Add a questionnaire. The AI reads its questions aloud, one at a time, and grades each answer against your reference answer.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Btn icon={ListChecks} onClick={() => setPickingQuestionnaire(true)}>
                    Add questionnaire
                  </Btn>
                  <Link href={`/w/${slug}/library`} className="text-[13px] text-secondary-soft hover:underline">
                    Write one in the Question library
                  </Link>
                </div>
              </div>
            )}

            {showPractical && (
              <div className="flex flex-col gap-4">
                {mode === "both" && <h3 className="text-[13px] font-semibold text-fg">Practical</h3>}
              <ChipGroup label="Frontend">
                {FRONTEND_FRAMEWORKS.map((f) => (
                  <Pill key={f.id} on={frontend.includes(f.id)} onClick={() => toggle(setFrontend, f.id)}>
                    {f.label}
                  </Pill>
                ))}
              </ChipGroup>
              <ChipGroup label="Backend">
                {BACKEND_LANGUAGES.map((b) => (
                  <Pill key={b.id} on={backend.includes(b.id)} onClick={() => toggle(setBackend, b.id)}>
                    {b.label}
                  </Pill>
                ))}
              </ChipGroup>
              {backend.length > 0 && (
                <ChipGroup label="Backend framework focus (steers the questions)">
                  {[...new Set(backend.flatMap((l) => BACKEND_FRAMEWORK_LABELS[l] ?? []))].map((fw) => (
                    <Pill key={fw} on={backendFw.includes(fw)} onClick={() => toggle(setBackendFw, fw)}>
                      {fw}
                    </Pill>
                  ))}
                </ChipGroup>
              )}
              <ChipGroup label="Algorithms">
                {DSA_LANGUAGES.map((l) => (
                  <Pill key={l} on={dsa.includes(l)} onClick={() => toggle(setDsa, l)}>
                    {DSA_LANGUAGE_LABELS[l] ?? l}
                  </Pill>
                ))}
              </ChipGroup>
              {missingDsa.length > 0 && (
                <p className="text-[13px] text-warning">
                  No algorithm problem in the bank uses {missingDsa.map((l) => DSA_LANGUAGE_LABELS[l] ?? l).join(", ")} yet, so that round is skipped.
                </p>
              )}
              <label className="flex items-center gap-2 text-[13px] text-muted">
                Time per round
                <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={`${selectCls} w-auto h-8`}>
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <Btn icon={BookOpen} onClick={() => setBrowsing(true)}>
                  Add from question library
                </Btn>
                {rows.length > MAX_ROUNDS && <span className="text-[13px] text-danger">A screening can have at most {MAX_ROUNDS} rounds.</span>}
              </div>

              {rows.length > 0 && (
                <ol className="flex flex-col rounded-xl border border-border divide-y divide-border">
                  {rows.map((r, i) => (
                    <li key={r.key} className="flex flex-wrap items-center gap-3 px-3.5 py-3">
                      <span className="w-7 h-7 rounded-lg bg-elevated text-[13px] font-semibold text-fg inline-flex items-center justify-center shrink-0">{(showTheory ? theorySpecs.length : 0) + i + 1}</span>
                      <div className="flex-1 min-w-[180px] flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-fg">{questionTitle(r.spec)}</span>
                        <span className="text-xs text-subtle">
                          {paradigmName(r.spec.paradigm)}, {roundLabel(r.spec)}, {r.spec.estimatedMinutes} min
                          {r.key.startsWith("lib:") ? ", from your library" : r.spec.sourceKind === "scaffold" ? ", swapped" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!r.key.startsWith("lib:") && (
                          <Btn variant="quiet" icon={Repeat2} onClick={() => setSwapping(r)}>
                            Swap question
                          </Btn>
                        )}
                        <IconBtn label="Move up" disabled={i === 0} onClick={() => move(r.key, -1)} icon={ArrowUp} />
                        <IconBtn label="Move down" disabled={i === rows.length - 1} onClick={() => move(r.key, 1)} icon={ArrowDown} />
                        <IconBtn label="Remove round" onClick={() => removeRound(r.key)} icon={Trash2} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {removed.length > 0 && (
                <button type="button" onClick={() => setRemoved([])} className="self-start text-[13px] text-secondary-soft hover:underline">
                  Bring back {plural(removed.length, "removed round")}
                </button>
              )}
              </div>
            )}
          </Section>

          {/* 3. Candidates */}
          <Section n={3} title="Candidates" hint="Pick from Candidates, or paste emails to add new people" done={people > 0}>
            <div className="flex flex-wrap gap-2">
              <label className="relative flex-1 min-w-[200px]">
                <span className="sr-only">Search candidates</span>
                <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className={`${inputCls} pl-8`} />
              </label>
              <Btn icon={ClipboardPaste} onClick={() => setPasting(true)}>
                Paste emails
              </Btn>
            </div>
            {pool.length === 0 && !newPeople.length ? (
              <p className="text-[13px] text-muted">There are no candidates with an email yet. Paste emails to add people.</p>
            ) : (
              <ul className="flex flex-col rounded-xl border border-border divide-y divide-border">
                {shown.map((c) => {
                  const on = picked.includes(c.id);
                  return (
                    <li key={c.id}>
                      <label className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-panel/60">
                        <input type="checkbox" checked={on} onChange={() => toggle(setPicked, c.id)} className="w-4 h-4 accent-secondary" />
                        <Avatar name={c.name} size={28} />
                        <span className="flex-1 min-w-0 flex flex-col">
                          <span className="text-sm text-fg truncate">{c.name}</span>
                          <span className="text-xs text-subtle truncate">{c.email}</span>
                        </span>
                        <span className="hidden sm:inline-flex">
                          <StageChip stage={c.stage} />
                        </span>
                      </label>
                    </li>
                  );
                })}
                {shown.length === 0 && <li className="px-3.5 py-3 text-[13px] text-subtle">No candidates match. Paste their email to add them.</li>}
              </ul>
            )}
            {(picked.length > 0 || newPeople.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {picked.map((id) => {
                  const c = pool.find((p) => p.id === id);
                  if (!c) return null;
                  return (
                    <Tag key={id} onRemove={() => setPicked((a) => a.filter((x) => x !== id))}>
                      {c.name}
                    </Tag>
                  );
                })}
                {newPeople.map((p) => (
                  <Tag key={p.email} onRemove={() => setNewPeople((a) => a.filter((x) => x.email !== p.email))} fresh>
                    {p.name} ({p.email})
                  </Tag>
                ))}
              </div>
            )}
          </Section>

          {/* 4. Settings */}
          <Section n={4} title="Settings" hint="Sensible defaults. Change them only if you need to." done>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-[13px] text-muted mb-2">How present the AI interviewer is</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.keys(ENGAGEMENT_LABELS) as EngagementLevel[]).map((l) => {
                  const on = level === l;
                  return (
                    <label
                      key={l}
                      className={`flex flex-col gap-1 rounded-xl border p-3 cursor-pointer transition ${on ? "border-secondary bg-secondary/[0.07]" : "border-border hover:border-border-strong"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-fg">
                          <input type="radio" name="presence" checked={on} onChange={() => setLevel(l)} className="w-4 h-4 accent-secondary" />
                          {ENGAGEMENT_LABELS[l].label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-warning tabular-nums">
                          <Coins className="w-3 h-3" aria-hidden />
                          {plural(AI_ENGAGEMENT_CREDIT_COST[l], "credit")}
                        </span>
                      </span>
                      <span className="text-xs text-subtle leading-snug">{ENGAGEMENT_LABELS[l].hint}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-subtle">Invite closes after</span>
                <select value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} className={inputCls}>
                  {EXPIRY_CHOICES.map((d) => (
                    <option key={d} value={d}>
                      {plural(d, "day")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-subtle">Reminder if not started</span>
                <select value={reminder} onChange={(e) => setReminder(Number(e.target.value))} className={inputCls}>
                  {REMINDER_CHOICES.filter((d) => d < expiry).map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? "No reminder" : `After ${plural(d, "day")}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-subtle">Extra time the candidate can add</span>
                <select
                  value={`${extensions}x${extMinutes}`}
                  onChange={(e) => {
                    const [a, b] = e.target.value.split("x").map(Number);
                    setExtensions(a);
                    setExtMinutes(b);
                  }}
                  className={inputCls}
                >
                  <option value="0x5">None</option>
                  <option value="1x5">Once, 5 min</option>
                  <option value="1x10">Once, 10 min</option>
                  <option value="2x5">Twice, 5 min each</option>
                  <option value="2x10">Twice, 10 min each</option>
                </select>
              </label>
            </div>
          </Section>
        </div>

        {/* Summary */}
        <aside className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-4 rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Summary</h2>
          <dl className="flex flex-col gap-2.5 text-[13px]">
            <Line k="Role" v={title.trim() || "Not named yet"} dim={!title.trim()} />
            <Line k="Tests" v={MODES.find((m) => m.id === mode)?.title ?? ""} />
            <Line k="Rounds" v={allSpecs.length ? `${allSpecs.length}, ${totalMinutes} min in all` : "None yet"} dim={!allSpecs.length} />
            <Line k="Candidates" v={people ? plural(people, "person", "people") : "None yet"} dim={!people} />
            <Line k="Interviewer" v={ENGAGEMENT_LABELS[level].label} />
            <Line k="Invite closes" v={closes ? closes.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Never"} />
          </dl>
          <div className="h-px bg-border" />
          <dl className="flex flex-col gap-2.5 text-[13px]">
            <Line k="Credits needed" v={`${check.needed}`} />
            <Line k="Free now" v={`${check.available}`} />
            <Line k="Free after" v={`${check.after}`} tone={check.ok ? undefined : "text-danger"} />
          </dl>
          <p className="text-xs text-subtle leading-relaxed">
            Credits are charged only when a candidate starts. Invites that close unstarted cost nothing.
          </p>
          {!check.ok && people > 0 && (
            <p className="text-[13px] text-danger">
              {check.needed - check.available} more {check.needed - check.available === 1 ? "credit is" : "credits are"} needed.{" "}
              {canBuy ? (
                <Link href={base} className="underline">
                  Buy credits
                </Link>
              ) : (
                "Ask an owner or admin to buy credits."
              )}
            </p>
          )}
          <Btn variant="primary" size="md" icon={Send} disabled={!!problems.length || sending} onClick={send} className="w-full">
            {sending ? "Sending invites" : people ? `Send ${plural(people, "invite")}` : "Send invites"}
          </Btn>
          {problems.length > 0 && <p className="text-xs text-subtle text-center">{problems[0]} to continue.</p>}
        </aside>
      </div>

      {swapping && (
        <SwapDialog
          row={swapping}
          questions={questions}
          current={swaps[swapping.key] ?? null}
          defaultTitle={questionTitle(swapping.base)}
          onClose={() => setSwapping(null)}
          onPick={(id) => {
            setSwaps((s) => {
              const next = { ...s };
              if (id) next[swapping.key] = id;
              else delete next[swapping.key];
              return next;
            });
            setSwapping(null);
          }}
        />
      )}
      {browsing && (
        <LibraryDialog
          questions={questions}
          challenges={challenges}
          minutes={minutes}
          initialKind={area && !area.technical ? "conversation" : ""}
          added={rows.map((r) => r.spec)}
          onAdd={addFromLibrary}
          onClose={() => setBrowsing(false)}
        />
      )}
      {pickingQuestionnaire && (
        <QuestionnaireDialog
          slug={slug}
          questionnaires={questionnaires}
          added={theoryRows.map((t) => t.templateId)}
          onAdd={addQuestionnaire}
          onClose={() => setPickingQuestionnaire(false)}
        />
      )}
      {pasting && (
        <Dialog
          title="Paste emails"
          onClose={() => setPasting(false)}
          width={520}
          footer={
            <>
              <Btn onClick={() => setPasting(false)}>Cancel</Btn>
              <Btn variant="primary" disabled={!pasteText.trim()} onClick={addPasted}>
                Add people
              </Btn>
            </>
          }
        >
          <p className="text-[13px] text-muted mb-3">One per line, or separated by commas. Names are optional: “Ava Patel &lt;ava@mail.com&gt;” or just the email. New people are added to Candidates.</p>
          <textarea
            rows={7}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Ava Patel <ava@mail.com>\nmateo@mail.com"}
            className={`${inputCls} h-auto py-2 font-mono text-[12.5px]`}
          />
          {pasteText.trim() && <p className="mt-2 text-xs text-subtle">{plural(parsePastedPeople(pasteText).length, "email")} found</p>}
        </Dialog>
      )}
      {toasts}
    </div>
  );
}

function stackFromSpecs(specs: Prefill["rounds"], challenges: ChallengeChoice[]) {
  const out = { frontend: [] as string[], backend: [] as string[], backendFw: [] as string[], dsa: [] as string[], swaps: {} as Record<string, string>, order: [] as string[], minutes: null as number | null, extra: [] as Row[], theory: [] as TheoryRow[] };
  const mine = new Set(challenges.filter((c) => c.mine).map((c) => c.id));
  for (const s of specs) {
    if (s.paradigm === "theory" && s.templateId) {
      out.theory.push({ key: `theory:${s.templateId}`, templateId: s.templateId, settings: sanitizeTheory(s.theory ?? DEFAULT_THEORY) });
      continue;
    }
    // A round picked from the team library stays that exact question.
    if (s.paradigm === "conversation" && s.templateId) {
      const spec: RoundSpecInput = { paradigm: "conversation", sourceKind: "scaffold", templateId: s.templateId, frameworkLabel: s.frameworkLabel ?? undefined, estimatedMinutes: s.estimatedMinutes };
      const key = `lib:scaffold:${s.templateId}`;
      out.extra.push({ key, spec, base: spec });
      out.order.push(key);
      continue;
    }
    if (s.sourceKind === "challenge" && s.sourceId && (mine.has(s.sourceId) || s.pinned)) {
      const spec: RoundSpecInput = {
        paradigm: s.paradigm as RoundSpecInput["paradigm"],
        language: s.language ?? undefined,
        frameworkLabel: s.frameworkLabel ?? undefined,
        sourceKind: "challenge",
        sourceId: s.sourceId,
        estimatedMinutes: s.estimatedMinutes,
      };
      const key = `lib:challenge:${s.sourceId}`;
      out.extra.push({ key, spec, base: spec });
      out.order.push(key);
      continue;
    }
    if (s.paradigm === "frontend") {
      const f = FRONTEND_FRAMEWORKS.find((x) => x.label === s.frameworkLabel || x.id === s.sourceId);
      if (f && !out.frontend.includes(f.id)) out.frontend.push(f.id);
    } else if (s.paradigm === "backend" && s.language) {
      if (!out.backend.includes(s.language)) out.backend.push(s.language);
      for (const fw of (s.frameworkLabel ?? "").split(",").map((x) => x.trim()).filter(Boolean)) if (!out.backendFw.includes(fw)) out.backendFw.push(fw);
    } else if (s.paradigm === "dsa" && s.language) {
      if (!out.dsa.includes(s.language)) out.dsa.push(s.language);
    }
    const f = s.paradigm === "frontend" ? FRONTEND_FRAMEWORKS.find((x) => x.label === s.frameworkLabel || x.id === s.sourceId)?.label ?? s.frameworkLabel : null;
    const key = slotKey({ paradigm: s.paradigm, language: s.language, frameworkLabel: f });
    out.order.push(key);
    if (s.sourceKind === "scaffold" && s.templateId) out.swaps[key] = s.templateId;
    out.minutes ??= s.estimatedMinutes;
  }
  return out;
}

const PICK_COUNTS = [3, 5, 8, 10, 15, 20];

/** The four settings of a theory round, in one row. */
function TheorySettingsFields({ settings, total, onChange }: { settings: TheorySettings; total: number; onChange: (patch: Partial<TheorySettings>) => void }) {
  const counts = PICK_COUNTS.filter((n) => n < total);
  const field = "flex flex-col gap-1.5 text-xs font-medium text-subtle";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-panel/50 border border-border p-3">
      <label className={field}>
        Questions to ask
        <select
          value={settings.count != null && settings.count < total ? settings.count : "all"}
          onChange={(e) => onChange({ count: e.target.value === "all" ? null : Number(e.target.value) })}
          className={inputCls}
        >
          <option value="all">All {total}, in order</option>
          {counts.map((n) => (
            <option key={n} value={n}>
              Random {n} of {total}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        Time per question
        <select value={settings.secondsPerQuestion} onChange={(e) => onChange({ secondsPerQuestion: Number(e.target.value) })} className={inputCls}>
          {SECONDS_CHOICES.map((s) => (
            <option key={s} value={s}>
              {plural(s / 60, "minute")}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        Follow-ups per question
        <select value={settings.followUps} onChange={(e) => onChange({ followUps: Number(e.target.value) as TheorySettings["followUps"] })} className={inputCls}>
          <option value={0}>None</option>
          <option value={1}>Up to 1</option>
          <option value={2}>Up to 2</option>
        </select>
      </label>
      <label className={field}>
        Answer by
        <select value={settings.answerMode} onChange={(e) => onChange({ answerMode: e.target.value as TheoryAnswerMode })} className={inputCls}>
          {(Object.keys(ANSWER_MODE_LABELS) as TheoryAnswerMode[]).map((m) => (
            <option key={m} value={m}>
              {ANSWER_MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <label className={`sm:col-span-2 flex items-start gap-2.5 text-[13px] ${settings.answerMode === "typing" ? "opacity-50" : ""}`}>
        <input
          type="checkbox"
          checked={settings.recordAudio}
          disabled={settings.answerMode === "typing"}
          onChange={(e) => onChange({ recordAudio: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-secondary"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-fg font-medium">Keep recordings of spoken answers</span>
          <span className="text-subtle">You can replay each answer in the report. Candidates are asked to agree first, and can type instead when typing is allowed.</span>
        </span>
      </label>
    </div>
  );
}

/** Pick a questionnaire from the Question library for a theory round. */
function QuestionnaireDialog({
  slug,
  questionnaires,
  added,
  onAdd,
  onClose,
}: {
  slug: string;
  questionnaires: QuestionChoice[];
  added: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const list = questionnaires.filter((x) => !needle || x.title.toLowerCase().includes(needle));
  return (
    <Dialog title="Add a questionnaire" onClose={onClose} width={560}>
      <div className="flex flex-col gap-3">
        <label className="relative">
          <span className="sr-only">Search questionnaires</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questionnaires" className={`${inputCls} pl-8`} />
        </label>
        <ul className="flex flex-col max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {list.map((x) => {
            const done = added.includes(x.id);
            return (
              <li key={x.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-fg truncate">{x.title}</span>
                  <span className="block text-xs text-subtle">
                    {plural(x.questionCount, "question")}
                    {x.frameworkLabel ? `, ${x.frameworkLabel}` : ""}
                  </span>
                </span>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-[13px] text-success">
                    <Check className="w-3.5 h-3.5" aria-hidden /> Added
                  </span>
                ) : (
                  <Btn icon={Plus} disabled={!x.questionCount} onClick={() => onAdd(x.id)}>
                    Add
                  </Btn>
                )}
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="px-3.5 py-6 text-center text-[13px] text-subtle">
              {questionnaires.length === 0 ? (
                <>
                  No questionnaires yet.{" "}
                  <Link href={`/w/${slug}/library`} className="text-secondary-soft underline">
                    Build one from the public questions
                  </Link>
                </>
              ) : (
                "No questionnaires match."
              )}
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}

function Section({ n, title, hint, done, children }: { n: number; title: string; hint: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[13px] font-semibold shrink-0 transition-colors ${
            done ? "bg-secondary text-bg" : "bg-elevated text-fg"
          }`}
        >
          {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} aria-label="Done" /> : n}
        </span>
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          <span className="text-[13px] text-muted">{hint}</span>
        </div>
      </div>
      {children}
    </section>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-subtle">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[13px] transition ${
        on ? "border-secondary/60 bg-secondary/15 text-fg" : "border-border-strong text-muted hover:text-fg hover:border-secondary/40"
      }`}
    >
      {on && <Check className="w-3 h-3 text-secondary-soft" aria-hidden />}
      {children}
    </button>
  );
}

function Tag({ children, onRemove, fresh }: { children: React.ReactNode; onRemove: () => void; fresh?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-md text-xs ${fresh ? "bg-success/10 text-success" : "bg-panel text-fg"}`}>
      {children}
      <button type="button" onClick={onRemove} aria-label="Remove" className="w-5 h-5 rounded inline-flex items-center justify-center text-muted hover:text-fg hover:bg-elevated">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function IconBtn({ label, icon: Icon, onClick, disabled }: { label: string; icon: typeof X; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel disabled:opacity-30 disabled:pointer-events-none"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Line({ k, v, dim, tone }: { k: string; v: string; dim?: boolean; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className={`text-right tabular-nums ${tone ?? (dim ? "text-subtle" : "text-fg")}`}>{v}</dd>
    </div>
  );
}

function SwapDialog({
  row,
  questions,
  current,
  defaultTitle,
  onClose,
  onPick,
}: {
  row: Row;
  questions: QuestionChoice[];
  current: string | null;
  defaultTitle: string;
  onClose: () => void;
  onPick: (id: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const list = questions
    .filter((x) => all || x.kind === row.spec.paradigm)
    .filter((x) => !q.trim() || x.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(b.custom) - Number(a.custom) || rel(b) - rel(a));
  function rel(x: QuestionChoice) {
    return x.language && row.spec.language && x.language === row.spec.language ? 1 : 0;
  }
  return (
    <Dialog title={`Swap the ${roundLabel(row.spec)} question`} onClose={onClose} width={560}>
      <div className="flex flex-col gap-3">
        <label className="relative">
          <span className="sr-only">Search questions</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" className={`${inputCls} pl-8`} />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="w-4 h-4 accent-secondary" />
          Show questions for other stacks too
        </label>
        <ul className="flex flex-col max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
          <li>
            <button type="button" onClick={() => onPick(null)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-panel/60">
              <Sparkles className="w-4 h-4 text-secondary-soft shrink-0" aria-hidden />
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-fg">Picked for you: {defaultTitle}</span>
                <span className="block text-xs text-subtle">Chosen from the stack</span>
              </span>
              {!current && <Check className="w-4 h-4 text-secondary-soft" aria-label="Selected" />}
            </button>
          </li>
          {list.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => onPick(x.id)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-panel/60">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-fg truncate">{x.title}</span>
                  <span className="block text-xs text-subtle">
                    {x.custom ? "Team question" : "Built in"}, {x.label}, {x.minutes} min
                  </span>
                </span>
                {current === x.id && <Check className="w-4 h-4 text-secondary-soft" aria-label="Selected" />}
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-3.5 py-3 text-[13px] text-subtle">No questions match.</li>}
        </ul>
      </div>
    </Dialog>
  );
}

type LibraryTab = "team" | "builtin" | "bank";

/** Browse every question the workspace can use and add any of them as a round. */
function LibraryDialog({
  questions,
  challenges,
  minutes,
  initialKind,
  added,
  onAdd,
  onClose,
}: {
  questions: QuestionChoice[];
  challenges: ChallengeChoice[];
  minutes: number;
  initialKind: "" | "conversation";
  added: RoundSpecInput[];
  onAdd: (spec: RoundSpecInput) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<LibraryTab>("team");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | "frontend" | "backend" | "dsa" | "conversation">(initialKind);

  type Item = { id: string; title: string; meta: string; kind: string; spec: RoundSpecInput };
  const items: Record<LibraryTab, Item[]> = useMemo(() => {
    const fromQuestion = (x: QuestionChoice): Item => ({
      id: `q:${x.id}`,
      title: x.title,
      meta: `${x.label}, ${x.minutes} min`,
      kind: x.kind,
      spec: {
        paradigm: x.kind as RoundSpecInput["paradigm"],
        language: x.kind === "conversation" ? undefined : x.language ?? undefined,
        frameworkLabel: x.frameworkLabel ?? undefined,
        sourceKind: "scaffold",
        templateId: x.id,
        estimatedMinutes: x.minutes,
      },
    });
    const fromChallenge = (c: ChallengeChoice): Item => {
      const fw = c.paradigm === "frontend" ? FRONTEND_FRAMEWORKS.find((f) => c.frameworks.includes(f.id)) : undefined;
      const spec: RoundSpecInput = {
        paradigm: c.paradigm,
        language: c.paradigm === "frontend" ? undefined : c.languages[0],
        frameworkLabel: fw?.label,
        sourceKind: "challenge",
        sourceId: c.id,
        estimatedMinutes: minutes,
      };
      return { id: `c:${c.id}`, title: c.title, meta: `${roundLabel(spec)}, ${c.difficulty}`, kind: c.paradigm, spec };
    };
    return {
      team: [...questions.filter((x) => x.custom).map(fromQuestion), ...challenges.filter((c) => c.mine).map(fromChallenge)],
      builtin: questions.filter((x) => !x.custom).map(fromQuestion),
      bank: challenges.filter((c) => !c.mine).map(fromChallenge),
    };
  }, [questions, challenges, minutes]);

  const isAdded = (s: RoundSpecInput) => added.some((a) => a.sourceKind === s.sourceKind && (a.sourceId ?? a.templateId) === (s.sourceId ?? s.templateId));
  const needle = q.trim().toLowerCase();
  const list = items[tab].filter((x) => (!kind || x.kind === kind) && (!needle || x.title.toLowerCase().includes(needle)));
  const TABS: { id: LibraryTab; label: string }[] = [
    { id: "team", label: "Your team" },
    { id: "builtin", label: "Built in" },
    { id: "bank", label: "Problem bank" },
  ];

  return (
    <Dialog title="Add from question library" onClose={onClose} width={620}>
      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Library" className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`h-9 px-3 -mb-px border-b-2 text-[13px] transition ${tab === t.id ? "border-secondary text-fg" : "border-transparent text-muted hover:text-fg"}`}
            >
              {t.label} <span className="text-subtle tabular-nums">{items[t.id].length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative flex-1 min-w-[200px]">
            <span className="sr-only">Search questions</span>
            <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" className={`${inputCls} pl-8`} />
          </label>
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Type" className={`${selectCls} w-auto`}>
            <option value="">All types</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="dsa">Algorithms</option>
            <option value="conversation">Conversation</option>
          </select>
        </div>
        <ul className="flex flex-col max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {list.map((x) => {
            const done = isAdded(x.spec);
            return (
              <li key={x.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-fg truncate">{x.title}</span>
                  <span className="block text-xs text-subtle">
                    {paradigmName(x.spec.paradigm)}, {x.meta}
                  </span>
                </span>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-[13px] text-success">
                    <Check className="w-3.5 h-3.5" aria-hidden /> Added
                  </span>
                ) : (
                  <Btn icon={Plus} onClick={() => onAdd(x.spec)}>
                    Add
                  </Btn>
                )}
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="px-3.5 py-6 text-center text-[13px] text-subtle">
              {items[tab].length === 0 && tab === "team"
                ? "Your team has no questions yet. Write one under Question sets, or add challenges in the Question library."
                : "No questions match."}
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
