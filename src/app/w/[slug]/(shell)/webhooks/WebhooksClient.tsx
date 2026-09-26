"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Eye, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { EVENT_DESCRIPTIONS, TEST_EVENT, WORKSPACE_EVENTS, describeEventList } from "@/lib/events/catalog";
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  redeliverWebhookAction,
  revealWebhookSecretAction,
  rotateWebhookSecretAction,
  sendWebhookTestAction,
  setWebhookPausedAction,
  updateWebhookEndpointAction,
  type SendResult,
} from "./actions";

export type EndpointView = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  pausedAt: string | null;
  pausedReason: string | null;
  failureCount: number;
  createdAt: string;
  deliveredThisWeek: number;
  firstTryThisWeek: number;
  hasDeliveries: boolean;
};

export type DeliveryView = {
  id: string;
  event: string;
  eventId: string;
  status: string;
  attempts: number;
  responseCode: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  summary: string;
  payload: string;
};

type Props = {
  slug: string;
  canManage: boolean;
  endpoints: EndpointView[];
  selectedId: string | null;
  deliveries: DeliveryView[];
  maxAttempts: number;
  autoPauseAfter: number;
};

type Tone = "positive" | "negative" | "attention" | "neutral";

const CHIP: Record<Tone, string> = {
  positive: "bg-success/10 text-success",
  negative: "bg-danger/10 text-danger",
  attention: "bg-warning/10 text-warning",
  neutral: "bg-panel text-muted",
};

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center h-[22px] px-2 rounded-full text-xs font-medium whitespace-nowrap ${CHIP[tone]}`}>
      {children}
    </span>
  );
}

const btn =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel transition disabled:opacity-50 disabled:cursor-not-allowed";
const btnSm =
  "inline-flex items-center justify-center gap-1 h-[30px] px-2.5 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel transition disabled:opacity-50";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition disabled:opacity-50";

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function health(e: EndpointView): { tone: Tone; label: string } {
  if (!e.active) return { tone: e.pausedReason === "failures" ? "negative" : "neutral", label: "Paused" };
  if (e.failureCount > 0) return { tone: "negative", label: "Failing" };
  if (!e.hasDeliveries) return { tone: "neutral", label: "New" };
  return { tone: "positive", label: "Healthy" };
}

function statusLine(e: EndpointView, autoPauseAfter: number): { text: string; danger: boolean } {
  if (!e.active) {
    return e.pausedReason === "failures"
      ? { text: `Paused after ${autoPauseAfter} failed tries in a row.`, danger: true }
      : { text: "Paused. Nothing is sent until you resume it.", danger: false };
  }
  if (e.failureCount > 0) {
    return {
      text: `${e.failureCount} failed in a row. We pause it after ${autoPauseAfter}.`,
      danger: true,
    };
  }
  if (!e.deliveredThisWeek) return { text: e.hasDeliveries ? "Nothing delivered this week" : "Nothing sent yet", danger: false };
  const pct = Math.round((e.firstTryThisWeek / e.deliveredThisWeek) * 1000) / 10;
  return { text: `${e.deliveredThisWeek} delivered this week, ${pct}% on the first try`, danger: false };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function responseChip(d: DeliveryView): { tone: Tone; label: string } {
  if (d.status === "succeeded") return { tone: "positive", label: String(d.responseCode ?? "OK") };
  if (d.status === "sending") return { tone: "neutral", label: "Sending" };
  if (d.status === "pending" && d.attempts === 0) return { tone: "neutral", label: "Queued" };
  const label = d.responseCode ? String(d.responseCode) : "No response";
  return { tone: d.status === "failed" ? "negative" : "attention", label };
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy. Select the text and copy it yourself.");
  }
}

export default function WebhooksClient({ slug, canManage, endpoints, selectedId, deliveries, maxAttempts, autoPauseAfter }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<"new" | "edit" | null>(endpoints.length === 0 && canManage ? "new" : null);
  const [secret, setSecret] = useState<{ endpointId: string; value: string; fresh: boolean } | null>(null);
  const [openDelivery, setOpenDelivery] = useState<string | null>(deliveries[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const selected = endpoints.find((e) => e.id === selectedId) ?? null;
  // Falls back to the newest row after switching endpoints.
  const shownDelivery = deliveries.find((d) => d.id === openDelivery) ?? deliveries[0] ?? null;

  const refresh = () => startTransition(() => router.refresh());

  async function act<T>(key: string, fn: () => Promise<{ ok: true } & T | { ok: false; error: string }>, onOk?: (r: T) => void) {
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

  const reportSend = (r: SendResult, what: string) => {
    if (r.ok) toast.success(`${what} delivered (${r.responseCode}).`);
    else toast.error(`${what} failed: ${r.error ?? "no response"}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
        <span>Connections</span>
        <span aria-hidden>/</span>
        <span className="text-fg font-medium">Webhooks</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6 min-w-0">
        {/* Endpoint list */}
        <section className="lg:w-[380px] shrink-0 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">Webhooks</h1>
            {canManage && (
              <button type="button" className={btnPrimary} onClick={() => setEditing("new")}>
                Add endpoint
              </button>
            )}
          </div>
          <p className="text-sm text-muted">
            We send a signed POST when something happens. Use it for an ATS we do not support yet, Zapier, or your own
            tools.
          </p>

          {!canManage && (
            <p className="text-[13px] text-muted rounded-lg border border-border bg-panel px-3 py-2">
              You can see the endpoints and deliveries. Only owners and admins can change them.
            </p>
          )}

          {endpoints.map((e) => {
            const h = health(e);
            const line = statusLine(e, autoPauseAfter);
            const isSel = e.id === selectedId;
            return (
              <Link
                key={e.id}
                href={`/w/${slug}/webhooks?endpoint=${e.id}`}
                scroll={false}
                aria-current={isSel ? "true" : undefined}
                className={`rounded-xl border bg-surface px-4 py-3.5 flex flex-col gap-2 transition hover:bg-panel/50 ${
                  isSel ? "border-secondary" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="font-mono text-[13px] text-fg truncate">{shortUrl(e.url)}</span>
                  <Chip tone={h.tone}>{h.label}</Chip>
                </div>
                <span className="text-[13px] text-muted">{describeEventList(e.events)}</span>
                <span className={`text-[13px] ${line.danger ? "text-danger" : "text-muted"}`}>{line.text}</span>
              </Link>
            );
          })}

          <div className="rounded-xl border border-dashed border-border px-4 py-3.5 flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Events you can send</span>
            {WORKSPACE_EVENTS.map((ev) => (
              <span key={ev} className="font-mono text-[13px] text-fg" title={EVENT_DESCRIPTIONS[ev]}>
                {ev}
              </span>
            ))}
          </div>
        </section>

        {/* Detail */}
        <section className="flex-1 min-w-0 flex flex-col gap-3.5">
          {editing && canManage && (
            <EndpointForm
              key={editing === "edit" ? selected?.id : "new"}
              mode={editing}
              initial={editing === "edit" ? selected : null}
              busy={busy === "save"}
              onCancel={() => setEditing(null)}
              onSubmit={(url, events) =>
                editing === "edit" && selected
                  ? act("save", () => updateWebhookEndpointAction(slug, selected.id, { url, events }), () => {
                      toast.success("Endpoint saved.");
                      setEditing(null);
                    })
                  : act("save", () => createWebhookEndpointAction(slug, { url, events }), (r: { id: string; secret: string }) => {
                      toast.success("Endpoint added.");
                      setEditing(null);
                      setSecret({ endpointId: r.id, value: r.secret, fresh: true });
                      router.push(`/w/${slug}/webhooks?endpoint=${r.id}`, { scroll: false });
                    })
              }
            />
          )}

          {!selected && !editing && (
            <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center text-sm text-muted">
              No endpoints yet.{canManage ? " Add one to start receiving events." : ""}
            </div>
          )}

          {selected && (
            <>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <h2 className="text-lg font-semibold text-fg break-all">{shortUrl(selected.url)}</h2>
                  <span className="text-[13px] text-muted">
                    Each request carries an X-Codepad-Signature header signed with this endpoint secret.
                  </span>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      className={btn}
                      disabled={!!busy}
                      onClick={() => act("test", () => sendWebhookTestAction(slug, selected.id), (r: SendResult) => reportSend(r, "Test event"))}
                    >
                      {busy === "test" && <Loader2 className="w-4 h-4 animate-spin" />} Send test
                    </button>
                    <button
                      type="button"
                      className={btn}
                      disabled={!!busy}
                      onClick={() =>
                        act("pause", () => setWebhookPausedAction(slug, selected.id, selected.active), () =>
                          toast.success(selected.active ? "Endpoint paused." : "Endpoint resumed."),
                        )
                      }
                    >
                      {selected.active ? "Pause" : "Resume"}
                    </button>
                    <button type="button" className={btn} onClick={() => setEditing("edit")}>
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {!selected.active && selected.pausedReason === "failures" && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-fg">
                  We paused this endpoint after {autoPauseAfter} failed tries in a row. Fix the receiver, send a test,
                  then resume. Deliveries already queued go out when you resume. New events are not queued while it is
                  paused.
                </div>
              )}

              {canManage && (
                <SecretPanel
                  endpointId={selected.id}
                  secret={secret?.endpointId === selected.id ? secret : null}
                  busy={busy}
                  onReveal={() =>
                    act("reveal", () => revealWebhookSecretAction(slug, selected.id), (r: { secret: string }) =>
                      setSecret({ endpointId: selected.id, value: r.secret, fresh: false }),
                    )
                  }
                  onRotate={() => {
                    if (!confirm("Rotate the signing secret? Requests signed with the old secret stop verifying right away.")) return;
                    void act("rotate", () => rotateWebhookSecretAction(slug, selected.id), (r: { secret: string }) => {
                      setSecret({ endpointId: selected.id, value: r.secret, fresh: true });
                      toast.success("New secret ready. Update your receiver.");
                    });
                  }}
                  onHide={() => setSecret(null)}
                />
              )}

              <DeliveriesTable
                deliveries={deliveries}
                maxAttempts={maxAttempts}
                openId={shownDelivery?.id ?? null}
                canManage={canManage}
                busy={busy}
                onOpen={setOpenDelivery}
                onResend={(d) =>
                  act(`resend:${d.id}`, () => redeliverWebhookAction(slug, d.id), (r: SendResult) => reportSend(r, "Delivery"))
                }
              />

              {shownDelivery && (
                <div className="rounded-xl border border-border bg-panel p-4 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-muted">Payload of the selected delivery</span>
                    <button type="button" className={btnSm} onClick={() => copy(shownDelivery.payload)}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                  </div>
                  {shownDelivery.lastError && shownDelivery.status !== "succeeded" && (
                    <p className="text-[13px] text-danger break-words">Last error: {shownDelivery.lastError}</p>
                  )}
                  {shownDelivery.status === "pending" && shownDelivery.nextAttemptAt && shownDelivery.attempts > 0 && (
                    <p className="text-[13px] text-muted" suppressHydrationWarning>
                      Next try at {new Date(shownDelivery.nextAttemptAt).toLocaleString()}
                    </p>
                  )}
                  <pre className="m-0 font-mono text-[12.5px] leading-relaxed text-fg whitespace-pre-wrap break-all max-h-[360px] overflow-auto">
                    {shownDelivery.payload}
                  </pre>
                </div>
              )}

              <details className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
                <summary className="cursor-pointer text-fg font-medium">How to check the signature</summary>
                <div className="mt-2 flex flex-col gap-2">
                  <p>
                    The header looks like <code className="font-mono text-fg">t=1727350000,v1=5f2c...</code>. Compute
                    HMAC-SHA256 of <code className="font-mono text-fg">t + &quot;.&quot; + raw request body</code> with
                    the endpoint secret as the key, as hex, and compare it with v1. Reject requests where t is more than
                    five minutes old.
                  </p>
                  <p>
                    We retry failed deliveries after 1 minute, 5 minutes, 30 minutes, 2 hours and 6 hours. Any 2xx
                    response counts as delivered. Use X-Codepad-Event-Id to ignore repeats.
                  </p>
                </div>
              </details>

              {canManage && (
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[13px] text-danger hover:underline disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() => {
                      if (!confirm("Remove this endpoint and its delivery log?")) return;
                      void act("delete", () => deleteWebhookEndpointAction(slug, selected.id), () => {
                        toast.success("Endpoint removed.");
                        router.push(`/w/${slug}/webhooks`, { scroll: false });
                      });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove endpoint
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function SecretPanel({
  secret,
  busy,
  onReveal,
  onRotate,
  onHide,
}: {
  endpointId: string;
  secret: { value: string; fresh: boolean } | null;
  busy: string | null;
  onReveal: () => void;
  onRotate: () => void;
  onHide: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-fg">Signing secret</span>
        <div className="flex gap-2">
          {secret ? (
            <button type="button" className={btnSm} onClick={onHide}>
              Hide
            </button>
          ) : (
            <button type="button" className={btnSm} disabled={!!busy} onClick={onReveal}>
              {busy === "reveal" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Reveal
            </button>
          )}
          <button type="button" className={btnSm} disabled={!!busy} onClick={onRotate}>
            {busy === "rotate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Rotate
          </button>
        </div>
      </div>
      {secret ? (
        <div className="flex items-center gap-2 min-w-0">
          <code className="font-mono text-[13px] text-fg bg-panel rounded-md px-2 py-1 truncate select-all">{secret.value}</code>
          <button type="button" className={btnSm} onClick={() => copy(secret.value)}>
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
        </div>
      ) : (
        <span className="font-mono text-[13px] text-muted">whsec_••••••••••••</span>
      )}
      {secret?.fresh && (
        <p className="text-[13px] text-muted">Put this secret in your receiver so it can check the signature. You can reveal it again here later.</p>
      )}
    </div>
  );
}

function DeliveriesTable({
  deliveries,
  maxAttempts,
  openId,
  canManage,
  busy,
  onOpen,
  onResend,
}: {
  deliveries: DeliveryView[];
  maxAttempts: number;
  openId: string | null;
  canManage: boolean;
  busy: string | null;
  onOpen: (id: string) => void;
  onResend: (d: DeliveryView) => void;
}) {
  if (!deliveries.length) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-8 text-center text-sm text-muted">
        No deliveries yet. Send a test to check the endpoint.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface overflow-x-auto">
      <table className="w-full border-collapse min-w-[560px]">
        <thead>
          <tr className="bg-panel text-left">
            <th className="text-xs font-semibold text-muted px-3.5 py-2.5 w-[110px]">Time</th>
            <th className="text-xs font-semibold text-muted px-3.5 py-2.5">Event</th>
            <th className="text-xs font-semibold text-muted px-3.5 py-2.5 w-[120px]">Response</th>
            <th className="text-xs font-semibold text-muted px-3.5 py-2.5 w-[80px]">Tries</th>
            <th className="px-3.5 py-2.5 w-[100px]" />
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => {
            const chip = responseChip(d);
            const isTest = d.event === TEST_EVENT;
            const tries = isTest || d.status === "succeeded" ? String(d.attempts) : `${d.attempts} of ${maxAttempts}`;
            const canResend = canManage && (d.status === "failed" || d.status === "succeeded" || (d.status === "pending" && d.attempts > 0));
            return (
              <tr
                key={d.id}
                onClick={() => onOpen(d.id)}
                className={`border-t border-border cursor-pointer ${openId === d.id ? "bg-secondary/[0.06]" : "hover:bg-panel/50"}`}
              >
                <td className="px-3.5 py-2.5 font-mono text-[13px] text-fg" suppressHydrationWarning>
                  {formatTime(d.createdAt)}
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-[13px] text-fg">{d.event}</span>
                    {d.summary && <span className="text-[13px] text-muted truncate">{d.summary}</span>}
                  </div>
                </td>
                <td className="px-3.5 py-2.5">
                  <Chip tone={chip.tone}>{chip.label}</Chip>
                </td>
                <td className="px-3.5 py-2.5 font-mono text-[13px] text-fg">{tries}</td>
                <td className="px-3.5 py-2.5 text-right">
                  {canResend && !isTest ? (
                    <button
                      type="button"
                      className={btnSm}
                      disabled={!!busy}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onResend(d);
                      }}
                    >
                      {busy === `resend:${d.id}` && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Resend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={btnSm}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onOpen(d.id);
                      }}
                    >
                      View
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EndpointForm({
  mode,
  initial,
  busy,
  onCancel,
  onSubmit,
}: {
  mode: "new" | "edit";
  initial: EndpointView | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (url: string, events: string[]) => void;
}) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [events, setEvents] = useState<string[]>(initial?.events ?? [...WORKSPACE_EVENTS]);
  const toggle = (ev: string) => setEvents((cur) => (cur.includes(ev) ? cur.filter((x) => x !== ev) : [...cur, ev]));

  return (
    <form
      className="rounded-xl border border-secondary/40 bg-surface p-4 md:p-5 flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(url, events);
      }}
    >
      <h2 className="text-base font-semibold text-fg">{mode === "new" ? "Add endpoint" : "Edit endpoint"}</h2>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg">Endpoint URL</span>
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/hooks/codepad"
          className="h-9 px-3 rounded-lg border border-border bg-bg font-mono text-[13px] text-fg focus:outline-none focus:border-secondary"
        />
        <span className="text-xs text-muted">Must be https. Private and local network addresses are not allowed.</span>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] font-medium text-fg mb-1">Events to send</legend>
        {WORKSPACE_EVENTS.map((ev) => (
          <label key={ev} className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={events.includes(ev)}
              onChange={() => toggle(ev)}
              className="mt-0.5 accent-secondary"
            />
            <span className="flex flex-col">
              <span className="font-mono text-[13px] text-fg">{ev}</span>
              <span className="text-xs text-muted">{EVENT_DESCRIPTIONS[ev]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={busy || !url.trim() || events.length === 0}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === "new" ? "Add endpoint" : "Save"}
        </button>
        <button type="button" className={btn} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
