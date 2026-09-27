"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, Copy, MoreHorizontal, Plus, ShieldAlert, Terminal } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_CHOICES,
  STALE_AFTER_DAYS,
  accessLabel,
  expiryLabel,
  keyHealth,
} from "@/lib/mcp/keys";
import { relativeTime } from "@/lib/workspace/display";
import { Btn, Dialog, Field, Menu, MenuItem, inputCls } from "../candidates/_components/ui";
import {
  createMcpApiKeyAction,
  renameMcpApiKeyAction,
  revokeMcpApiKeyAction,
  rotateMcpApiKeyAction,
} from "./actions";

export type ConsoleTab = "keys" | "activity" | "connect";

interface KeyRow {
  id: string;
  label: string;
  keyPreview: string;
  scopes: string[];
  createdBy: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
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
  keyId: string | null;
  keyLabel: string | null;
  keyPreview: string | null;
}

interface AuditPagination {
  page: number;
  totalPages: number;
  totalEntries: number;
  pageSize: number;
  kind: "ALL" | "tool" | "resource";
  errorsOnly: boolean;
  keyId: string | null;
}

interface ConsoleProps {
  workspaceSlug: string;
  workspaceName: string;
  mcpUrl: string;
  canManage: boolean;
  tab: ConsoleTab;
  now: string;
  keys: KeyRow[];
  auditLog: AuditEntry[];
  recent: AuditEntry[];
  auditPagination: AuditPagination;
}

type Revealed = { plaintext: string; label: string; scopes: string[] };

export default function ApiKeysConsole({
  workspaceSlug,
  workspaceName,
  mcpUrl,
  canManage,
  tab,
  now,
  keys,
  auditLog,
  recent,
  auditPagination,
}: ConsoleProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState<KeyRow | null>(null);
  const [justCreated, setJustCreated] = useState<Revealed | null>(null);
  const at = new Date(now);
  const base = `/w/${workspaceSlug}/api-keys`;

  const liveKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  const handleRevoke = async (k: KeyRow) => {
    if (!confirm(`Revoke "${k.label}"? Anything using this key stops working straight away. This cannot be undone.`)) return;
    try {
      await revokeMcpApiKeyAction(workspaceSlug, k.id);
      toast.success(`Revoked "${k.label}".`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke the key.");
    }
  };

  const handleRotate = async (k: KeyRow) => {
    if (
      !confirm(
        `Rotate "${k.label}"? You get a new key with the same name, access and expiry. Anything still using the old one stops working straight away.`,
      )
    ) {
      return;
    }
    try {
      const res = await rotateMcpApiKeyAction(workspaceSlug, k.id);
      setJustCreated({ plaintext: res.plaintext, label: res.label, scopes: res.scopes });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rotate the key.");
    }
  };

  const tabs: { id: ConsoleTab; label: string }[] = [
    { id: "keys", label: "Keys" },
    { id: "activity", label: "Activity" },
    { id: "connect", label: "Connect a client" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">API and MCP</h1>
          <p className="text-sm text-muted max-w-2xl">
            Keys let Claude, Cursor or your own scripts list candidates, read results and add notes. No key can pass a candidate.{" "}
            <Link href="/docs/mcp" target="_blank" className="text-secondary hover:underline underline-offset-2 inline-flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" aria-hidden /> Docs
            </Link>
          </p>
        </div>
        {canManage && (
          <Btn variant="primary" size="md" icon={Plus} onClick={() => setShowCreate(true)}>
            Create key
          </Btn>
        )}
      </header>

      <nav aria-label="API and MCP sections" className="flex gap-6 border-b border-border overflow-x-auto">
        {tabs.map((t) => {
          const on = t.id === tab;
          return (
            <Link
              key={t.id}
              href={t.id === "keys" ? base : `${base}?tab=${t.id}`}
              aria-current={on ? "page" : undefined}
              className={`h-10 -mb-px inline-flex items-center text-sm whitespace-nowrap border-b-2 transition ${
                on ? "text-fg font-medium border-secondary" : "text-muted hover:text-fg border-transparent"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {tab === "keys" && (
        <>
          <KeysTable
            keys={liveKeys}
            now={at}
            canManage={canManage}
            base={base}
            onRename={setRenaming}
            onRotate={handleRotate}
            onRevoke={handleRevoke}
          />

          {revokedKeys.length > 0 && (
            <details className="rounded-xl border border-border bg-surface overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer text-[13px] text-muted hover:text-fg">
                Revoked keys ({revokedKeys.length})
              </summary>
              <ul className="border-t border-border">
                {revokedKeys.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border-t border-border first:border-t-0 text-[13px]">
                    <span className="text-muted">{k.label}</span>
                    <span className="font-mono text-subtle">{k.keyPreview}…</span>
                    <span className="text-subtle">Revoked {k.revokedAt ? relativeTime(k.revokedAt, at).toLowerCase() : ""}</span>
                    <Link href={`${base}?tab=activity&key=${k.id}`} className="ml-auto text-secondary hover:underline underline-offset-2">
                      Activity
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-2.5">
              <h2 className="text-[13px] font-semibold text-muted">Recent activity</h2>
              {recent.length === 0 ? (
                <p className="text-sm text-muted">No calls yet. Once a client uses a key, its calls show up here.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {recent.map((e) => (
                    <li key={e.id} className={`flex items-baseline justify-between gap-3 text-sm ${e.errorCode ? "text-danger" : "text-fg"}`}>
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-[13px]">{e.name}</span>
                        {e.resultSummary ? `, ${e.errorCode ? "refused" : e.resultSummary}` : ""}
                      </span>
                      <span className={`shrink-0 text-[13px] ${e.errorCode ? "" : "text-muted"}`}>{e.keyLabel ?? "Deleted key"}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[13px] text-muted mt-auto">
                Calls that change data are also in the{" "}
                <Link href={`/w/${workspaceSlug}/audit?category=connections`} className="text-secondary hover:underline underline-offset-2">
                  audit log
                </Link>
                .{" "}
                <Link href={`${base}?tab=activity`} className="text-secondary hover:underline underline-offset-2">
                  See all activity
                </Link>
              </p>
            </section>
            <ConnectCard mcpUrl={mcpUrl} workspaceName={workspaceName} base={base} />
          </div>
        </>
      )}

      {tab === "activity" && (
        <ActivityTab keys={keys} entries={auditLog} pagination={auditPagination} base={base} now={at} />
      )}

      {tab === "connect" && <ConnectTab mcpUrl={mcpUrl} workspaceName={workspaceName} />}

      {showCreate && (
        <CreateKeyDialog
          workspaceSlug={workspaceSlug}
          onClose={() => setShowCreate(false)}
          onCreated={(r) => {
            setShowCreate(false);
            setJustCreated(r);
            router.refresh();
          }}
        />
      )}

      {renaming && (
        <RenameDialog
          workspaceSlug={workspaceSlug}
          k={renaming}
          onClose={() => setRenaming(null)}
          onDone={() => {
            setRenaming(null);
            router.refresh();
          }}
        />
      )}

      {justCreated && (
        <KeyRevealModal
          plaintext={justCreated.plaintext}
          label={justCreated.label}
          scopes={justCreated.scopes}
          workspaceName={workspaceName}
          url={mcpUrl}
          onClose={() => setJustCreated(null)}
        />
      )}
    </div>
  );
}

/* ── Keys ───────────────────────────────────────────────────────────────── */

function KeysTable({
  keys,
  now,
  canManage,
  base,
  onRename,
  onRotate,
  onRevoke,
}: {
  keys: KeyRow[];
  now: Date;
  canManage: boolean;
  base: string;
  onRename: (k: KeyRow) => void;
  onRotate: (k: KeyRow) => void;
  onRevoke: (k: KeyRow) => void;
}) {
  if (keys.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-12 text-center flex flex-col items-center gap-2">
        <p className="text-[15px] font-medium text-fg">No keys yet</p>
        <p className="text-[13px] text-muted max-w-sm">
          {canManage ? "Create a key to connect Claude, Cursor or a script to this workspace." : "Ask a workspace owner or admin to create one."}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-[13px] text-muted bg-panel">
            <th className="px-4 py-2.5 font-semibold">Name</th>
            <th className="px-4 py-2.5 font-semibold w-[150px]">Access</th>
            <th className="px-4 py-2.5 font-semibold w-[160px]">Created by</th>
            <th className="px-4 py-2.5 font-semibold w-[160px]">Last used</th>
            <th className="px-4 py-2.5 font-semibold w-[120px]">Expires</th>
            <th className="px-4 py-2.5 w-[150px]">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const h = keyHealth(k, now);
            const expired = h.state === "expired";
            const soon = !expired && h.expiresInDays !== null && h.expiresInDays < 7;
            return (
              <tr key={k.id} className={`border-t border-border ${h.stale ? "bg-warning/[0.06]" : ""} ${expired ? "bg-danger/[0.04]" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-fg">{k.label}</span>
                    <span className="font-mono text-[13px] text-subtle">{k.keyPreview}…</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center h-6 px-2 rounded-full text-[13px] font-medium whitespace-nowrap ${
                      k.scopes.includes("write") ? "bg-secondary/15 text-secondary" : "bg-panel text-muted"
                    }`}
                  >
                    {accessLabel(k.scopes)}
                  </span>
                </td>
                <td className="px-4 py-3 text-fg">{k.createdBy ?? <span className="text-subtle">Unknown</span>}</td>
                <td className={`px-4 py-3 ${h.stale ? "text-warning" : "text-muted"}`}>
                  <div className="flex flex-col">
                    <span>{k.lastUsedAt ? relativeTime(k.lastUsedAt, now) : "Never"}</span>
                    {h.stale && (
                      <span className="text-xs" title={`No calls for ${STALE_AFTER_DAYS} days or more. Revoke it if nothing needs it.`}>
                        Unused for {h.idleDays} days
                      </span>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-3 ${expired ? "text-danger" : soon ? "text-warning" : "text-muted"}`}>{expiryLabel(k, now)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {canManage && (
                      <Btn variant={h.stale || expired ? "danger" : "ghost"} onClick={() => onRevoke(k)}>
                        Revoke
                      </Btn>
                    )}
                    <Menu
                      align="right"
                      width={180}
                      label={`More for ${k.label}`}
                      trigger={(p) => (
                        <button
                          type="button"
                          {...p}
                          aria-label={`More for ${k.label}`}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      )}
                    >
                      {(close) => (
                        <>
                          <MenuItem href={`${base}?tab=activity&key=${k.id}`}>View activity</MenuItem>
                          {canManage && (
                            <MenuItem
                              onClick={() => {
                                close();
                                onRename(k);
                              }}
                            >
                              Rename
                            </MenuItem>
                          )}
                          {canManage && !expired && (
                            <MenuItem
                              onClick={() => {
                                close();
                                onRotate(k);
                              }}
                            >
                              Rotate
                            </MenuItem>
                          )}
                        </>
                      )}
                    </Menu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Activity ───────────────────────────────────────────────────────────── */

function activityHref(base: string, p: Partial<AuditPagination>): string {
  const q = new URLSearchParams({ tab: "activity" });
  if (p.keyId) q.set("key", p.keyId);
  if (p.kind && p.kind !== "ALL") q.set("kind", p.kind);
  if (p.errorsOnly) q.set("errorsOnly", "1");
  if (p.page && p.page > 1) q.set("page", String(p.page));
  return `${base}?${q.toString()}`;
}

function ActivityTab({
  keys,
  entries,
  pagination,
  base,
  now,
}: {
  keys: KeyRow[];
  entries: AuditEntry[];
  pagination: AuditPagination;
  base: string;
  now: Date;
}) {
  const router = useRouter();
  const link = (patch: Partial<AuditPagination>) => activityHref(base, { ...pagination, page: 1, ...patch });
  const selectedKey = keys.find((k) => k.id === pagination.keyId) ?? null;
  const first = pagination.totalEntries === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const last = Math.min(pagination.page * pagination.pageSize, pagination.totalEntries);
  const chip = (on: boolean) =>
    `inline-flex items-center h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition ${
      on ? "bg-ink text-ink-fg" : "bg-panel text-fg hover:bg-elevated"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="activity-key" className="text-[13px] text-muted">
          Key
        </label>
        <select
          id="activity-key"
          value={pagination.keyId ?? ""}
          onChange={(e) => router.push(link({ keyId: e.target.value || null }))}
          className="h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-fg focus:outline-none focus:border-secondary/60"
        >
          <option value="">All keys</option>
          {keys.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
              {k.revokedAt ? " (revoked)" : ""}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <Link href={link({ kind: "ALL" })} className={chip(pagination.kind === "ALL")}>
          All calls
        </Link>
        <Link href={link({ kind: "tool" })} className={chip(pagination.kind === "tool")}>
          Tools
        </Link>
        <Link href={link({ kind: "resource" })} className={chip(pagination.kind === "resource")}>
          Resources
        </Link>
        <Link href={link({ errorsOnly: !pagination.errorsOnly })} className={chip(pagination.errorsOnly)} aria-pressed={pagination.errorsOnly}>
          Errors only
        </Link>
      </div>

      {selectedKey && (
        <p className="text-[13px] text-muted">
          Calls made with <span className="font-medium text-fg">{selectedKey.label}</span>. Created{" "}
          {relativeTime(selectedKey.createdAt, now).toLowerCase()}, last used{" "}
          {selectedKey.lastUsedAt ? relativeTime(selectedKey.lastUsedAt, now).toLowerCase() : "never"}.
        </p>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-12 text-center">
          <p className="text-[15px] font-medium text-fg">No calls to show</p>
          <p className="text-[13px] text-muted mt-1">
            {pagination.errorsOnly || pagination.kind !== "ALL" || pagination.keyId
              ? "Try another key or filter."
              : "After you add a key to Claude or Cursor and run a tool, its calls show up here."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[13px] text-muted bg-panel">
                <th className="px-4 py-2.5 font-semibold w-[150px]">When</th>
                <th className="px-4 py-2.5 font-semibold w-[190px]">Key</th>
                <th className="px-4 py-2.5 font-semibold w-[200px]">Call</th>
                <th className="px-4 py-2.5 font-semibold">Result</th>
                <th className="px-4 py-2.5 font-semibold w-[70px] text-right">ms</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 text-muted whitespace-nowrap" title={new Date(e.createdAt).toISOString()}>
                    {relativeTime(e.createdAt, now)}
                  </td>
                  <td className="px-4 py-2.5 text-fg">{e.keyLabel ?? <span className="text-subtle">Deleted key</span>}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[13px] text-fg">{e.name}</span>
                    {e.kind === "resource" && <span className="ml-1.5 text-xs text-subtle">resource</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {e.errorCode ? (
                      <span className="text-danger inline-flex items-start gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                        {e.resultSummary || e.errorCode}
                      </span>
                    ) : (
                      e.resultSummary || "Done"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-subtle">{e.durationMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalEntries > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <span>
            Showing {first} to {last} of {pagination.totalEntries.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Btn
              href={pagination.page > 1 ? activityHref(base, { ...pagination, page: pagination.page - 1 }) : undefined}
              disabled={pagination.page <= 1}
            >
              Previous
            </Btn>
            <Btn
              href={pagination.page < pagination.totalPages ? activityHref(base, { ...pagination, page: pagination.page + 1 }) : undefined}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Connect ────────────────────────────────────────────────────────────── */

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "interviewpad"
  );
}

function snippets(url: string, workspaceName: string, key: string) {
  const name = slugify(workspaceName);
  return {
    claude: JSON.stringify(
      { mcpServers: { [name]: { command: "npx", args: ["-y", "mcp-remote", url, "--header", `Authorization:Bearer ${key}`] } } },
      null,
      2,
    ),
    cursor: JSON.stringify({ mcpServers: { [name]: { url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2),
    curl: [
      `curl -X POST '${url}' \\`,
      `  -H 'Authorization: Bearer ${key}' \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H 'Accept: application/json, text/event-stream' \\`,
      `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`,
    ].join("\n"),
  };
}

function ConnectCard({ mcpUrl, workspaceName, base }: { mcpUrl: string; workspaceName: string; base: string }) {
  const s = snippets(mcpUrl, workspaceName, "ip_live_...");
  return (
    <section className="rounded-xl border border-border bg-ink text-ink-fg p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium opacity-70">Connect Cursor or any MCP client</h2>
        <Link href={`${base}?tab=connect`} className="text-[13px] underline underline-offset-2 opacity-80 hover:opacity-100">
          More clients
        </Link>
      </div>
      <pre className="m-0 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all">{s.cursor}</pre>
    </section>
  );
}

function ConnectTab({ mcpUrl, workspaceName }: { mcpUrl: string; workspaceName: string }) {
  const s = snippets(mcpUrl, workspaceName, "ip_live_YOUR_KEY");
  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`Copied the ${what}.`);
  };
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <p className="text-sm text-muted">
        Replace <span className="font-mono text-fg">ip_live_YOUR_KEY</span> with a key from the Keys tab. The full key is only shown once, when it is
        created. The server address is <span className="font-mono text-fg break-all">{mcpUrl}</span>.
      </p>
      <SnippetBlock
        title="Claude desktop"
        subtitle="Add this to claude_desktop_config.json, then restart Claude desktop."
        code={s.claude}
        onCopy={() => copy(s.claude, "Claude desktop config")}
      />
      <SnippetBlock
        title="Cursor, Goose and other clients that take a URL"
        subtitle="For clients that speak the MCP Streamable HTTP transport directly."
        code={s.cursor}
        onCopy={() => copy(s.cursor, "config")}
      />
      <SnippetBlock
        title="curl"
        subtitle="Lists the available tools, a quick way to check that a key works."
        code={s.curl}
        onCopy={() => copy(s.curl, "curl command")}
      />
      <p className="text-[13px] text-muted">
        Write tools can move a candidate between New, Screening and Not passed, add notes and send screenings. They never pass anyone: passing is a
        recruiter decision made in the app.
      </p>
    </div>
  );
}

function SnippetBlock({ title, subtitle, code, onCopy }: { title: string; subtitle: string; code: string; onCopy: () => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-fg flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-muted" aria-hidden /> {title}
          </div>
          <div className="text-xs text-muted mt-0.5">{subtitle}</div>
        </div>
        <Btn icon={Copy} onClick={onCopy}>
          Copy
        </Btn>
      </div>
      <pre className="text-xs font-mono text-fg bg-bg p-3 rounded-xl border border-border overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

/* ── Dialogs ────────────────────────────────────────────────────────────── */

function CreateKeyDialog({
  workspaceSlug,
  onClose,
  onCreated,
}: {
  workspaceSlug: string;
  onClose: () => void;
  onCreated: (r: Revealed) => void;
}) {
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"read" | "read-write">("read");
  const [expiry, setExpiry] = useState<number>(DEFAULT_EXPIRY_DAYS);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!label.trim()) return;
    start(async () => {
      try {
        const res = await createMcpApiKeyAction(workspaceSlug, label, scope, expiry);
        onCreated({ plaintext: res.plaintext, label: res.label, scopes: res.scopes });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create the key.");
      }
    });
  };

  return (
    <Dialog
      title="Create key"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={pending || !label.trim()}>
            {pending ? "Creating…" : "Create key"}
          </Btn>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Name" hint="Who uses it and where, such as Priya, Claude desktop.">
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} className={inputCls} placeholder="Priya, Claude desktop" />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium text-subtle mb-1.5">Access</legend>
          {(
            [
              ["read", "Read only", "List candidates and screenings, read results and transcripts."],
              ["read-write", "Read and write", "Also add notes, move candidates between New, Screening and Not passed, and send screenings. Never passes anyone."],
            ] as const
          ).map(([value, title, desc]) => (
            <label
              key={value}
              className={`flex gap-3 rounded-xl border p-3 cursor-pointer transition ${
                scope === value ? "border-secondary/60 bg-secondary/[0.06]" : "border-border hover:bg-panel"
              }`}
            >
              <input type="radio" name="scope" value={value} checked={scope === value} onChange={() => setScope(value)} className="mt-1 accent-secondary" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-fg">{title}</span>
                <span className="text-[13px] text-muted">{desc}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Field label="Expires" hint="After this the key stops working. You can create a new one at any time.">
          <select value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} className={inputCls}>
            {EXPIRY_CHOICES.map((c) => (
              <option key={c.days} value={c.days}>
                {c.days === 0 ? "Never" : `In ${c.label}`}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-[13px] text-muted">The full key is shown once. We only keep a hash, so copy it before you close the next window.</p>
      </form>
    </Dialog>
  );
}

function RenameDialog({ workspaceSlug, k, onClose, onDone }: { workspaceSlug: string; k: KeyRow; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(k.label);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      try {
        await renameMcpApiKeyAction(workspaceSlug, k.id, name);
        toast.success("Key renamed.");
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not rename the key.");
      }
    });
  return (
    <Dialog
      title="Rename key"
      onClose={onClose}
      width={440}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save"}
          </Btn>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Name" hint="The key itself does not change, so nothing needs updating.">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputCls} />
        </Field>
      </form>
    </Dialog>
  );
}

function KeyRevealModal({
  plaintext,
  label,
  scopes,
  workspaceName,
  url,
  onClose,
}: {
  plaintext: string;
  label: string;
  scopes: string[];
  workspaceName: string;
  url: string;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const s = snippets(url, workspaceName, plaintext);
  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`Copied the ${what}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[6vh] overflow-y-auto">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-reveal-title"
        className="relative w-full max-w-2xl rounded-2xl border border-border-strong bg-surface shadow-2xl shadow-black/40 p-6 flex flex-col gap-5"
      >
        <h2 id="key-reveal-title" className="text-lg font-semibold text-fg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" aria-hidden /> Copy your new key
        </h2>
        <p className="rounded-xl border border-danger/30 bg-danger/[0.06] p-3 text-[13px] text-danger">
          This is the only time the full key is shown. We keep only a hash, so if you lose it, revoke it and create another.
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="font-medium text-fg">{label}</span>
            <span className="text-muted">{accessLabel(scopes)}</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-bg font-mono text-[13px] break-all">
            <span className="flex-1 text-fg select-all">{plaintext}</span>
            <Btn variant="primary" icon={Copy} onClick={() => copy(plaintext, "key")}>
              Copy
            </Btn>
          </div>
        </div>
        <SnippetBlock
          title="Claude desktop"
          subtitle="Add this to claude_desktop_config.json, then restart Claude desktop."
          code={s.claude}
          onCopy={() => copy(s.claude, "Claude desktop config")}
        />
        <SnippetBlock
          title="Cursor, Goose and other clients that take a URL"
          subtitle="For clients that speak the MCP Streamable HTTP transport directly."
          code={s.cursor}
          onCopy={() => copy(s.cursor, "config")}
        />
        <label className="flex items-start gap-2 text-[13px] text-muted cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 accent-secondary" />
          <span>I have copied the key and stored it somewhere safe.</span>
        </label>
        <div className="flex justify-end">
          <Btn variant="primary" size="md" disabled={!confirmed} onClick={onClose}>
            Done
          </Btn>
        </div>
      </div>
    </div>
  );
}
