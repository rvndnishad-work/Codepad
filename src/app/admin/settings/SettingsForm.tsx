"use client";

import { useState } from "react";
import { updateNavLinks, updateB2bSettings, B2bSettingsConfig, updateInterviewArenaSettings, InterviewArenaSettings } from "@/lib/settings";
import { NavLinkConfig, NavStatus } from "@/lib/settings-constants";
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
  Link2, 
  Sliders, 
  CheckCircle2,
  Sparkles,
  Zap,
  Play,
  Brain
} from "lucide-react";

export default function SettingsForm({
  initialLinks,
  initialB2bSettings,
  initialArenaSettings,
}: {
  initialLinks: NavLinkConfig[];
  initialB2bSettings: B2bSettingsConfig;
  initialArenaSettings: InterviewArenaSettings;
}) {
  const [links, setLinks] = useState(initialLinks);
  const [b2bSettings, setB2bSettings] = useState<B2bSettingsConfig>(initialB2bSettings);
  const [arenaSettings, setArenaSettings] = useState<InterviewArenaSettings>(initialArenaSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tabbed recruiter state
  const [activeTab, setActiveTab] = useState<"nav" | "billing" | "proctoring" | "integrations" | "arena">("nav");

  // Advanced Proctoring Heuristics Slider (Mock/UI State)
  const [sensitivity, setSensitivity] = useState(75);

  // ATS Webhook Fields (Mock/UI State)
  const [atsLever, setAtsLever] = useState("https://api.lever.co/v1/webhooks/interviewpad");
  const [atsGreenhouse, setAtsGreenhouse] = useState("https://api.greenhouse.io/v1/webhooks/interviewpad");
  const [atsAshby, setAtsAshby] = useState("https://api.ashbyhq.com/v1/webhooks/interviewpad");
  const [atsEnabled, setAtsEnabled] = useState(true);

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
      localStorage.setItem("ipad_ats_enabled", atsEnabled.toString());
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
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
            activeTab === "integrations"
              ? "bg-accent text-bg shadow-sm"
              : "text-muted hover:text-fg hover:bg-elevated"
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          ATS Webhooks
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
      </div>

      {/* Tab 1: Platform Navigation Control */}
      {activeTab === "nav" && (
        <div className="rounded-2xl border border-border bg-surface p-6 animate-fade-in space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
              Navigation Links
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Enable, disable, or flag forthcoming features in candidate-facing views.
            </p>
          </div>

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

      {/* Tab 4: ATS Integrations Webhooks */}
      {activeTab === "integrations" && (
        <div className="rounded-2xl border border-border bg-surface p-6 animate-fade-in space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
                ATS System Integrations
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Automatically push graded candidate results and scorecards into your ATS platform.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAtsEnabled(prev => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                atsEnabled ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                  atsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {atsEnabled ? (
            <div className="space-y-4">
              {/* Ashby Integration */}
              <div className="p-4 rounded-xl border border-border bg-bg/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-fg">Ashby Integration</span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">ACTIVE</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={atsAshby}
                    onChange={(e) => setAtsAshby(e.target.value)}
                    className="w-full pl-3 pr-4 py-2 bg-bg border border-border rounded-xl text-xs font-mono text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Lever Integration */}
              <div className="p-4 rounded-xl border border-border bg-bg/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-fg">Lever Integration</span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">ACTIVE</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={atsLever}
                    onChange={(e) => setAtsLever(e.target.value)}
                    className="w-full pl-3 pr-4 py-2 bg-bg border border-border rounded-xl text-xs font-mono text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Greenhouse Integration */}
              <div className="p-4 rounded-xl border border-border bg-bg/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-fg">Greenhouse Integration</span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">ACTIVE</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={atsGreenhouse}
                    onChange={(e) => setAtsGreenhouse(e.target.value)}
                    className="w-full pl-3 pr-4 py-2 bg-bg border border-border rounded-xl text-xs font-mono text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-[#101424]/40 p-8 text-center text-xs text-muted">
              ATS integrations are disabled. Toggle the switch to configure Greenhouse, Ashby, and Lever.
            </div>
          )}
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

      {/* Admin Override Warning */}
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
