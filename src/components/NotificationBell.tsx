"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  X,
  Check,
  Briefcase,
  Clock,
  Award,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Heart,
  CheckCheck,
  Megaphone,
} from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

type ApiPayload = { unread: number; items: Notification[] };

const POLL_INTERVAL_MS = 30_000;

const ICON_FOR_TYPE: Record<string, { Icon: typeof Bell; tone: string }> = {
  INTERVIEW_SCHEDULED: { Icon: Briefcase, tone: "text-indigo-400 bg-indigo-500/10" },
  INTERVIEW_REPLAY_READY: { Icon: Sparkles, tone: "text-emerald-400 bg-emerald-500/10" },
  TAKE_HOME_EXPIRING: { Icon: Clock, tone: "text-amber-400 bg-amber-500/10" },
  TAKE_HOME_SUBMITTED: { Icon: Award, tone: "text-emerald-400 bg-emerald-500/10" },
  SCORECARD_REQUESTED: { Icon: Award, tone: "text-rose-300 bg-rose-500/10" },
  PROMPT_UPVOTED: { Icon: Heart, tone: "text-fuchsia-400 bg-fuchsia-500/10" },
  AI_CREDITS_LOW: { Icon: CreditCard, tone: "text-amber-400 bg-amber-500/10" },
  SECURITY_2FA_ENABLED: { Icon: ShieldCheck, tone: "text-emerald-400 bg-emerald-500/10" },
  SECURITY_2FA_DISABLED: { Icon: ShieldAlert, tone: "text-amber-400 bg-amber-500/10" },
  // IP-45: admin-composed broadcasts get a megaphone tone so users can
  // distinguish "system message" from event-driven rows at a glance.
  ADMIN_BROADCAST: { Icon: Megaphone, tone: "text-sky-400 bg-sky-500/10" },
};

function iconFor(type: string) {
  return ICON_FOR_TYPE[type] ?? { Icon: Bell, tone: "text-muted bg-panel/60" };
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/me", { cache: "no-store" });
      if (!res.ok) return; // Unauthenticated → keep silent; bell just shows 0.
      const data = (await res.json()) as ApiPayload;
      setUnread(data.unread);
      setItems(data.items);
    } catch {
      // Network blip → keep stale view. Next poll will recover.
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  // Close on outside click (lightweight — avoids a portal + focus trap for
  // an MVP-scope dropdown).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function onItemClick(n: Notification) {
    // Optimistic: mark read locally first so the dropdown reflects the new
    // state before the network roundtrip.
    if (!n.readAt) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      setUnread((u) => Math.max(0, u - 1));
      fetch(`/api/notifications/me/${n.id}/read`, { method: "POST" }).catch(() => {
        // Best-effort. If it fails we'll heal on next poll.
      });
    }
    if (n.href) {
      window.location.href = n.href;
    }
  }

  async function onDismiss(e: React.MouseEvent, n: Notification) {
    e.stopPropagation();
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.readAt) setUnread((u) => Math.max(0, u - 1));
    fetch(`/api/notifications/me/${n.id}/dismiss`, { method: "POST" }).catch(() => {});
  }

  async function onMarkAllRead() {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.readAt ? x : { ...x, readAt: now })));
      setUnread(0);
      await fetch("/api/notifications/me", { method: "POST" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-surface/40 text-muted hover:text-fg hover:bg-panel/40 transition"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
      >
        {unread > 0 ? (
          <BellRing className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] rounded-xl border border-border bg-surface shadow-xl z-50 flex flex-col overflow-hidden">
          <header className="px-3 py-2 flex items-center justify-between border-b border-border bg-panel/40">
            <div className="text-xs font-semibold text-fg">
              Notifications
              {unread > 0 && (
                <span className="ml-2 text-[10px] font-mono text-muted">
                  {unread} unread
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={loading || unread === 0}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted">
                You're all caught up.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {items.map((n) => {
                  const { Icon, tone } = iconFor(n.type);
                  const isUnread = !n.readAt;
                  return (
                    <li key={n.id}>
                      {/* Row is a div (not a button) so the dismiss button can
                          nest inside it without invalid-nested-interactive
                          markup + the React hydration warning (IP-52). Keyboard
                          access preserved via role/tabIndex + Enter/Space. */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onItemClick(n)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onItemClick(n);
                          }
                        }}
                        className={`group w-full px-3 py-2.5 flex items-start gap-2.5 text-left cursor-pointer hover:bg-panel/30 focus:outline-none focus-visible:bg-panel/40 ${
                          isUnread ? "bg-indigo-500/[0.03]" : ""
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${tone}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[12px] font-semibold text-fg truncate">
                              {n.title}
                            </span>
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                            )}
                          </div>
                          {n.body && (
                            <div className="text-[11px] text-muted line-clamp-2 leading-snug">
                              {n.body}
                            </div>
                          )}
                          <div className="text-[10px] text-muted/70 font-mono">
                            {relTime(n.createdAt)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => onDismiss(e, n)}
                          aria-label="Dismiss"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-panel/60"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="px-3 py-2 border-t border-border bg-panel/40">
            <Link
              href="/profile/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium text-muted hover:text-fg transition-colors"
            >
              Notification settings →
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}
