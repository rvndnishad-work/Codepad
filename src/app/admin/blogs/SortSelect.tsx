"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

export default function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sortBy") || "createdAt_desc";

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", value);
    params.set("page", "1"); // Reset page on sort change
    router.push(`/admin/blogs?${params.toString()}`);
  }

  return (
    <div className="relative">
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="appearance-none bg-surface border border-border rounded-xl py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition cursor-pointer font-medium text-muted hover:text-fg hover:border-border-strong min-w-[140px]"
      >
        <option value="createdAt_desc">Date: Newest</option>
        <option value="featured_desc">Featured First</option>
        <option value="createdAt_asc">Date: Oldest</option>
        <option value="viewCount_desc">Views: Highest</option>
        <option value="reactions_desc">Reactions: Highest</option>
        <option value="comments_desc">Comments: Highest</option>
        <option value="author_asc">Author: A-Z</option>
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
    </div>
  );
}
