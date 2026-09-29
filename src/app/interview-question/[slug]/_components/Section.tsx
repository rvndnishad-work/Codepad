import type { ReactNode } from "react";

/** One step of the study flow: a numbered heading, an optional line under it, then the content. */
export default function Section({
  id,
  num,
  title,
  sub,
  aside,
  children,
}: {
  id: string;
  num: number;
  title: string;
  sub?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-[96px] md:scroll-mt-[164px]">
      <header className="mb-5 flex items-start gap-3.5">
        <span
          aria-hidden
          className="mt-px grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-xs font-medium tabular-nums text-subtle"
        >
          {num}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="text-lg font-semibold leading-7 tracking-[-0.01em] text-fg md:text-xl">
            {title}
          </h2>
          {sub && <p className="mt-1 text-sm leading-relaxed text-subtle">{sub}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      {children}
    </section>
  );
}
