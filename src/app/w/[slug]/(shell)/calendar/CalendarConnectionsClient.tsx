"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarCheck, CalendarX, Info } from "lucide-react";
import { Avatar, Btn, useToasts } from "../candidates/_components/ui";
import { disconnectCalendarAction } from "./actions";

type Provider = "google" | "microsoft";

export type MemberRow = {
  userId: string;
  name: string;
  email: string;
  connection: { provider: Provider; email: string; status: "active" | "expired"; since: string } | null;
};

const LABEL: Record<Provider, string> = { google: "Google", microsoft: "Outlook" };

const ERRORS: Record<string, string> = {
  not_configured: "That calendar is not set up on this server yet.",
  denied: "The calendar was not connected because access was not granted.",
  wrong_account: "Finish connecting while signed in as the same person who started.",
  not_member: "You are no longer a member of this workspace.",
  exchange_failed: "The calendar did not accept the connection. Try again.",
  no_email: "The calendar did not tell us its email address. Try again.",
};

type Props = {
  slug: string;
  meId: string;
  canManage: boolean;
  configured: Record<Provider, boolean>;
  rows: MemberRow[];
  flash: { tone: "ok"; provider: string } | { tone: "error"; code: string } | null;
};

export default function CalendarConnectionsClient({ slug, meId, canManage, configured, rows, flash }: Props) {
  const router = useRouter();
  const [toasts, toast] = useToasts();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const anyConfigured = configured.google || configured.microsoft;
  const connected = rows.filter((r) => r.connection?.status === "active").length;
  const connectHref = (p: Provider) => `/api/calendar/${p}/connect?slug=${encodeURIComponent(slug)}`;

  const disconnect = (userId: string) => {
    setBusyId(userId);
    start(async () => {
      const res = await disconnectCalendarAction(slug, userId);
      setBusyId(null);
      if (!res.ok) return toast(res.error, "error");
      toast(userId === meId ? "Your calendar is disconnected" : "Calendar disconnected");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {toasts}
      {flash?.tone === "ok" && (
        <div className="flex gap-2.5 items-start rounded-xl border border-success/30 bg-success/[0.06] px-4 py-3 text-[13px] text-fg">
          <CalendarCheck className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden />
          Your {flash.provider === "microsoft" ? "Outlook" : "Google"} calendar is connected. Your busy times now show when teammates schedule interviews with you.
        </div>
      )}
      {flash?.tone === "error" && (
        <div className="flex gap-2.5 items-start rounded-xl border border-warning/30 bg-warning/[0.06] px-4 py-3 text-[13px] text-fg">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
          {ERRORS[flash.code] ?? "The calendar could not be connected. Try again."}
        </div>
      )}
      {!anyConfigured && (
        <div className="flex gap-2.5 items-start rounded-xl border border-border bg-panel px-4 py-3 text-[13px] text-muted">
          <Info className="w-4 h-4 text-subtle shrink-0 mt-0.5" aria-hidden />
          <span>
            Calendar connections are not set up on this server yet. An administrator adds the Google or Microsoft app credentials
            (GOOGLE_CALENDAR_CLIENT_ID and MS_CALENDAR_CLIENT_ID with their secrets), then members can connect here.
          </span>
        </div>
      )}

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <h2 className="text-[15px] font-semibold text-fg">Members</h2>
          <span className="text-[13px] text-muted">
            {connected} of {rows.length} connected
          </span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const mine = r.userId === meId;
            const c = r.connection;
            return (
              <li key={r.userId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <Avatar name={r.name} size={30} />
                <span className="flex-1 min-w-[180px]">
                  <span className="block text-[14px] font-medium text-fg truncate">
                    {r.name}
                    {mine && <span className="ml-1.5 text-xs font-normal text-subtle">You</span>}
                  </span>
                  <span className="block text-xs text-subtle truncate">{r.email}</span>
                </span>
                <span className="min-w-[200px] text-[13px]">
                  {c ? (
                    c.status === "expired" ? (
                      <span className="text-warning">{LABEL[c.provider]} needs reconnecting</span>
                    ) : (
                      <span className="text-success">
                        {LABEL[c.provider]} <span className="text-subtle">· {c.email}</span>
                      </span>
                    )
                  ) : (
                    <span className="text-muted">Not connected</span>
                  )}
                </span>
                <span className="flex flex-wrap gap-2 justify-end">
                  {mine &&
                    (["google", "microsoft"] as Provider[])
                      .filter((p) => configured[p] && !(c?.provider === p && c.status === "active"))
                      .map((p) => (
                        <a
                          key={p}
                          href={connectHref(p)}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap border border-border bg-surface text-fg hover:bg-panel hover:border-border-strong"
                        >
                          {c?.provider === p ? "Reconnect" : c ? `Switch to ${LABEL[p]}` : `Connect ${LABEL[p]}`}
                        </a>
                      ))}
                  {c && (mine || canManage) && (
                    <Btn variant="quiet" icon={CalendarX} disabled={pending && busyId === r.userId} onClick={() => disconnect(r.userId)}>
                      Disconnect
                    </Btn>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-[13px] text-muted max-w-2xl">
        Only you can connect your own calendar. Disconnecting stops busy times and event updates; events already created stay on the calendar.
        {canManage ? " As someone who manages integrations, you can disconnect anyone's calendar." : ""}
      </p>
    </div>
  );
}
