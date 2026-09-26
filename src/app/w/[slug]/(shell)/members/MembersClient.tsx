"use client";

/**
 * Members page: People, Invites and Roles tabs. Every change goes through
 * /api/w/[slug]/members, which checks permissions, applies the ownership
 * guards and writes the audit entry; this component only refreshes after.
 */
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Search, UserPlus } from "lucide-react";
import { Avatar, Btn, Dialog, Field, Menu, MenuItem, inputCls, useToasts } from "../candidates/_components/ui";
import { ConfirmDialog } from "../candidates/_components/dialogs";
import { relativeTime, plural } from "@/lib/workspace/display";
import {
  INVITABLE_ROLES,
  ROLE_LABELS,
  checkRemoval,
  checkRoleChange,
  isInactive,
  type SeatUsage,
} from "@/lib/workspace/members";
import { ROLE_EXPLAINER, overrideSummary, EXPLAINED_PERMISSIONS } from "@/lib/workspace/role-explainer";

export type MembersTab = "people" | "invites" | "roles";

type MemberRow = {
  id: string;
  userId: string;
  role: string;
  permissions: Record<string, boolean> | null;
  name: string | null;
  email: string | null;
  image: string | null;
  twoFactor: boolean;
  lastActiveAt: string | null;
  ownedCandidates: number;
};

type InviteRow = { id: string; email: string; role: string; expiresAt: string; createdAt: string; expired: boolean };

type Props = {
  slug: string;
  tab: MembersTab;
  now: string;
  me: { memberId: string; role: string; canInvite: boolean; canRemove: boolean; canSetRoles: boolean };
  members: MemberRow[];
  invites: InviteRow[];
  seats: SeatUsage;
  roleColumns: { key: string; label: string; description: string | null }[];
  roleBasePermissions: Record<string, string[]>;
};

const roleLabel = (r: string) => ROLE_LABELS[r] ?? r.charAt(0) + r.slice(1).toLowerCase();
const displayName = (m: { name: string | null; email: string | null }) => m.name || m.email || "Unnamed member";

async function callMembersApi(slug: string, method: "POST" | "PATCH" | "DELETE", body: unknown): Promise<void> {
  const res = await fetch(`/api/w/${slug}/members`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `Request failed (${res.status})`);
}

export default function MembersClient(props: Props) {
  const { slug, tab, me, members, invites, seats } = props;
  const router = useRouter();
  const [toastNode, toast] = useToasts();
  const [, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);

  const refresh = () => startTransition(() => router.refresh());
  const run = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      toast(ok);
      refresh();
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error");
      return false;
    }
  };

  const liveInvites = invites.filter((i) => !i.expired).length;
  const seatLine =
    seats.limit === null
      ? `${plural(seats.members, "person", "people")} in this workspace. Seats are billed per person.`
      : `${seats.used} of ${seats.limit} seats are used${seats.pendingInvites ? `, counting ${plural(seats.pendingInvites, "pending invite")}` : ""}.`;

  const tabLink = (id: MembersTab, text: string, count?: number) => (
    <Link
      key={id}
      href={id === "people" ? `/w/${slug}/members` : `/w/${slug}/members?tab=${id}`}
      aria-current={tab === id ? "page" : undefined}
      className={`relative flex items-center gap-2 h-10 text-sm whitespace-nowrap transition-colors ${
        tab === id ? "text-fg font-medium" : "text-muted hover:text-fg"
      }`}
    >
      {text}
      {count !== undefined && <span className="text-subtle tabular-nums">{count}</span>}
      {tab === id && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-secondary" />}
    </Link>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Members</h1>
          <p className="text-sm text-muted">
            {seatLine}
            {seats.full && (
              <>
                {" "}
                <Link href={`/w/${slug}/billing`} className="text-secondary-soft hover:underline">
                  See plans
                </Link>{" "}
                to add more.
              </>
            )}
          </p>
        </div>
        {me.canInvite && (
          <Btn
            variant="primary"
            size="md"
            icon={UserPlus}
            disabled={seats.full}
            title={seats.full ? "All seats are used" : undefined}
            onClick={() => setInviteOpen(true)}
          >
            Invite people
          </Btn>
        )}
      </div>

      <nav aria-label="Members sections" className="flex gap-6 border-b border-border overflow-x-auto">
        {tabLink("people", "People", members.length)}
        {tabLink("invites", "Invites", liveInvites)}
        {tabLink("roles", "Roles")}
      </nav>

      {tab === "people" && <PeopleTab {...props} run={run} />}
      {tab === "invites" && <InvitesTab {...props} run={run} />}
      {tab === "roles" && <RolesTab {...props} />}

      {inviteOpen && (
        <InviteDialog
          onClose={() => setInviteOpen(false)}
          roleColumns={props.roleColumns}
          onInvite={async (email, role) => {
            const ok = await run(() => callMembersApi(slug, "POST", { email, role }), `Invite sent to ${email}.`);
            if (ok) setInviteOpen(false);
          }}
        />
      )}
      {toastNode}
    </div>
  );
}

type RunFn = (fn: () => Promise<void>, ok: string) => Promise<boolean>;

/* ───────────────────────────── People ───────────────────────────── */

const FILTERS: { id: string; label: string; roles: string[] | null }[] = [
  { id: "all", label: "All roles", roles: null },
  { id: "admins", label: "Owners and admins", roles: ["OWNER", "ADMIN"] },
  { id: "recruiters", label: "Recruiters", roles: ["RECRUITER"] },
  { id: "interviewers", label: "Interviewers", roles: ["INTERVIEWER"] },
  { id: "viewers", label: "Viewers", roles: ["VIEWER"] },
];

function PeopleTab({ slug, me, members, now, roleBasePermissions, run }: Props & { run: RunFn }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const nowDate = useMemo(() => new Date(now), [now]);
  const caller = { id: me.memberId, role: me.role };

  const visible = members.filter((m) => {
    const f = FILTERS.find((x) => x.id === filter);
    if (f?.roles && !f.roles.includes(m.role)) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (m.name ?? "").toLowerCase().includes(needle) || (m.email ?? "").toLowerCase().includes(needle);
  });

  const inactive = me.canRemove
    ? members.find(
        (m) => m.id !== me.memberId && isInactive(m.lastActiveAt, nowDate) && checkRemoval({ caller, target: m, members }).ok,
      )
    : undefined;

  const changeRole = async (m: MemberRow, role: string) => {
    setSavingId(m.id);
    await run(() => callMembersApi(slug, "PATCH", { memberId: m.id, role }), `${displayName(m)} is now ${roleLabel(role).toLowerCase()}.`);
    setSavingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative flex items-center">
          <span className="sr-only">Search members</span>
          <Search className="absolute left-3 w-3.5 h-3.5 text-subtle" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            className={`${inputCls} pl-8 w-72 max-w-full`}
          />
        </label>
        {FILTERS.filter((f) => !f.roles || members.some((m) => f.roles!.includes(m.role))).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`h-8 px-3 rounded-full text-[13px] font-medium transition-colors ${
              filter === f.id ? "bg-fg text-bg" : "bg-panel text-muted hover:text-fg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-panel text-left text-xs font-medium text-muted">
              <th className="px-4 py-2.5 font-medium">Person</th>
              <th className="px-4 py-2.5 font-medium w-[190px]">Role</th>
              <th className="px-4 py-2.5 font-medium w-[140px]">Owns</th>
              <th className="px-4 py-2.5 font-medium w-[140px]">Last active</th>
              <th className="px-4 py-2.5 font-medium w-[110px]">Sign-in</th>
              <th className="px-4 py-2.5 w-[70px]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
              const isMe = m.id === me.memberId;
              const extra = overrideSummary(roleBasePermissions[m.role] ?? [], m.permissions);
              const canEditRole = me.canSetRoles && (m.role !== "OWNER" || me.role === "OWNER");
              const canRemoveThis = me.canRemove && !isMe && checkRemoval({ caller, target: m, members }).ok;
              const stale = isInactive(m.lastActiveAt, nowDate);
              return (
                <tr key={m.id} className="border-t border-border align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="" className="w-8 h-8 rounded-full border border-border shrink-0" />
                      ) : (
                        <Avatar name={displayName(m)} size={32} />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-fg truncate">
                          {displayName(m)} {isMe && <span className="font-normal text-muted">(you)</span>}
                        </span>
                        {m.name && m.email && <span className="text-[13px] text-muted truncate">{m.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      {canEditRole ? (
                        <label className="contents">
                          <span className="sr-only">Role for {displayName(m)}</span>
                          <select
                            value={m.role}
                            disabled={savingId === m.id}
                            onChange={(e) => changeRole(m, e.target.value)}
                            className="h-8 rounded-lg border border-border bg-bg px-2 text-[13px] text-fg focus:outline-none focus:border-secondary/60 disabled:opacity-50"
                          >
                            {Object.keys(ROLE_LABELS).map((r) => (
                              <option
                                key={r}
                                value={r}
                                disabled={r !== m.role && !checkRoleChange({ caller, target: m, nextRole: r, members }).ok}
                              >
                                {roleLabel(r)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span className="text-fg">{roleLabel(m.role)}</span>
                      )}
                      {(extra.added > 0 || extra.removed > 0) && (
                        <span className="text-xs text-secondary-soft">
                          {[extra.added ? `+${extra.added} extra` : "", extra.removed ? `-${extra.removed} removed` : ""].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted tabular-nums">{m.ownedCandidates ? plural(m.ownedCandidates, "candidate") : "None"}</td>
                  <td className={`px-4 py-3 ${stale ? "text-warning" : "text-muted"}`}>
                    {m.lastActiveAt ? relativeTime(m.lastActiveAt, nowDate) : <span className="text-subtle">Not seen yet</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ${
                        m.twoFactor ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}
                    >
                      {m.twoFactor ? "2FA on" : "2FA off"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(me.canSetRoles || canRemoveThis) && (
                      <Menu
                        align="right"
                        label={`Actions for ${displayName(m)}`}
                        trigger={(t) => (
                          <button
                            type="button"
                            {...t}
                            aria-label={`More for ${displayName(m)}`}
                            className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        )}
                      >
                        {(close) => (
                          <>
                            {me.canSetRoles && (
                              <MenuItem
                                onClick={() => {
                                  close();
                                  setEditing(m);
                                }}
                              >
                                Extra permissions
                              </MenuItem>
                            )}
                            {canRemoveThis && (
                              <MenuItem
                                danger
                                onClick={() => {
                                  close();
                                  setRemoving(m);
                                }}
                              >
                                Remove from workspace
                              </MenuItem>
                            )}
                          </>
                        )}
                      </Menu>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr className="border-t border-border">
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No one matches that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {inactive && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
          <span className="flex-1 min-w-[240px] text-sm text-fg">
            {displayName(inactive)} has not opened this workspace for{" "}
            {Math.floor((nowDate.getTime() - new Date(inactive.lastActiveAt!).getTime()) / 86_400_000)} days. Removing them frees a
            seat; their candidates, interviews and notes stay.
          </span>
          <Btn onClick={() => setRemoving(inactive)}>Remove {inactive.name?.split(" ")[0] ?? "them"}</Btn>
        </div>
      )}

      {removing && (
        <ConfirmDialog
          title={`Remove ${displayName(removing)}?`}
          body="They lose access to this workspace straight away. Their candidates, interviews and notes stay. You can invite them again later."
          confirmLabel="Remove"
          danger
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            const target = removing;
            setRemoving(null);
            await run(() => callMembersApi(slug, "DELETE", { memberId: target.id }), `${displayName(target)} was removed.`);
          }}
        />
      )}

      {editing && (
        <PermissionsDialog
          member={editing}
          base={roleBasePermissions[editing.role] ?? []}
          onClose={() => setEditing(null)}
          onSave={async (overrides) => {
            const target = editing;
            const ok = await run(
              () => callMembersApi(slug, "PATCH", { memberId: target.id, permissions: overrides }),
              "Permissions saved.",
            );
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PermissionsDialog({
  member,
  base,
  onClose,
  onSave,
}: {
  member: MemberRow;
  base: string[];
  onClose: () => void;
  onSave: (overrides: Record<string, boolean> | null) => Promise<void>;
}) {
  const baseSet = new Set(base);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({ ...(member.permissions ?? {}) });
  const [busy, setBusy] = useState(false);
  const effective = (p: string) => (p in overrides ? overrides[p] : baseSet.has(p));
  const toggle = (p: string, next: boolean) =>
    setOverrides((o) => {
      const copy = { ...o };
      // Store only the difference from the role, so a role change later still applies.
      if (baseSet.has(p) === next) delete copy[p];
      else copy[p] = next;
      return copy;
    });

  return (
    <Dialog
      title={`Permissions for ${displayName(member)}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              // Overrides on permissions this dialog does not show are kept as they are.
              await onSave(Object.keys(overrides).length ? overrides : null);
              setBusy(false);
            }}
          >
            Save
          </Btn>
        </>
      }
    >
      <p className="text-sm text-muted mb-4">
        Starts from the {roleLabel(member.role).toLowerCase()} role. Anything you tick or untick here applies to this person only.
      </p>
      <div className="flex flex-col gap-4">
        {ROLE_EXPLAINER.map((g) => (
          <fieldset key={g.label} className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-subtle mb-1">{g.label}</legend>
            {g.rows.map((r) => {
              const on = effective(r.permission);
              const changed = on !== baseSet.has(r.permission);
              return (
                <label key={r.permission} className="flex items-center gap-2.5 text-sm text-fg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => toggle(r.permission, e.target.checked)}
                    className="accent-secondary w-4 h-4"
                  />
                  <span className={changed ? "text-secondary-soft font-medium" : ""}>{r.label}</span>
                  {changed && <span className="text-xs text-secondary-soft">{on ? "Added" : "Removed"}</span>}
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>
    </Dialog>
  );
}

/* ───────────────────────────── Invites ───────────────────────────── */

function InvitesTab({ slug, me, invites, now, run }: Props & { run: RunFn }) {
  const [revoking, setRevoking] = useState<InviteRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const nowDate = new Date(now);

  if (invites.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted">
        No open invites. People you invite show up here until they accept.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-panel text-left text-xs font-medium text-muted">
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium w-[140px]">Role</th>
              <th className="px-4 py-2.5 font-medium w-[130px]">Sent</th>
              <th className="px-4 py-2.5 font-medium w-[150px]">Status</th>
              <th className="px-4 py-2.5 w-[190px]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => (
              <tr key={inv.id} className="border-t border-border">
                <td className="px-4 py-3 text-fg">{inv.email}</td>
                <td className="px-4 py-3 text-muted">{roleLabel(inv.role)}</td>
                <td className="px-4 py-3 text-muted">{relativeTime(inv.createdAt, nowDate)}</td>
                <td className="px-4 py-3">
                  {inv.expired ? (
                    <span className="inline-flex items-center h-6 px-2 rounded-full text-xs font-medium bg-warning/10 text-warning">Expired</span>
                  ) : (
                    <span className="text-muted">Expires {relativeTime(inv.expiresAt, nowDate).toLowerCase()}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {me.canInvite && (
                    <div className="flex justify-end gap-2">
                      <Btn
                        disabled={busyId === inv.id}
                        onClick={async () => {
                          setBusyId(inv.id);
                          await run(() => callMembersApi(slug, "POST", { resendInviteId: inv.id }), `Invite sent again to ${inv.email}.`);
                          setBusyId(null);
                        }}
                      >
                        Resend
                      </Btn>
                      <Btn variant="danger" onClick={() => setRevoking(inv)}>
                        Revoke
                      </Btn>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-muted">Invites last 14 days. Resending sends a new link and starts the 14 days again.</p>
      {revoking && (
        <ConfirmDialog
          title={`Revoke the invite for ${revoking.email}?`}
          body="The link in their email stops working. You can invite them again at any time."
          confirmLabel="Revoke"
          danger
          onCancel={() => setRevoking(null)}
          onConfirm={async () => {
            const target = revoking;
            setRevoking(null);
            await run(() => callMembersApi(slug, "DELETE", { inviteId: target.id }), "Invite revoked.");
          }}
        />
      )}
    </>
  );
}

/* ───────────────────────────── Roles ───────────────────────────── */

function RolesTab({ roleColumns, roleBasePermissions }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted max-w-3xl">
        What each role can do. This table is read from the same role settings the app checks, so it matches what people can
        actually do. Everyone in the workspace can see candidates, results, take homes and interviews. To give one person an
        extra permission, use Extra permissions on their row in People.
      </p>
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-panel text-left text-xs font-medium text-muted">
              <th className="px-4 py-2.5 font-medium">Permission</th>
              {roleColumns.map((r) => (
                <th key={r.key} className="px-3 py-2.5 font-medium text-center w-[110px]" title={r.description ?? undefined}>
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLE_EXPLAINER.map((g) => (
              <RoleGroup key={g.label} group={g} roleColumns={roleColumns} roleBasePermissions={roleBasePermissions} />
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {roleColumns.map((r) => (
          <div key={r.key} className="rounded-xl border border-border bg-surface px-4 py-3">
            <dt className="text-sm font-medium text-fg">{r.label}</dt>
            <dd className="text-[13px] text-muted mt-0.5">
              {r.description ?? "No description."}{" "}
              {plural(EXPLAINED_PERMISSIONS.filter((p) => (roleBasePermissions[r.key] ?? []).includes(p)).length, "permission")} from
              the table.
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RoleGroup({
  group,
  roleColumns,
  roleBasePermissions,
}: {
  group: (typeof ROLE_EXPLAINER)[number];
  roleColumns: Props["roleColumns"];
  roleBasePermissions: Record<string, string[]>;
}) {
  return (
    <>
      <tr className="border-t border-border bg-bg/40">
        <td colSpan={roleColumns.length + 1} className="px-4 py-2 text-xs font-medium text-muted">
          {group.label}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.permission} className="border-t border-border">
          <td className="px-4 py-2.5 text-fg">{row.label}</td>
          {roleColumns.map((r) => {
            const yes = (roleBasePermissions[r.key] ?? []).includes(row.permission);
            return (
              <td key={r.key} className={`px-3 py-2.5 text-center ${yes ? "text-success font-medium" : "text-subtle"}`}>
                {yes ? "Yes" : "No"}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/* ───────────────────────────── Invite dialog ───────────────────────────── */

function InviteDialog({
  onClose,
  onInvite,
  roleColumns,
}: {
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
  roleColumns: Props["roleColumns"];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("INTERVIEWER");
  const [busy, setBusy] = useState(false);
  const description = roleColumns.find((r) => r.key === role)?.description;

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    await onInvite(email.trim(), role);
    setBusy(false);
  };

  return (
    <Dialog
      title="Invite people"
      onClose={onClose}
      width={480}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={busy || !email.trim()} onClick={submit}>
            {busy ? "Sending" : "Send invite"}
          </Btn>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className={inputCls}
          />
        </Field>
        <Field label="Role" hint={description ?? undefined}>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-[13px] text-muted">
          They get an email with a link that works for 14 days. To make someone an owner, invite them first and change their role
          once they join.
        </p>
      </form>
    </Dialog>
  );
}
