import type { ReactNode } from "react";

/**
 * A settings card whose header button stays beside the title in the
 * narrower main column (the shared SettingsCard lets it wrap underneath).
 */
export function PrivacyCard({
  id,
  title,
  description,
  aside,
  children,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="rounded-xl border border-border bg-surface shadow-sm shadow-black/5">
      <header className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 pt-4 pb-3.5">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
          {description && <p className="text-[13px] text-muted max-w-2xl">{description}</p>}
        </div>
        {aside && <div className="shrink-0 self-start sm:self-center">{aside}</div>}
      </header>
      {children ? <div className="divide-y divide-border border-t border-border">{children}</div> : null}
    </section>
  );
}
