"use client";

import { useState } from "react";
import Link from "next/link";
import { countCards, GROUP_LABELS, type CardGroup, type CardState, type CatalogCard } from "@/lib/connections/catalog";
import { Chip, type Tone } from "./ui";

type Filter = "all" | "connected" | "attention";

const STATE_TONE: Record<CardState, Tone> = {
  connected: "positive",
  attention: "attention",
  available: "neutral",
  planned: "neutral",
  locked: "neutral",
  blocked: "neutral",
};

const TILE: Record<CardGroup, string> = {
  ats: "bg-success/10 text-success",
  scheduling: "bg-secondary/10 text-secondary",
  alerts: "bg-panel text-fg",
  developers: "bg-panel text-fg",
};

function matches(card: CatalogCard, f: Filter) {
  if (f === "all") return true;
  if (f === "attention") return card.state === "attention";
  return card.state === "connected" || card.state === "attention";
}

function Card({ card }: { card: CatalogCard }) {
  if (card.note) {
    return (
      <div className="rounded-xl border border-dashed border-border p-[18px] flex flex-col gap-1">
        <span className="font-semibold text-fg">{card.name}</span>
        <span className="text-[13px] text-muted leading-relaxed">{card.meta}</span>
      </div>
    );
  }
  const border = card.state === "attention" ? "border-warning/60" : card.state === "connected" && card.group === "ats" ? "border-secondary" : "border-border";
  return (
    <div className={`rounded-xl border ${border} bg-surface p-[18px] flex flex-col gap-3`}>
      <div className="flex items-center gap-3">
        {card.tile && (
          <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center font-bold text-sm shrink-0 ${card.group === "ats" && card.state !== "connected" && card.state !== "attention" ? "bg-panel text-fg" : TILE[card.group]}`} aria-hidden>
            {card.tile}
          </div>
        )}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-semibold text-fg truncate">{card.name}</span>
          {card.subtitle && <span className="text-[13px] text-muted truncate">{card.subtitle}</span>}
        </div>
        {card.chip && <Chip tone={STATE_TONE[card.state]}>{card.chip}</Chip>}
      </div>
      <p className="text-[13px] text-muted leading-relaxed flex-1">{card.meta}</p>
      {card.action && (
        <div className="flex gap-2">
          {card.action.href ? (
            <Link
              href={card.action.href}
              className={
                card.action.primary
                  ? "inline-flex items-center h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition"
                  : "inline-flex items-center h-9 px-3.5 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel transition"
              }
            >
              {card.action.label}
            </Link>
          ) : (
            <span className="inline-flex items-center h-9 px-3.5 rounded-lg border border-border text-sm text-subtle">{card.action.label}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConnectionsCatalog({ cards, canManage }: { cards: CatalogCard[]; canManage: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = countCards(cards);
  const visible = cards.filter((c) => (c.note ? filter === "all" : matches(c, filter)));
  const groups = (Object.keys(GROUP_LABELS) as CardGroup[])
    .map((g) => ({ g, items: visible.filter((c) => c.group === g) }))
    .filter((x) => x.items.length);

  const filters: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "connected", label: "Connected", n: counts.connected },
    { key: "attention", label: "Needs attention", n: counts.attention },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] font-semibold tracking-tight text-fg">Connections</h1>
          <p className="text-sm text-muted max-w-[620px]">
            Bring applied candidates in from your ATS, send decisions back, and keep calendars and chat in step.{" "}
            {canManage ? "Only admins can change these." : "Only admins can change these, so you see their status here."}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter connections">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center h-7 px-2.5 rounded-full text-[13px] font-medium transition ${
                filter === f.key ? "bg-fg text-bg" : "bg-panel text-fg hover:brightness-95"
              }`}
            >
              {f.label} {f.n}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">Nothing here right now.</div>
      )}

      {groups.map(({ g, items }) => (
        <section key={g} className="flex flex-col gap-2.5" aria-labelledby={`grp-${g}`}>
          <h2 id={`grp-${g}`} className="text-[13px] font-semibold text-muted">
            {GROUP_LABELS[g]}
          </h2>
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((c) => (
              <Card key={c.key} card={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
