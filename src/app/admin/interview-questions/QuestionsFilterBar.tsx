"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";
import { PAGE_SIZES, DEFAULT_PAGE_SIZE, SORT_OPTIONS, FILTER_COOKIE, type SortKey } from "./list-params";

const select = "px-3 py-2 rounded-lg border border-border bg-bg text-xs font-bold focus:outline-none focus:border-accent/50 cursor-pointer";

function buildParams(state: { q: string; tech: string; status: string; per: number; sort: string }): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.tech) params.set("tech", state.tech);
  if (state.status) params.set("status", state.status);
  if (state.per !== DEFAULT_PAGE_SIZE) params.set("per", String(state.per));
  if (state.sort) params.set("sort", state.sort);
  return params;
}

function writeFilterCookie(value: string) {
  // 30 days; scoped to the admin questions subtree — nothing else reads it.
  document.cookie = `${FILTER_COOKIE}=${value}; path=/admin/interview-questions; max-age=2592000; samesite=lax`;
}

/** Search + tech/status filters for the admin question list. All state lives
 *  in the URL so pagination links and refreshes keep the current view. */
export default function QuestionsFilterBar({
  q,
  tech,
  status,
  per,
  sort,
}: {
  q: string;
  tech: string;
  status: string;
  per: number;
  sort: SortKey;
}) {
  const router = useRouter();

  // Mirror the current (server-rendered) filter state into the cookie so a
  // later param-less visit — sidebar link, other tab — restores this view.
  useEffect(() => {
    writeFilterCookie(buildParams({ q, tech, status, per, sort }).toString());
  }, [q, tech, status, per, sort]);

  function push(next: Partial<{ q: string; tech: string; status: string; per: number; sort: string }>) {
    const params = buildParams({ q, tech, status, per, sort, ...next });
    // No page param: changing filters always resets to page 1.
    const qs = params.toString();
    router.push(`/admin/interview-questions${qs ? `?${qs}` : ""}`);
  }

  function clearAll() {
    // Wipe the cookie BEFORE navigating, or the bare URL would immediately
    // redirect back to the filters we just cleared.
    writeFilterCookie("");
    router.push("/admin/interview-questions");
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <form
        className="relative flex-1 sm:max-w-xs"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
        }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          key={q}
          placeholder="Search title or slug…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:border-accent/50"
        />
      </form>
      <select value={tech} onChange={(e) => push({ tech: e.target.value })} className={select} aria-label="Filter by technology">
        <option value="">All tech</option>
        {TECHNOLOGIES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
      </select>
      <select value={status} onChange={(e) => push({ status: e.target.value })} className={select} aria-label="Filter by status">
        <option value="">All statuses</option>
        <option value="published">published</option>
        <option value="draft">draft</option>
        <option value="archived">archived</option>
      </select>
      <select value={sort} onChange={(e) => push({ sort: e.target.value })} className={select} aria-label="Sort order">
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={per} onChange={(e) => push({ per: parseInt(e.target.value, 10) })} className={select} aria-label="Rows per page">
        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
      </select>
      {(q || tech || status || sort) && (
        <button type="button" onClick={clearAll} className="text-xs font-bold text-accent hover:underline whitespace-nowrap">
          Clear
        </button>
      )}
    </div>
  );
}
