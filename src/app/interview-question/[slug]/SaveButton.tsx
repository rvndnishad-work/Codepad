"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { isSaved, toggleSaved, type SavedQuestion } from "@/lib/interview-questions/saved";

interface SaveButtonProps {
  question: Omit<SavedQuestion, "savedAt">;
  saved?: boolean;
  onClick?: () => void;
}

/** Save / unsave a question for later (localStorage-backed / database-synced). */
export default function SaveButton({ question, saved: controlledSaved, onClick }: SaveButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (controlledSaved !== undefined) return;
    const check = isSaved(question.slug);
    setTimeout(() => setSaved(check), 0);
  }, [question.slug, controlledSaved]);

  const displaySaved = controlledSaved !== undefined ? controlledSaved : saved;

  const handlePress = () => {
    if (onClick) {
      onClick();
    } else {
      setSaved(toggleSaved(question));
    }
  };

  return (
    <button
      onClick={handlePress}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition ${
        displaySaved
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border text-muted hover:text-fg hover:border-fg/30"
      }`}
    >
      {displaySaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      {displaySaved ? "Saved" : "Save"}
    </button>
  );
}

