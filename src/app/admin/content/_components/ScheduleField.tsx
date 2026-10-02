"use client";

import { toLocalInputValue } from "../_lib/schedule";

/**
 * A datetime-local input that reports an ISO string (or "" to clear). The
 * browser's time zone is used, so the admin picks a time on their own clock.
 */
export default function ScheduleField({
  value,
  onChange,
  id,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="datetime-local"
        value={toLocalInputValue(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? new Date(v).toISOString() : "");
        }}
        className="h-8 rounded-md border border-border bg-bg px-2 text-sm text-fg focus:outline-none focus:border-border-strong"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="text-xs text-muted hover:text-fg">
          Clear
        </button>
      )}
    </div>
  );
}
