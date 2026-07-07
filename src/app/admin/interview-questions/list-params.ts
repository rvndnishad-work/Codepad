/**
 * URL-param vocabulary shared by the admin question list (server page) and its
 * filter bar (client). Lives in a plain module: exporting these from the
 * "use client" filter bar would hand the server component opaque client
 * references instead of real values.
 */

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Cookie holding the last-used list filters as a query string. The filter bar
 * keeps it in sync client-side; the server page restores it (via redirect)
 * when the list is opened without any params, so filters survive tab-hopping.
 */
export const FILTER_COOKIE = "admin_iq_filters";
/** Param keys that participate in save/restore ("page" deliberately excluded). */
export const PERSISTED_KEYS = ["q", "tech", "status", "per", "sort"] as const;

/** "" = default order (newest first). */
export const SORT_OPTIONS = [
  { value: "", label: "Newest first" },
  { value: "difficulty-asc", label: "Easy → Hard" },
  { value: "difficulty-desc", label: "Hard → Easy" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
