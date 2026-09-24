"use client";

/**
 * Small pieces shared by the AI screening pages: the page header with the
 * credits chip, tone chips for AI suggestions, integrity and invite status.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bot, Coins, Plus } from "lucide-react";
import type { CreditSummary } from "@/lib/ai-interview/console-server";
import { statusLabel, statusTone, type Tone } from "@/lib/ai-interview/console";
import { plural } from "@/lib/workspace/display";
import { Btn, Dialog, inputCls, useToasts } from "../../candidates/_components/ui";
import { createCreditPackCheckoutAction } from "../actions";

export const TONE_CHIP: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/25",
  indigo: "bg-secondary/15 text-secondary-soft ring-secondary/30",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-danger/10 text-danger ring-danger/25",
  neutral: "bg-panel text-muted ring-border",
};

export const TONE_DOT: Record<Tone, string> = {
  success: "bg-success",
  indigo: "bg-secondary",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-subtle",
};

export const TONE_BAR: Record<Tone, string> = TONE_DOT;

export function ToneChip({ tone, children, className = "" }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ring-1 ring-inset ${TONE_CHIP[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  return <ToneChip tone={statusTone(status)}>{statusLabel(status)}</ToneChip>;
}

export function ToneDot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-muted whitespace-nowrap">
      <span aria-hidden className={`w-2 h-2 rounded-full ${TONE_DOT[tone]}`} />
      {label}
    </span>
  );
}

/** Score with a thin bar coloured by the AI suggestion. */
export function ToneScore({ value, tone, width = 72 }: { value: number | null; tone: Tone; width?: number }) {
  if (value == null) return <span className="text-[13px] text-subtle">No score</span>;
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="text-sm font-semibold tabular-nums text-fg w-7 text-right">{value}</span>
      <span className="h-1 rounded-full bg-panel" style={{ width }}>
        <span className={`block h-1 rounded-full ${TONE_BAR[tone]}`} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
      </span>
    </span>
  );
}

export type HeaderTab = "review" | "screenings" | "questions";

/**
 * Title band, credits chip, New screening and the Review / Screenings /
 * Question sets tabs.
 */
export function AiHeader({
  slug,
  active,
  counts,
  credits,
  canCreate,
  canBuy,
  packs,
}: {
  slug: string;
  active: HeaderTab | null;
  counts: { review: number; screenings: number };
  credits: CreditSummary;
  canCreate: boolean;
  canBuy: boolean;
  packs: { id: string; label: string; credits: number; priceCents: number }[];
}) {
  const base = `/w/${slug}/ai-interviews`;
  const tab = (id: HeaderTab, text: string, n: number | null, href: string) => (
    <Link
      key={id}
      href={href}
      aria-current={active === id ? "page" : undefined}
      className={`group relative flex items-center gap-2 h-10 px-0.5 text-sm font-medium transition-colors ${
        active === id ? "text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {text}
      {n != null && (
        <span
          className={`min-w-5 h-5 px-1.5 rounded-full text-xs leading-5 text-center tabular-nums transition-colors ${
            active === id ? "bg-secondary/20 text-secondary-soft" : "bg-panel text-subtle group-hover:text-muted"
          }`}
        >
          {n}
        </span>
      )}
      <span
        aria-hidden
        className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-secondary origin-left transition-transform duration-300 motion-reduce:transition-none ${
          active === id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
        }`}
      />
    </Link>
  );
  return (
    <div className="flex flex-col gap-4">
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 md:px-7 animate-slide-up motion-reduce:animate-none"
        style={{
          backgroundImage:
            "radial-gradient(520px 220px at 0% 0%, rgb(var(--c-accent-2) / 0.22), transparent 70%), radial-gradient(420px 200px at 100% 130%, rgb(var(--c-success) / 0.10), transparent 70%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--c-border-strong) / 0.55) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to left, black, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent 60%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span
              aria-hidden
              className="hidden sm:flex w-11 h-11 shrink-0 rounded-xl items-center justify-center bg-secondary/15 text-secondary-soft ring-1 ring-inset ring-secondary/25"
            >
              <Bot className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-tight text-fg">AI screening</h1>
              <p className="text-[15px] text-muted mt-1 max-w-[620px]">
                The AI interviewer runs a short coding interview with each candidate. You review the results and decide who passes.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CreditsChip credits={credits} canBuy={canBuy} packs={packs} slug={slug} />
            {canCreate && (
              <Btn variant="primary" size="md" icon={Plus} href={`${base}/new`}>
                New screening
              </Btn>
            )}
          </div>
        </div>
      </section>
      <nav aria-label="AI screening views" className="flex gap-6 border-b border-border overflow-x-auto">
        {tab("review", "Review", counts.review, base)}
        {tab("screenings", "Screenings", counts.screenings, `${base}/screenings`)}
        {tab("questions", "Question sets", null, `${base}/questions`)}
      </nav>
    </div>
  );
}

function CreditsChip({
  credits,
  canBuy,
  packs,
  slug,
}: {
  credits: CreditSummary;
  canBuy: boolean;
  packs: { id: string; label: string; credits: number; priceCents: number }[];
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, toast] = useToasts();
  const low = credits.available <= 2;

  async function buy(packId: string) {
    setBusy(packId);
    const r = await createCreditPackCheckoutAction(slug, packId);
    if (r.ok) {
      window.location.href = r.url;
      return;
    }
    setBusy(null);
    toast(r.error, "error");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border text-[13px] font-medium transition ${
          low ? "border-warning/50 bg-warning/10 text-fg hover:bg-warning/15" : "border-border bg-surface text-fg hover:bg-panel hover:border-border-strong"
        }`}
      >
        <Coins className="w-3.5 h-3.5 text-warning" aria-hidden />
        <span className="tabular-nums">{plural(credits.available, "credit")}</span>
        {canBuy && <span className="text-secondary-soft">Buy</span>}
      </button>
      {open && (
        <Dialog title="AI screening credits" onClose={() => setOpen(false)} width={500}>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Free to use", credits.available],
              ["Held by open invites", credits.held],
              ["Used this month", credits.usedThisMonth],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-xl border border-border bg-bg px-3 py-3">
                <div className="text-xl font-semibold tabular-nums text-fg">{v}</div>
                <div className="text-xs text-subtle mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-muted leading-relaxed">
            A credit is charged when a candidate starts, not when you send the invite: 1 credit when the interviewer answers
            questions, 2 when it checks in, 3 when it coaches. Invites that expire without being started cost nothing.
          </p>
          {canBuy ? (
            <div className="mt-5 flex flex-col gap-2">
              {packs.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-fg">
                      {p.label}, {p.credits} credits
                    </div>
                    <div className="text-xs text-subtle">${(p.priceCents / 100).toFixed(0)} one time</div>
                  </div>
                  <Btn variant="primary" disabled={!!busy} onClick={() => buy(p.id)}>
                    {busy === p.id ? "Opening checkout" : "Buy"}
                  </Btn>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-subtle">Ask a workspace owner or admin to buy more credits.</p>
          )}
        </Dialog>
      )}
      {toasts}
    </>
  );
}

/** The shared input style without its full width, for inline selects. */
export const selectCls = inputCls.replace("w-full", "");
