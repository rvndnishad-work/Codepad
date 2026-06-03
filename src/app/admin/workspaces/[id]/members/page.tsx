import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Workspace members — Interviewpad Admin",
};

export default async function WorkspaceMembersPage({ params }: Props) {
  const { id } = await params;

  const ws = await prisma.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      members: {
        select: {
          id: true,
          role: true,
          user: { select: { name: true, email: true, image: true } },
        },
      },
    },
  });

  if (!ws) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-fg">Members</h3>
        <p className="text-xs text-muted mt-0.5">
          {ws.members.length} active {ws.members.length === 1 ? "seat" : "seats"} on this workspace
        </p>
      </div>

      {ws.members.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-sm text-muted">No members yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ws.members.map((m) => (
                <tr key={m.id} className="hover:bg-panel/30 transition-colors">
                  <td className="px-4 py-3 align-middle">
                    <div className="font-semibold text-fg">{m.user.name || "Anonymous"}</div>
                  </td>
                  <td className="px-4 py-3 align-middle font-mono text-[11px] text-muted">{m.user.email || "—"}</td>
                  <td className="px-4 py-3 align-middle">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-panel/50 border border-border text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {m.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
