"use client";

import { useState } from "react";
import { updateNavLinks } from "@/lib/settings";
import { NavLinkConfig, NavStatus } from "@/lib/settings-constants";
import { Eye, EyeOff, Clock, Save, Loader2 } from "lucide-react";

export default function SettingsForm({
  initialLinks,
}: {
  initialLinks: NavLinkConfig[];
}) {
  const [links, setLinks] = useState(initialLinks);
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
      await updateNavLinks(links);
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

        <div className="mt-8 flex items-center justify-between">
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
            className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fg text-bg text-sm font-bold hover:bg-fg/90 transition shadow-soft disabled:opacity-50 active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
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
