"use client";

import { Search } from "lucide-react";

export type StatusFilter = "all" | "published" | "draft";
export type SortKey = "recent" | "oldest" | "title" | "views";

type Props = {
  query: string;
  onQuery: (v: string) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  placeholder?: string;
  statusLabels?: { published: string; draft: string };
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title (A–Z)" },
  { value: "views", label: "Most viewed" },
];

export default function WorkspaceToolbar({
  query,
  onQuery,
  status,
  onStatus,
  sort,
  onSort,
  placeholder = "Search by title…",
  statusLabels = { published: "Published", draft: "Draft" },
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-panel border border-border focus:border-accent/60 text-sm outline-none placeholder:text-muted"
        />
      </div>

      <div className="inline-flex rounded-lg border border-border bg-panel p-0.5 text-[11px]">
        {(["all", "published", "draft"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={`px-2.5 py-1.5 rounded-md transition ${
              status === s
                ? "bg-accent text-bg font-semibold"
                : "text-muted hover:text-fg"
            }`}
          >
            {s === "all" ? "All" : s === "published" ? statusLabels.published : statusLabels.draft}
          </button>
        ))}
      </div>

      <label className="inline-flex items-center gap-1.5 text-[11px] text-muted">
        Sort
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="px-2 py-1.5 rounded-lg bg-panel border border-border text-xs text-fg outline-none focus:border-accent/60"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
