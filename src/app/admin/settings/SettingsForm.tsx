"use client";

import { useState } from "react";
import {
  updateNavLinks,
  updateB2bSettings,
  B2bSettingsConfig,
  updateInterviewArenaSettings,
  InterviewArenaSettings,
  updateMaintenanceSettings,
} from "@/lib/settings";
import {
  NavLinkConfig,
  NavStatus,
  isProtectedRoute,
  type MaintenanceConfig,
} from "@/lib/settings-constants";
import {
  Eye,
  EyeOff,
  Clock,
  Save,
  Loader2,
  Users,
  DollarSign,
  ShieldAlert,
  Settings,
  CreditCard,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  Sparkles,
  Zap,
  Play,
  Brain,
  Building2,
  UserCircle2,
  Globe,
  Lock,
  AlertTriangle,
  Wrench,
  Power,
} from "lucide-react";

export default function SettingsForm({
  initialLinks,
  initialB2bSettings,
  initialArenaSettings,
  initialMaintenance,
}: {
  initialLinks: NavLinkConfig[];
  initialB2bSettings: B2bSettingsConfig;
  initialArenaSettings: InterviewArenaSettings;
  initialMaintenance: MaintenanceConfig;
}) {
  const [links, setLinks] = useState(initialLinks);
  const [b2bSettings, setB2bSettings] = useState<B2bSettingsConfig>(initialB2bSettings);
  const [arenaSettings, setArenaSettings] = useState<InterviewArenaSettings>(initialArenaSettings);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(initialMaintenance);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tabbed recruiter state. (ATS integrations moved to per-workspace UI at
  // /w/[slug]/integrations — see IP-32. Multi-tenant SaaS: each recruiting team
  // owns their own ATS account, so there's no useful platform-global tier.)
  const [activeTab, setActiveTab] = useState<"nav" | "billing" | "proctoring" | "arena" | "maintenance">("nav");

  // Advanced Proctoring Heuristics Slider (Mock/UI State)
  const [sensitivity, setSensitivity] = useState(75);

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
        updateInterviewArenaSettings(arenaSettings),
        updateMaintenanceSettings(maintenance),
      ]);

      setMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      saveSensitivityPreference();
      setSaving(false);
    }
  };

  // Persist proctoring preference in local storage for demonstration/dashboard telemetry consistency
  const saveSensitivityPreference = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ipad_proctoring_sensitivity", sensitivity.toString());
    }
  };

  const sensitivityText = () => {
    if (sensitivity < 35) return "Low Signal (Flags only extreme copypastes)";
    if (sensitivity < 70) return "Standard Integrity (Recommended)";
    return "High Precision (Flags minor latency patterns, typing bursts, and all streaming copy)";
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Recruiter Tab Selector */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-surface border border-border p-1">
        <button
          type="button"
          onClick={() => setActiveTab("nav")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
            activeTab === "nav"
              ? "bg-accent text-bg shadow-sm"
              : "text-muted hover:text-fg hover:bg-elevated"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Navigation Control
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("billing")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
            activeTab === "billing"
              ? "bg-accent text-bg shadow-sm"
              : "text-muted hover:text-fg hover:bg-elevated"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Billing & Cadence
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("proctoring")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
            activeTab === "proctoring"
              ? "bg-accent text-bg shadow-sm"
              : "text-muted hover:text-fg hover:bg-elevated"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          AI Proctoring & Telemetry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("arena")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
            activeTab === "arena"
              ? "bg-accent text-bg shadow-sm"
              : "text-muted hover:text-fg hover:bg-elevated"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          Interview Arena
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("maintenance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
            activeTab === "maintenance"
              ? "bg-accent text-bg shadow-sm"
              : maintenance.enabled
              ? "text-rose-400 hover:text-rose-300 hover:bg-elevated"
              : "text-muted hover:text-fg hover:bg-elevated"
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          Maintenance
          {maintenance.enabled && (
            <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab 1: Platform Navigation Control */}
      {activeTab === "nav" && (
        <div className="rounded-2xl border border-border bg-surface p-6 animate-fade-in space-y-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
              Navigation Links
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Enable, disable, or flag forthcoming features across all user-facing views.
            </p>
          </div>

          {/* General / Site-wide Links */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                General / Site-wide
              </span>
            </div>
            {links.filter((l) => l.group === "general").map((link) => (
              <NavLinkRow key={link.href} link={link} onStatusChange={handleStatusChange} />
            ))}
          </div>

          {/* Candidate-facing Links */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
                <UserCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                Candidate-Facing (For Developers)
              </span>
            </div>
            {links.filter((l) => l.group === "candidate").map((link) => (
              <NavLinkRow key={link.href} link={link} onStatusChange={handleStatusChange} />
            ))}
          </div>

          {/* Recruiter-facing Links */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                Recruiter-Facing (For Hiring Teams)
              </span>
            </div>
            {links.filter((l) => l.group === "recruiter").map((link) => (
              <NavLinkRow key={link.href} link={link} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: SaaS Billing & Limits */}
      {activeTab === "billing" && (
        <div className="rounded-2xl border border-border bg-surface p-6 animate-fade-in space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
              SaaS Billing & Limits
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Configure free seat caps and seat limits for recruiters and hiring managers.
            </p>
          </div>

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
          </div>
        </div>
      )}

      {/* Tab 3: AI Proctoring & Telemetry Sensitivity */}
      {activeTab === "proctoring" && (
        <div className="rounded-2xl border border-border bg-surface p-6 animate-fade-in space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
              AI Proctoring & Proctor Sensitivity
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Tweak sensitivity algorithms to determine code plagiarism triggers and keystroke analyses.
            </p>
          </div>

          <div className="space-y-6">
            {/* Global AI Proctoring Toggle */}
            <div className="p-5 rounded-xl border border-border bg-bg/50 flex items-center justify-between gap-4">
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

            {/* Advanced Sensitivity Threshold Slider */}
            {b2bSettings.proctoringEnabled && (
              <div className="p-5 rounded-xl border border-border bg-[#101424]/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-accent" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#F3F4F6]">
                      AI Suspicion Sensitivity Threshold
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-accent">{sensitivity}%</span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseInt(e.target.value, 10))}
                    className="w-full accent-accent bg-border h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-lg bg-bg/50 border border-border/40 text-[11px] leading-relaxed">
                  <span className="font-bold text-fg block mb-1">Algorithmic Band Status:</span>
                  <span className="text-muted/80">{sensitivityText()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Tab 5: Interview Arena Settings */}
      {activeTab === "arena" && (
        <div className="rounded-2xl border border-border bg-surface p-6 animate-fade-in space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
              Interview Arena Customization
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Dynamically choose which capabilities are shown or restricted for Developers and Recruiters inside the practice/live arena.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Developer Permissions Card */}
            <div className="p-6 rounded-xl border border-border bg-bg/50 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-fg">Developer Options (Candidates)</h4>
                  <span className="text-[10px] text-muted font-semibold tracking-wider uppercase font-mono">PERSONA: candidate</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Developer Mock Practice Toggle */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface border border-border">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-fg flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Mock Practice Arena
                    </label>
                    <span className="text-[10px] text-muted leading-tight block">
                      Enables self-paced simulated code assessments.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setArenaSettings((prev) => ({
                        ...prev,
                        showMockToDeveloper: !prev.showMockToDeveloper,
                      }))
                    }
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      arenaSettings.showMockToDeveloper ? "bg-accent" : "bg-border"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                        arenaSettings.showMockToDeveloper ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Recruiter Permissions Card */}
            <div className="p-6 rounded-xl border border-border bg-bg/50 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-fg">Recruiter Options (Interviewers)</h4>
                  <span className="text-[10px] text-muted font-semibold tracking-wider uppercase font-mono">PERSONA: recruiter</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Recruiter Mock Practice Toggle */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface border border-border">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-fg flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Mock Practice Arena
                    </label>
                    <span className="text-[10px] text-muted leading-tight block">
                      Enables simulated candidate sandbox evaluation.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setArenaSettings((prev) => ({
                        ...prev,
                        showMockToRecruiter: !prev.showMockToRecruiter,
                      }))
                    }
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      arenaSettings.showMockToRecruiter ? "bg-accent" : "bg-border"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                        arenaSettings.showMockToRecruiter ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Recruiter Live Screen Toggle */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface border border-border">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-fg flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Live / Scheduled Multiplayer Arena
                    </label>
                    <span className="text-[10px] text-muted leading-tight block">
                      Allows scheduling first-class multiplayer technical sessions.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setArenaSettings((prev) => ({
                        ...prev,
                        showScheduleToRecruiter: !prev.showScheduleToRecruiter,
                      }))
                    }
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      arenaSettings.showScheduleToRecruiter ? "bg-accent" : "bg-border"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                        arenaSettings.showScheduleToRecruiter ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Site-wide Maintenance Mode */}
      {activeTab === "maintenance" && (
        <div className="rounded-2xl border border-border bg-surface p-6 animate-fade-in space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
              Site-Wide Maintenance
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Take the entire public site offline temporarily. Visitors get a
              branded &ldquo;we&rsquo;ll be back&rdquo; page (HTTP 503); you and
              other admins keep full access so you can verify and switch it off.
            </p>
          </div>

          {/* The toggle — deliberately heavy-weight because the blast radius is
              the whole site. Red when armed. */}
          <div
            className={`p-5 rounded-xl border flex items-center justify-between gap-4 transition-colors ${
              maintenance.enabled
                ? "border-rose-500/40 bg-rose-500/5"
                : "border-border bg-bg/50"
            }`}
          >
            <div className="flex gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 h-10 w-10 flex items-center justify-center ${
                  maintenance.enabled
                    ? "bg-rose-500/15 text-rose-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                <Power className="w-4 h-4" />
              </div>
              <div>
                <label className="text-sm font-bold text-fg block">
                  {maintenance.enabled
                    ? "Maintenance mode is ON — site is offline"
                    : "Maintenance mode is OFF — site is live"}
                </label>
                <span className="text-[11px] text-muted leading-relaxed block mt-0.5 max-w-md">
                  {maintenance.enabled
                    ? "Logged-out visitors and candidates currently see the maintenance page. Don't forget to turn this off."
                    : "Flip this on during deploys or incidents. Auth, /login and /admin stay reachable so you can get back in."}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!maintenance.enabled) {
                  const ok = window.confirm(
                    "Take the ENTIRE public site offline?\n\nEveryone except logged-in admins will see the maintenance page until you turn this back off."
                  );
                  if (!ok) return;
                }
                setMaintenance((prev) => ({ ...prev, enabled: !prev.enabled }));
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                maintenance.enabled ? "bg-rose-500" : "bg-border"
              }`}
              aria-pressed={maintenance.enabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                  maintenance.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Optional message shown on the maintenance screen. */}
          <div className="p-5 rounded-xl border border-border bg-bg/50 space-y-2">
            <label className="text-sm font-bold text-fg block">
              Visitor message <span className="text-muted font-normal">(optional)</span>
            </label>
            <span className="text-[11px] text-muted leading-relaxed block">
              Shown on the maintenance page — e.g. an ETA. Leave blank for the default copy.
            </span>
            <textarea
              value={maintenance.message}
              onChange={(e) =>
                setMaintenance((prev) => ({
                  ...prev,
                  message: e.target.value.slice(0, 280),
                }))
              }
              maxLength={280}
              rows={3}
              placeholder="Back by 3:00 PM UTC — upgrading our servers. Thanks for your patience!"
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm text-fg focus:outline-none focus:border-accent transition resize-none"
            />
            <div className="text-[10px] text-muted/60 text-right font-mono">
              {maintenance.message.length}/280
            </div>
          </div>

          {maintenance.enabled && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex gap-3 items-start">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-300/90 leading-relaxed">
                <strong>Armed.</strong> Click <em>Save Changes</em> to apply. Once
                saved, the public site returns 503 for everyone except admins
                within ~10 seconds. The home page can&rsquo;t opt out of this —
                that&rsquo;s intentional for real downtime.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Admin Override Warning */}
      <div className="rounded-2xl border border-border bg-amber-500/5 p-4 flex gap-4 items-start">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-fg">Admin Override</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Admins always see all links and can visit every page regardless of these
            settings — so you can&apos;t see the effect of gating a page yourself.
            For regular users, <strong>&ldquo;Hidden&rdquo;</strong> and{" "}
            <strong>&ldquo;Soon&rdquo;</strong> links are removed from the nav and the
            page redirects to a friendly &ldquo;coming soon&rdquo; screen (no longer a
            broken-looking 404). The home page is always reachable and can&apos;t be gated.
          </p>
        </div>
      </div>

      {/* Footer controls */}
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

function NavLinkRow({
  link,
  onStatusChange,
}: {
  link: NavLinkConfig;
  onStatusChange: (href: string, status: NavStatus) => void;
}) {
  const protectedRoute = isProtectedRoute(link.href);
  // Top-level site-wide pages are the ones a logged-out visitor reaches by
  // typing the domain or following a shared link — gating those has the widest
  // blast radius, so we surface an explicit warning to the admin (who is
  // exempt from the gate and otherwise can't see the effect).
  const topLevel =
    link.href.startsWith("/") &&
    (link.group === "general" || !link.href.includes("/", 1));
  const gated = link.status === "hidden" || link.status === "coming_soon";

  return (
    <div className="flex flex-col p-4 rounded-xl border border-border bg-bg/50 gap-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="font-bold text-fg flex items-center gap-2">
            {link.label}
            {protectedRoute && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-muted/70 bg-elevated border border-border px-1.5 py-0.5 rounded">
                <Lock className="w-2.5 h-2.5" />
                Always on
              </span>
            )}
          </div>
          <div className="text-xs text-muted font-mono">{link.href}</div>
        </div>

        <div className="flex items-center gap-2">
          <StatusButton
            active={link.status === "visible"}
            onClick={() => onStatusChange(link.href, "visible")}
            icon={Eye}
            label="Visible"
            color="text-emerald-500"
            bg="bg-emerald-500/10"
          />
          <StatusButton
            active={link.status === "coming_soon"}
            onClick={() => onStatusChange(link.href, "coming_soon")}
            icon={Clock}
            label="Soon"
            color="text-amber-500"
            bg="bg-amber-500/10"
            disabled={protectedRoute}
            disabledHint="The home page can't be gated."
          />
          <StatusButton
            active={link.status === "hidden"}
            onClick={() => onStatusChange(link.href, "hidden")}
            icon={EyeOff}
            label="Hidden"
            color="text-rose-500"
            bg="bg-rose-500/10"
            disabled={protectedRoute}
            disabledHint="The home page can't be gated."
          />
        </div>
      </div>

      {protectedRoute ? (
        <div className="flex items-start gap-2 text-[11px] text-muted/80 leading-relaxed">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted/60" />
          <span>
            This is your public front door, so it can&apos;t be hidden or gated —
            doing so would lock out every logged-out visitor.
          </span>
        </div>
      ) : gated && topLevel ? (
        <div className="flex items-start gap-2 text-[11px] text-amber-500/90 leading-relaxed rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Heads up: logged-out visitors (and anyone you share this link with)
            can&apos;t open this page — they&apos;ll be redirected to the
            &ldquo;coming soon&rdquo; screen. You won&apos;t see this yourself
            because admins bypass the gate.
          </span>
        </div>
      ) : null}
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
  disabled = false,
  disabledHint,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  color: string;
  bg: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
        disabled
          ? "text-muted/20 border-transparent cursor-not-allowed"
          : active
          ? `${color} ${bg} border-current shadow-sm`
          : "text-muted/40 border-transparent hover:text-muted hover:bg-elevated"
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

