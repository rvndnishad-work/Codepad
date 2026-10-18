"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateNavLinks,
  updateInterviewArenaSettings,
  InterviewArenaSettings,
  updatePlaygroundAssistSettings,
  PlaygroundAssistSettings,
} from "@/lib/settings";
import { NavLinkConfig, NavStatus, isProtectedRoute } from "@/lib/settings-constants";
import { Eye, EyeOff, Clock, Save, Loader2, Lock, AlertTriangle, ToggleRight } from "lucide-react";

export type SettingsTab = "nav" | "arena" | "aiassist";

/**
 * Admin site settings. One tab at a time (the tab lives in ?tab= so it is
 * linkable), and each tab saves only its own setting so the audit log gets
 * one `setting.update` row per real change.
 *
 * Removed in the admin revamp: the "billing" tab (b2b_settings was never read
 * by any product code), the proctoring tab (its sensitivity slider only wrote
 * localStorage) and the maintenance tab (moved to /admin/maintenance).
 */
export default function SettingsForm({
  tab,
  initialLinks,
  initialArenaSettings,
  initialAssistSettings,
}: {
  tab: SettingsTab;
  initialLinks: NavLinkConfig[];
  initialArenaSettings: InterviewArenaSettings;
  initialAssistSettings: PlaygroundAssistSettings;
}) {
  if (tab === "arena") return <ArenaSection initial={initialArenaSettings} />;
  if (tab === "aiassist") return <AssistSection initial={initialAssistSettings} />;
  return <NavSection initial={initialLinks} />;
}

/* ── Shared bits ─────────────────────────────────────────────────────────── */

function useSaver() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(fn: () => Promise<unknown>) {
    setSaving(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: "Saved." });
      router.refresh();
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Could not save settings.",
      });
    } finally {
      setSaving(false);
    }
  }
  return { saving, message, run };
}

function SaveBar({
  dirty,
  saving,
  message,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  message: { ok: boolean; text: string } | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
      {message && (
        <span
          className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
          role="status"
        >
          {message.text}
        </span>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !dirty}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fg text-bg text-sm font-medium hover:bg-fg/90 transition disabled:opacity-40"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save changes
      </button>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-2/50 ${
        on ? "bg-accent-2" : "bg-border"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow transition ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  title,
  hint,
  on,
  onChange,
}: {
  title: string;
  hint: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <div className="min-w-0">
        <div className="text-fg font-medium">{title}</div>
        <div className="text-muted text-xs mt-0.5">{hint}</div>
      </div>
      <Toggle on={on} onChange={onChange} label={title} />
    </div>
  );
}

function SwitchesNote() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <ToggleRight className="w-3.5 h-3.5 text-subtle" />
      Also available in{" "}
      <Link href="/admin/switches" className="text-fg underline underline-offset-2 hover:text-accent-2">
        Feature switches
      </Link>
      .
    </p>
  );
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ── Navigation ──────────────────────────────────────────────────────────── */

const NAV_GROUPS: { id: NavLinkConfig["group"]; label: string }[] = [
  { id: "general", label: "General" },
  { id: "candidate", label: "Candidate-facing" },
  { id: "recruiter", label: "Recruiter-facing" },
];

function NavSection({ initial }: { initial: NavLinkConfig[] }) {
  const [saved, setSaved] = useState(initial);
  const [links, setLinks] = useState(initial);
  const { saving, message, run } = useSaver();

  const onStatusChange = (href: string, status: NavStatus) =>
    setLinks((prev) => prev.map((l) => (l.href === href ? { ...l, status } : l)));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Show, hide or mark links as coming soon for everyone who is not staff. Staff always see
        every link and can open every page, so you will not see the effect yourself. Hidden and
        coming-soon pages redirect to the coming-soon screen. The home page can never be gated.
      </p>

      {NAV_GROUPS.map((g) => (
        <section key={g.id} className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-2.5 bg-panel border-b border-border text-sm font-medium text-fg">
            {g.label}
          </div>
          <div className="divide-y divide-border">
            {links
              .filter((l) => l.group === g.id)
              .map((link) => (
                <NavLinkRow key={link.href} link={link} onStatusChange={onStatusChange} />
              ))}
          </div>
        </section>
      ))}

      <SaveBar
        dirty={!sameJson(links, saved)}
        saving={saving}
        message={message}
        onSave={() =>
          run(async () => {
            await updateNavLinks(links);
            setSaved(links);
          })
        }
      />
    </div>
  );
}

function NavLinkRow({
  link,
  onStatusChange,
}: {
  link: NavLinkConfig;
  onStatusChange: (href: string, status: NavStatus) => void;
}) {
  const protectedRoute = isProtectedRoute(link.href);
  // Top-level pages are the ones a logged-out visitor reaches by typing the
  // domain or following a shared link, so gating them gets a warning.
  const topLevel =
    link.href.startsWith("/") && (link.group === "general" || !link.href.includes("/", 1));
  const gated = link.status === "hidden" || link.status === "coming_soon";

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-fg flex items-center gap-2">
            {link.label}
            {protectedRoute && (
              <span className="inline-flex items-center gap-1 text-xs text-muted border border-border px-1.5 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Always on
              </span>
            )}
          </div>
          <div className="text-xs text-subtle font-mono">{link.href}</div>
        </div>
        <div className="flex items-center gap-1">
          <StatusButton
            active={link.status === "visible"}
            onClick={() => onStatusChange(link.href, "visible")}
            icon={Eye}
            label="Visible"
            tone="ok"
          />
          <StatusButton
            active={link.status === "coming_soon"}
            onClick={() => onStatusChange(link.href, "coming_soon")}
            icon={Clock}
            label="Soon"
            tone="warn"
            disabled={protectedRoute}
            disabledHint="The home page cannot be gated."
          />
          <StatusButton
            active={link.status === "hidden"}
            onClick={() => onStatusChange(link.href, "hidden")}
            icon={EyeOff}
            label="Hidden"
            tone="bad"
            disabled={protectedRoute}
            disabledHint="The home page cannot be gated."
          />
        </div>
      </div>
      {!protectedRoute && gated && topLevel && (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Logged-out visitors and anyone you share this link with will be sent to the coming-soon
            screen.
          </span>
        </div>
      )}
    </div>
  );
}

const TONE: Record<"ok" | "warn" | "bad", string> = {
  ok: "border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
  warn: "border-amber-600/30 text-amber-700 dark:text-amber-400 bg-amber-500/10",
  bad: "border-rose-600/30 text-rose-700 dark:text-rose-400 bg-rose-500/10",
};

function StatusButton({
  active,
  onClick,
  icon: Icon,
  label,
  tone,
  disabled = false,
  disabledHint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: keyof typeof TONE;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={active}
      title={disabled ? disabledHint : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        disabled
          ? "border-transparent text-subtle/50 cursor-not-allowed"
          : active
            ? TONE[tone]
            : "border-transparent text-muted hover:text-fg hover:bg-panel"
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

/* ── Interview arena ─────────────────────────────────────────────────────── */

function ArenaSection({ initial }: { initial: InterviewArenaSettings }) {
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState(initial);
  const { saving, message, run } = useSaver();
  const set = (k: keyof InterviewArenaSettings) => (v: boolean) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted">
          Which interview arena options developers and recruiters see.
        </p>
        <SwitchesNote />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-2.5 bg-panel border-b border-border text-sm font-medium text-fg">
            Developers
          </div>
          <div className="divide-y divide-border">
            <ToggleRow
              title="Mock practice"
              hint="Self-paced simulated coding interviews."
              on={s.showMockToDeveloper}
              onChange={set("showMockToDeveloper")}
            />
            <ToggleRow
              title="Schedule live interviews"
              hint="Let developers schedule live multiplayer sessions."
              on={s.showScheduleToDeveloper}
              onChange={set("showScheduleToDeveloper")}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-2.5 bg-panel border-b border-border text-sm font-medium text-fg">
            Recruiters
          </div>
          <div className="divide-y divide-border">
            <ToggleRow
              title="Mock practice"
              hint="Simulated candidate sandbox for evaluation."
              on={s.showMockToRecruiter}
              onChange={set("showMockToRecruiter")}
            />
            <ToggleRow
              title="Schedule live interviews"
              hint="Schedule live multiplayer technical sessions."
              on={s.showScheduleToRecruiter}
              onChange={set("showScheduleToRecruiter")}
            />
          </div>
        </section>
      </div>

      <SaveBar
        dirty={!sameJson(s, saved)}
        saving={saving}
        message={message}
        onSave={() =>
          run(async () => {
            await updateInterviewArenaSettings(s);
            setSaved(s);
          })
        }
      />
    </div>
  );
}

/* ── Playground AI assist ────────────────────────────────────────────────── */

function AssistSection({ initial }: { initial: PlaygroundAssistSettings }) {
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState(initial);
  const { saving, message, run } = useSaver();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted">
          The signed-in code helper in playgrounds. Anonymous traffic never reaches the model.
        </p>
        <SwitchesNote />
      </div>

      <section className="rounded-xl border border-border bg-surface divide-y divide-border">
        <ToggleRow
          title="AI assist available"
          hint={
            s.enabled
              ? "On: signed-in users can use it. Turning it off blocks new calls at once."
              : "Off: the sidebar stays visible and explains that assist is off."
          }
          on={s.enabled}
          onChange={(v) => setS((p) => ({ ...p, enabled: v }))}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0">
            <div className="text-fg font-medium">Free messages per user per day</div>
            <div className="text-muted text-xs mt-0.5">Applies as soon as you save.</div>
          </div>
          <input
            type="number"
            min={1}
            max={100}
            value={s.dailyLimit}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                dailyLimit: Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 0)),
              }))
            }
            aria-label="Free messages per user per day"
            className="w-24 px-3 py-1.5 rounded-lg bg-bg border border-border text-sm text-fg tabular-nums text-right focus:outline-none focus:border-accent-2"
          />
        </div>
      </section>

      <SaveBar
        dirty={!sameJson(s, saved)}
        saving={saving}
        message={message}
        onSave={() =>
          run(async () => {
            await updatePlaygroundAssistSettings(s);
            setSaved(s);
          })
        }
      />
    </div>
  );
}
