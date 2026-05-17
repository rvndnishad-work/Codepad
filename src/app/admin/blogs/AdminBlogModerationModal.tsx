"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileText, CheckCircle2, Clock, AlertCircle, XCircle, Star, Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminBlogModerationModalProps {
  blog: {
    id: string;
    title: string;
    slug: string;
    status: string;
    featured: boolean;
    adminNotes: string | null;
  };
  onClose: () => void;
}

export default function AdminBlogModerationModal({ blog, onClose }: AdminBlogModerationModalProps) {
  const router = useRouter();
  const [status, setStatus] = useState(blog.status);
  const [featured, setFeatured] = useState(blog.featured);
  const [adminNotes, setAdminNotes] = useState(blog.adminNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  async function handleUpdate() {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blogs/${blog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, featured, adminNotes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update blog");
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this blog post? This action cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/blogs/${blog.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete blog");
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
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
            className="relative w-full max-w-lg rounded-2xl border border-border bg-panel shadow-soft overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold tracking-tight">Moderate Blog</h2>
              </div>
              <button onClick={onClose} className="text-muted hover:text-fg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-black tracking-tight mb-1">{blog.title}</h3>
                <p className="text-xs text-muted font-mono">slug: /{blog.slug}</p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted">Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatusButton 
                    active={status === "PENDING"} 
                    onClick={() => setStatus("PENDING")} 
                    label="Pending" 
                    icon={Clock} 
                    color="amber" 
                  />
                  <StatusButton 
                    active={status === "PUBLISHED"} 
                    onClick={() => setStatus("PUBLISHED")} 
                    label="Approve" 
                    icon={CheckCircle2} 
                    color="emerald" 
                  />
                  <StatusButton 
                    active={status === "NEEDS_CHANGES"} 
                    onClick={() => setStatus("NEEDS_CHANGES")} 
                    label="Changes" 
                    icon={AlertCircle} 
                    color="blue" 
                  />
                  <StatusButton 
                    active={status === "REJECTED"} 
                    onClick={() => setStatus("REJECTED")} 
                    label="Reject" 
                    icon={XCircle} 
                    color="red" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted">
                  Admin Notes / Feedback
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain why changes are needed or why it was rejected..."
                  rows={4}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition resize-none"
                />
                <p className="text-[10px] text-muted italic">This note will be visible to the author.</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full border border-border transition-colors relative ${featured ? "bg-accent border-accent" : "bg-surface"}`}>
                    <div className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full transition-transform ${featured ? "translate-x-5 bg-bg" : "bg-muted"}`} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted group-hover:text-fg transition flex items-center gap-1.5">
                    <Star className={`w-3 h-3 ${featured ? "text-accent fill-accent" : ""}`} />
                    Staff Pick / Featured
                  </span>
                </label>

                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted hover:text-red-500 transition disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete Post
                </button>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Apply Moderation
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
}

function StatusButton({ active, onClick, label, icon: Icon, color }: any) {
  const colors: any = {
    amber: active ? "bg-amber-500 text-bg border-amber-500" : "text-amber-500 bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10",
    emerald: active ? "bg-emerald-500 text-bg border-emerald-500" : "text-emerald-500 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10",
    blue: active ? "bg-blue-500 text-bg border-blue-500" : "text-blue-500 bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10",
    red: active ? "bg-red-500 text-bg border-red-500" : "text-red-500 bg-red-500/5 border-red-500/20 hover:bg-red-500/10",
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${colors[color]}`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </button>
  );
}
