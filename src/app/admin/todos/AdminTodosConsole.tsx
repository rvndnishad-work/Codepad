"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ClipboardList,
  Plus,
  Trash2,
  Tag,
  GripVertical,
  X,
  Check,
  Square,
  CheckSquare,
  Hash,
  FileText,
  ListChecks,
  StickyNote,
  Calendar,
  User as UserIcon,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createTodoAction,
  updateTodoStatusAction,
  updateTodoAction,
  deleteTodoAction,
  toggleAcceptanceCriterionAction,
  type TodoStatus,
  type TodoPriority,
  type AcceptanceCriterion,
} from "./actions";

interface TodoRow {
  id: string;
  ticketKey: string | null;
  title: string;
  body: string | null;
  status: string;
  priority: string;
  category: string | null;
  acceptanceCriteria: AcceptanceCriterion[];
  ownerNotes: string | null;
  addedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface DependencyEdge {
  id: string;
  fromId: string;
  toId: string;
  /** "BLOCKS" | "FOLLOWS_FROM" | "RELATES_TO" */
  type: string;
}

interface Props {
  todos: TodoRow[];
  categories: string[];
  dependencies: DependencyEdge[];
}

/**
 * Per-direction display copy for a dependency type. Outgoing means the row's
 * `fromId === this.id`; incoming is `toId === this.id`. The inverse phrasing
 * is what shows up in the "linked tickets" section of the detail modal.
 */
const DEP_LABEL_OUT: Record<string, string> = {
  BLOCKS: "Blocks",
  FOLLOWS_FROM: "Spawned from",
  RELATES_TO: "Relates to",
};
const DEP_LABEL_IN: Record<string, string> = {
  BLOCKS: "Blocked by",
  FOLLOWS_FROM: "Spawned",
  RELATES_TO: "Relates to",
};
const DEP_TONE: Record<string, string> = {
  BLOCKS: "border-rose-500/30 bg-rose-500/[0.05] text-rose-300",
  FOLLOWS_FROM: "border-indigo-500/30 bg-indigo-500/[0.05] text-indigo-300",
  RELATES_TO: "border-slate-500/30 bg-slate-500/[0.05] text-slate-300",
};

const COLUMNS: { id: TodoStatus; label: string; accent: string }[] = [
  { id: "BACKLOG", label: "Backlog", accent: "border-slate-500/30" },
  { id: "TODO", label: "To do", accent: "border-indigo-500/40" },
  { id: "IN_PROGRESS", label: "In progress", accent: "border-amber-500/40" },
  { id: "DONE", label: "Done", accent: "border-emerald-500/40" },
];

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  LOW: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const STATUS_STYLES: Record<string, string> = {
  BACKLOG: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  TODO: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
  IN_PROGRESS: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  DONE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

export default function AdminTodosConsole({
  todos: initialTodos,
  categories: initialCategories,
  dependencies,
}: Props) {
  const [todos, setTodos] = useState<TodoRow[]>(initialTodos);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPriority, setNewPriority] = useState<TodoPriority>("MEDIUM");
  const [isCreating, startCreate] = useTransition();

  // Open ticket detail modal — track by id so updates to the row stay in sync
  // with the modal contents without needing to pass a stale reference.
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const openTicket = openTicketId ? todos.find((t) => t.id === openTicketId) ?? null : null;

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const categories = useMemo(() => {
    const set = new Set(initialCategories);
    for (const t of todos) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [todos, initialCategories]);

  const filtered = todos.filter((t) => {
    if (filterCategory !== "ALL" && t.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay =
        `${t.ticketKey ?? ""} ${t.title} ${t.body ?? ""} ${t.category ?? ""} ${t.ownerNotes ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const byColumn = useMemo(() => {
    const map: Record<TodoStatus, TodoRow[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const t of filtered) {
      const status = (map[t.status as TodoStatus] ? (t.status as TodoStatus) : "BACKLOG");
      map[status].push(t);
    }
    return map;
  }, [filtered]);

  const activeTodo = activeDragId ? todos.find((t) => t.id === activeDragId) ?? null : null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    startCreate(async () => {
      try {
        const res = await createTodoAction({
          title: newTitle,
          category: newCategory || undefined,
          priority: newPriority,
        });
        setTodos((prev) => [
          {
            id: res.id,
            ticketKey: res.ticketKey ?? null,
            title: newTitle.trim(),
            body: null,
            status: "BACKLOG",
            priority: newPriority,
            category: newCategory.trim() || null,
            acceptanceCriteria: [],
            ownerNotes: null,
            addedByEmail: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          ...prev,
        ]);
        setNewTitle("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Create failed.");
      }
    });
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const todoId = String(e.active.id);
    const targetStatus =
      (e.over?.data.current?.columnId as TodoStatus | undefined) ?? null;
    if (!targetStatus) return;

    const todo = todos.find((t) => t.id === todoId);
    if (!todo || todo.status === targetStatus) return;

    const prevStatus = todo.status;
    setTodos((prev) =>
      prev.map((row) =>
        row.id === todoId
          ? {
              ...row,
              status: targetStatus,
              completedAt:
                targetStatus === "DONE" ? new Date().toISOString() : null,
            }
          : row
      )
    );
    try {
      await updateTodoStatusAction(todoId, targetStatus);
    } catch (err) {
      setTodos((prev) =>
        prev.map((row) => (row.id === todoId ? { ...row, status: prevStatus } : row))
      );
      toast.error(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const handleDelete = async (t: TodoRow) => {
    if (!confirm(`Delete ${t.ticketKey ?? t.title}? This cannot be undone.`)) return;
    try {
      await deleteTodoAction(t.id);
      setTodos((prev) => prev.filter((row) => row.id !== t.id));
      if (openTicketId === t.id) setOpenTicketId(null);
      toast.success("Deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  /** Centralized patcher passed to the detail modal so changes propagate back
   *  to the board state without the modal having to know about setTodos. */
  const patchTodo = (id: string, patch: Partial<TodoRow>) => {
    setTodos((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-fg flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-accent" /> Platform Todos
        </h1>
        <p className="text-sm text-muted/80 mt-1 max-w-2xl leading-relaxed">
          Drag cards across columns as work progresses. Click a card to open its
          full ticket. New captures land in <strong className="text-fg">Backlog</strong>.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-col md:flex-row gap-2 rounded-2xl border border-border bg-surface p-3"
      >
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What needs doing? (Enter to add)"
          className="flex-1 px-3 py-2 rounded-xl border border-border bg-bg text-sm text-fg focus:outline-none focus:border-accent"
          required
          maxLength={200}
        />
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          list="todo-categories"
          placeholder="Category"
          className="md:w-40 px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
        />
        <datalist id="todo-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as TodoPriority)}
          className="md:w-28 px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
        >
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <button
          type="submit"
          disabled={!newTitle.trim() || isCreating}
          className="px-4 py-2 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </form>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {categories.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterCategory("ALL")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition ${
                filterCategory === "ALL"
                  ? "bg-accent/15 border-accent/30 text-accent"
                  : "bg-bg border-border/40 text-muted hover:text-fg"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition ${
                  filterCategory === c
                    ? "bg-accent/15 border-accent/30 text-accent"
                    : "bg-bg border-border/40 text-muted hover:text-fg"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, IP-N, notes…"
          className="md:ml-auto md:max-w-xs px-3 py-1.5 rounded-lg border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
        />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={byColumn[col.id]}
              onOpen={(t) => setOpenTicketId(t.id)}
              onDelete={handleDelete}
              activeDragId={activeDragId}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTodo ? <CardView todo={activeTodo} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {openTicket && (
        <TicketDetailModal
          todo={openTicket}
          onClose={() => setOpenTicketId(null)}
          onPatch={patchTodo}
          onDelete={handleDelete}
          dependencies={dependencies}
          todos={todos}
          onOpenLinked={(id) => setOpenTicketId(id)}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  cards,
  onOpen,
  onDelete,
  activeDragId,
}: {
  column: { id: TodoStatus; label: string; accent: string };
  cards: TodoRow[];
  onOpen: (t: TodoRow) => void;
  onDelete: (t: TodoRow) => void;
  activeDragId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `col-${column.id}`,
    data: { columnId: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border ${column.accent} bg-surface flex flex-col min-h-[200px] transition-colors ${
        isOver ? "bg-elevated/60 ring-2 ring-accent/30" : ""
      }`}
    >
      <div className="p-3 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-fg">
          {column.label}
        </h2>
        <span className="text-[10px] font-bold tabular-nums text-muted bg-bg px-2 py-0.5 rounded-full border border-border/60">
          {cards.length}
        </span>
      </div>
      <div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto max-h-[70vh]">
        {cards.length === 0 ? (
          <div className="text-[11px] text-muted/60 italic text-center py-6">
            {column.id === "BACKLOG" ? "Nothing captured yet." : "Drop cards here."}
          </div>
        ) : (
          cards.map((t) => (
            <DraggableCard
              key={t.id}
              todo={t}
              onOpen={onOpen}
              onDelete={onDelete}
              hidden={t.id === activeDragId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  todo,
  onOpen,
  onDelete,
  hidden,
}: {
  todo: TodoRow;
  onOpen: (t: TodoRow) => void;
  onDelete: (t: TodoRow) => void;
  hidden: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    data: { columnId: todo.status as TodoStatus },
  });

  if (hidden) {
    return <div className="rounded-xl border border-dashed border-border/40 bg-bg/40 h-16" />;
  }

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={`relative ${isDragging ? "opacity-0" : ""}`}
    >
      <CardView
        todo={todo}
        onOpen={onOpen}
        onDelete={onDelete}
        dragHandleProps={{ ...listeners, ...attributes }}
      />
    </div>
  );
}

function CardView({
  todo,
  onOpen,
  onDelete,
  dragHandleProps,
  isOverlay,
}: {
  todo: TodoRow;
  onOpen?: (t: TodoRow) => void;
  onDelete?: (t: TodoRow) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isOverlay?: boolean;
}) {
  const priorityCls = PRIORITY_STYLES[todo.priority] ?? PRIORITY_STYLES.MEDIUM;
  const acTotal = todo.acceptanceCriteria.length;
  const acDone = todo.acceptanceCriteria.filter((c) => c.done).length;

  return (
    <div
      onClick={() => onOpen?.(todo)}
      className={`rounded-xl border border-border bg-bg p-3 space-y-1.5 hover:bg-elevated/30 transition cursor-pointer ${
        isOverlay ? "shadow-2xl rotate-1 cursor-grabbing" : ""
      } ${todo.status === "DONE" ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-1.5">
        {dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 text-muted/40 hover:text-muted cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to another column"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {todo.ticketKey && (
            <div className="text-[9px] font-mono font-bold text-accent/80 tracking-wider mb-0.5">
              {todo.ticketKey}
            </div>
          )}
          <div
            className={`text-[13px] font-bold leading-snug ${
              todo.status === "DONE" ? "line-through text-muted" : "text-fg"
            }`}
          >
            {todo.title}
          </div>
        </div>
        {!isOverlay && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo);
            }}
            className="-mr-1 -mt-1 p-1 rounded-md hover:bg-rose-500/10 text-muted hover:text-rose-400 transition"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 flex-wrap pt-1">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${priorityCls}`}
        >
          {todo.priority}
        </span>
        {todo.category && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-surface text-[9px] font-bold uppercase tracking-wider text-muted">
            <Tag className="w-2.5 h-2.5" />
            {todo.category}
          </span>
        )}
        {acTotal > 0 && (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wider ${
              acDone === acTotal
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-border bg-surface text-muted"
            }`}
            title={`${acDone}/${acTotal} acceptance criteria done`}
          >
            <ListChecks className="w-2.5 h-2.5" />
            {acDone}/{acTotal}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Big detail modal. Layout: left column for the body (title, description, AC,
 * owner notes), right rail for metadata (ticket key, status, priority, category,
 * dates). Edits save on blur with optimistic local updates piped back via
 * `onPatch` so the underlying board reflects changes immediately.
 */
function TicketDetailModal({
  todo,
  onClose,
  onPatch,
  onDelete,
  dependencies,
  todos,
  onOpenLinked,
}: {
  todo: TodoRow;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<TodoRow>) => void;
  onDelete: (t: TodoRow) => void;
  dependencies: DependencyEdge[];
  todos: TodoRow[];
  onOpenLinked: (id: string) => void;
}) {
  // Index todos by id once — modal renders many chips and we don't want to
  // re-scan the array per chip.
  const todosById = useMemo(() => {
    const m = new Map<string, TodoRow>();
    todos.forEach((t) => m.set(t.id, t));
    return m;
  }, [todos]);

  // Bucket dependency edges into outgoing and incoming groups, keyed by type.
  // Outgoing reads "this → other" via DEP_LABEL_OUT; incoming reads
  // "other → this" via DEP_LABEL_IN.
  const linked = useMemo(() => {
    const outgoing: Record<string, { dep: DependencyEdge; other: TodoRow }[]> = {};
    const incoming: Record<string, { dep: DependencyEdge; other: TodoRow }[]> = {};
    for (const d of dependencies) {
      if (d.fromId === todo.id) {
        const other = todosById.get(d.toId);
        if (!other) continue;
        (outgoing[d.type] ||= []).push({ dep: d, other });
      } else if (d.toId === todo.id) {
        const other = todosById.get(d.fromId);
        if (!other) continue;
        (incoming[d.type] ||= []).push({ dep: d, other });
      }
    }
    return { outgoing, incoming };
  }, [dependencies, todosById, todo.id]);

  // Portal to document.body — the admin layout has `<main z-10>` which creates
  // a stacking context, and the sidebar is `lg:z-20` as a sibling at the
  // layout level. Rendering the modal inline would put its z-50 *inside* the
  // main stacking context, which still tops out below the sidebar visually.
  // Portaling escapes that whole hierarchy.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Esc to close. Stop propagation when typing inside fields so the
  // textarea/input Enter handling isn't hijacked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleStatusChange = async (status: TodoStatus) => {
    if (status === todo.status) return;
    const prev = todo.status;
    onPatch(todo.id, {
      status,
      completedAt: status === "DONE" ? new Date().toISOString() : null,
    });
    try {
      await updateTodoStatusAction(todo.id, status);
    } catch (err) {
      onPatch(todo.id, { status: prev });
      toast.error(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const handlePriorityChange = async (priority: TodoPriority) => {
    if (priority === todo.priority) return;
    const prev = todo.priority;
    onPatch(todo.id, { priority });
    try {
      await updateTodoAction(todo.id, { priority });
    } catch (err) {
      onPatch(todo.id, { priority: prev });
      toast.error(err instanceof Error ? err.message : "Update failed.");
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl my-8 bg-surface border border-border rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal header */}
        <div className="p-5 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {todo.ticketKey && (
              <span className="font-mono text-xs font-bold text-accent tracking-wider px-2 py-1 rounded-md bg-accent/10 border border-accent/30 shrink-0">
                {todo.ticketKey}
              </span>
            )}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[todo.status] ?? STATUS_STYLES.BACKLOG}`}
            >
              {todo.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(todo)}
              className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold uppercase tracking-wider transition"
            >
              <Trash2 className="w-3 h-3 inline mr-1" />
              Delete
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-fg"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body — two columns on desktop */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Left: title + description + AC + notes */}
            <div className="lg:col-span-2 p-6 space-y-6 lg:border-r border-border">
              <EditableField
                label="Title"
                value={todo.title}
                multiline={false}
                large
                onSave={async (v) => {
                  const t = v.trim();
                  if (!t) throw new Error("Title cannot be empty.");
                  onPatch(todo.id, { title: t });
                  await updateTodoAction(todo.id, { title: t });
                }}
              />

              <EditableField
                label="Description"
                icon={<FileText className="w-3.5 h-3.5" />}
                value={todo.body ?? ""}
                multiline
                rows={6}
                placeholder="What is this ticket about? Add context, links, screenshots-by-URL, anything that helps the next person understand."
                onSave={async (v) => {
                  const next = v.trim() || null;
                  onPatch(todo.id, { body: next });
                  await updateTodoAction(todo.id, { body: next });
                }}
              />

              <LinkedTicketsSection
                outgoing={linked.outgoing}
                incoming={linked.incoming}
                onOpenLinked={onOpenLinked}
              />

              <AcceptanceCriteriaSection
                todo={todo}
                onPatch={onPatch}
              />

              <EditableField
                label="Owner / dev notes"
                icon={<StickyNote className="w-3.5 h-3.5" />}
                value={todo.ownerNotes ?? ""}
                multiline
                rows={5}
                placeholder="Scratchpad for whoever picks this up. Tradeoffs, gotchas, who to ask, anything that won't make it into the final commit."
                onSave={async (v) => {
                  const next = v.trim() || null;
                  onPatch(todo.id, { ownerNotes: next });
                  await updateTodoAction(todo.id, { ownerNotes: next });
                }}
              />
            </div>

            {/* Right rail: metadata */}
            <div className="p-6 space-y-5 bg-bg/40">
              <MetaSection label="Status" icon={<Hash className="w-3 h-3" />}>
                <div className="flex flex-wrap gap-1.5">
                  {COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => handleStatusChange(col.id)}
                      className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition ${
                        todo.status === col.id
                          ? STATUS_STYLES[col.id]
                          : "border-border bg-bg text-muted hover:text-fg"
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </MetaSection>

              <MetaSection label="Priority">
                <div className="flex gap-1.5">
                  {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition ${
                        todo.priority === p
                          ? PRIORITY_STYLES[p]
                          : "border-border bg-bg text-muted hover:text-fg"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </MetaSection>

              <MetaSection label="Category" icon={<Tag className="w-3 h-3" />}>
                <InlineTextInput
                  value={todo.category ?? ""}
                  placeholder="e.g. MCP, AI Screening, UI"
                  onSave={async (v) => {
                    const next = v.trim() || null;
                    onPatch(todo.id, { category: next });
                    await updateTodoAction(todo.id, { category: next });
                  }}
                />
              </MetaSection>

              <div className="border-t border-border pt-4 space-y-2 text-[11px] text-muted">
                <MetaInline icon={<Calendar className="w-3 h-3" />} label="Created">
                  {new Date(todo.createdAt).toLocaleString()}
                </MetaInline>
                <MetaInline icon={<Calendar className="w-3 h-3" />} label="Updated">
                  {new Date(todo.updatedAt).toLocaleString()}
                </MetaInline>
                {todo.completedAt && (
                  <MetaInline icon={<Check className="w-3 h-3" />} label="Completed">
                    <span className="text-emerald-400/80">
                      {new Date(todo.completedAt).toLocaleString()}
                    </span>
                  </MetaInline>
                )}
                {todo.addedByEmail && (
                  <MetaInline icon={<UserIcon className="w-3 h-3" />} label="Added by">
                    <span className="font-mono">{todo.addedByEmail}</span>
                  </MetaInline>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function MetaSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-black uppercase text-muted tracking-wider flex items-center gap-1">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function MetaInline({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1 text-muted/70">
        {icon} {label}
      </span>
      <span className="text-fg/85 text-right truncate">{children}</span>
    </div>
  );
}

/**
 * Inline editable single-line input that saves on blur or Enter. Used for the
 * Category sidebar field — title/description use EditableField below.
 */
function InlineTextInput({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder?: string;
  onSave: (next: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = async () => {
    if (draft === value) return;
    try {
      await onSave(draft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
      setDraft(value);
    }
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
    />
  );
}

/**
 * Multi-line editable field with auto-save on blur. Renders as a clickable
 * read-only block until the user clicks in — at which point it becomes a
 * textarea (or input for single-line) and saves when focus leaves.
 */
function EditableField({
  label,
  icon,
  value,
  multiline,
  rows,
  large,
  placeholder,
  onSave,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  multiline: boolean;
  rows?: number;
  large?: boolean;
  placeholder?: string;
  onSave: (next: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      if ("setSelectionRange" in ref.current) {
        const len = ref.current.value.length;
        ref.current.setSelectionRange(len, len);
      }
    }
  }, [editing]);

  const commit = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
      setDraft(value);
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-black uppercase text-muted tracking-wider flex items-center gap-1">
        {icon} {label}
        {isSaving && (
          <span className="ml-auto text-[9px] text-muted/60 normal-case font-medium tracking-normal">
            saving…
          </span>
        )}
      </div>
      {editing ? (
        multiline ? (
          <textarea
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
            rows={rows ?? 4}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl border border-accent/40 bg-bg text-sm text-fg focus:outline-none focus:border-accent resize-y"
          />
        ) : (
          <input
            ref={ref as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
            placeholder={placeholder}
            className={`w-full px-3 py-2 rounded-xl border border-accent/40 bg-bg text-fg focus:outline-none focus:border-accent ${
              large ? "text-xl font-black tracking-tight" : "text-sm"
            }`}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`w-full text-left px-3 py-2 rounded-xl border border-border/40 bg-bg/40 hover:bg-bg hover:border-border transition cursor-text ${
            large ? "text-xl font-black tracking-tight text-fg" : "text-sm"
          } ${!value ? "text-muted/60 italic" : "text-fg"}`}
        >
          <div className={multiline ? "whitespace-pre-line leading-relaxed" : ""}>
            {value || placeholder || `Click to add ${label.toLowerCase()}…`}
          </div>
        </button>
      )}
    </div>
  );
}

function AcceptanceCriteriaSection({
  todo,
  onPatch,
}: {
  todo: TodoRow;
  onPatch: (id: string, patch: Partial<TodoRow>) => void;
}) {
  const [newText, setNewText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const list = todo.acceptanceCriteria;
  const done = list.filter((c) => c.done).length;

  const persist = async (next: AcceptanceCriterion[]) => {
    onPatch(todo.id, { acceptanceCriteria: next });
    try {
      await updateTodoAction(todo.id, { acceptanceCriteria: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
      // Roll back by re-fetching parent state would be cleaner; for this
      // admin tool we just leave the optimistic state and trust the next
      // page load to reconcile.
    }
  };

  const toggle = async (index: number) => {
    // Use the dedicated single-toggle action so each tick is a tiny atomic
    // write — important if someone is rapidly checking off many criteria.
    const target = !list[index].done;
    const next = list.map((c, i) => (i === index ? { ...c, done: target } : c));
    onPatch(todo.id, { acceptanceCriteria: next });
    try {
      await toggleAcceptanceCriterionAction(todo.id, index, target);
    } catch (err) {
      onPatch(todo.id, { acceptanceCriteria: list });
      toast.error(err instanceof Error ? err.message : "Toggle failed.");
    }
  };

  const add = async () => {
    const text = newText.trim();
    if (!text) return;
    const next = [...list, { text, done: false }];
    setNewText("");
    await persist(next);
  };

  const remove = async (index: number) => {
    const next = list.filter((_, i) => i !== index);
    await persist(next);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(list[index].text);
  };

  const commitEdit = async () => {
    if (editingIndex === null) return;
    const text = editingText.trim();
    if (!text) {
      // Empty = delete the row, matches typical Jira behavior.
      const next = list.filter((_, i) => i !== editingIndex);
      setEditingIndex(null);
      await persist(next);
      return;
    }
    const next = list.map((c, i) => (i === editingIndex ? { ...c, text } : c));
    setEditingIndex(null);
    await persist(next);
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-black uppercase text-muted tracking-wider flex items-center gap-1">
        <ListChecks className="w-3.5 h-3.5" /> Acceptance criteria
        {list.length > 0 && (
          <span className="ml-auto text-[10px] text-muted/70 normal-case font-medium tracking-normal">
            {done} / {list.length} done
          </span>
        )}
      </div>

      {list.length === 0 && (
        <div className="text-[11px] text-muted/60 italic px-3 py-2 rounded-lg border border-dashed border-border/50">
          No acceptance criteria yet. Add the first one below.
        </div>
      )}

      <ul className="space-y-1">
        {list.map((c, i) => (
          <li
            key={i}
            className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-bg/60 group"
          >
            <button
              onClick={() => toggle(i)}
              className={`mt-0.5 ${c.done ? "text-emerald-400" : "text-muted hover:text-fg"}`}
              aria-label={c.done ? "Mark as not done" : "Mark as done"}
            >
              {c.done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              {editingIndex === i ? (
                <input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === "Escape") {
                      setEditingIndex(null);
                    }
                  }}
                  autoFocus
                  className="w-full px-2 py-1 rounded-md border border-accent/40 bg-bg text-xs text-fg focus:outline-none focus:border-accent"
                />
              ) : (
                <button
                  onClick={() => startEdit(i)}
                  className={`text-left text-[13px] leading-snug w-full cursor-text ${
                    c.done ? "line-through text-muted" : "text-fg"
                  }`}
                >
                  {c.text}
                </button>
              )}
            </div>
            <button
              onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 transition p-1 rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10"
              aria-label="Remove criterion"
            >
              <X className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <Plus className="w-3.5 h-3.5 text-muted shrink-0 ml-1.5" />
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add an acceptance criterion (Enter to save)"
          className="flex-1 px-2 py-1.5 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
        />
      </form>
    </div>
  );
}

/**
 * Linked-tickets section for the ticket detail modal. Reads the pre-bucketed
 * `outgoing` and `incoming` edge groups and renders one row per dependency
 * type that has any links, with chips that open the linked ticket's modal.
 *
 * Empty state: render nothing rather than show "no links yet" — the section
 * is only useful when there's structure to show.
 */
function LinkedTicketsSection({
  outgoing,
  incoming,
  onOpenLinked,
}: {
  outgoing: Record<string, { dep: DependencyEdge; other: TodoRow }[]>;
  incoming: Record<string, { dep: DependencyEdge; other: TodoRow }[]>;
  onOpenLinked: (id: string) => void;
}) {
  const orderedTypes = ["BLOCKS", "FOLLOWS_FROM", "RELATES_TO"] as const;
  const hasAny = orderedTypes.some(
    (t) => (outgoing[t]?.length ?? 0) > 0 || (incoming[t]?.length ?? 0) > 0,
  );
  if (!hasAny) return null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-black uppercase text-muted tracking-wider flex items-center gap-1">
        <Link2 className="w-3.5 h-3.5" /> Linked tickets
      </div>
      <div className="rounded-lg border border-border bg-bg/40 p-3 space-y-2.5">
        {orderedTypes.map((type) => {
          const out = outgoing[type] ?? [];
          const inc = incoming[type] ?? [];
          if (out.length === 0 && inc.length === 0) return null;
          return (
            <div key={type} className="space-y-1.5">
              {out.length > 0 && (
                <LinkedRow
                  label={DEP_LABEL_OUT[type] ?? type}
                  tone={DEP_TONE[type] ?? ""}
                  items={out.map(({ other }) => other)}
                  onOpenLinked={onOpenLinked}
                />
              )}
              {inc.length > 0 && (
                <LinkedRow
                  label={DEP_LABEL_IN[type] ?? type}
                  tone={DEP_TONE[type] ?? ""}
                  items={inc.map(({ other }) => other)}
                  onOpenLinked={onOpenLinked}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinkedRow({
  label,
  tone,
  items,
  onOpenLinked,
}: {
  label: string;
  tone: string;
  items: TodoRow[];
  onOpenLinked: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted/80 w-[88px] shrink-0 pt-1">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpenLinked(t.id)}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10.5px] font-semibold hover:brightness-125 transition max-w-full ${tone}`}
            title={t.title}
          >
            <span className="font-mono shrink-0">{t.ticketKey ?? "—"}</span>
            <span className="text-fg/90 font-normal truncate">{t.title}</span>
            {t.status === "DONE" && (
              <span className="text-emerald-400 shrink-0">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
