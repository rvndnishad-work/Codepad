"use client";

import { Printer } from "lucide-react";

/**
 * Print/PDF export button. Extracted into a client component because the report
 * page itself is an async server component and cannot attach onClick handlers.
 */
export default function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md hover:-translate-y-0.5 active:scale-95"
    >
      <Printer className="w-4 h-4" />
      Print / PDF Export
    </button>
  );
}
