"use client";

/**
 * Coding rounds for a live interview: browse the library on the left, build
 * the running order on the right. Drag rows (or use the keyboard) to reorder.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Code2, GripVertical, MessageSquareCode, Plus, Search, SquareTerminal, X } from "lucide-react";
import type { RoundOption } from "@/lib/interview/wizard-server";
import { MAX_ROUNDS, roundKey, roundsMinutes, toWizardRound, type WizardRound } from "@/lib/interview/wizard";
import { inputCls } from "../../candidates/_components/ui";
import { Chip, Segmented, fmtMinutes, spring } from "./parts";

type Tab = "challenge" | "playground" | "prompt";
type Stack = "all" | "frontend" | "backend" | "dsa";

const TAB_ICON = { challenge: Code2, playground: SquareTerminal, prompt: MessageSquareCode } as const;
const TAB_LABEL: Record<Tab, string> = { challenge: "Problems", playground: "Open editors", prompt: "Prompt tasks" };
const KIND_LABEL: Record<Tab, string> = { challenge: "Problem", playground: "Editor", prompt: "Prompt task" };
const DIFF_DOT: Record<string, string> = {
  easy: "bg-success",
  beginner: "bg-success",
  medium: "bg-warning",
  intermediate: "bg-warning",
  hard: "bg-danger",
  advanced: "bg-danger",
};

export default function RoundsBuilder({
  options,
  rounds,
  onChange,
}: {
  options: RoundOption[];
  rounds: WizardRound[];
  onChange: (next: WizardRound[]) => void;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>("challenge");
  const [stack, setStack] = useState<Stack>("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(40);
  const chosen = useMemo(() => new Set(rounds.map((r) => r.key)), [rounds]);
  const full = rounds.length >= MAX_ROUNDS;

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { challenge: 0, playground: 0, prompt: 0 };
    for (const o of options) c[o.kind]++;
    return c;
  }, [options]);

  const needle = q.trim().toLowerCase();
  const list = options.filter(
    (o) =>
      o.kind === tab &&
      (stack === "all" || tab === "prompt" || o.paradigm === stack) &&
      (!needle || [o.title, o.category ?? "", ...o.tags].some((v) => v.toLowerCase().includes(needle))),
  );
  // The team's own questions first.
  list.sort((a, b) => Number(b.own) - Number(a.own));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = rounds.findIndex((r) => r.key === e.active.id);
    const to = rounds.findIndex((r) => r.key === e.over!.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(rounds, from, to));
  };

  const add = (o: RoundOption) => {
    if (chosen.has(roundKey(o)) || full) return;
    onChange([...rounds, toWizardRound(o)]);
  };
  const remove = (key: string) => onChange(rounds.filter((r) => r.key !== key));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      {/* Library */}
      <section aria-label="Question library" className="min-w-0 rounded-xl border border-border bg-surface flex flex-col min-h-[420px]">
        <div className="flex flex-col gap-3 p-3 border-b border-border">
          <Segmented
            id="rounds-tab"
            value={tab}
            onChange={(v) => (setTab(v), setLimit(40))}
            options={(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
              const Icon = TAB_ICON[t];
              return {
                id: t,
                label: (
                  <>
                    <Icon className="w-3.5 h-3.5" aria-hidden />
                    {TAB_LABEL[t]}
                    <span className="text-xs text-subtle tabular-nums">{counts[t]}</span>
                  </>
                ),
              };
            })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 min-w-[180px]">
              <span className="sr-only">Search the library</span>
              <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, topic or language" className={`${inputCls} pl-8`} />
            </label>
            {tab !== "prompt" && (
              <Segmented
                id="rounds-stack"
                size="sm"
                value={stack}
                onChange={setStack}
                options={[
                  { id: "all", label: "All" },
                  { id: "frontend", label: "Frontend" },
                  { id: "backend", label: "Backend" },
                  { id: "dsa", label: "Algorithms" },
                ]}
              />
            )}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto max-h-[440px] p-1.5" aria-label={TAB_LABEL[tab]}>
          {list.length === 0 && <li className="px-3 py-10 text-center text-[13px] text-muted">Nothing matches. Try another search or stack.</li>}
          {list.slice(0, limit).map((o) => {
            const on = chosen.has(roundKey(o));
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => (on ? remove(roundKey(o)) : add(o))}
                  disabled={!on && full}
                  aria-pressed={on}
                  className={`group w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors disabled:opacity-40 ${on ? "bg-secondary/10" : "hover:bg-panel"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DIFF_DOT[o.difficulty ?? ""] ?? "bg-subtle"}`} aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-fg truncate">{o.title}</span>
                    <span className="block text-xs text-subtle truncate">
                      {[o.difficulty ? o.difficulty[0].toUpperCase() + o.difficulty.slice(1) : null, o.category, ...o.tags].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  {o.own && (
                    <span className="hidden sm:inline-flex">
                      <Chip tone="indigo">Your team</Chip>
                    </span>
                  )}
                  <span className="text-xs text-subtle tabular-nums w-12 text-right shrink-0">{o.minutes} min</span>
                  <span
                    aria-hidden
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all ${
                      on ? "bg-secondary text-bg rotate-45" : "border border-border text-muted group-hover:border-secondary/60 group-hover:text-fg"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </button>
              </li>
            );
          })}
          {list.length > limit && (
            <li className="p-2">
              <button type="button" onClick={() => setLimit((n) => n + 60)} className="w-full h-8 rounded-lg text-[13px] text-muted hover:text-fg hover:bg-panel">
                Show more ({list.length - limit})
              </button>
            </li>
          )}
        </ul>
      </section>

      {/* Running order */}
      <section aria-label="Interview plan" className="min-w-0 rounded-xl border border-border bg-surface flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 h-[52px] border-b border-border">
          <div>
            <h3 className="text-[14px] font-semibold text-fg">Running order</h3>
          </div>
          <span className="text-[13px] text-muted tabular-nums">
            {rounds.length} of {MAX_ROUNDS}, {fmtMinutes(roundsMinutes(rounds))}
          </span>
        </div>
        {rounds.length === 0 ? (
          <div className="flex-1 m-3 rounded-lg border border-dashed border-border-strong flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <span className="w-10 h-10 rounded-full bg-secondary/10 text-secondary-soft flex items-center justify-center">
              <Plus className="w-5 h-5" aria-hidden />
            </span>
            <p className="text-[14px] font-medium text-fg">No rounds yet</p>
            <p className="text-[13px] text-muted max-w-[260px]">Click a question on the left to add it. Drag rounds here to set the order.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rounds.map((r) => r.key)} strategy={verticalListSortingStrategy}>
              <ol className="flex flex-col gap-1.5 p-3">
                <AnimatePresence initial={false}>
                  {rounds.map((r, i) => (
                    <motion.li
                      key={r.key}
                      initial={reduce ? false : { opacity: 0, x: 18, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={reduce ? undefined : { opacity: 0, x: -18, height: 0, marginTop: 0 }}
                      transition={spring}
                    >
                      <SortableRound round={r} index={i} onRemove={() => remove(r.key)} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}

function SortableRound({ round, index, onRemove }: { round: WizardRound; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: round.key });
  const Icon = TAB_ICON[round.kind];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-2.5 rounded-lg border bg-bg px-2 py-2 ${isDragging ? "z-10 border-secondary/60 shadow-lg shadow-black/30" : "border-border"}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Move ${round.title}`}
        className="w-6 h-8 flex items-center justify-center rounded text-subtle hover:text-fg cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary-soft text-xs font-semibold flex items-center justify-center tabular-nums shrink-0">{index + 1}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium text-fg truncate">{round.title}</span>
        <span className="flex items-center gap-1.5 text-xs text-subtle">
          <Icon className="w-3 h-3" aria-hidden />
          {KIND_LABEL[round.kind]}, {round.minutes} min
        </span>
      </span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${round.title}`} className="w-7 h-7 rounded-md flex items-center justify-center text-subtle hover:text-danger hover:bg-danger/10">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
