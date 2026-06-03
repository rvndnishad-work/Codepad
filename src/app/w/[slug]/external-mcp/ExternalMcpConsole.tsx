"use client";

import { useState, useTransition } from "react";
import {
  Plug,
  Plus,
  X,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Power,
  PowerOff,
  Beaker,
} from "lucide-react";
import { toast } from "sonner";
import {
  createExternalMcpAction,
  updateExternalMcpAction,
  deleteExternalMcpAction,
  testExternalMcpAction,
  setWorkspaceAllowExternalMcpAction,
} from "./actions";

interface ServerRow {
  id: string;
  name: string;
  url: string;
  hasAuthToken: boolean;
  enabled: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestSummary: string | null;
  createdAt: string;
}

interface Props {
  workspaceSlug: string;
  canManage: boolean;
  allowExternalMcp: boolean;
  servers: ServerRow[];
}

export default function ExternalMcpConsole({
  workspaceSlug,
  canManage,
  allowExternalMcp: initialAllow,
  servers: initialServers,
}: Props) {
  const [servers, setServers] = useState<ServerRow[]>(initialServers);
  const [allowExternalMcp, setAllowExternalMcp] = useState(initialAllow);
  const [togglingSwitch, setTogglingSwitch] = useState(false);

  const handleKillSwitch = async (next: boolean) => {
    if (
      next &&
      !confirm(
        "Enable outbound MCP wire for this workspace? The AI interviewer will be allowed to call into enabled+bound external servers during candidate screenings. You can disable any time."
      )
    ) {
      return;
    }
    setTogglingSwitch(true);
    try {
      const res = await setWorkspaceAllowExternalMcpAction(workspaceSlug, next);
      setAllowExternalMcp(res.allow);
      toast.success(next ? "Outbound MCP enabled for this workspace." : "Outbound MCP disabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Toggle failed.");
    } finally {
      setTogglingSwitch(false);
    }
  };
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ServerRow | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await testExternalMcpAction(workspaceSlug, id);
      if (res.ok) {
        toast.success(res.summary);
      } else {
        toast.error(`Test failed: ${res.summary}`);
      }
      // Refresh row state — server side already wrote lastTestedAt
      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                lastTestedAt: new Date().toISOString(),
                lastTestStatus: res.ok ? "ok" : "error",
                lastTestSummary: res.summary,
              }
            : s
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed.");
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnabled = async (s: ServerRow) => {
    // Don't allow enabling something that's never been tested or last test
    // failed — surfaces problems before any future Phase 4.1 wiring touches it.
    if (!s.enabled && s.lastTestStatus !== "ok") {
      toast.error("Test the connection successfully before enabling.");
      return;
    }
    try {
      await updateExternalMcpAction(workspaceSlug, s.id, {
        name: s.name,
        url: s.url,
        enabled: !s.enabled,
      });
      setServers((prev) =>
        prev.map((row) => (row.id === s.id ? { ...row, enabled: !s.enabled } : row))
      );
      toast.success(`${!s.enabled ? "Enabled" : "Disabled"} "${s.name}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Toggle failed.");
    }
  };

  const handleDelete = async (s: ServerRow) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    try {
      await deleteExternalMcpAction(workspaceSlug, s.id);
      setServers((prev) => prev.filter((row) => row.id !== s.id));
      toast.success("Server deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg flex items-center gap-2">
            <Plug className="w-7 h-7 text-accent" /> External MCP Servers
          </h1>
          <p className="text-sm text-muted/80 mt-1 max-w-2xl leading-relaxed">
            Connect external MCP servers (your internal docs, ATS, repo context) to this workspace. The AI interviewer can call into them mid-screening to ground its questions in customer-specific context — but only when the workspace kill-switch below is on AND a server is bound to the candidate&apos;s template.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md shrink-0 text-center justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add server</span>
          </button>
        )}
      </div>

      {/* Security note */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-[12px] text-amber-200/90 leading-relaxed flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Security model:</strong> URLs are SSRF-checked (private IPs blocked,
          HTTPS required in production). Auth tokens are encrypted at rest and
          never returned via the API after creation — to rotate, paste a new one.
          New servers are <strong>disabled by default</strong>; you must run a successful
          test before enabling. Three gates must all be ON for the AI interviewer to
          call out: <strong>kill-switch below</strong>, server <strong>enabled</strong>, and
          server <strong>bound to the candidate&apos;s template</strong> via the Templates modal.
        </div>
      </div>

      {/* Workspace kill-switch */}
      <div
        className={`rounded-2xl border p-5 flex items-start justify-between gap-4 transition-colors ${
          allowExternalMcp
            ? "border-emerald-500/30 bg-emerald-500/[0.04]"
            : "border-border bg-surface"
        }`}
      >
        <div className="space-y-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
            {allowExternalMcp ? (
              <Power className="w-4 h-4 text-emerald-400" />
            ) : (
              <PowerOff className="w-4 h-4 text-muted" />
            )}
            Outbound MCP wire — workspace kill-switch
          </h2>
          <p className="text-[12px] text-muted/90 leading-relaxed max-w-2xl">
            When OFF, the AI interviewer never calls into any external MCP — bindings stay configured but inert. When ON, the per-template bindings take effect. Default OFF.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => handleKillSwitch(!allowExternalMcp)}
            disabled={togglingSwitch}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition disabled:opacity-50 ${
              allowExternalMcp
                ? "border border-rose-500/35 text-rose-400 hover:bg-rose-500/10"
                : "bg-emerald-500 text-bg hover:bg-emerald-400"
            }`}
          >
            {togglingSwitch
              ? "Saving..."
              : allowExternalMcp
              ? "Turn OFF"
              : "Turn ON"}
          </button>
        )}
      </div>

      {/* Servers table */}
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg">
            Configured servers ({servers.length})
          </h2>
        </div>

        {servers.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted">
            No external MCP servers yet.{" "}
            {canManage ? "Add one above to get started." : "Ask a workspace owner to add one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-bg/50">
                <tr className="text-left text-muted uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">URL</th>
                  <th className="px-4 py-3 font-bold">Auth</th>
                  <th className="px-4 py-3 font-bold">Last test</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  {canManage && <th className="px-4 py-3 font-bold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {servers.map((s) => (
                  <tr key={s.id} className="border-t border-border/40">
                    <td className="px-4 py-3 font-bold text-fg">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-muted text-[11px] max-w-xs truncate" title={s.url}>
                      {s.url}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${
                          s.hasAuthToken
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-border bg-bg text-muted/60"
                        }`}
                      >
                        {s.hasAuthToken ? "bearer token" : "no auth"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted/80 text-[10px]">
                      {s.lastTestedAt ? new Date(s.lastTestedAt).toLocaleString() : <span className="italic">never</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.lastTestStatus === "ok" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]" title={s.lastTestSummary || undefined}>
                          <CheckCircle2 className="w-3 h-3" /> ok
                        </span>
                      ) : s.lastTestStatus === "error" ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-[10px]" title={s.lastTestSummary || undefined}>
                          <XCircle className="w-3 h-3" /> error
                        </span>
                      ) : (
                        <span className="text-muted/50 text-[10px] italic">untested</span>
                      )}
                      {s.enabled && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded border border-accent/30 bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-wider">
                          enabled
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleTest(s.id)}
                            disabled={testingId === s.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-elevated text-muted hover:text-fg text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-50"
                          >
                            <Beaker className="w-3 h-3" /> {testingId === s.id ? "..." : "Test"}
                          </button>
                          <button
                            onClick={() => handleToggleEnabled(s)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition ${
                              s.enabled
                                ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                          >
                            {s.enabled ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                            {s.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => setEditing(s)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-elevated text-muted hover:text-fg text-[10px] font-bold uppercase tracking-wider transition"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold uppercase tracking-wider transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreate && (
        <ServerFormModal
          workspaceSlug={workspaceSlug}
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={(s) => {
            setServers((prev) => [s, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {editing && (
        <ServerFormModal
          workspaceSlug={workspaceSlug}
          mode="edit"
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={(s) => {
            setServers((prev) => prev.map((row) => (row.id === s.id ? s : row)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ServerFormModal({
  workspaceSlug,
  mode,
  existing,
  onClose,
  onSaved,
}: {
  workspaceSlug: string;
  mode: "create" | "edit";
  existing?: ServerRow;
  onClose: () => void;
  onSaved: (s: ServerRow) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [authToken, setAuthToken] = useState("");
  const [clearAuthToken, setClearAuthToken] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (mode === "create") {
          const res = await createExternalMcpAction(workspaceSlug, { name, url, authToken });
          if (res.success) {
            onSaved({
              id: res.id,
              name,
              url,
              hasAuthToken: !!authToken.trim(),
              enabled: false,
              lastTestedAt: null,
              lastTestStatus: null,
              lastTestSummary: null,
              createdAt: new Date().toISOString(),
            });
            toast.success("Server added. Run a test before enabling.");
          }
        } else if (existing) {
          await updateExternalMcpAction(workspaceSlug, existing.id, {
            name,
            url,
            authToken: authToken.trim() || undefined,
            clearAuthToken,
          });
          onSaved({
            ...existing,
            name,
            url,
            hasAuthToken: clearAuthToken ? false : !!authToken.trim() || existing.hasAuthToken,
          });
          toast.success("Server updated.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg bg-surface border border-border rounded-3xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
            <Plug className="w-4 h-4 text-accent" />
            {mode === "create" ? "Add external MCP server" : `Edit "${existing?.name}"`}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-elevated text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
            Name (human-readable)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            placeholder="e.g. Acme internal docs"
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
            MCP server URL (Streamable HTTP endpoint)
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://docs.acme.com/api/mcp"
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg font-mono focus:outline-none focus:border-accent"
          />
          <div className="text-[10px] text-muted/60">
            Production requires HTTPS. Private/internal addresses are blocked.
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
            Bearer auth token (optional)
          </label>
          <input
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            type="password"
            placeholder={
              mode === "edit" && existing?.hasAuthToken
                ? "leave blank to keep existing"
                : "leave blank for no auth"
            }
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg font-mono focus:outline-none focus:border-accent"
          />
          {mode === "edit" && existing?.hasAuthToken && (
            <label className="flex items-center gap-2 text-[10px] text-muted cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={clearAuthToken}
                onChange={(e) => setClearAuthToken(e.target.checked)}
                className="accent-rose-500"
              />
              Clear the existing token (server will be unauthenticated).
            </label>
          )}
          <div className="text-[10px] text-muted/60">
            Sent as <code className="font-mono">Authorization: Bearer ...</code>. Never returned via API after save.
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted hover:text-fg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-50"
          >
            {isPending ? "Saving..." : mode === "create" ? "Add server" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
