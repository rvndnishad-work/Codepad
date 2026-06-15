"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { isSaved, toggleSaved, type SavedQuestion } from "@/lib/interview-questions/saved";

/** Save / unsave a question for later (localStorage-backed). */
export default function SaveButton({ question }: { question: Omit<SavedQuestion, "savedAt"> }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(question.slug));
  }, [question.slug]);

  return (
    <button
      onClick={() => setSaved(toggleSaved(question))}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition ${
        saved
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border text-muted hover:text-fg hover:border-fg/30"
      }`}
    >
      {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
