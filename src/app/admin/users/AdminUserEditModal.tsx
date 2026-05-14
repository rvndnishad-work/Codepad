"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User, ShieldAlert, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminUserEditModalProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    bio: string | null;
    hireMeUrl: string | null;
    portfolioPublic: boolean;
    banned: boolean;
    isAdmin: boolean;
  };
  onClose: () => void;
}

export default function AdminUserEditModal({ user, onClose }: AdminUserEditModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    bio: user.bio || "",
    hireMeUrl: user.hireMeUrl || "",
    portfolioPublic: user.portfolioPublic,
    banned: user.banned,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return typeof document !== "undefined"
    ? createPortal(
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 grid place-items-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-border bg-panel/95 backdrop-blur shadow-soft overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold tracking-tight">Edit User</h2>
              </div>
              <button onClick={onClose} className="text-muted hover:text-fg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted">Hire Me URL</label>
                <input
                  type="text"
                  value={formData.hireMeUrl}
                  onChange={(e) => setFormData({ ...formData, hireMeUrl: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
                  placeholder="e.g. https://linkedin.com/in/..."
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.portfolioPublic}
                    onChange={(e) => setFormData({ ...formData, portfolioPublic: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full border border-border transition-colors relative ${formData.portfolioPublic ? "bg-accent border-accent" : "bg-surface"}`}>
                    <div className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full transition-transform ${formData.portfolioPublic ? "translate-x-5 bg-bg" : "bg-muted"}`} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted group-hover:text-fg transition">Portfolio Public</span>
                </label>

                {!user.isAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.banned}
                      onChange={(e) => setFormData({ ...formData, banned: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full border border-border transition-colors relative ${formData.banned ? "bg-red-500 border-red-500" : "bg-surface"}`}>
                      <div className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full transition-transform ${formData.banned ? "translate-x-5 bg-bg" : "bg-muted"}`} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-red-500/80 group-hover:text-red-500 transition">Banned</span>
                  </label>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;
}
