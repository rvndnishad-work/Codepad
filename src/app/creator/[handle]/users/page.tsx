import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Users, Calendar, ShieldCheck, Mail } from "lucide-react";

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function CreatorSpaceUsersPage({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");

  const space = await prisma.creatorSpace.findUnique({
    where: { handle },
  });

  if (!space || space.ownerId !== userId) notFound();

  // Fetch memberships
  const memberships = await prisma.spaceMembership.findMany({
    where: { spaceId: space.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const subscriberIds = memberships.map((m) => m.subscriberId);
  const users = await prisma.user.findMany({
    where: { id: { in: subscriberIds } },
    select: { id: true, name: true, email: true, image: true },
  });

  const tiers = await prisma.spaceTier.findMany({
    where: { spaceId: space.id },
  });

  const membersList = memberships.map((m) => {
    const user = users.find((u) => u.id === m.subscriberId);
    const tier = tiers.find((t) => t.rank === m.tierRank);
    return {
      id: m.id,
      name: user?.name || "Anonymous User",
      email: user?.email || "No email provided",
      image: user?.image || null,
      tierName: tier?.name || `Tier ${m.tierRank}`,
      status: m.status,
      currentPeriodEnd: m.currentPeriodEnd,
      createdAt: m.createdAt,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Users & Subscribers</h1>
          <p className="text-xs text-muted mt-0.5">Manage and view active subscribers in your creator space.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-tile">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-panel/30">
          <h2 className="text-sm font-bold text-fg">Subscribers List ({membersList.length})</h2>
        </div>

        {membersList.length === 0 ? (
          <div className="px-5 py-12 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-panel border border-border grid place-items-center mx-auto text-muted mb-3.5">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-fg">No subscribers yet</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              When users subscribe to your membership tiers, they will appear here as active members.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-panel/10 text-muted uppercase font-bold tracking-wider">
                  <th className="px-5 py-3">Subscriber</th>
                  <th className="px-5 py-3">Membership Tier</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Subscribed Since</th>
                  <th className="px-5 py-3">Next Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {membersList.map((m) => (
                  <tr key={m.id} className="hover:bg-panel/20 transition-colors">
                    {/* User profile */}
                    <td className="px-5 py-3.5 flex items-center gap-3">
                      {m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt={m.name} className="w-8 h-8 rounded-lg border border-border bg-surface shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-accent font-semibold shrink-0">
                          {m.name.substring(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-fg truncate">{m.name}</div>
                        <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-muted/60" /> {m.email}
                        </div>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-fg">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent" /> {m.tierName}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider text-[9px] ${
                          m.status === "active"
                            ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                            : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${m.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {m.status}
                      </span>
                    </td>

                    {/* Subscribed Since */}
                    <td className="px-5 py-3.5 text-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted/60" />
                        {m.createdAt.toLocaleDateString()}
                      </div>
                    </td>

                    {/* Next Renewal */}
                    <td className="px-5 py-3.5 text-muted">
                      {m.currentPeriodEnd ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-muted/60" />
                          {m.currentPeriodEnd.toLocaleDateString()}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
