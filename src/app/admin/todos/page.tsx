import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminTodosConsole from "./AdminTodosConsole";

export const metadata = {
  title: "Platform Todos — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminTodosPage() {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) redirect("/");

  // Pull all todos and let the client component bucket them by status column.
  // We sort by priority then createdAt so high-priority items float to the top
  // of each column on first render. Drag-reordering within a column is not
  // persisted in this iteration — order is purely status + priority + recency.
  const rows = await prisma.adminTodo.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const priorityRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  rows.sort((a, b) => {
    const p = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
    if (p !== 0) return p;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // Distinct categories for the filter chips — only non-null, preserved alphabetically.
  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((c): c is string => !!c))
  ).sort();

  return (
    <AdminTodosConsole
      categories={categories}
      todos={rows.map((r) => {
        let ac: { text: string; done: boolean }[] = [];
        if (r.acceptanceCriteria) {
          try {
            const parsed = JSON.parse(r.acceptanceCriteria);
            if (Array.isArray(parsed)) {
              ac = parsed
                .map((c) => ({ text: String(c?.text ?? ""), done: !!c?.done }))
                .filter((c) => c.text.length > 0);
            }
          } catch {
            ac = [];
          }
        }
        return {
          id: r.id,
          ticketKey: r.ticketKey,
          title: r.title,
          body: r.body,
          status: r.status,
          priority: r.priority,
          category: r.category,
          acceptanceCriteria: ac,
          ownerNotes: r.ownerNotes,
          addedByEmail: r.addedByEmail,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
        };
      })}
    />
  );
}
