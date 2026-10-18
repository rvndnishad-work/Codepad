"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { ALERT_EVENTS, PROVIDER_LABEL, formatAlert, type AlertProvider } from "@/lib/alerts/format";
import type { WorkspaceEvent } from "@/lib/events/catalog";
import {
  connectWebhookChannelAction,
  removeAlertChannelAction,
  sendAlertTestAction,
  updateAlertChannelAction,
} from "./actions";

export type ChannelView = {
  id: string;
  provider: AlertProvider;
  mode: "oauth" | "webhook";
  target: string;
  teamName: string | null;
  urlHint: string;
  events: string[];
  includeScore: boolean;
  active: boolean;
  lastSentAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
};

type Props = {
  slug: string;
  workspaceName: string;
  origin: string;
  canManage: boolean;
  slackAppReady: boolean;
  channels: ChannelView[];
  selectedId: string | null;
  flashError: string | null;
  justConnected: boolean;
};

const btn =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel transition disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition disabled:opacity-50";
const input =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-secondary";

/** Sample data for the preview. Nothing here comes from a real candidate. */
const SAMPLE: Record<WorkspaceEvent, Record<string, unknown>> = {
  "takehome.submitted": { candidate: { name: "Ana Lima" }, takeHome: { title: "Checkout form", score: 78 } },
  "screening.completed": { candidate: { name: "Ana Lima" }, screening: { positionTitle: "Senior Frontend Engineer", score: 82 } },
  "interview.completed": { candidate: { name: "Ana Lima" }, interview: { title: "Frontend pairing" } },
  "invite.bounced": { email: { recipient: "ana.lima@example.com" } },
  "candidate.decided": { candidate: { name: "Ana Lima" }, decision: "passed" },
  "round.waiting": { candidate: { name: "Ana Lima" }, waiting: "next_step", round: { name: "Coding round", kind: "interview" }, result: "above bar" },
};

function relative(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function channelLabel(c: ChannelView): string {
  return `${c.target} (${PROVIDER_LABEL[c.provider]})`;
}

export default function AlertsClient(props: Props) {
  const { slug, workspaceName, origin, canManage, slackAppReady, channels, selectedId, flashError, justConnected } = props;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(channels.length === 0);
  const selected = channels.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (flashError) toast.error(flashError);
    else if (justConnected) toast.success("Slack channel connected.");
    if (flashError || justConnected) {
      router.replace(`/w/${slug}/alerts${selectedId ? `?channel=${selectedId}` : ""}`, { scroll: false });
    }
    // Only on first load with the flash params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => startTransition(() => router.refresh());

  async function act<T>(key: string, fn: () => Promise<({ ok: true } & T) | { ok: false; error: string }>, onOk?: (r: T) => void) {
    setBusy(key);
    try {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onOk?.(r);
      refresh();
    } finally {
      setBusy(null);
    }
  }

  const providerName = selected ? PROVIDER_LABEL[selected.provider] : "Slack";
  const previewEvent: WorkspaceEvent =
    (selected && ALERT_EVENTS.find((r) => r.event === "screening.completed" && selected.events.includes(r.event))?.event) ??
    (selected && ALERT_EVENTS.find((r) => selected.events.includes(r.event))?.event) ??
    "screening.completed";
  const preview = useMemo(
    () =>
      formatAlert(
        { event: previewEvent, workspace: { slug, name: workspaceName }, data: { ...SAMPLE[previewEvent], reportUrl: `${origin}/w/${slug}` } },
        { origin, includeScore: selected?.includeScore ?? false },
      ),
    [previewEvent, slug, workspaceName, origin, selected?.includeScore],
  );

  const toggleEvent = (c: ChannelView, ev: WorkspaceEvent, on: boolean) => {
    const next = on ? [...c.events, ev] : c.events.filter((e) => e !== ev);
    act(`ev:${ev}`, () => updateAlertChannelAction(slug, c.id, { events: next }));
  };

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
        <span>Connections</span>
        <span aria-hidden>/</span>
        <span className="text-fg font-medium">Slack and Teams</span>
      </nav>

      <div className="flex flex-col xl:flex-row gap-7 min-w-0">
        <section className="flex-1 min-w-0 flex flex-col gap-[18px]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
                {selected ? `What should ${providerName} tell you?` : "Slack and Teams alerts"}
              </h1>
              <p className="text-sm text-muted max-w-[620px]">
                Messages carry a name, what finished and a link. Answers, transcripts and code stay in Codepad.
              </p>
            </div>
            {channels.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="alert-channel" className="text-[13px] text-muted">
                  Channel
                </label>
                <select
                  id="alert-channel"
                  value={selected?.id ?? ""}
                  onChange={(e) => router.push(`/w/${slug}/alerts?channel=${e.target.value}`, { scroll: false })}
                  className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm text-fg max-w-[260px]"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {channelLabel(c)}
                    </option>
                  ))}
                </select>
                {canManage && selected && (
                  <button
                    type="button"
                    className={btn}
                    disabled={busy === "test"}
                    onClick={() =>
                      act("test", () => sendAlertTestAction(slug, selected.id), (r: { sent: boolean; error: string | null }) =>
                        r.sent ? toast.success(`Test sent to ${selected.target}.`) : toast.error(`Test failed: ${r.error ?? "no response"}`),
                      )
                    }
                  >
                    {busy === "test" && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send a test
                  </button>
                )}
              </div>
            )}
          </div>

          {!canManage && (
            <p className="text-[13px] text-muted rounded-lg border border-border bg-panel px-3 py-2">
              You can see these settings. Only owners and admins can change them.
            </p>
          )}

          {selected && (
            <>
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-panel">
                      <th className="text-left text-[12.5px] font-semibold text-muted px-3.5 py-2.5">When</th>
                      <th className="text-center text-[12.5px] font-semibold text-muted px-3.5 py-2.5 w-[150px]">Post in channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALERT_EVENTS.map((row) => {
                      const on = selected.events.includes(row.event);
                      return (
                        <tr key={row.event} className="border-t border-border">
                          <td className="px-3.5 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-fg">{row.label}</span>
                              <span className="text-[13px] text-muted">{row.hint}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <input
                              type="checkbox"
                              className="w-[18px] h-[18px] accent-secondary"
                              checked={on}
                              disabled={!canManage || busy !== null}
                              aria-label={`Post in ${selected.target}: ${row.label}`}
                              onChange={(e) => toggleEvent(selected, row.event, e.target.checked)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <label className="flex items-start gap-2.5 text-sm text-fg">
                <input
                  type="checkbox"
                  className="mt-0.5 w-[18px] h-[18px] accent-secondary"
                  checked={selected.includeScore}
                  disabled={!canManage || busy !== null}
                  onChange={(e) => act("score", () => updateAlertChannelAction(slug, selected.id, { includeScore: e.target.checked }))}
                />
                <span className="flex flex-col">
                  <span className="font-medium">Add the score as a percentage</span>
                  <span className="text-[13px] text-muted">For AI screenings and take homes only. Off by default.</span>
                </span>
              </label>

              <div className="rounded-xl border border-border bg-surface px-4 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-medium text-fg">
                    {selected.target}
                    {selected.teamName ? <span className="text-muted font-normal"> in {selected.teamName}</span> : null}
                  </span>
                  <span className="text-[13px] text-muted">
                    {PROVIDER_LABEL[selected.provider]}, {selected.mode === "oauth" ? "Slack app install" : "incoming webhook"},{" "}
                    <span className="font-mono">{selected.urlHint}</span>
                  </span>
                  <StatusLine c={selected} />
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className={btn}
                      disabled={busy !== null}
                      onClick={() => act("pause", () => updateAlertChannelAction(slug, selected.id, { active: !selected.active }))}
                    >
                      {selected.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      className={`${btn} text-danger`}
                      disabled={busy !== null}
                      onClick={() => {
                        if (!window.confirm(`Stop posting to ${selected.target}? You can connect it again later.`)) return;
                        act("remove", () => removeAlertChannelAction(slug, selected.id), () => {
                          toast.success("Channel removed.");
                          router.push(`/w/${slug}/alerts`, { scroll: false });
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {canManage &&
            (adding ? (
              <AddChannel
                slug={slug}
                slackAppReady={slackAppReady}
                busy={busy === "add"}
                canCancel={channels.length > 0}
                onCancel={() => setAdding(false)}
                onSubmit={(provider, url, target) =>
                  act("add", () => connectWebhookChannelAction(slug, { provider, url, target }), (r: { id: string }) => {
                    toast.success(`${PROVIDER_LABEL[provider]} channel connected. Send a test to check it.`);
                    setAdding(false);
                    router.push(`/w/${slug}/alerts?channel=${r.id}`, { scroll: false });
                  })
                }
              />
            ) : (
              <div>
                <button type="button" className={btn} onClick={() => setAdding(true)}>
                  Add a channel
                </button>
              </div>
            ))}

          {!canManage && channels.length === 0 && (
            <p className="text-sm text-muted">No channels are connected yet. Ask a workspace owner or admin to add one.</p>
          )}
        </section>

        <aside className="xl:w-[360px] shrink-0 flex flex-col gap-3">
          <span className="text-[13px] font-semibold text-muted">
            Preview{selected ? ` in ${selected.target}` : ""}
          </span>
          <div className="rounded-xl border border-border bg-surface p-4 flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary text-bg font-bold flex items-center justify-center shrink-0">C</div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex gap-2 items-baseline">
                <span className="font-bold text-sm text-fg">Codepad</span>
                <span className="text-xs text-muted">10:04</span>
              </div>
              <span className="text-sm leading-relaxed text-fg">{preview.text}</span>
              {preview.linkLabel && (
                <div className="flex gap-2">
                  <span className="inline-flex items-center h-[30px] px-2.5 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg">
                    {preview.linkLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
          <span className="text-[13px] text-muted leading-relaxed">
            Microsoft Teams uses the same settings, with an adaptive card in place of the Slack message.
          </span>
        </aside>
      </div>
    </div>
  );
}

function StatusLine({ c }: { c: ChannelView }) {
  if (!c.active) return <span className="text-[13px] text-muted">Paused. Nothing is posted until you resume it.</span>;
  const errorIsLatest = c.lastErrorAt && (!c.lastSentAt || c.lastErrorAt > c.lastSentAt);
  if (errorIsLatest && c.lastError) {
    return (
      <span className="text-[13px] text-danger">
        Last post failed {relative(c.lastErrorAt!)}: {c.lastError}
      </span>
    );
  }
  if (c.lastSentAt) return <span className="text-[13px] text-muted">Last posted {relative(c.lastSentAt)}</span>;
  return <span className="text-[13px] text-muted">Nothing posted yet</span>;
}

function AddChannel({
  slug,
  slackAppReady,
  busy,
  canCancel,
  onCancel,
  onSubmit,
}: {
  slug: string;
  slackAppReady: boolean;
  busy: boolean;
  canCancel: boolean;
  onCancel: () => void;
  onSubmit: (provider: AlertProvider, url: string, target: string) => void;
}) {
  const [provider, setProvider] = useState<AlertProvider>("slack");
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState("");

  return (
    <form
      className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(provider, url, target);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">Connect a channel</h2>
        <div role="tablist" aria-label="Service" className="inline-flex rounded-lg border border-border bg-panel p-0.5">
          {(["slack", "teams"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={provider === p}
              onClick={() => setProvider(p)}
              className={`h-8 px-3 rounded-md text-[13px] font-medium transition ${
                provider === p ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              {PROVIDER_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {provider === "slack" && (
        <div className="flex flex-col gap-2">
          {slackAppReady ? (
            <>
              <div>
                <a href={`/api/integrations/slack/install?slug=${encodeURIComponent(slug)}`} className={btnPrimary}>
                  Add to Slack
                </a>
              </div>
              <span className="text-[13px] text-muted">Slack asks you to pick a channel, then sends you back here.</span>
              <span className="text-[13px] text-muted pt-1">Or paste an incoming webhook URL instead:</span>
            </>
          ) : (
            <span className="text-[13px] text-muted">
              The Slack app is not set up on this server yet, so paste an incoming webhook URL. In Slack, create an app,
              turn on Incoming Webhooks and add one for your channel.
            </span>
          )}
        </div>
      )}
      {provider === "teams" && (
        <span className="text-[13px] text-muted">
          In Teams, open the channel, choose Workflows, and pick &quot;Post to a channel when a webhook request is
          received&quot;. Paste the URL it gives you. An older incoming webhook URL also works.
        </span>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg">Webhook URL</span>
          <input
            className={`${input} font-mono text-[13px]`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={provider === "slack" ? "https://hooks.slack.com/services/..." : "https://...logic.azure.com/workflows/..."}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg">Channel name</span>
          <input
            className={input}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={provider === "slack" ? "#hiring-screens" : "Hiring / Screens"}
            maxLength={80}
          />
        </label>
      </div>
      <span className="text-[13px] text-muted">We keep the URL encrypted and never show it in full again.</span>

      <div className="flex items-center gap-2">
        <button type="submit" className={btnPrimary} disabled={busy || !url.trim()}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Connect
        </button>
        {canCancel && (
          <button type="button" className={btn} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
