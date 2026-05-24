"use client";

import { useState } from "react";
import { updateNavLinks, updateB2bSettings, B2bSettingsConfig } from "@/lib/settings";
import { NavLinkConfig, NavStatus } from "@/lib/settings-constants";
import { Eye, EyeOff, Clock, Save, Loader2, Users, DollarSign, ShieldAlert } from "lucide-react";

export default function SettingsForm({
  initialLinks,
  initialB2bSettings,
}: {
  initialLinks: NavLinkConfig[];
  initialB2bSettings: B2bSettingsConfig;
}) {
  const [links, setLinks] = useState(initialLinks);
  const [b2bSettings, setB2bSettings] = useState<B2bSettingsConfig>(initialB2bSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleStatusChange = (href: string, status: NavStatus) => {
    setLinks((prev) =>
      prev.map((l) => (l.href === href ? { ...l, status } : l))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all([
        updateNavLinks(links),
        updateB2bSettings(b2bSettings),
      ]);
      setMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-6 flex items-center gap-2">
          Navigation Links
        </h3>

        <div className="space-y-4">
          {links.map((link) => (
            <div
              key={link.href}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border bg-bg/50 gap-4"
            >
              <div>
                <div className="font-bold text-fg">{link.label}</div>
                <div className="text-xs text-muted font-mono">{link.href}</div>
              </div>

              <div className="flex items-center gap-2">
                <StatusButton
                  active={link.status === "visible"}
                  onClick={() => handleStatusChange(link.href, "visible")}
                  icon={Eye}
                  label="Visible"
                  color="text-emerald-500"
                  bg="bg-emerald-500/10"
                />
                <StatusButton
                  active={link.status === "coming_soon"}
                  onClick={() => handleStatusChange(link.href, "coming_soon")}
                  icon={Clock}
                  label="Soon"
                  color="text-amber-500"
                  bg="bg-amber-500/10"
                />
                <StatusButton
                  active={link.status === "hidden"}
                  onClick={() => handleStatusChange(link.href, "hidden")}
                  icon={EyeOff}
                  label="Hidden"
                  color="text-rose-500"
                  bg="bg-rose-500/10"
                />
              </div>
            </div>
          ))}
        </div>

      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-6 flex items-center gap-2">
          SaaS Billing & Limits
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan Seat Limit */}
          <div className="p-5 rounded-xl border border-border bg-bg/50 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <label className="text-sm font-bold text-fg block">Free Plan Seat Limit</label>
                <span className="text-[11px] text-muted leading-tight block mt-0.5">
                  Max teammate seats in a Free workspace.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <input
                type="range"
                min="1"
                max="20"
                value={b2bSettings.freeSeatLimit}
                onChange={(e) =>
                  setB2bSettings((prev) => ({
                    ...prev,
                    freeSeatLimit: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-accent bg-border h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-mono font-bold px-3 py-1 rounded bg-bg border border-border w-12 text-center text-fg">
                {b2bSettings.freeSeatLimit}
              </span>
            </div>
          </div>

          {/* Growth Plan Seat Pricing */}
          <div className="p-5 rounded-xl border border-border bg-bg/50 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <label className="text-sm font-bold text-fg block">Growth Plan Seat Pricing</label>
                <span className="text-[11px] text-muted leading-tight block mt-0.5">
                  Seat cost in USD per month on Growth.
                </span>
              </div>
            </div>
            <div className="relative pt-1 max-w-[160px]">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="number"
                min="1"
                max="500"
                value={b2bSettings.seatPrice}
                onChange={(e) =>
                  setB2bSettings((prev) => ({
                    ...prev,
                    seatPrice: Math.max(1, parseInt(e.target.value, 10) || 0),
                  }))
                }
                className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-xl text-sm font-mono font-bold text-fg focus:outline-none focus:border-accent transition"
              />
            </div>
          </div>

          {/* Global AI Proctoring */}
          <div className="p-5 rounded-xl border border-border bg-bg/50 md:col-span-2 flex items-center justify-between gap-4">
            <div className="flex gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 h-10 w-10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <label className="text-sm font-bold text-fg block">Global AI Proctoring Telemetry</label>
                <span className="text-[11px] text-muted leading-relaxed block mt-0.5 max-w-xl">
                  Enable platform-wide candidate focus tracking, paste telemetry, blur timing logs, and suspicious integrity ratings calculations.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setB2bSettings((prev) => ({
                  ...prev,
                  proctoringEnabled: !prev.proctoringEnabled,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                b2bSettings.proctoringEnabled ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                  b2bSettings.proctoringEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-amber-500/5 p-4 flex gap-4 items-start">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-fg">Admin Override</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Admins always see all links and can visit pages regardless of these settings. 
            "Hidden" links are only removed for regular users. "Soon" links are visible but 
            disabled for regular users.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          {message && (
            <div className={`text-xs font-bold ${message.type === "success" ? "text-emerald-500" : "text-rose-500"} animate-in fade-in slide-in-from-left-2`}>
              {message.text}
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fg text-bg text-sm font-bold hover:bg-fg/90 transition shadow-soft disabled:opacity-50 active:scale-95"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function StatusButton({
  active,
  onClick,
  icon: Icon,
  label,
  color,
  bg,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
        active
          ? `${color} ${bg} border-current shadow-sm`
          : "text-muted/40 border-transparent hover:text-muted hover:bg-elevated"
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}
