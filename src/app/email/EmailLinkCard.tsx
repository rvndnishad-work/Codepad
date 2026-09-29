import type { ReactNode } from "react";

/** Centered card used by the public email link pages. */
export default function EmailLinkCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-bg text-fg">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        <div className="mt-3 text-sm text-muted leading-relaxed flex flex-col items-center gap-4">{children}</div>
      </div>
    </main>
  );
}

export const primaryBtn =
  "inline-flex items-center justify-center h-10 px-5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60";
