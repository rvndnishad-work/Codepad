"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AtsSummary, SyncEventView } from "@/lib/ats/connection-server";
import { syncedWhen } from "@/lib/connections/catalog";
import { disconnectAtsAction, retryWritebackAction, saveTriggerStageAction, saveWritebackAction, sendWaitingInviteAction, syncNowAction } from "../actions";
import { btn, btnDanger, btnPrimary, btnSm, Chip, formatWhen, input, type Tone } from "../ui";
import MappingEditor, { type MappingRow, type ScreeningChoice } from "./MappingEditor";
import KeyPanel from "./KeyPanel";

type Props = {
  slug: string;
  tab: "log" | "mapping" | "settings";
  summary: AtsSummary;
  providerName: string;
  canManage: boolean;
  canSend: boolean;
  log: SyncEventView[];
  mapping: { rows: MappingRow[]; screenings: ScreeningChoice[] } | null;
  partnerBaseUrl: string;
};

function resultChip(e: SyncEventView): { tone: Tone; label: string } {
  switch (e.status) {
    case "imported":
      return { tone: "positive", label: "Imported" };
    case "linked":
      return { tone: "neutral", label: "Linked" };
    case "waiting":
      return e.resolved ? { tone: "neutral", label: "Sent later" } : { tone: "attention", label: "Waiting on you" };
    case "sent":
      return { tone: "positive", label: "Sent" };
    case "failed":
      return e.resolved ? { tone: "neutral", label: "Retried" } : { tone: "negative", label: e.httpStatus ? `Failed, ${e.httpStatus}` : "Failed" };
    default:
      return { tone: "neutral", label: "Noted" };
  }
}

function Kpi({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <div className={`rounded-xl border ${danger ? "border-danger/60" : "border-border"} bg-surface px-[18px] py-4 flex flex-col gap-1`}>
      <b className={`text-[26px] font-semibold tabular-nums tracking-tight ${danger ? "text-danger" : "text-fg"}`}>{value}</b>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}

export default function AtsDetailClient({ slug, tab, summary, providerName, canManage, canSend, log, mapping, partnerBaseUrl }: Props) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const base = `/w/${slug}/connections/ats`;
  const attention = summary.needsAttention;
  const since = summary.lastSyncAt ? syncedWhen(summary.lastSyncAt) : "Never";
  const connectedOn = new Date(summary.connectedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  const sync = () =>
    start(async () => {
      const r = await syncNowAction(slug);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.sent ? `Checked ${r.checked}, sent ${r.sent} result${r.sent === 1 ? "" : "s"}` : `Checked ${r.checked}. Nothing new to send.`);
      router.refresh();
    });
  const retry = (id: string) =>
    start(async () => {
      const r = await retryWritebackAction(slug, id);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.outcome === "sent" || r.outcome === "recorded" ? "Sent" : "Tried again. See the newest row.");
      router.refresh();
    });
  const sendWaiting = (requestId: string) =>
    start(async () => {
      const r = await sendWaitingInviteAction(slug, requestId);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Invite sent");
      router.refresh();
    });
  const disconnect = () =>
    start(async () => {
      const r = await disconnectAtsAction(slug);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`${providerName} disconnected`);
      router.push(`/w/${slug}/connections`);
    });

  const tabs = [
    { key: "log", label: "Sync log", href: base },
    { key: "mapping", label: "Job mapping", href: `${base}?tab=mapping` },
    { key: "settings", label: "Settings", href: `${base}?tab=settings` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-muted flex gap-2">
        <Link href={`/w/${slug}/connections`} className="hover:text-fg">
          Connections
        </Link>
        <span aria-hidden>/</span>
        <span className="text-fg font-medium">{providerName}</span>
      </nav>

      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex gap-3.5 items-center">
          <div className="w-11 h-11 rounded-[10px] bg-success/10 text-success flex items-center justify-center font-bold text-lg" aria-hidden>
            {providerName[0]}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-fg">{providerName}</h1>
              <Chip tone="positive">Connected</Chip>
            </div>
            <span className="text-[13px] text-muted">
              Connected{summary.connectedBy ? ` by ${summary.connectedBy}` : ""} on {connectedOn}.{" "}
              {summary.partner
                ? `${summary.settings.triggerStage ? `Imports from ${summary.settings.triggerStage}` : "Imports when Greenhouse sends the test"}, sends decisions back.`
                : "Imports through a signed webhook. Decisions go out through Webhooks."}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={sync} disabled={busy} title="Check every open candidate and send any result that is ready">
              Sync now
            </button>
            <Link className={btn} href={summary.partner ? `${base}/setup?step=3` : `${base}?tab=mapping`}>
              Edit job mapping
            </Link>
            {confirmDisconnect ? (
              <>
                <button type="button" className={btnDanger} onClick={disconnect} disabled={busy}>
                  Yes, disconnect
                </button>
                <button type="button" className={btn} onClick={() => setConfirmDisconnect(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className={btnDanger} onClick={() => setConfirmDisconnect(true)}>
                Disconnect
              </button>
            )}
          </div>
        )}
      </div>
      {confirmDisconnect && (
        <p className="text-[13px] text-muted -mt-2">
          {providerName} will no longer be able to send candidates or read results. Imported candidates, the job mapping and this log stay.
        </p>
      )}

      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        <Kpi value={String(summary.imported30d)} label="Candidates imported, 30 days" />
        <Kpi value={String(summary.decisionsSent30d)} label="Decisions sent back, 30 days" />
        <Kpi value={since.replace(/^on /, "")} label="Since the last sync" />
        <Kpi value={String(attention)} label="Needs your attention" danger={attention > 0} />
      </div>

      <nav className="flex gap-6 border-b border-border" aria-label="Connection sections">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={`h-10 flex items-center px-0.5 text-sm ${tab === t.key ? "text-fg font-medium shadow-[inset_0_-2px_0_rgb(var(--c-accent-2))]" : "text-muted hover:text-fg"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "log" && (
        <div className="rounded-xl border border-border bg-surface overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-panel text-left text-[13px] font-semibold text-muted">
                <th className="px-3.5 py-2.5 w-[110px]">When</th>
                <th className="px-3.5 py-2.5 w-[150px]">Direction</th>
                <th className="px-3.5 py-2.5">What happened</th>
                <th className="px-3.5 py-2.5 w-[150px]">Result</th>
                <th className="px-3.5 py-2.5 w-[110px]">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3.5 py-8 text-center text-sm text-muted border-t border-border">
                    Nothing yet. Rows appear here when {providerName} sends a candidate or a result goes back.
                  </td>
                </tr>
              )}
              {log.map((e) => {
                const chip = resultChip(e);
                const failed = e.status === "failed" && !e.resolved;
                return (
                  <Fragment key={e.id}>
                    <tr className={`border-t border-border ${failed ? "bg-danger/[0.04]" : ""}`}>
                      <td className="px-3.5 py-3 font-mono text-[13px] text-fg whitespace-nowrap">{formatWhen(e.createdAt)}</td>
                      <td className="px-3.5 py-3 text-sm text-fg">{e.direction === "in" ? `From ${providerName}` : `To ${providerName}`}</td>
                      <td className="px-3.5 py-3 text-sm text-fg">
                        {e.candidateId ? (
                          <Link href={`/w/${slug}/candidates/${e.candidateId}`} className="hover:underline">
                            {e.summary}
                          </Link>
                        ) : (
                          e.summary
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <Chip tone={chip.tone}>{chip.label}</Chip>
                      </td>
                      <td className="px-3.5 py-3">
                        {failed && e.direction === "out" && e.requestId && canManage && (
                          <button type="button" className={btnSm} onClick={() => retry(e.id)} disabled={busy}>
                            Retry
                          </button>
                        )}
                        {e.canSend && e.requestId && canSend && (
                          <button type="button" className={btnSm} onClick={() => sendWaiting(e.requestId!)} disabled={busy}>
                            Send now
                          </button>
                        )}
                        {e.canSend && !canSend && e.candidateId && (
                          <Link className={btnSm} href={`/w/${slug}/candidates/${e.candidateId}`}>
                            Review
                          </Link>
                        )}
                      </td>
                    </tr>
                    {e.detail && !e.resolved && (
                      <tr>
                        <td colSpan={5} className={`px-3.5 pb-3 pt-0 text-[13px] ${failed ? "text-danger" : "text-muted"}`}>
                          {e.detail}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "mapping" && mapping && (
        <MappingEditor
          slug={slug}
          providerName={providerName}
          triggerStage={summary.settings.triggerStage}
          rows={mapping.rows}
          screenings={mapping.screenings}
          canManage={canManage}
        />
      )}

      {tab === "settings" && <SettingsPanel slug={slug} summary={summary} providerName={providerName} canManage={canManage} partnerBaseUrl={partnerBaseUrl} />}
    </div>
  );
}

function SettingsPanel({ slug, summary, providerName, canManage, partnerBaseUrl }: { slug: string; summary: AtsSummary; providerName: string; canManage: boolean; partnerBaseUrl: string }) {
  const router = useRouter();
  const [stage, setStage] = useState(summary.settings.triggerStage);
  const [sendScore, setSendScore] = useState(summary.settings.sendScore);
  const [busy, start] = useTransition();

  const save = () =>
    start(async () => {
      const a = await saveTriggerStageAction(slug, stage);
      if (!a.ok) return void toast.error(a.error);
      const b = await saveWritebackAction(slug, { sendScore });
      if (!b.ok) return void toast.error(b.error);
      toast.success("Settings saved");
      router.refresh();
    });

  if (!summary.partner) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-2 max-w-2xl">
        <p className="text-sm text-fg">
          This {providerName} connection uses a signed webhook. Its key and signing secret are managed on the older ATS page.
        </p>
        <Link href={`/w/${slug}/ats`} className="text-sm text-secondary hover:underline">
          Open the webhook settings
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2 items-start">
      <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="text-[15px] font-semibold text-fg">Key and address</h2>
        <KeyPanel slug={slug} baseUrl={partnerBaseUrl} canManage={canManage} />
      </section>
      <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="text-[15px] font-semibold text-fg">Import and write back</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Greenhouse stage with the Codepad test</span>
          <input className={input} value={stage} onChange={(e) => setStage(e.target.value)} disabled={!canManage} placeholder="Technical screen" />
        </label>
        <label className="flex items-start gap-2.5 text-sm text-fg">
          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-secondary" checked={sendScore} onChange={(e) => setSendScore(e.target.checked)} disabled={!canManage} />
          <span>Send the screening score with the decision</span>
        </label>
        <p className="text-[13px] text-muted leading-relaxed">
          Greenhouse always gets the decision and a link to the candidate profile. It hears nothing until a recruiter passes or does not pass the candidate.
        </p>
        {canManage && (
          <div>
            <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
              Save settings
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
