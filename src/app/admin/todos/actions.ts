"use server";

import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAdminAction, type AdminActor } from "@/lib/admin/audit";

export type TodoStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
export type TodoPriority = "LOW" | "MEDIUM" | "HIGH";

// Note: this list is duplicated inline (not exported) because Next.js's
// "use server" files can only export async functions. The client-side copy
// lives in AdminTodosConsole's COLUMNS constant.
const STATUSES: readonly TodoStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

async function assertAdminUser(): Promise<AdminActor & { email: string | null }> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: Admin privilege required.");
  }
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

/** The todo board and the admin home (open-todo count) both read AdminTodo. */
function revalidateTodos() {
  revalidatePath("/admin/todos");
  revalidatePath("/admin");
}

function sanitizeStatus(raw: unknown): TodoStatus {
  if (typeof raw === "string" && (STATUSES as readonly string[]).includes(raw)) {
    return raw as TodoStatus;
  }
  return "BACKLOG";
}

function sanitizePriority(raw: unknown): TodoPriority {
  if (raw === "LOW" || raw === "MEDIUM" || raw === "HIGH") return raw;
  return "MEDIUM";
}

export async function createTodoAction(input: {
  title: string;
  body?: string;
  priority?: TodoPriority;
  category?: string;
}) {
  const actor = await assertAdminUser();
  const { email } = actor;

  const title = input.title?.trim() ?? "";
  if (!title) throw new Error("Title is required.");
  if (title.length > 200) throw new Error("Title must be 200 characters or fewer.");

  const body = input.body?.trim() ? input.body.trim() : null;
  const category = input.category?.trim() ? input.category.trim() : null;

  // Allocate the next ticket key inside a transaction so two concurrent
  // creates can't grab the same IP-N. Reads MAX(ticketSeq) and writes +1
  // atomically. With SQLite's default deferred transactions this is best-
  // effort (a second writer could still race) — for an admin tool with
  // single-digit QPS that's acceptable, but if MCP ever auto-creates tickets
  // we'll want a real Sequence table or a unique-violation retry loop.
  const { row, ticketKey } = await prisma.$transaction(async (tx) => {
    const last = await tx.adminTodo.findFirst({
      where: { ticketSeq: { not: null } },
      orderBy: { ticketSeq: "desc" },
      select: { ticketSeq: true },
    });
    const nextSeq = (last?.ticketSeq ?? 0) + 1;
    const ticketKey = `IP-${nextSeq}`;
    const row = await tx.adminTodo.create({
      data: {
        title,
        body,
        priority: sanitizePriority(input.priority),
        category,
        addedByEmail: email,
        ticketSeq: nextSeq,
        ticketKey,
      },
    });
    return { row, ticketKey };
  });

  await logAdminAction({
    actor,
    action: "todo.create",
    targetType: "todo",
    targetId: row.id,
    targetLabel: `${ticketKey} ${title}`,
    after: { title, priority: row.priority, category },
  });
  revalidateTodos();
  return { success: true, id: row.id, ticketKey };
}

export async function updateTodoStatusAction(id: string, status: TodoStatus) {
  const actor = await assertAdminUser();
  const safe = sanitizeStatus(status);

  const before = await prisma.adminTodo.findUnique({
    where: { id },
    select: { status: true, title: true, ticketKey: true },
  });
  if (!before) throw new Error("Todo not found.");

  await prisma.adminTodo.update({
    where: { id },
    data: {
      status: safe,
      // Set completedAt only when moving INTO DONE; clear it on the way out.
      completedAt: safe === "DONE" ? new Date() : null,
    },
  });

  if (before.status !== safe) {
    await logAdminAction({
      actor,
      action: "todo.status",
      targetType: "todo",
      targetId: id,
      targetLabel: [before.ticketKey, before.title].filter(Boolean).join(" "),
      before: { status: before.status },
      after: { status: safe },
    });
  }
  revalidateTodos();
  return { success: true };
}

export type AcceptanceCriterion = { text: string; done: boolean };

export async function updateTodoAction(
  id: string,
  input: {
    title?: string;
    body?: string | null;
    priority?: TodoPriority;
    category?: string | null;
    acceptanceCriteria?: AcceptanceCriterion[] | null;
    ownerNotes?: string | null;
  }
) {
  const actor = await assertAdminUser();

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error("Title cannot be empty.");
    if (title.length > 200) throw new Error("Title must be 200 characters or fewer.");
    data.title = title;
  }
  if (input.body !== undefined) {
    data.body = input.body && input.body.trim() ? input.body.trim() : null;
  }
  if (input.priority !== undefined) {
    data.priority = sanitizePriority(input.priority);
  }
  if (input.category !== undefined) {
    data.category =
      input.category && input.category.trim() ? input.category.trim() : null;
  }
  if (input.acceptanceCriteria !== undefined) {
    if (input.acceptanceCriteria === null) {
      data.acceptanceCriteria = null;
    } else {
      // Sanitize: each entry must have a non-empty text. `done` defaults to false.
      const clean = input.acceptanceCriteria
        .map((c) => ({
          text: (c?.text ?? "").trim(),
          done: !!c?.done,
        }))
        .filter((c) => c.text.length > 0);
      data.acceptanceCriteria = clean.length > 0 ? JSON.stringify(clean) : null;
    }
  }
  if (input.ownerNotes !== undefined) {
    data.ownerNotes =
      input.ownerNotes && input.ownerNotes.trim() ? input.ownerNotes.trim() : null;
  }

  const fields = Object.keys(data);
  const before = await prisma.adminTodo.findUnique({ where: { id } });
  if (!before) throw new Error("Todo not found.");

  await prisma.adminTodo.update({
    where: { id },
    data,
  });

  const prev = before as unknown as Record<string, unknown>;
  await logAdminAction({
    actor,
    action: "todo.update",
    targetType: "todo",
    targetId: id,
    targetLabel: [before.ticketKey, before.title].filter(Boolean).join(" "),
    before: Object.fromEntries(fields.map((k) => [k, prev[k] ?? null])),
    after: data,
  });
  revalidateTodos();
  return { success: true };
}

/**
 * Toggle a single acceptance-criterion checkbox in place. Called when the
 * user ticks/unticks a box in the detail modal. Keeps the rest of the
 * criteria array intact and avoids a full PUT round-trip per click.
 */
export async function toggleAcceptanceCriterionAction(
  id: string,
  index: number,
  done: boolean
) {
  const actor = await assertAdminUser();

  const row = await prisma.adminTodo.findUnique({
    where: { id },
    select: { acceptanceCriteria: true, title: true, ticketKey: true },
  });
  if (!row) throw new Error("Todo not found.");

  let list: AcceptanceCriterion[] = [];
  try {
    list = row.acceptanceCriteria ? JSON.parse(row.acceptanceCriteria) : [];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }

  if (index < 0 || index >= list.length) {
    throw new Error("Criterion index out of range.");
  }

  const wasDone = !!list[index]?.done;
  list[index] = { text: String(list[index]?.text ?? ""), done: !!done };

  await prisma.adminTodo.update({
    where: { id },
    data: { acceptanceCriteria: JSON.stringify(list) },
  });

  await logAdminAction({
    actor,
    action: "todo.criterion",
    targetType: "todo",
    targetId: id,
    targetLabel: [row.ticketKey, row.title].filter(Boolean).join(" "),
    before: { index, text: list[index].text, done: wasDone },
    after: { index, text: list[index].text, done: !!done },
  });
  revalidateTodos();
  return { success: true };
}

export async function deleteTodoAction(id: string) {
  const actor = await assertAdminUser();
  const before = await prisma.adminTodo.findUnique({
    where: { id },
    select: { title: true, ticketKey: true, status: true, priority: true },
  });
  if (!before) throw new Error("Todo not found.");
  await prisma.adminTodo.delete({ where: { id } });
  await logAdminAction({
    actor,
    action: "todo.delete",
    targetType: "todo",
    targetId: id,
    targetLabel: [before.ticketKey, before.title].filter(Boolean).join(" "),
    before,
  });
  revalidateTodos();
  return { success: true };
}
