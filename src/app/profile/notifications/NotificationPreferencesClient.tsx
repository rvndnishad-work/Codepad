"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Mail,
  ShieldCheck,
  Briefcase,
  Clock,
  Award,
  Sparkles,
  Heart,
  CreditCard,
  Megaphone,
  Loader2,
  Lock,
} from "lucide-react";
import { updatePreferenceAction } from "./actions";
import type { PreferenceView } from "@/lib/notifications/preferences";

type Props = { initialPrefs: PreferenceView[] };

const TYPE_META: Record<string, { label: string; body: string; Icon: typeof Bell; group: "events" | "social" | "system" | "security" }> = {
  INTERVIEW_SCHEDULED: {
    label: "Interview scheduled",
    body: "A recruiter scheduled a live session with you.",
    Icon: Briefcase,
    group: "events",
  },
  INTERVIEW_REPLAY_READY: {
    label: "Replay ready",
    body: "Your session finished processing and the replay is available.",
    Icon: Sparkles,
    group: "events",
  },
  TAKE_HOME_EXPIRING: {
    label: "Take-home expiring",
    body: "Less than 24h remaining on a pending take-home.",
    Icon: Clock,
    group: "events",
  },
  TAKE_HOME_SUBMITTED: {
    label: "Take-home submitted",
    body: "A candidate submitted their take-home attempt.",
    Icon: Award,
    group: "events",
  },
  SCORECARD_REQUESTED: {
    label: "Scorecard needed",
    body: "An interview is complete but the rubric isn't filled in.",
    Icon: Award,
    group: "events",
  },
  PROMPT_UPVOTED: {
    label: "Prompt upvoted",
    body: "Someone in the community upvoted your shared prompt attempt.",
    Icon: Heart,
    group: "social",
  },
  CREATOR_PUBLISH: {
    label: "New content from creators you follow",
    body: "A creator you follow (or subscribe to) published a new tutorial, Q&A, or experience.",
    Icon: Sparkles,
    group: "social",
  },
  CREATOR_NEW_FOLLOWER: {
    label: "New follower on your space",
    body: "Someone started following your creator space.",
    Icon: Heart,
    group: "social",
  },
  AI_CREDITS_LOW: {
    label: "AI credits running low",
    body: "Your workspace is close to running out of AI screening credits.",
    Icon: CreditCard,
    group: "events",
  },
  SECURITY_2FA_ENABLED: {
    label: "2FA enabled",
    body: "Self-notification when two-factor auth is turned on.",
    Icon: ShieldCheck,
    group: "security",
  },
  SECURITY_2FA_DISABLED: {
    label: "2FA disabled",
    body: "Self-notification when two-factor auth is turned off. Critical for incident response.",
    Icon: ShieldCheck,
    group: "security",
  },
  ADMIN_BROADCAST: {
    label: "Platform announcements",
    body: "System messages from the Interviewpad team (maintenance, policy updates).",
    Icon: Megaphone,
    group: "system",
  },
};

const GROUP_ORDER: Array<{ id: "events" | "social" | "security" | "system"; label: string; sub: string }> = [
  { id: "events", label: "Workflow events", sub: "Things that happen in your active work — interviews, take-homes, scorecards." },
  { id: "social", label: "Social", sub: "Community engagement with your shared content." },
  { id: "system", label: "System messages", sub: "Platform announcements from the Interviewpad team." },
  { id: "security", label: "Security", sub: "Sign-in alerts and account changes. These can't be turned off." },
];

export default function NotificationPreferencesClient({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<PreferenceView[]>(initialPrefs);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startSave] = useTransition();

  async function toggle(p: PreferenceView, channel: "inApp" | "email") {
    if (p.forcedOn) return;
    if (channel === "email") {
      toast.message("Email channel ships with IP-24.", {
        description: "We'll honor this toggle automatically once the email service is wired.",
      });
      return;
    }
    const key = `${p.type}:${channel}`;
    const newEnabled = !p[channel === "inApp" ? "inAppEnabled" : "emailEnabled"];
    // Optimistic update — flip locally first so the toggle feels instant.
    setPrefs((prev) =>
      prev.map((row) =>
        row.type === p.type
          ? { ...row, [channel === "inApp" ? "inAppEnabled" : "emailEnabled"]: newEnabled }
          : row,
      ),
    );
    setPendingKey(key);
    startSave(async () => {
      try {
        await updatePreferenceAction({ type: p.type, channel, enabled: newEnabled });
      } catch (err) {
        // Roll back on failure.
        setPrefs((prev) =>
          prev.map((row) =>
            row.type === p.type
              ? { ...row, [channel === "inApp" ? "inAppEnabled" : "emailEnabled"]: !newEnabled }
              : row,
          ),
        );
        toast.error((err as Error).message ?? "Couldn't save preference.");
      } finally {
        setPendingKey(null);
      }
    });
  }

  const byGroup: Record<string, PreferenceView[]> = {};
  for (const p of prefs) {
    const g = TYPE_META[p.type]?.group ?? "events";
    (byGroup[g] ||= []).push(p);
  }

  return (
    <div className="min-h-screen bg-bg text-fg pt-20 pb-16 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft className="w-3 h-3" /> Back to profile
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Notification preferences</h1>
          <p className="text-sm text-muted leading-relaxed max-w-2xl">
            Choose which types reach your bell and (when the email service ships)
            your inbox. Changes save instantly and apply to <span className="text-fg font-medium">future</span>{" "}
            notifications — existing rows in your bell are unaffected.
          </p>
        </header>

        {/* Column headers — once at the top, since rows are wide enough */}
        <div className="grid grid-cols-[1fr_64px_64px] items-center gap-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-muted/70">
          <div></div>
          <div className="flex items-center justify-center gap-1">
            <Bell className="w-3 h-3" /> In-app
          </div>
          <div className="flex items-center justify-center gap-1 text-muted/40">
            <Mail className="w-3 h-3" /> Email
          </div>
        </div>

        {GROUP_ORDER.map((g) => {
          const rows = byGroup[g.id] ?? [];
          if (rows.length === 0) return null;
          return (
            <section key={g.id} className="space-y-2">
              <div className="px-1">
                <div className="text-xs font-semibold text-fg">{g.label}</div>
                <div className="text-[11px] text-muted/80">{g.sub}</div>
              </div>
              <ul className="rounded-xl border border-border bg-surface/60 divide-y divide-border/60">
                {rows.map((p) => {
                  const meta = TYPE_META[p.type];
                  if (!meta) return null;
                  const inAppPending = pendingKey === `${p.type}:inApp`;
                  return (
                    <li key={p.type} className="grid grid-cols-[1fr_64px_64px] items-center gap-3 px-4 py-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-bg/60 border border-border flex items-center justify-center shrink-0 text-muted">
                          <meta.Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-fg flex items-center gap-1.5">
                            {meta.label}
                            {p.forcedOn && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded">
                                <Lock className="w-2.5 h-2.5" />
                                Forced
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted line-clamp-2">{meta.body}</div>
                        </div>
                      </div>

                      <ToggleCell
                        enabled={p.inAppEnabled}
                        forcedOn={p.forcedOn}
                        pending={inAppPending}
                        onClick={() => toggle(p, "inApp")}
                        title={
                          p.forcedOn
                            ? "Forced ON — this notification type can't be disabled."
                            : `Click to ${p.inAppEnabled ? "disable" : "enable"} in-app delivery`
                        }
                      />
                      <ToggleCell
                        enabled={p.emailEnabled}
                        forcedOn={p.forcedOn}
                        pending={false}
                        muted
                        onClick={() => toggle(p, "email")}
                        title="Email channel ships with IP-24."
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <p className="text-[10px] text-muted/70 px-1">
          Tracking: in-app gating ships now. Email-side gating reads the same
          preference rows and lands when the email service does (
          <code className="font-mono">IP-24</code> / <code className="font-mono">IP-66</code>).
        </p>
      </div>
    </div>
  );
}

function ToggleCell({
  enabled,
  forcedOn,
  pending,
  muted,
  onClick,
  title,
}: {
  enabled: boolean;
  forcedOn: boolean;
  pending: boolean;
  muted?: boolean;
  onClick: () => void;
  title: string;
}) {
  const active = enabled || forcedOn;
  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={forcedOn}
        className={`relative inline-flex items-center w-10 h-5 px-[2px] rounded-full border transition ${
          forcedOn
            ? "bg-amber-500/40 border-amber-500/60 cursor-not-allowed"
            : active
              ? muted
                ? "bg-emerald-500/40 border-emerald-500/50 hover:brightness-110"
                : "bg-emerald-500/80 border-emerald-500 hover:brightness-110"
              : "bg-elevated border-border hover:border-fg/60"
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-fg shadow-sm transition-transform ${
            active ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
        {pending && (
          <Loader2 className="w-2.5 h-2.5 animate-spin absolute -top-0.5 -right-3 text-muted" />
        )}
      </button>
    </div>
  );
}
