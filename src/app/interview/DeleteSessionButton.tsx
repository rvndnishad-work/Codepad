"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this interview session? This action is permanent.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/interview/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Interview session deleted successfully.");
      router.refresh();
    } catch (err) {
      toast.error("Failed to delete session.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2.5 rounded-xl border border-border bg-surface text-muted hover:text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/20 transition flex items-center justify-center shrink-0 disabled:opacity-40"
      title="Delete interview session"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}
