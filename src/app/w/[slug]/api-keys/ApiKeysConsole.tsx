"use client";

import { useState, useTransition } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Trash2,
  X,
  CheckCircle2,
  ShieldAlert,
  Terminal,
  Clock,
  Activity,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  createMcpApiKeyAction,
  revokeMcpApiKeyAction,
  rotateMcpApiKeyAction,
} from "./actions";

interface KeyRow {
  id: string;
  label: string;
  keyPreview: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  kind: string;
  name: string;
  argsJson: string | null;
  resultSummary: string | null;
  errorCode: string | null;
  durationMs: number;
  createdAt: string;
  keyLabel: string | null;
  keyPreview: string | null;
}

interface Stats {
  activeKeyCount: number;
  callsLast24h: number;
  lastCallAt: string | null;
}

interface AuditPagination {
  page: number;
  totalPages: number;
  totalEntries: number;
  pageSize: number;
  kind: "ALL" | "tool" | "resource";
  errorsOnly: boolean;
}

interface ConsoleProps {
  workspaceSlug: string;
  workspaceName: string;
  canManage: boolean;
  stats: Stats;
  keys: KeyRow[];
  auditLog: AuditEntry[];
  auditPagination: AuditPagination;
}

export default function ApiKeysConsole({
  workspaceSlug,
  workspaceName,
  canManage,
  stats,
  keys: initialKeys,
  auditLog,
  auditPagination,
}: ConsoleProps) {
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [justCreated, setJustCreated] = useState<{
    plaintext: string;
    label: string;
    scopes: string[];
  } | null>(null);

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  const handleRevoke = async (id: string, label: string) => {
    if (
      !confirm(
        `Revoke "${label}"? Any client using this key will immediately stop working. This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await revokeMcpApiKeyAction(workspaceSlug, id);
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k
        )
      );
      toast.success(`Revoked "${label}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed.");
    }
  };

  const handleRotate = async (k: KeyRow) => {
    if (
      !confirm(
        `Rotate "${k.label}"? A new key will be generated; any client still using the old one will stop working immediately. You'll see the new plaintext once — copy it before closing.`
      )
    ) {
      return;
    }
    try {
      const res = await rotateMcpApiKeyAction(workspaceSlug, k.id);
      if (!res.success) return;
      // Mark old row as revoked and append " (rotated)" so the table mirrors
      // the server state without a round-trip.
      const taggedLabel = k.label.endsWith(" (rotated)") ? k.label : `${k.label} (rotated)`;
      setKeys((prev) => [
        {
          id: `tmp-${Date.now()}`,
          label: res.label,
          keyPreview: res.preview,
          scopes: res.scopes,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev.map((row) =>
          row.id === k.id
            ? { ...row, label: taggedLabel, revokedAt: new Date().toISOString() }
            : row
        ),
      ]);
      setJustCreated({ plaintext: res.plaintext, label: res.label, scopes: res.scopes });
      toast.success(`Rotated "${k.label}". Copy the new key — shown once.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rotate failed.");
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg flex items-center gap-2">
            <KeyRound className="w-7 h-7 text-accent" /> MCP API Keys
          </h1>
          <p className="text-sm text-muted/80 mt-1 max-w-2xl leading-relaxed">
            Connect Claude, Cursor, Goose — any MCP-compatible client — to this workspace. Mint <strong className="text-fg">read</strong> keys for analytics access, or <strong className="text-fg">read + write</strong> keys to create screenings, refund credits, and update candidates from inside your assistant.{" "}
            <Link href="/docs/mcp" target="_blank" className="text-accent underline underline-offset-2 inline-flex items-center gap-0.5">
              <BookOpen className="w-3 h-3" /> Docs
            </Link>
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md shrink-0 text-center justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Generate API key</span>
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile
          icon={<KeyRound className="w-5 h-5" />}
          label="Active keys"
          value={`${stats.activeKeyCount}`}
          tone="accent"
        />
        <StatTile
          icon={<Activity className="w-5 h-5" />}
          label="Calls (last 24h)"
          value={stats.callsLast24h.toLocaleString()}
          tone="emerald"
        />
        <StatTile
          icon={<Clock className="w-5 h-5" />}
          label="Last call"
          value={
            stats.lastCallAt
              ? new Date(stats.lastCallAt).toLocaleString()
              : "—"
          }
          tone="indigo"
          monoValue
        />
      </div>

      {/* Active keys */}
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg">
            Active keys ({activeKeys.length})
          </h2>
          <p className="text-[11px] text-muted/70 mt-0.5">
            Treat these like passwords. Only the workspace owner can see them on
            generation — and even then, only once.
          </p>
        </div>

        {activeKeys.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted">
            No active keys.{" "}
            {canManage ? "Generate one above to connect an MCP client." : "Ask a workspace owner or admin to mint one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-bg/50">
                <tr className="text-left text-muted uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">Label</th>
                  <th className="px-4 py-3 font-bold">Preview</th>
                  <th className="px-4 py-3 font-bold">Scopes</th>
                  <th className="px-4 py-3 font-bold">Last used</th>
                  <th className="px-4 py-3 font-bold">Created</th>
                  {canManage && <th className="px-4 py-3 font-bold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {activeKeys.map((k) => (
                  <tr key={k.id} className="border-t border-border/40 hover:bg-surface/30">
                    <td className="px-4 py-3 font-bold text-fg">{k.label}</td>
                    <td className="px-4 py-3 font-mono text-muted text-[11px]">
                      {k.keyPreview}…
                    </td>
                    <td className="px-4 py-3">
                      {k.scopes.map((s) => (
                        <span
                          key={s}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider mr-1 ${
                            s === "write"
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-muted/80 text-[10px]">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : <span className="italic">never</span>}
                    </td>
                    <td className="px-4 py-3 text-muted/70 text-[10px]">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRotate(k)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider transition"
                            title="Generate a new key and revoke this one in one step"
                          >
                            <RefreshCw className="w-3 h-3" /> Rotate
                          </button>
                          <button
                            onClick={() => handleRevoke(k.id, k.label)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold uppercase tracking-wider transition"
                          >
                            <Trash2 className="w-3 h-3" /> Revoke
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

      {/* Revoked keys (collapsed by default for context) */}
      {revokedKeys.length > 0 && (
        <details className="rounded-2xl border border-border bg-surface overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer flex items-center justify-between list-none">
            <span className="text-xs font-black uppercase tracking-widest text-muted">
              Revoked ({revokedKeys.length})
            </span>
            <span className="text-[10px] text-muted/60">audit history preserved</span>
          </summary>
          <div className="overflow-x-auto border-t border-border/60">
            <table className="w-full text-xs">
              <tbody>
                {revokedKeys.map((k) => (
                  <tr key={k.id} className="border-b border-border/30 opacity-60">
                    <td className="px-4 py-2 text-fg/70">{k.label}</td>
                    <td className="px-4 py-2 font-mono text-muted text-[11px]">{k.keyPreview}…</td>
                    <td className="px-4 py-2 text-muted/60 text-[10px]">
                      revoked {k.revokedAt ? new Date(k.revokedAt).toLocaleString() : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Audit log */}
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-fg">
              Recent activity
            </h2>
            <p className="text-[11px] text-muted/70 mt-0.5">
              Every MCP call writes a row here. {auditPagination.totalEntries.toLocaleString()} total.
            </p>
          </div>
          <AuditFilterChips
            workspaceSlug={workspaceSlug}
            pagination={auditPagination}
          />
        </div>

        {auditLog.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted">
            {auditPagination.totalEntries === 0
              ? "No activity yet. After you install a key in Claude/Cursor and run a tool, calls will appear here within seconds."
              : "No entries match the current filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-bg/50">
                <tr className="text-left text-muted uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">Key</th>
                  <th className="px-4 py-3 font-bold">Kind</th>
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">Result</th>
                  <th className="px-4 py-3 font-bold text-right">ms</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((e) => (
                  <tr key={e.id} className="border-t border-border/40">
                    <td className="px-4 py-2 text-muted/70 text-[10px] whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-fg/80">
                      {e.keyLabel ? (
                        <span className="font-bold">{e.keyLabel}</span>
                      ) : (
                        <span className="italic text-muted/50">(revoked)</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${
                          e.kind === "tool"
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                        }`}
                      >
                        {e.kind}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-fg/80 text-[11px]">{e.name}</td>
                    <td className="px-4 py-2 text-muted">
                      {e.errorCode ? (
                        <span className="text-rose-400">
                          <ShieldAlert className="w-3 h-3 inline mr-1" />
                          {e.errorCode}: {e.resultSummary}
                        </span>
                      ) : (
                        e.resultSummary || "—"
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted/70">
                      {e.durationMs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {auditPagination.totalPages > 1 && (
          <AuditPaginationFooter
            workspaceSlug={workspaceSlug}
            pagination={auditPagination}
          />
        )}
      </section>

      {showCreate && (
        <CreateKeyModal
          workspaceSlug={workspaceSlug}
          onClose={() => setShowCreate(false)}
          onCreated={(plaintext, label, preview, scopes) => {
            setKeys((prev) => [
              {
                id: `tmp-${Date.now()}`,
                label,
                keyPreview: preview,
                scopes,
                lastUsedAt: null,
                revokedAt: null,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
            setJustCreated({ plaintext, label, scopes });
            setShowCreate(false);
          }}
        />
      )}

      {justCreated && (
        <KeyRevealModal
          plaintext={justCreated.plaintext}
          label={justCreated.label}
          scopes={justCreated.scopes}
          workspaceName={workspaceName}
          onClose={() => setJustCreated(null)}
        />
      )}
    </div>
  );
}

/**
 * Build a /w/[slug]/api-keys URL with the given audit-filter params. Used by
 * both the filter chips and the pagination footer so they share encoding.
 */
function buildAuditUrl(
  workspaceSlug: string,
  params: { page?: number; kind?: "ALL" | "tool" | "resource"; errorsOnly?: boolean }
): string {
  const q = new URLSearchParams();
  if (params.page && params.page > 1) q.set("page", String(params.page));
  if (params.kind && params.kind !== "ALL") q.set("kind", params.kind);
  if (params.errorsOnly) q.set("errorsOnly", "1");
  const qs = q.toString();
  return qs ? `/w/${workspaceSlug}/api-keys?${qs}` : `/w/${workspaceSlug}/api-keys`;
}

function AuditFilterChips({
  workspaceSlug,
  pagination,
}: {
  workspaceSlug: string;
  pagination: AuditPagination;
}) {
  // Changing a filter resets page to 1; otherwise you'd land on an empty page
  // when narrowing the result set.
  const linkFor = (next: Partial<AuditPagination>) =>
    buildAuditUrl(workspaceSlug, {
      page: 1,
      kind: next.kind ?? pagination.kind,
      errorsOnly:
        next.errorsOnly !== undefined ? next.errorsOnly : pagination.errorsOnly,
    });

  return (
    <div className="flex gap-1.5 flex-wrap">
      {(["ALL", "tool", "resource"] as const).map((k) => (
        <Link
          key={k}
          href={linkFor({ kind: k })}
          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border transition ${
            pagination.kind === k
              ? "bg-accent/15 border-accent/30 text-accent"
              : "bg-bg border-border/40 text-muted hover:text-fg"
          }`}
        >
          {k === "ALL" ? "all" : k}
        </Link>
      ))}
      <Link
        href={linkFor({ errorsOnly: !pagination.errorsOnly })}
        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border transition ${
          pagination.errorsOnly
            ? "bg-rose-500/15 border-rose-500/35 text-rose-300"
            : "bg-bg border-border/40 text-muted hover:text-fg"
        }`}
      >
        errors only
      </Link>
    </div>
  );
}

function AuditPaginationFooter({
  workspaceSlug,
  pagination,
}: {
  workspaceSlug: string;
  pagination: AuditPagination;
}) {
  const first = (pagination.page - 1) * pagination.pageSize + 1;
  const last = Math.min(pagination.page * pagination.pageSize, pagination.totalEntries);
  const prevHref = buildAuditUrl(workspaceSlug, {
    page: pagination.page - 1,
    kind: pagination.kind,
    errorsOnly: pagination.errorsOnly,
  });
  const nextHref = buildAuditUrl(workspaceSlug, {
    page: pagination.page + 1,
    kind: pagination.kind,
    errorsOnly: pagination.errorsOnly,
  });
  return (
    <div className="p-3 border-t border-border/60 flex items-center justify-between text-[10px] text-muted">
      <span className="tabular-nums">
        Showing {first}–{last} of {pagination.totalEntries.toLocaleString()}
      </span>
      <div className="flex items-center gap-1.5">
        {pagination.page > 1 ? (
          <Link
            href={prevHref}
            className="px-2 py-1 rounded-md border border-border hover:bg-elevated text-fg font-bold"
          >
            ← Prev
          </Link>
        ) : (
          <span className="px-2 py-1 rounded-md border border-border/40 text-muted/40">
            ← Prev
          </span>
        )}
        <span className="px-2 tabular-nums">
          {pagination.page} / {pagination.totalPages}
        </span>
        {pagination.page < pagination.totalPages ? (
          <Link
            href={nextHref}
            className="px-2 py-1 rounded-md border border-border hover:bg-elevated text-fg font-bold"
          >
            Next →
          </Link>
        ) : (
          <span className="px-2 py-1 rounded-md border border-border/40 text-muted/40">
            Next →
          </span>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
  monoValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "accent" | "emerald" | "indigo";
  monoValue?: boolean;
}) {
  const toneCls = {
    accent: "bg-accent/10 border-accent/20 text-accent",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${toneCls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</span>
        <div
          className={`mt-0.5 ${
            monoValue
              ? "text-sm font-bold text-fg font-mono"
              : "text-2xl font-black text-fg tabular-nums"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function CreateKeyModal({
  workspaceSlug,
  onClose,
  onCreated,
}: {
  workspaceSlug: string;
  onClose: () => void;
  onCreated: (plaintext: string, label: string, preview: string, scopes: string[]) => void;
}) {
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"read" | "read-write">("read");
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    startTransition(async () => {
      try {
        const res = await createMcpApiKeyAction(workspaceSlug, label, scope);
        if (res.success) {
          onCreated(res.plaintext, res.label, res.preview, res.scopes);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Create failed.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-accent" /> Generate API key
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-elevated text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-[11px] text-amber-200/90 leading-relaxed">
          <ShieldAlert className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
          The full key will be shown <strong>once</strong>. Copy it before
          closing the next dialog — we only store a hash and can&apos;t recover it.
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
            Label (which client / what for)
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            maxLength={60}
            placeholder="e.g. Claude Desktop — Alice"
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-muted tracking-wider block">
            Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope("read")}
              className={`text-left rounded-xl border p-3 transition ${
                scope === "read"
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-border bg-bg hover:bg-elevated"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">read</span>
                {scope === "read" && (
                  <span className="text-[9px] text-emerald-400">● selected</span>
                )}
              </div>
              <div className="text-[10px] text-muted leading-snug">
                List + inspect candidates, screenings, credits, transcripts. Safe default.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setScope("read-write")}
              className={`text-left rounded-xl border p-3 transition ${
                scope === "read-write"
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-border bg-bg hover:bg-elevated"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">read</span>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">+ write</span>
                {scope === "read-write" && (
                  <span className="text-[9px] text-amber-400">● selected</span>
                )}
              </div>
              <div className="text-[10px] text-muted leading-snug">
                Plus: create screenings, update candidate status, add notes, refund credits.
              </div>
            </button>
          </div>
          {scope === "read-write" && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-2 text-[10px] text-amber-200/80 leading-snug">
              Write-scoped keys can spend workspace data (create screenings, refund credits). Treat them like service accounts.
            </div>
          )}
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
            disabled={isPending || !label.trim()}
            className="px-5 py-2 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-50"
          >
            {isPending ? "Generating..." : "Generate key"}
          </button>
        </div>
      </form>
    </div>
  );
}

function KeyRevealModal({
  plaintext,
  label,
  scopes,
  workspaceName,
  onClose,
}: {
  plaintext: string;
  label: string;
  scopes: string[];
  workspaceName: string;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/api/mcp`;

  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`Copied ${what} to clipboard.`);
  };

  const claudeDesktopSnippet = JSON.stringify(
    {
      mcpServers: {
        [slugify(workspaceName)]: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            url,
            "--header",
            `Authorization:Bearer ${plaintext}`,
          ],
        },
      },
    },
    null,
    2
  );

  const cursorSnippet = JSON.stringify(
    {
      mcpServers: {
        [slugify(workspaceName)]: {
          url,
          headers: { Authorization: `Bearer ${plaintext}` },
        },
      },
    },
    null,
    2
  );

  const curlSnippet = [
    `curl -X POST '${url}' \\`,
    `  -H 'Authorization: Bearer ${plaintext}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Accept: application/json, text/event-stream' \\`,
    `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`,
  ].join("\n");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-surface border border-accent/30 rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Key generated — copy now
          </h3>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3 text-[11px] text-rose-200/90 leading-relaxed">
          <ShieldAlert className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
          This is the only time you&apos;ll see the full key. Copy it before
          closing — we store only the hash. If you lose it, revoke and re-issue.
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase text-muted tracking-wider">
              {label}
            </label>
            <div className="flex gap-1">
              {scopes.map((s) => (
                <span
                  key={s}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${
                    s === "write"
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-bg font-mono text-[12px] break-all">
            <span className="flex-1 text-fg select-all">{plaintext}</span>
            <button
              onClick={() => copy(plaintext, "key")}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-bg text-[10px] font-bold uppercase tracking-wider hover:bg-accent-soft transition"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        </div>

        <SnippetBlock
          title="Claude Desktop"
          subtitle="Edit %APPDATA%\Claude\claude_desktop_config.json on Windows, or ~/Library/Application Support/Claude/claude_desktop_config.json on macOS. Restart Claude Desktop after saving."
          code={claudeDesktopSnippet}
          onCopy={() => copy(claudeDesktopSnippet, "Claude Desktop config")}
        />

        <SnippetBlock
          title="Cursor / Goose (native URL)"
          subtitle="For clients that speak the MCP Streamable HTTP transport directly."
          code={cursorSnippet}
          onCopy={() => copy(cursorSnippet, "Cursor config")}
        />

        <SnippetBlock
          title="Raw curl (smoke test)"
          subtitle="Lists the available tools — handy for verifying the key works."
          code={curlSnippet}
          onCopy={() => copy(curlSnippet, "curl command")}
        />

        <label className="flex items-start gap-2 text-[11px] text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          <span>I&apos;ve copied the key and stored it somewhere safe.</span>
        </label>

        <div className="flex justify-end pt-1">
          <button
            disabled={!confirmed}
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-fg text-bg text-xs font-black uppercase tracking-wider hover:bg-fg/90 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function SnippetBlock({
  title,
  subtitle,
  code,
  onCopy,
}: {
  title: string;
  subtitle: string;
  code: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-fg flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-muted" /> {title}
          </div>
          <div className="text-[10px] text-muted/70 mt-0.5 leading-snug">{subtitle}</div>
        </div>
        <button
          onClick={onCopy}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-elevated text-fg text-[10px] font-bold uppercase tracking-wider transition"
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <pre className="text-[10px] font-mono text-fg/90 bg-bg p-3 rounded-xl border border-border/50 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
