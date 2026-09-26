"use client";

/**
 * Shared ranking list for prioritisation exercises. The interviewer writes
 * the items and a prompt; both sides drag them into order.
 */
import { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Plus, X } from "lucide-react";

type Item = { id: string; text: string };

function useY<T>(read: () => T, observe: (fn: () => void) => () => void): T {
  const [v, setV] = useState(read);
  useEffect(() => {
    setV(read());
    return observe(() => setV(read()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

export default function RankingBoard({ doc, interviewer, readOnly }: { doc: Y.Doc; interviewer: boolean; readOnly: boolean }) {
  const arr = useMemo(() => doc.getArray<Item>("ranking"), [doc]);
  const meta = useMemo(() => doc.getMap<string>("meta"), [doc]);
  const raw = useY(
    () => arr.toArray(),
    (fn) => {
      arr.observe(fn);
      return () => arr.unobserve(fn);
    },
  );
  const title = useY(
    () => meta.get("rankingTitle") ?? "",
    (fn) => {
      meta.observe(fn);
      return () => meta.unobserve(fn);
    },
  );
  // Two people moving the same card at once can leave a duplicate; show one.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return raw.filter((i) => i && typeof i.id === "string" && !seen.has(i.id) && seen.add(i.id));
  }, [raw]);

  const [draft, setDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const add = () => {
    const text = draft.trim().slice(0, 200);
    if (!text || items.length >= 30) return;
    arr.push([{ id: Math.random().toString(36).slice(2, 10), text }]);
    setDraft("");
  };
  const remove = (id: string) =>
    doc.transact(() => {
      for (let i = arr.length - 1; i >= 0; i--) if (arr.get(i)?.id === id) arr.delete(i, 1);
    });
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(items, from, to);
    doc.transact(() => {
      arr.delete(0, arr.length);
      arr.insert(0, next.map((i) => ({ ...i })));
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[640px] mx-auto px-5 py-6 flex flex-col gap-5">
        {interviewer && !readOnly && titleDraft !== null ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value.slice(0, 240))}
            onBlur={() => {
              meta.set("rankingTitle", titleDraft.trim());
              setTitleDraft(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="What should they rank, and by what?"
            className="w-full bg-transparent text-[18px] font-semibold text-fg placeholder:text-subtle border-b border-border-strong focus:border-secondary/60 focus:outline-none pb-1"
          />
        ) : (
          <button
            type="button"
            disabled={!interviewer || readOnly}
            onClick={() => setTitleDraft(title)}
            className="text-left text-[18px] font-semibold text-fg disabled:cursor-default enabled:hover:text-secondary-soft"
          >
            {title || (interviewer ? "Add a prompt, for example: rank these by what you would ship first" : "Put these in order")}
          </button>
        )}
        {!interviewer && <p className="-mt-3 text-[13px] text-muted">Drag the cards, or focus one and use the arrow keys with space. Most important at the top.</p>}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {items.map((it, i) => (
                  <Row key={it.id} item={it} rank={i + 1} canRemove={interviewer && !readOnly} disabled={readOnly} onRemove={() => remove(it.id)} />
                ))}
              </AnimatePresence>
            </ol>
          </SortableContext>
        </DndContext>

        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-[13px] text-muted">
            {interviewer ? "Add the items to rank. The candidate sees them as you type them in." : "Your interviewer will add the items here."}
          </p>
        )}

        {!readOnly && (interviewer || items.length > 0) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={interviewer ? "Add an item, for example: fix the checkout bug" : "Suggest another item"}
              aria-label="New item"
              className="flex-1 min-w-0 h-10 rounded-lg border border-border bg-bg px-3 text-[14px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20"
            />
            <button type="submit" disabled={!draft.trim()} className="h-10 px-3.5 rounded-lg bg-secondary text-bg text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40">
              <Plus className="w-4 h-4" aria-hidden /> Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Row({ item, rank, canRemove, disabled, onRemove }: { item: Item; rank: number; canRemove: boolean; disabled: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  return (
    <motion.li
      ref={setNodeRef}
      layout={!isDragging}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`group flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 ${isDragging ? "border-secondary/60 shadow-xl shadow-black/30 scale-[1.02]" : "border-border"}`}
    >
      <span className="w-7 h-7 rounded-lg bg-secondary/15 text-secondary-soft text-[13px] font-semibold tabular-nums flex items-center justify-center shrink-0">{rank}</span>
      <span className="flex-1 min-w-0 text-[14px] text-fg break-words">{item.text}</span>
      {canRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${item.text}`} className="w-7 h-7 rounded-md flex items-center justify-center text-subtle hover:text-fg hover:bg-panel opacity-60 group-hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {!disabled && (
        <button type="button" {...attributes} {...listeners} aria-label={`Move ${item.text}, rank ${rank}`} className="w-7 h-8 rounded-md flex items-center justify-center text-subtle hover:text-fg cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="w-4 h-4" />
        </button>
      )}
    </motion.li>
  );
}
