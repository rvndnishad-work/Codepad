"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Heart,
  Download,
  Gift,
  ShieldCheck,
  Calendar,
  Mail,
  Loader2,
  Trash2,
} from "lucide-react";
import { grantCompMembershipAction, revokeCompMembershipAction } from "../../actions";

type Member = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  tierName: string;
  status: string;
  comp: boolean;
  currentPeriodEnd: string | null;
  createdAt: string;
};

type Follower = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AudienceClient({
  spaceId,
  members,
  followers,
  tiers,
}: {
  spaceId: string;
  members: Member[];
  followers: Follower[];
  tiers: { id: string; name: string; rank: number }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"members" | "followers">("members");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRank, setGrantRank] = useState(tiers[0] ? String(tiers[0].rank) : "");
  const [granting, setGranting] = useState(false);

  async function grant() {
    if (!grantEmail.trim() || !grantRank) {
      toast.error("Enter an email and pick a tier.");
      return;
    }
    setGranting(true);
    try {
      await grantCompMembershipAction(spaceId, grantEmail, parseInt(grantRank, 10));
      toast.success("Comp membership granted.");
      setGrantEmail("");
      router.refresh();
    } catch (err) {
      toast.error("Grant failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setGranting(false);
    }
  }

  async function revoke(membershipId: string) {
    try {
      await revokeCompMembershipAction(spaceId, membershipId);
      toast.success("Comp membership revoked.");
      router.refresh();
    } catch (err) {
      toast.error("Revoke failed", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  function exportCsv() {
    if (tab === "members") {
      downloadCsv("members.csv", [
        ["name", "email", "tier", "status", "comp", "since", "renews"],
        ...members.map((m) => [
          m.name,
          m.email,
          m.tierName,
          m.status,
          m.comp ? "yes" : "no",
          m.createdAt.slice(0, 10),
          m.currentPeriodEnd?.slice(0, 10) ?? "",
        ]),
      ]);
    } else {
      downloadCsv("followers.csv", [
        ["name", "email", "since"],
        ...followers.map((f) => [f.name, f.email, f.createdAt.slice(0, 10)]),
      ]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fg">Audience</h1>
            <p className="text-xs text-muted mt-0.5">
              {members.length} member{members.length === 1 ? "" : "s"} · {followers.length} follower
              {followers.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-fg hover:bg-panel/50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(
          [
            { key: "members", label: `Members (${members.length})`, Icon: ShieldCheck },
            { key: "followers", label: `Followers (${followers.length})`, Icon: Heart },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <t.Icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <>
          {/* Comp grant */}
          {tiers.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-fg">
                <Gift className="w-4 h-4 text-accent" /> Gift a membership
              </div>
              <input
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="member@email.com"
                className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
              />
              <select
                value={grantRank}
                onChange={(e) => setGrantRank(e.target.value)}
                className="px-2.5 py-2 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none"
                title="Tier"
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.rank}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={grant}
                disabled={granting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {granting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                Grant free access
              </button>
            </div>
          )}

          <PeopleTable
            empty="No members yet — when someone subscribes (or you gift access) they'll appear here."
            head={["Member", "Tier", "Status", "Since", "Renews", ""]}
            rows={members.map((m) => ({
              key: m.id,
              cells: [
                <Person key="p" name={m.name} email={m.email} image={m.image} />,
                <span key="t" className="inline-flex items-center gap-1 font-semibold text-fg text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" /> {m.tierName}
                  {m.comp && (
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-violet-500 bg-violet-500/10 border border-violet-500/25 rounded-full px-1.5 py-0.5">
                      comp
                    </span>
                  )}
                </span>,
                <StatusChip key="s" status={m.status} />,
                <DateCell key="d1" iso={m.createdAt} />,
                m.currentPeriodEnd ? <DateCell key="d2" iso={m.currentPeriodEnd} /> : <span key="d2">—</span>,
                m.comp ? (
                  <button
                    key="x"
                    onClick={() => revoke(m.id)}
                    className="w-7 h-7 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 grid place-items-center transition-colors"
                    title="Revoke comp membership"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span key="x" />
                ),
              ],
            }))}
          />
        </>
      )}

      {tab === "followers" && (
        <PeopleTable
          empty="No followers yet — share your public page to start building an audience."
          head={["Follower", "Following since"]}
          rows={followers.map((f) => ({
            key: f.id,
            cells: [<Person key="p" name={f.name} email={f.email} image={f.image} />, <DateCell key="d" iso={f.createdAt} />],
          }))}
        />
      )}
    </div>
  );
}

function Person({ name, email, image }: { name: string; email: string; image: string | null }) {
  return (
    <span className="flex items-center gap-3 min-w-0">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="w-8 h-8 rounded-lg border border-border bg-surface shrink-0 object-cover" />
      ) : (
        <span className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 grid place-items-center text-accent font-semibold shrink-0">
          {name.substring(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-semibold text-fg truncate text-xs">{name}</span>
        <span className="text-[10px] text-muted flex items-center gap-1 mt-0.5 truncate">
          <Mail className="w-3 h-3 text-muted/60 shrink-0" /> {email || "no email"}
        </span>
      </span>
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider text-[9px] ${
        active
          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
          : "text-amber-500 border-amber-500/30 bg-amber-500/10"
      }`}
    >
      <span className={`w-1 h-1 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`} />
      {status}
    </span>
  );
}

function DateCell({ iso }: { iso: string }) {
  return (
    <span className="flex items-center gap-1 text-muted text-xs">
      <Calendar className="w-3.5 h-3.5 text-muted/60" />
      {new Date(iso).toLocaleDateString()}
    </span>
  );
}

function PeopleTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: { key: string; cells: React.ReactNode[] }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-14 px-6 text-center">
        <Users className="w-6 h-6 text-muted mx-auto mb-3" />
        <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">{empty}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-tile">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-panel/10 text-muted uppercase font-bold tracking-wider text-[10px]">
              {head.map((h, i) => (
                <th key={i} className="px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-panel/20 transition-colors">
                {r.cells.map((c, i) => (
                  <td key={i} className="px-5 py-3.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
