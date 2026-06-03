"use server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type TodoStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
export type TodoPriority = "LOW" | "MEDIUM" | "HIGH";

// Note: this list is duplicated inline (not exported) because Next.js's
// "use server" files can only export async functions. The client-side copy
// lives in AdminTodosConsole's COLUMNS constant.
const STATUSES: readonly TodoStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

async function assertAdminUser(): Promise<{ email: string | null }> {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Admin privilege required.");
  }
  return { email: session?.user?.email ?? null };
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
  const { email } = await assertAdminUser();

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

  revalidatePath("/admin/todos");
  return { success: true, id: row.id, ticketKey };
}

export async function updateTodoStatusAction(id: string, status: TodoStatus) {
  await assertAdminUser();
  const safe = sanitizeStatus(status);

  await prisma.adminTodo.update({
    where: { id },
    data: {
      status: safe,
      // Set completedAt only when moving INTO DONE; clear it on the way out.
      completedAt: safe === "DONE" ? new Date() : null,
    },
  });

  revalidatePath("/admin/todos");
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
  await assertAdminUser();

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

  await prisma.adminTodo.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/todos");
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
  await assertAdminUser();

  const row = await prisma.adminTodo.findUnique({
    where: { id },
    select: { acceptanceCriteria: true },
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

  list[index] = { text: String(list[index]?.text ?? ""), done: !!done };

  await prisma.adminTodo.update({
    where: { id },
    data: { acceptanceCriteria: JSON.stringify(list) },
  });

  revalidatePath("/admin/todos");
  return { success: true };
}

export async function deleteTodoAction(id: string) {
  await assertAdminUser();
  await prisma.adminTodo.delete({ where: { id } });
  revalidatePath("/admin/todos");
  return { success: true };
}
