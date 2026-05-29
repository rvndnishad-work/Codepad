"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Megaphone,
  Users,
  UserCheck,
  Briefcase,
  Building2,
  User as UserIcon,
  Send,
  Loader2,
  Repeat,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  AUDIENCE_TYPES,
  type AudienceType,
  type SentBroadcastRow,
} from "@/lib/notifications/broadcast-types";
import {
  dispatchBroadcastAction,
  listBroadcastsAction,
  previewAudienceCountAction,
  resendBroadcastAction,
} from "@/lib/notifications/broadcast";

const AUDIENCE_LABELS: Record<AudienceType, { label: string; Icon: typeof Users; needsTarget: "USER_ID" | "WORKSPACE_ID" | null }> = {
  ALL: { label: "All users", Icon: Users, needsTarget: null },
  ALL_CANDIDATES: { label: "All candidates", Icon: UserCheck, needsTarget: null },
  ALL_RECRUITERS: { label: "All recruiters", Icon: Briefcase, needsTarget: null },
  WORKSPACE: { label: "Single workspace", Icon: Building2, needsTarget: "WORKSPACE_ID" },
  USER: { label: "Single user (by id or email)", Icon: UserIcon, needsTarget: "USER_ID" },
};

type Workspace = { id: string; label: string };

type Props = {
  initialSent: SentBroadcastRow[];
  workspaces: Workspace[];
};

export default function AdminBroadcastConsole({ initialSent, workspaces }: Props) {
  const [tab, setTab] = useState<"compose" | "sent">("compose");
  const [sent, setSent] = useState(initialSent);

  const [audienceType, setAudienceType] = useState<AudienceType>("ALL_RECRUITERS");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [userIdOrEmail, setUserIdOrEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [sending, startSending] = useTransition();
  const [resending, setResending] = useState<string | null>(null);

  const needsTarget = AUDIENCE_LABELS[audienceType].needsTarget;

  // Recompute the audience preview whenever the audience selector changes.
  // Debounce text inputs slightly so a recruiter typing an email isn't
  // re-resolved on every keystroke.
  useEffect(() => {
    let cancelled = false;
    const resolveTarget = (): string | null => {
      if (!needsTarget) return null;
      if (needsTarget === "WORKSPACE_ID") return workspaceId || null;
      if (needsTarget === "USER_ID") return userIdOrEmail.trim() || null;
      return null;
    };
    const target = resolveTarget();
    if (needsTarget && !target) {
      setPreviewCount(null);
      return;
    }
    setPreviewLoading(true);
    const handle = setTimeout(async () => {
      try {
        const count = await previewAudienceCountAction(audienceType, target);
        if (!cancelled) setPreviewCount(count);
      } catch {
        if (!cancelled) setPreviewCount(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [audienceType, workspaceId, userIdOrEmail, needsTarget]);

  function resetForm() {
    setTitle("");
    setBody("");
    setHref("");
    setUserIdOrEmail("");
    setWorkspaceId("");
  }

  function onSend() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    startSending(async () => {
      try {
        const result = await dispatchBroadcastAction({
          audienceType,
          audienceTarget:
            needsTarget === "WORKSPACE_ID"
              ? workspaceId
              : needsTarget === "USER_ID"
                ? userIdOrEmail.trim()
                : null,
          title: title.trim(),
          body: body.trim() || undefined,
          href: href.trim() || undefined,
        });
        toast.success(
          `Broadcast sent to ${result.recipientCount} ${result.recipientCount === 1 ? "user" : "users"}.`,
        );
        resetForm();
        // Refresh sent log and switch to it so the admin sees the result.
        const fresh = await listBroadcastsAction(50);
        setSent(fresh);
        setTab("sent");
      } catch (err) {
        toast.error((err as Error).message ?? "Dispatch failed.");
      }
    });
  }

  async function onResend(id: string) {
    setResending(id);
    try {
      const result = await resendBroadcastAction(id);
      toast.success(`Resent to ${result.recipientCount} ${result.recipientCount === 1 ? "user" : "users"}.`);
      const fresh = await listBroadcastsAction(50);
      setSent(fresh);
    } catch (err) {
      toast.error((err as Error).message ?? "Resend failed.");
    } finally {
      setResending(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70">
          <Megaphone className="w-3.5 h-3.5" />
          Internal · Broadcast notifications
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted leading-relaxed max-w-2xl">
          Compose a system message and dispatch it to an audience. Lands in the
          recipient's bell within the next poll (≤30s). Use for maintenance
          windows, policy updates, beta-program invites, and support follow-ups.
        </p>
      </header>

      <div className="flex items-center gap-2 border-b border-border">
        {(["compose", "sent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
              tab === t
                ? "border-fg text-fg"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t === "compose" ? "Compose" : `Sent log (${sent.length})`}
          </button>
        ))}
      </div>

      {tab === "compose" ? (
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Compose form */}
          <div className="space-y-5 rounded-xl border border-border bg-surface/60 p-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 block">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Maintenance window — Sunday 2 AM PT"
                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-fg focus:outline-none focus:border-fg"
              />
              <p className="text-[10px] text-muted/70">{title.length} / 200</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 block">
                Body (optional)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Brief details. Markdown is not rendered — keep it plain."
                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-fg focus:outline-none focus:border-fg resize-y"
              />
              <p className="text-[10px] text-muted/70">{body.length} / 1000</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 block">
                Link (optional)
              </label>
              <input
                type="text"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="/some/path or https://…"
                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm font-mono text-fg/90 focus:outline-none focus:border-fg"
              />
            </div>
          </div>

          {/* Audience picker + preview */}
          <aside className="space-y-4 rounded-xl border border-border bg-surface/60 p-5 h-fit">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 mb-2">
                Audience
              </div>
              <div className="space-y-1.5">
                {AUDIENCE_TYPES.map((t) => {
                  const meta = AUDIENCE_LABELS[t];
                  const active = audienceType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAudienceType(t)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold border transition text-left ${
                        active
                          ? "border-fg bg-panel/60 text-fg"
                          : "border-border text-muted hover:text-fg hover:bg-panel/30"
                      }`}
                    >
                      <meta.Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {needsTarget === "WORKSPACE_ID" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 block">
                  Workspace
                </label>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-md text-xs text-fg focus:outline-none focus:border-fg"
                >
                  <option value="">Pick a workspace…</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {needsTarget === "USER_ID" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 block">
                  User id
                </label>
                <input
                  type="text"
                  value={userIdOrEmail}
                  onChange={(e) => setUserIdOrEmail(e.target.value)}
                  placeholder="cmpjk2htm00007br3qnr6u1mp"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-md text-xs font-mono text-fg focus:outline-none focus:border-fg"
                />
                <p className="text-[10px] text-muted/70">
                  Paste the User.id — email lookup ships in a follow-up.
                </p>
              </div>
            )}

            {/* Preview count */}
            <div className="rounded-lg border border-border bg-bg/40 px-3 py-2.5 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">
                Will reach
              </div>
              {previewLoading ? (
                <div className="text-sm text-muted/80 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Resolving…
                </div>
              ) : previewCount === null ? (
                <div className="text-sm text-muted/80">
                  Pick a target to preview the audience size.
                </div>
              ) : (
                <div className="text-base text-fg font-semibold">
                  {previewCount} {previewCount === 1 ? "user" : "users"}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onSend}
              disabled={sending || !title.trim() || previewCount === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-fg text-bg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send now
            </button>
            <p className="text-[10px] text-muted/70 leading-relaxed">
              Rate-limited to 1 broadcast / 10s per admin. Sends fan-out in
              chunks of 500 — large audiences may take a few seconds.
            </p>
          </aside>
        </section>
      ) : (
        <section className="space-y-3">
          {sent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg/30 p-8 text-center text-sm text-muted">
              No broadcasts yet. Compose your first one in the other tab.
            </div>
          ) : (
            <ul className="space-y-3">
              {sent.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-border bg-surface/60 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-muted">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/[0.08] border border-sky-500/30 text-sky-300 font-semibold">
                          <Megaphone className="w-2.5 h-2.5" />
                          {row.audienceLabel}
                        </span>
                        <span className="text-muted/70">
                          {row.recipientCount} recipient{row.recipientCount === 1 ? "" : "s"}
                        </span>
                        <span className="text-muted/50">·</span>
                        <span className="font-mono">
                          {row.sentAt
                            ? new Date(row.sentAt).toLocaleString()
                            : "in progress…"}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-fg mt-1">
                        {row.title}
                      </div>
                      {row.body && (
                        <div className="text-[12px] text-muted/90 mt-1 line-clamp-2">
                          {row.body}
                        </div>
                      )}
                      {row.href && (
                        <a
                          href={row.href}
                          className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline mt-1 font-mono"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.href}
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onResend(row.id)}
                        disabled={resending === row.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel disabled:opacity-50"
                      >
                        {resending === row.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Repeat className="w-3 h-3" />
                        )}
                        Resend
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted/70 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      created {new Date(row.createdAt).toLocaleString()}
                    </span>
                    {row.sentAt && (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        delivered
                      </span>
                    )}
                    {row.composedByEmail && (
                      <span className="text-muted/60">by {row.composedByEmail}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
