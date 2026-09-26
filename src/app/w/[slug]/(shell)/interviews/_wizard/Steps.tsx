"use client";

/**
 * The wizard steps other than Questions: format, candidates, interviewers,
 * schedule and review. Each takes the wizard state and a patch function.
 */
import { useEffect, useMemo, useState } from "react";
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
  Mail,
  ListOrdered,
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
  MAX_GUESTS,
  MAX_PANEL,
  STEPS,
  clampMinutes,
  defaultStart,
  firstName,
  formatOf,
  isEmail,
  normalizeGuests,
  parseLocal,
  roundsMinutes,
  staggerSlots,
  stepIssues,
  suggestedMinutes,
  timeClashes,
  type FormatDef,
  type FormatId,
  type StepId,
  type WizardCandidate,
  type WizardState,
} from "@/lib/interview/wizard";
import { Avatar, Btn, StageChip, inputCls } from "../../candidates/_components/ui";
import { roleName } from "./QuestionsPicker";
import { TOOLS, defaultTools, isToolId, type ToolId } from "@/lib/interview/tools";
import { TOOL_ICON } from "@/app/interview/[id]/tools/icons";
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
          <p className="text-[13px] text-muted">Nobody else in this workspace yet. Add their email below instead.</p>
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

      <GuestEmails guests={state.guests ?? []} onChange={(g) => patch({ guests: g })} />
    </div>
  );
}

/** Interviewers who are not workspace members: HR types their email and
 * they get the details with their own interviewer link. */
function GuestEmails({ guests, onChange }: { guests: string[]; onChange: (g: string[]) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const full = guests.length >= MAX_GUESTS;

  const add = (raw: string) => {
    const parts = raw.split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) return;
    const bad = parts.filter((p) => !isEmail(p));
    const good = parts.filter((p) => isEmail(p));
    const next = normalizeGuests([...guests, ...good]);
    if (next.length !== guests.length) onChange(next);
    setText(bad.join(" "));
    setError(bad.length ? `${bad[0]} does not look like an email.` : good.length && next.length === guests.length ? "Already added." : "");
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary-soft flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-fg">Email the details (optional)</h3>
            <span className="text-[13px] text-subtle tabular-nums">
              {guests.length} of {MAX_GUESTS}
            </span>
          </div>
          <p className="text-[13px] text-muted mt-0.5">
            For interviewers who are not in this workspace. They get the candidate, the time and the brief by email, with their own link to join as an interviewer. No account needed.
          </p>
        </div>
      </div>
      {guests.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {guests.map((g) => (
              <motion.li
                key={g}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={spring}
                className="inline-flex items-center gap-2 h-9 pl-1.5 pr-1 rounded-full border border-secondary/40 bg-secondary/10 text-[13px] text-fg"
              >
                <Avatar name={g} size={24} />
                <span className="font-medium">{g}</span>
                <button
                  type="button"
                  aria-label={`Remove ${g}`}
                  onClick={() => onChange(guests.filter((x) => x !== g))}
                  className="w-7 h-7 rounded-full text-subtle hover:text-fg hover:bg-panel flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={text}
          disabled={full}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && guests.length) {
              onChange(guests.slice(0, -1));
            }
          }}
          onBlur={() => text.trim() && add(text)}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (/[\s,;]/.test(t.trim())) {
              e.preventDefault();
              add(t);
            }
          }}
          placeholder={full ? "That is the most for one interview" : "name@company.com, press Enter to add"}
          aria-label="Interviewer email"
          aria-invalid={!!error}
          className={`${inputCls} h-10 ${error ? "border-danger/60" : ""}`}
        />
        <Btn size="md" icon={Plus} disabled={!text.trim() || full} onClick={() => add(text)}>
          Add
        </Btn>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </section>
  );
}

/* ───────────────────────── Schedule ───────────────────────── */

export function ScheduleStep({ state, patch }: { state: WizardState; patch: Patch }) {
  const format = formatOf(state.format);
  const rows: { key: string; name: string; email: string | null }[] = state.noCandidate || state.candidates.length === 0
    ? [{ key: "open", name: "Open link", email: null }]
    : state.candidates.map((c, i) => ({ key: c.id ?? c.email ?? `${c.name}-${i}`, name: c.name, email: c.email || null }));
  const count = rows.length;
  const multi = count > 1;
  const [gap, setGap] = useState(15);
  const suggested = suggestedMinutes(format, state.plan === "set" ? state.rounds : []);
  const withEmail = state.candidates.filter((c) => c.email).length;
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const times = Array.from({ length: count }, (_, i) => state.times[i] ?? "");
  const set = times.filter(Boolean).length;
  const clashes = timeClashes(times, state.minutes);
  const now = Date.now();

  // First visit: suggest back-to-back times from tomorrow at 10:00. The
  // recruiter can change or clear any of them.
  useEffect(() => {
    if (!state.timesSet && !state.times.some(Boolean)) patch({ times: staggerSlots(defaultStart(), state.minutes, count, gap), timesSet: true });
    // Only on first open of the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRow = (i: number, v: string) => {
    const next = [...times];
    next[i] = v;
    patch({ times: next, timesSet: true });
  };
  const fillFromFirst = (g = gap) => {
    const start = times.find(Boolean) || defaultStart();
    patch({ times: staggerSlots(start, state.minutes, count, g), timesSet: true });
  };
  const setMinutes = (n: number) => patch({ minutes: clampMinutes(n), lengthSet: true });

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

      {/* When: one row per interviewee, each with its own picker */}
      <section className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-fg">{state.noCandidate ? "Start time" : multi ? `Interviewees (${count})` : "Interviewee"}</h3>
            <p className="text-[13px] text-muted">
              {set === 0 ? "No times yet. Agree on one with each candidate and join from the list." : set < count ? `${count - set} without a time get the invite without one.` : "Each time goes in that invite and on the Interviews list."}
            </p>
          </div>
          {multi && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted">Break</span>
              <Segmented
                id="gap"
                size="sm"
                value={String(gap)}
                onChange={(g) => setGap(Number(g))}
                options={["0", "15", "30"].map((g) => ({ id: g, label: `${g} min` }))}
              />
              <Btn icon={ListOrdered} onClick={() => fillFromFirst()}>
                Back to back
              </Btn>
            </div>
          )}
        </div>
        <ul className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {rows.map((r, i) => {
              const d = parseLocal(times[i]);
              const past = !!d && d.getTime() < now;
              const clash = clashes.has(i);
              return (
                <motion.li
                  key={r.key}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-bg border border-border px-3 py-2.5"
                >
                  {state.noCandidate ? (
                    <span className="w-[26px] h-[26px] rounded-full bg-panel text-subtle flex items-center justify-center">
                      <Link2 className="w-3.5 h-3.5" aria-hidden />
                    </span>
                  ) : (
                    <Avatar name={r.name} size={26} />
                  )}
                  <span className="flex-1 min-w-[140px]">
                    <span className="block text-[13px] font-medium text-fg truncate">{r.name}</span>
                    <span className="block text-xs text-subtle truncate">
                      {clash ? <span className="text-warning">Overlaps another interview</span> : past ? <span className="text-warning">This time has passed</span> : d ? fmtWhen(times[i]) : r.email ?? "No time yet"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-subtle" aria-hidden />
                    <input
                      type="datetime-local"
                      aria-label={`Date and time for ${r.name}`}
                      value={times[i]}
                      onChange={(e) => setRow(i, e.target.value)}
                      className={`${inputCls.replace("w-full", "w-[210px]")} tabular-nums [color-scheme:light] dark:[color-scheme:dark] ${clash || past ? "border-warning/50" : ""}`}
                    />
                    <button
                      type="button"
                      aria-label={`Clear the time for ${r.name}`}
                      disabled={!times[i]}
                      onClick={() => setRow(i, "")}
                      className="w-8 h-9 rounded-lg text-subtle hover:text-fg hover:bg-panel disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
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
          <span className="text-xs text-subtle">Only interviewers see this, including anyone you emailed.</span>
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
  const timedCount = people.filter((_, i) => state.times[i]).length;
  const guests = state.guests ?? [];

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
          detail={[state.panelIds.length ? `Panel: ${state.panelIds.map(name).join(", ")}` : "No panel", guests.length ? `Details emailed to ${guests.join(", ")}` : null].filter(Boolean).join(". ")}
        />
        <ReviewCard step="questions" goTo={goTo} icon={MessagesSquare} title="Questions" value={questions} detail={state.plan === "set" && state.rounds.length ? state.rounds.map((r) => r.title).join(", ") : state.plan === "later" && state.questionsNote ? `Note: ${state.questionsNote}` : undefined} tone={state.plan === "later" ? "warning" : undefined} />
        <ReviewCard
          step="schedule"
          goTo={goTo}
          icon={CalendarClock}
          title="Schedule"
          value={`${fmtMinutes(state.minutes)}, ${people.length > 1 ? `${timedCount} of ${people.length} with a time` : state.times[0] ? fmtWhen(state.times[0]) : "no time yet"}`}
          detail={people.length > 1 ? people.map((p, i) => `${firstName(p.name)} ${state.times[i] ? fmtWhen(state.times[i]) : "no time"}`).join(", ") : undefined}
        />
        <ReviewCard
          step="schedule"
          goTo={goTo}
          icon={Link2}
          title="Invites"
          value={state.noCandidate ? "Copy the link after scheduling" : state.sendInvites && people.some((p) => p.email) ? `Email to ${people.filter((p) => p.email).length} of ${people.length}` : "No emails, copy links"}
        />
      </div>

      <RoomTools state={state} patch={patch} />

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

/** Which room tools are on when the interview opens. Interviewers can still
 * switch any tool on or off during the interview. */
function RoomTools({ state, patch }: { state: WizardState; patch: Patch }) {
  const suggested = defaultTools(state.format);
  const on: ToolId[] = state.tools ? state.tools.filter(isToolId) : suggested;
  const custom = !!state.tools;
  const toggle = (id: ToolId) => patch({ tools: on.includes(id) ? on.filter((t) => t !== id) : [...on, id] });
  return (
    <section className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-medium text-fg">Tools in the room</h3>
          <p className="text-[13px] text-muted mt-0.5">Ready in the dock when the interview opens. Interviewers can switch any tool on or off during the call.</p>
        </div>
        {custom && (
          <button type="button" onClick={() => patch({ tools: undefined })} className="text-[12px] text-secondary-soft hover:underline">
            Use the suggested set
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tools in the room">
        {TOOLS.map((t) => {
          const Icon = TOOL_ICON[t.id];
          const sel = on.includes(t.id);
          return (
            <motion.button
              key={t.id}
              type="button"
              role="checkbox"
              aria-checked={sel}
              title={t.blurb}
              onClick={() => toggle(t.id)}
              whileTap={{ scale: 0.96 }}
              transition={spring}
              className={`inline-flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-lg border text-[13px] font-medium transition-colors ${
                sel ? "border-secondary/60 bg-secondary/[0.08] text-fg" : "border-border text-muted hover:text-fg hover:border-border-strong"
              }`}
            >
              <CheckDot on={sel} size={16} square />
              <Icon className="w-4 h-4" aria-hidden />
              {t.label}
            </motion.button>
          );
        })}
      </div>
    </section>
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
