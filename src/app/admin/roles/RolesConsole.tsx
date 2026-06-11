"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, Trash2, UserPlus, X, Plus, Lock } from "lucide-react";
import { expandRolePermissions } from "@/lib/permissions/resolve";
import {
  setRolePermissionsAction,
  createRoleAction,
  deleteRoleAction,
  assignRoleAction,
  unassignRoleAction,
} from "./actions";

type Member = {
  userRoleId: string;
  userId: string;
  name: string | null;
  email: string | null;
};

type Role = {
  id: string;
  key: string;
  label: string;
  scope: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  members: Member[];
};

type Props = {
  roles: Role[];
  permissionGroups: { workspace: string[]; platform: string[]; creator: string[] };
  allPermissions: string[];
};

const scopeBadge = (scope: string) =>
  scope === "GLOBAL"
    ? "text-violet-300 border-violet-500/30 bg-violet-500/10"
    : "text-indigo-300 border-indigo-500/30 bg-indigo-500/10";

export default function RolesConsole({ roles, permissionGroups }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <Shield className="w-5 h-5 text-violet-400" />
        <div>
          <h1 className="text-xl font-bold text-fg">Roles &amp; Permissions</h1>
          <p className="text-xs text-muted mt-0.5">
            System roles are managed by the seed and shown read-only. Create custom
            roles to compose new permission sets, and assign global roles to staff.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            permissionGroups={permissionGroups}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>

      <CreateRoleForm onChanged={() => router.refresh()} />
    </div>
  );
}

function RoleCard({
  role,
  permissionGroups,
  onChanged,
}: {
  role: Role;
  permissionGroups: Props["permissionGroups"];
  onChanged: () => void;
}) {
  // Effective concrete permissions (wildcards expanded) for display + initial
  // checkbox state.
  const effective = new Set<string>(expandRolePermissions(role.permissions));
  const [selected, setSelected] = useState<Set<string>>(new Set(effective));
  const [saving, setSaving] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const editable = !role.isSystem;

  const dirty =
    editable &&
    (selected.size !== effective.size ||
      [...selected].some((p) => !effective.has(p)));

  function toggle(perm: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(perm);
      else next.delete(perm);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await setRolePermissionsAction(role.id, [...selected]);
      toast.success(`Updated ${role.key} permissions.`);
      onChanged();
    } catch (err) {
      toast.error("Failed to update permissions", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the "${role.label}" role?`)) return;
    try {
      await deleteRoleAction(role.id);
      toast.success("Role deleted.");
      onChanged();
    } catch (err) {
      toast.error("Failed to delete role", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignEmail.trim()) return;
    try {
      await assignRoleAction(assignEmail, role.id);
      toast.success(`Granted ${role.key} to ${assignEmail}.`);
      setAssignEmail("");
      onChanged();
    } catch (err) {
      toast.error("Failed to assign role", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function unassign(userRoleId: string) {
    try {
      await unassignRoleAction(userRoleId);
      toast.success("Role removed.");
      onChanged();
    } catch (err) {
      toast.error("Failed to remove role", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const groupsToShow: Record<string, string[]> =
    role.scope === "WORKSPACE"
      ? { workspace: permissionGroups.workspace }
      : { platform: permissionGroups.platform, creator: permissionGroups.creator };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-fg">{role.label}</span>
            <code className="text-[10px] text-muted font-mono">{role.key}</code>
            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${scopeBadge(role.scope)}`}>
              {role.scope}
            </span>
            {role.isSystem && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-panel/50 text-[9px] font-bold uppercase tracking-wider text-muted">
                <Lock className="w-2.5 h-2.5" /> System
              </span>
            )}
          </div>
          {role.description && (
            <p className="text-[11px] text-muted mt-1">{role.description}</p>
          )}
        </div>
        {editable && (
          <button
            onClick={remove}
            className="w-7 h-7 rounded-md text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center shrink-0"
            title="Delete role"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Permissions */}
      <div className="space-y-2">
        {Object.entries(groupsToShow).map(([group, perms]) => (
          <div key={group}>
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted mb-1">
              {group}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1">
              {perms.map((perm) => {
                const checked = selected.has(perm);
                return (
                  <label
                    key={perm}
                    className={`flex items-center gap-1.5 text-[11px] ${editable ? "cursor-pointer text-fg" : "text-muted"}`}
                    title={perm}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!editable || saving}
                      onChange={(e) => toggle(perm, e.target.checked)}
                      className="accent-accent w-3 h-3 disabled:opacity-60"
                    />
                    <span className="font-mono truncate">{perm}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {editable && (
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save permissions"}
            </button>
          </div>
        )}
      </div>

      {/* Members (global roles only) */}
      {role.scope === "GLOBAL" && (
        <div className="border-t border-border pt-3 space-y-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted">
            Assigned users ({role.members.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {role.members.map((m) => (
              <span
                key={m.userRoleId}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-panel/50 text-[11px] text-fg"
              >
                {m.email || m.name || m.userId}
                <button
                  onClick={() => unassign(m.userRoleId)}
                  className="text-muted hover:text-rose-500"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {role.members.length === 0 && (
              <span className="text-[11px] text-muted">No users assigned.</span>
            )}
          </div>
          <form onSubmit={assign} className="flex items-center gap-2">
            <input
              type="email"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              placeholder="user@email.com"
              className="flex-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-muted hover:text-fg hover:bg-panel text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Grant
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function CreateRoleForm({ onChanged }: { onChanged: () => void }) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"GLOBAL" | "WORKSPACE">("GLOBAL");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !label.trim()) {
      toast.error("Key and label are required.");
      return;
    }
    setCreating(true);
    try {
      await createRoleAction({ key, label, scope, description });
      toast.success("Role created.");
      setKey("");
      setLabel("");
      setDescription("");
      onChanged();
    } catch (err) {
      toast.error("Failed to create role", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-dashed border-border bg-surface/50 p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-fg">
        <Plus className="w-4 h-4 text-accent" /> Create custom role
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="KEY (e.g. SUPPORT_AGENT)"
          className="px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-xs font-mono focus:outline-none focus:border-accent/40"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Support Agent)"
          className="px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "GLOBAL" | "WORKSPACE")}
          className="px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
        >
          <option value="GLOBAL">Global (platform/creator)</option>
          <option value="WORKSPACE">Workspace</option>
        </select>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={creating}
          className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create role"}
        </button>
      </div>
      <p className="text-[10px] text-muted">
        New roles start with no permissions — tick them above after creating.
      </p>
    </form>
  );
}
