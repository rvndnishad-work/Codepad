"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Trash2, X } from "lucide-react";
import { getSaved, removeSaved, type SavedQuestion } from "@/lib/interview-questions/saved";
import { difficultyClasses, techLabel } from "@/lib/interview-questions/shared";

export default function SavedQuestionsPage() {
  const [items, setItems] = useState<SavedQuestion[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      let currentUserId: string | null = null;
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          currentUserId = session?.user?.id || null;
          setUserId(currentUserId);
        }
      } catch (e) {
        console.error("Failed to check auth session", e);
      }

      if (currentUserId) {
        // 1. Sync guest history if it exists
        const localSaved = getSaved();
        const localSolved = typeof window !== "undefined" ? localStorage.getItem("iq-solved-questions") : null;
        let solvedSlugs: string[] = [];
        try {
          if (localSolved) {
            const arr = JSON.parse(localSolved);
            if (Array.isArray(arr)) solvedSlugs = arr.map((item: any) => item.slug);
          }
        } catch {}

        if (localSaved.length > 0 || solvedSlugs.length > 0) {
          try {
            await fetch("/api/interview-questions/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                savedSlugs: localSaved.map((q) => q.slug),
                solvedSlugs,
              }),
            });
            localStorage.removeItem("iq-saved-questions");
            localStorage.removeItem("iq-solved-questions");
            window.dispatchEvent(new Event("iq-saved-changed"));
            window.dispatchEvent(new Event("iq-solved-changed"));
          } catch (e) {
            console.error("Failed to sync guest data on saved page mount", e);
          }
        }

        // 2. Fetch the current state from the database
        try {
          const dbRes = await fetch("/api/interview-questions/sync");
          if (dbRes.ok) {
            const dbData = await dbRes.json();
            setItems(dbData.saved || []);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to fetch saved questions from database", e);
        }
      }

      // Guest fallback
      setItems(getSaved());
      setLoading(false);
    }

    loadData();

    const refresh = () => {
      if (!userId) setItems(getSaved());
    };
    window.addEventListener("iq-saved-changed", refresh);
    return () => window.removeEventListener("iq-saved-changed", refresh);
  }, [userId]);

  async function handleRemove(slug: string) {
    if (userId) {
      try {
        setItems((prev) => (prev ? prev.filter((q) => q.slug !== slug) : []));
        await fetch(`/api/interview-questions/${slug}/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "saved", active: false }),
        });
      } catch (e) {
        console.error("Failed to remove saved question from database", e);
      }
    } else {
      removeSaved(slug);
    }
  }

  async function handleClearAll() {
    if (items && items.length > 0) {
      if (userId) {
        try {
          setItems([]);
          await fetch("/api/interview-questions/sync", {
            method: "DELETE",
          });
        } catch (e) {
          console.error("Failed to clear saved questions from database", e);
        }
      } else {
        items.forEach((q) => removeSaved(q.slug));
      }
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition mb-6">
          <ArrowLeft className="w-4 h-4" /> Interview Questions
        </Link>

        <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight">
          <Bookmark className="w-6 h-6 text-accent" /> Saved questions
        </h1>
        <p className="text-sm text-muted mt-2">Questions you saved to review later. Stored on this device.</p>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted">Loading your saved questions...</div>
          ) : items === null || items.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-border text-center">
              <p className="text-sm text-muted">No saved questions yet.</p>
              <Link href="/interview-questions" className="inline-block mt-3 text-sm font-bold text-accent hover:underline">
                Browse questions →
              </Link>
            </div>
          ) : (
            items.map((q) => (
              <div key={q.slug} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface/40">
                <Link href={`/interview-question/${q.slug}`} className="min-w-0 flex-1 group">
                  <h3 className="font-bold text-sm leading-snug group-hover:text-accent transition-colors">{q.title}</h3>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-muted">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${difficultyClasses(q.difficulty)}`}>{q.difficulty}</span>
                    {q.technology && <span className="font-bold text-fg/70">{techLabel(q.technology)}</span>}
                    {q.company && <span>· {q.company}</span>}
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(q.slug)}
                  className="p-1.5 rounded-md text-muted hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {items && items.length > 0 && !loading && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 mt-6 text-xs font-bold text-muted hover:text-rose-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </button>
        )}
      </div>
    </div>
  );
}
