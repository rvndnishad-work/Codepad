"use client";

/**
 * The wizard steps other than Questions: format, candidates, interviewers,
 * schedule and review. Each takes the wizard state and a patch function.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  CalendarClock,
  CalendarDays,
  Code2,
  Coffee,
  Info,
  Link2,
  MessagesSquare,
  Minus,
  Pencil,
  Plus,
  Search,
  Shuffle,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { GuideOption, MemberOption, PersonOption } from "@/lib/interview/wizard-server";
import {
  DURATION_CHOICES,
  FORMATS,
  MAX_CANDIDATES,
  MAX_PANEL,
  STEPS,
  clampMinutes,
  firstName,
  formatOf,
  isEmail,
  parseLocal,
  roundsMinutes,
  staggerSlots,
  stepIssues,
  suggestedMinutes,
  toLocalInput,
  type FormatDef,
  type FormatId,
  type StepId,
  type WizardCandidate,
  type WizardState,
} from "@/lib/interview/wizard";
import { Avatar, Btn, StageChip, inputCls } from "../../candidates/_components/ui";
import { roleName } from "./QuestionsPicker";
import { CheckDot, ChoiceCard, Chip, Segmented, StepHeading, Switch, fmtMinutes, fmtWhen, spring, textareaCls } from "./parts";

type Patch = (p: Partial<WizardState>) => void;

export const FORMAT_ICON: Record<FormatId, typeof Code2> = {
  coding: Code2,
  discussion: Brain,
  mixed: Shuffle,
  behavioural: Users,
  intro: Coffee,
};

/* ───────────────────────── Format ───────────────────────── */

export function FormatStep({ state, onPick }: { state: WizardState; onPick: (f: FormatDef) => void }) {
  const groups: { title: string; body: string; items: FormatDef[] }[] = [
    { title: "Technical", body: "An engineer usually runs these.", items: FORMATS.filter((f) => f.technical) },
    { title: "Non-technical", body: "Anyone on the team can run these.", items: FORMATS.filter((f) => !f.technical) },
  ];
  return (
    <div className="flex flex-col gap-6">
      <StepHeading title="What kind of interview is it?" lead="This decides which steps you see next and what the room looks like. You can change it later in this setup." />
      {groups.map((g, gi) => (
        <section key={g.title} className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[15px] font-semibold text-fg">{g.title}</h3>
            <span className="text-[13px] text-subtle">{g.body}</span>
          </div>
          <div role="radiogroup" aria-label={`${g.title} formats`} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((f, i) => {
              const Icon = FORMAT_ICON[f.id];
              const on = state.format === f.id;
              return (
                <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: (gi * 3 + i) * 0.04 }}>
                  <ChoiceCard selected={on} onSelect={() => onPick(f)} className="w-full h-full p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${on ? "bg-secondary text-bg" : "bg-secondary/10 text-secondary-soft"}`}>
                        <Icon className="w-5 h-5" aria-hidden />
                      </span>
                      <CheckDot on={on} />
                    </div>
                    <p className="text-[15px] font-semibold text-fg mt-3">{f.label}</p>
                    <p className="text-[13px] text-muted mt-1 leading-relaxed">{f.blurb}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <Chip>{f.minutes} min</Chip>
                      {f.coding && <Chip>Shared editor</Chip>}
                      {f.guide && <Chip>Question guide</Chip>}
                      {f.plan === "open" && <Chip tone="success">No prep needed</Chip>}
                    </div>
                  </ChoiceCard>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ───────────────────────── Candidates ───────────────────────── */

export function CandidatesStep({ state, patch, people }: { state: WizardState; patch: Patch; people: PersonOption[] }) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState("all");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const batches = useMemo(() => [...new Set(people.map((p) => p.batch).filter((b): b is string => !!b))].sort(), [people]);
  const picked = new Set(state.candidates.map((c) => c.id ?? `new:${c.email}`));
  const full = state.candidates.length >= MAX_CANDIDATES;

  const needle = q.trim().toLowerCase();
  const shown = people.filter(
    (p) => (batch === "all" || p.batch === batch) && (!needle || [p.name, p.email ?? "", p.batch ?? ""].some((v) => v.toLowerCase().includes(needle))),
  );

  const toggle = (p: PersonOption) => {
    if (picked.has(p.id)) patch({ candidates: state.candidates.filter((c) => c.id !== p.id), noCandidate: false });
    else if (!full) patch({ candidates: [...state.candidates, { id: p.id, name: p.name, email: p.email ?? "" }], noCandidate: false });
  };
  const addNew = () => {
    const n = name.trim();
    const e = email.trim().toLowerCase();
    if (!n) return setErr("Add a name.");
    if (e && !isEmail(e)) return setErr("That email does not look right.");
    const known = e ? people.find((p) => p.email?.toLowerCase() === e) : null;
    if (known) {
      if (!picked.has(known.id)) toggle(known);
      setErr("");
      setName("");
      setEmail("");
      return;
    }
    if (e && state.candidates.some((c) => c.email.toLowerCase() === e)) return setErr("Already added.");
    patch({ candidates: [...state.candidates, { id: null, name: n, email: e }], noCandidate: false });
    setName("");
    setEmail("");
    setErr("");
  };
  const removeAt = (c: WizardCandidate) => patch({ candidates: state.candidates.filter((x) => x !== c) });

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Who are you interviewing?"
        lead="Pick one or more people. Each person gets their own room and link, with the same setup."
        aside={
          <Btn size="md" icon={UserPlus} onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            Add someone new
          </Btn>
        }
      />

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addNew();
              }}
              className="rounded-xl border border-border bg-surface p-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.2fr_auto] items-end"
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-subtle">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" className={inputCls} autoFocus />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-subtle">Email (for the invite)</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@example.com" className={inputCls} />
              </label>
              <Btn size="md" variant="primary" icon={Plus} type="submit" disabled={full}>
                Add
              </Btn>
              {err && <p className="sm:col-span-3 text-[13px] text-danger">{err}</p>}
              <p className="sm:col-span-3 text-xs text-subtle">With an email they are added to Candidates and get the invite. Without one, you share the link yourself.</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tray of chosen people */}
      <div className="flex flex-wrap items-center gap-2 min-h-[36px]">
        <AnimatePresence initial={false}>
          {state.candidates.map((c) => (
            <motion.span
              key={c.id ?? `new:${c.email || c.name}`}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.6 }}
              transition={spring}
              className="inline-flex items-center gap-2 h-9 pl-1 pr-1.5 rounded-full border border-secondary/40 bg-secondary/10"
            >
              <Avatar name={c.name} size={26} />
              <span className="text-[13px] font-medium text-fg">{c.name}</span>
              {!c.id && <span className="text-xs text-secondary-soft">new</span>}
              <button type="button" onClick={() => removeAt(c)} aria-label={`Remove ${c.name}`} className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        {state.candidates.length === 0 && !state.noCandidate && <span className="text-[13px] text-subtle">Nobody picked yet.</span>}
        {state.candidates.length > 1 && <span className="text-[13px] text-muted ml-1">{state.candidates.length} rooms will be created</span>}
      </div>

      <div className={`flex flex-col gap-3 transition-opacity ${state.noCandidate ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[220px]">
            <span className="sr-only">Search candidates</span>
            <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or batch" className={`${inputCls} pl-8`} />
          </label>
          {batches.length > 0 && (
            <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Batch" className={`${inputCls.replace("w-full", "w-auto")} pr-8`}>
              <option value="all">All batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
        </div>
        <ul role="listbox" aria-multiselectable="true" aria-label="Candidates" className="rounded-xl border border-border bg-surface divide-y divide-border max-h-[380px] overflow-y-auto">
          {shown.length === 0 && (
            <li className="px-4 py-10 text-center text-[13px] text-muted">{people.length ? "No one matches." : "No candidates yet. Add someone new above."}</li>
          )}
          {shown.slice(0, 200).map((p) => {
            const on = picked.has(p.id);
            return (
              <li key={p.id} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  disabled={!on && full}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${on ? "bg-secondary/[0.07]" : "hover:bg-panel/60"}`}
                >
                  <CheckDot on={on} size={18} square />
                  <Avatar name={p.name} size={32} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-medium text-fg truncate">{p.name}</span>
                    <span className="block text-xs text-subtle truncate">{p.email ?? "No email, share the link yourself"}</span>
                  </span>
                  {p.interviews > 0 && <span className="hidden md:inline text-xs text-subtle whitespace-nowrap">{p.interviews === 1 ? "1 interview" : `${p.interviews} interviews`} already</span>}
                  {p.batch && <span className="hidden sm:inline text-xs text-muted truncate max-w-[140px]">{p.batch}</span>}
                  <StageChip stage={p.stage} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <Switch
          on={state.noCandidate}
          onChange={(v) => patch({ noCandidate: v, candidates: v ? [] : state.candidates })}
          label="No candidate yet"
          hint="Create one room now and send its link to whoever you like later."
        />
      </div>
    </div>
  );
}

/* ───────────────────────── Interviewers ───────────────────────── */

export function PanelStep({ state, patch, members, meId }: { state: WizardState; patch: Patch; members: MemberOption[]; meId: string }) {
  const format = formatOf(state.format);
  const host = members.find((m) => m.userId === state.hostId);
  const others = members.filter((m) => m.userId !== state.hostId);
  const togglePanel = (id: string) =>
    patch({ panelIds: state.panelIds.includes(id) ? state.panelIds.filter((x) => x !== id) : state.panelIds.length < MAX_PANEL ? [...state.panelIds, id] : state.panelIds });
  const hostTip = format?.technical && host && host.role === "RECRUITER";

  return (
    <div className="flex flex-col gap-6">
      <StepHeading title="Who runs the interview?" lead="The host leads the room. Anyone on the panel joins with the same interviewer view and can write notes and the scorecard." />
      <section className="flex flex-col gap-3">
        <h3 className="text-[15px] font-semibold text-fg">Host</h3>
        <div role="radiogroup" aria-label="Host" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <ChoiceCard
              key={m.userId}
              selected={state.hostId === m.userId}
              onSelect={() => patch({ hostId: m.userId, panelIds: state.panelIds.filter((x) => x !== m.userId) })}
              className="px-3.5 py-3"
            >
              <div className="flex items-center gap-3">
                <Avatar name={m.name} size={36} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium text-fg truncate">
                    {m.name}
                    {m.userId === meId && <span className="text-subtle font-normal"> (you)</span>}
                  </span>
                  <span className="block text-xs text-subtle truncate">
                    {roleName(m.role)}, {m.email}
                  </span>
                </span>
                <CheckDot on={state.hostId === m.userId} />
              </div>
            </ChoiceCard>
          ))}
        </div>
        <AnimatePresence>
          {hostTip && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-[13px] text-muted"
            >
              <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
              Technical rounds go best with an engineer as host or on the panel. You can keep yourself as host and add one below.
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-fg">Panel (optional)</h3>
          <span className="text-[13px] text-subtle tabular-nums">
            {state.panelIds.length} of {MAX_PANEL}
          </span>
        </div>
        {others.length === 0 ? (
          <p className="text-[13px] text-muted">Nobody else in this workspace yet. Invite teammates from Members.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {others.map((m) => {
              const on = state.panelIds.includes(m.userId);
              return (
                <motion.button
                  key={m.userId}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => togglePanel(m.userId)}
                  whileTap={{ scale: 0.96 }}
                  className={`inline-flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-full border text-[13px] transition-colors ${
                    on ? "border-secondary/60 bg-secondary/10 text-fg" : "border-border bg-surface text-muted hover:text-fg hover:border-border-strong"
                  }`}
                >
                  <Avatar name={m.name} size={28} />
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-subtle">{roleName(m.role)}</span>
                  <CheckDot on={on} size={16} />
                </motion.button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ───────────────────────── Schedule ───────────────────────── */

const SLOT_TIMES = Array.from({ length: 24 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});

function days(n: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => new Date(today.getTime() + i * 86_400_000));
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ScheduleStep({ state, patch }: { state: WizardState; patch: Patch }) {
  const format = formatOf(state.format);
  const count = Math.max(1, state.candidates.length);
  const multi = count > 1;
  const [mode, setMode] = useState<"stagger" | "each">("stagger");
  const [gap, setGap] = useState(15);
  const timed = state.times.some(Boolean);
  const first = parseLocal(state.times[0] ?? "");
  const suggested = suggestedMinutes(format, state.plan === "set" ? state.rounds : []);
  const withEmail = state.candidates.filter((c) => c.email).length;
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  const setStart = (d: Date) => {
    const start = toLocalInput(d);
    patch({ times: multi && mode === "stagger" ? staggerSlots(start, state.minutes, count, gap) : multi ? state.times.map((t, i) => (i === 0 ? start : t || start)) : [start] });
  };
  const pickDay = (day: Date) => {
    const base = first ?? new Date(day.getTime() + 10 * 3_600_000);
    const d = new Date(day);
    d.setHours(base.getHours(), base.getMinutes(), 0, 0);
    setStart(d);
  };
  const pickTime = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = first ? new Date(first) : new Date(Date.now() + 86_400_000);
    d.setHours(h, m, 0, 0);
    setStart(d);
  };
  const setMinutes = (n: number) => {
    const m = clampMinutes(n);
    patch({ minutes: m, lengthSet: true, times: timed && multi && mode === "stagger" ? staggerSlots(state.times[0], m, count, gap) : state.times });
  };
  const toggleTimed = (on: boolean) => {
    if (!on) return patch({ times: [] });
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(10, 0, 0, 0);
    setStart(d);
  };

  return (
    <div className="flex flex-col gap-6">
      <StepHeading title="When, and for how long?" lead="Times are in your time zone. The invite shows the candidate the time in theirs." aside={tz ? <Chip>{tz.replace(/_/g, " ")}</Chip> : undefined} />

      {/* Length */}
      <section className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-fg">Length</h3>
          {state.plan === "set" && state.rounds.length > 0 && (
            <span className="text-[13px] text-muted">
              Rounds add up to {fmtMinutes(roundsMinutes(state.rounds))}.
              {suggested !== state.minutes && (
                <button type="button" onClick={() => setMinutes(suggested)} className="ml-1.5 text-secondary-soft font-medium hover:underline">
                  Use {fmtMinutes(suggested)}
                </button>
              )}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {DURATION_CHOICES.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={state.minutes === d}
              onClick={() => setMinutes(d)}
              className={`relative h-10 px-4 rounded-lg border text-[13px] font-medium transition-colors ${
                state.minutes === d ? "border-secondary text-fg" : "border-border text-muted hover:text-fg hover:border-border-strong"
              }`}
            >
              {state.minutes === d && <motion.span layoutId="len-pill" transition={spring} className="absolute inset-0 rounded-lg bg-secondary/15" />}
              <span className="relative">{fmtMinutes(d)}</span>
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <button type="button" aria-label="15 minutes less" onClick={() => setMinutes(state.minutes - 15)} className="w-9 h-10 rounded-lg border border-border text-muted hover:text-fg flex items-center justify-center">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-24 text-center text-[14px] font-semibold text-fg tabular-nums">{fmtMinutes(state.minutes)}</span>
            <button type="button" aria-label="15 minutes more" onClick={() => setMinutes(state.minutes + 15)} className="w-9 h-10 rounded-lg border border-border text-muted hover:text-fg flex items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* When */}
      <section className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
        <Switch on={timed} onChange={toggleTimed} label="Set a time now" hint={timed ? "The time goes in the invite and on the Interviews list." : "No time in the invite. Agree on one with the candidate and join from the list."} />
        <AnimatePresence initial={false}>
          {timed && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden flex flex-col gap-4">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="radiogroup" aria-label="Day">
                {days(14).map((d) => {
                  const on = !!first && sameDay(d, first);
                  const weekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => pickDay(d)}
                      className={`relative shrink-0 w-[62px] h-[68px] rounded-xl border flex flex-col items-center justify-center transition-colors ${
                        on ? "border-secondary text-fg" : `border-border hover:border-border-strong ${weekend ? "text-subtle" : "text-muted"}`
                      }`}
                    >
                      {on && <motion.span layoutId="day-pill" transition={spring} className="absolute inset-0 rounded-xl bg-secondary/15" />}
                      <span className="relative text-xs">{sameDay(d, new Date()) ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                      <span className="relative text-[18px] font-semibold tabular-nums leading-tight">{d.getDate()}</span>
                      <span className="relative text-xs text-subtle">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5" role="radiogroup" aria-label="Start time">
                {SLOT_TIMES.map((t) => {
                  const on = !!first && `${String(first.getHours()).padStart(2, "0")}:${String(first.getMinutes()).padStart(2, "0")}` === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => pickTime(t)}
                      className={`relative h-9 rounded-lg border text-[13px] tabular-nums transition-colors ${on ? "border-secondary text-fg font-semibold" : "border-border text-muted hover:text-fg hover:border-border-strong"}`}
                    >
                      {on && <motion.span layoutId="time-pill" transition={spring} className="absolute inset-0 rounded-lg bg-secondary/15" />}
                      <span className="relative">{t}</span>
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-2 text-[13px] text-muted">
                Or type a time
                <input
                  type="datetime-local"
                  value={state.times[0] ?? ""}
                  onChange={(e) => {
                    const d = parseLocal(e.target.value);
                    if (d) setStart(d);
                  }}
                  className={inputCls.replace("w-full", "w-auto")}
                />
              </label>

              {multi && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Segmented
                      id="multi-mode"
                      value={mode}
                      onChange={(m) => {
                        setMode(m);
                        if (m === "stagger" && state.times[0]) patch({ times: staggerSlots(state.times[0], state.minutes, count, gap) });
                      }}
                      options={[
                        { id: "stagger", label: "Back to back" },
                        { id: "each", label: "Set each time" },
                      ]}
                    />
                    {mode === "stagger" && (
                      <span className="flex items-center gap-2 text-[13px] text-muted">
                        Break between
                        <Segmented
                          id="gap"
                          size="sm"
                          value={String(gap)}
                          onChange={(g) => {
                            setGap(Number(g));
                            if (state.times[0]) patch({ times: staggerSlots(state.times[0], state.minutes, count, Number(g)) });
                          }}
                          options={["0", "15", "30"].map((g) => ({ id: g, label: `${g} min` }))}
                        />
                      </span>
                    )}
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {state.candidates.map((c, i) => (
                      <li key={c.id ?? c.email ?? i} className="flex flex-wrap items-center gap-3 rounded-lg bg-bg border border-border px-3 py-2">
                        <Avatar name={c.name} size={26} />
                        <span className="text-[13px] font-medium text-fg flex-1 min-w-[120px] truncate">{c.name}</span>
                        {mode === "stagger" ? (
                          <span className="text-[13px] text-muted tabular-nums">{fmtWhen(state.times[i] ?? "")}</span>
                        ) : (
                          <input
                            type="datetime-local"
                            aria-label={`Time for ${c.name}`}
                            value={state.times[i] ?? ""}
                            onChange={(e) => {
                              const next = [...state.times];
                              while (next.length < count) next.push("");
                              next[i] = e.target.value;
                              patch({ times: next });
                            }}
                            className={inputCls.replace("w-full", "w-auto")}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Briefs and invite */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg">Brief for the interviewers</span>
          <textarea
            value={state.brief}
            onChange={(e) => patch({ brief: e.target.value })}
            rows={4}
            maxLength={2000}
            placeholder="What to probe, what the hiring manager cares about, anything from earlier rounds."
            className={textareaCls}
          />
          <span className="text-xs text-subtle">Only the host and panel see this.</span>
        </label>
        {format?.coding ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-fg">Note for the candidate</span>
            <textarea
              value={state.candidateBrief}
              onChange={(e) => patch({ candidateBrief: e.target.value })}
              rows={4}
              maxLength={2000}
              placeholder="For example: Think out loud. You can use any documentation."
              className={textareaCls}
            />
            <span className="text-xs text-subtle">Shown to the candidate next to the coding rounds.</span>
          </label>
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong p-4 text-[13px] text-muted flex gap-3 items-start">
            <CalendarDays className="w-4 h-4 text-subtle shrink-0 mt-0.5" aria-hidden />
            The candidate joins a video room with the interviewers. There is no editor in this format, so there is nothing else to show them.
          </div>
        )}
      </section>

      {!state.noCandidate && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <Switch
            on={state.sendInvites && withEmail > 0}
            onChange={(v) => patch({ sendInvites: v })}
            label={withEmail === 0 ? "No emails to send" : withEmail === 1 ? "Email the invite" : `Email the invite to ${withEmail} people`}
            hint={
              withEmail === 0
                ? "Nobody picked has an email. Copy each link after scheduling."
                : withEmail < state.candidates.length
                  ? `${state.candidates.length - withEmail} without an email get a link to copy instead.`
                  : "It has the join link, the access code, the time and the length."
            }
          />
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── Review ───────────────────────── */

export function ReviewStep({
  state,
  patch,
  members,
  guides,
  titleEdited,
  onTitleEdit,
  goTo,
  defaultTitleText,
}: {
  state: WizardState;
  patch: Patch;
  members: MemberOption[];
  guides: GuideOption[];
  titleEdited: boolean;
  onTitleEdit: () => void;
  goTo: (s: StepId) => void;
  defaultTitleText: string;
}) {
  const format = formatOf(state.format);
  const name = (id: string | null) => members.find((m) => m.userId === id)?.name ?? "Unknown";
  const guide = guides.find((g) => g.id === state.guideId);
  const issues = stepIssues(state, "review");
  const Icon = format ? FORMAT_ICON[format.id] : Code2;
  const people = state.noCandidate ? [] : state.candidates;

  const questions =
    state.plan === "later"
      ? `${name(state.questionsOwnerId)} picks them later`
      : state.plan === "open"
        ? "No set questions"
        : [format?.coding ? `${state.rounds.length} coding round${state.rounds.length === 1 ? "" : "s"}` : null, guide ? `guide: ${guide.title}` : null].filter(Boolean).join(", ") || "None yet";

  return (
    <div className="flex flex-col gap-5">
      <StepHeading title="Check and schedule" lead="Everything below can still be changed. Click a card to jump back to its step." />

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg">Interview title</span>
        <div className="flex items-center gap-2">
          <input
            value={state.title}
            onChange={(e) => {
              onTitleEdit();
              patch({ title: e.target.value });
            }}
            maxLength={120}
            className={`${inputCls} h-10 text-[14px]`}
          />
          {titleEdited && state.title !== defaultTitleText && (
            <Btn size="md" onClick={() => patch({ title: defaultTitleText })}>
              Reset
            </Btn>
          )}
        </div>
      </label>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ReviewCard step="format" goTo={goTo} icon={Icon} title="Format" value={format?.label ?? "Not picked"} detail={format?.blurb} />
        <ReviewCard
          step="candidates"
          goTo={goTo}
          icon={Users}
          title="Candidates"
          value={state.noCandidate ? "No candidate yet, one open link" : people.length === 1 ? people[0].name : `${people.length} people, one room each`}
          detail={people.length > 1 ? people.map((p) => firstName(p.name)).join(", ") : people[0]?.email || undefined}
        />
        <ReviewCard
          step="panel"
          goTo={goTo}
          icon={UserPlus}
          title="Interviewers"
          value={`${name(state.hostId)} hosts`}
          detail={state.panelIds.length ? `Panel: ${state.panelIds.map(name).join(", ")}` : "No panel"}
        />
        <ReviewCard step="questions" goTo={goTo} icon={MessagesSquare} title="Questions" value={questions} detail={state.plan === "set" && state.rounds.length ? state.rounds.map((r) => r.title).join(", ") : state.plan === "later" && state.questionsNote ? `Note: ${state.questionsNote}` : undefined} tone={state.plan === "later" ? "warning" : undefined} />
        <ReviewCard
          step="schedule"
          goTo={goTo}
          icon={CalendarClock}
          title="Schedule"
          value={`${fmtMinutes(state.minutes)}, ${state.times[0] ? fmtWhen(state.times[0]) : "no time yet"}`}
          detail={people.length > 1 && state.times[0] ? `Last starts ${fmtWhen(state.times[people.length - 1] ?? "")}` : undefined}
        />
        <ReviewCard
          step="schedule"
          goTo={goTo}
          icon={Link2}
          title="Invites"
          value={state.noCandidate ? "Copy the link after scheduling" : state.sendInvites && people.some((p) => p.email) ? `Email to ${people.filter((p) => p.email).length} of ${people.length}` : "No emails, copy links"}
        />
      </div>

      <AnimatePresence>
        {issues.length > 0 && (
          <motion.ul initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-danger/35 bg-danger/[0.06] p-4 flex flex-col gap-1.5">
            {issues.map((i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-fg">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" aria-hidden />
                {i}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewCard({
  step,
  goTo,
  icon: Icon,
  title,
  value,
  detail,
  tone,
}: {
  step: StepId;
  goTo: (s: StepId) => void;
  icon: typeof Code2;
  title: string;
  value: string;
  detail?: string;
  tone?: "warning";
}) {
  const label = STEPS.find((s) => s.id === step)?.label ?? title;
  return (
    <button
      type="button"
      onClick={() => goTo(step)}
      className="group text-left rounded-xl border border-border bg-surface p-4 flex items-start gap-3 hover:border-border-strong hover:bg-panel/40 transition-colors"
      aria-label={`Edit ${label}`}
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone === "warning" ? "bg-warning/10 text-warning" : "bg-secondary/10 text-secondary-soft"}`}>
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs text-subtle">{title}</span>
        <span className="block text-[14px] font-medium text-fg mt-0.5">{value}</span>
        {detail && <span className="block text-[13px] text-muted mt-0.5 line-clamp-2">{detail}</span>}
      </span>
      <Pencil className="w-3.5 h-3.5 text-subtle opacity-0 group-hover:opacity-100 transition-opacity mt-1" aria-hidden />
    </button>
  );
}
