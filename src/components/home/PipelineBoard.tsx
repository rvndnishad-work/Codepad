"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * THE LIVE PIPELINE BOARD.
 *
 * The hiring page's product surface: a board that actually runs the funnel.
 * Candidates advance a stage, get rejected, reach an offer and leave, and new
 * applicants fill in behind them. The page argues "watch how candidates move",
 * so the hero shows movement.
 *
 * WHY IT LOOKS LIKE THIS. A row of bordered boxes with a name in it reads as a
 * wireframe, so every card carries four registers instead of one: a monogram
 * tile for identity, the name, a right-aligned figure in tabular mono, and a
 * five-segment signal meter — the site's stage motif shrunk to card scale.
 * Columns are lanes with a tinted ground and a capacity meter in the header,
 * so the board reads as an instrument rather than a grid of boxes.
 *
 * MOTION. Nothing floats, bounces, scales or glows. A card TRANSLATES on the
 * expo-out curve the travelling rules use, and the card that just moved holds
 * an accent border for one beat. Rejection and offer are two-beat: marked in
 * place so you can read what happened, then gone. The trace line underneath
 * narrates each move with a timestamp, which is what makes the animation a
 * readout rather than an effect.
 *
 * LAYOUT. Lanes are measured pixel widths on a weighted scale, not equal
 * fractions, so the three working stages get the room and OFFER — which holds
 * one card on its way out — gets a stub. Below a readable lane width the board
 * scrolls sideways instead of shrinking, which is how a real kanban behaves on
 * a phone, rather than four 85px columns of truncated names.
 *
 * The simulation is deterministic (no Math.random, no Date.now), so it renders
 * identically every time and never mismatches on hydration. It self-balances:
 * columns are capped, SCREENED is refilled from a cast longer than the board
 * can hold, and which stage moves first rotates so no column drains. It ticks
 * only while on screen; reduced-motion users get the opening frame, still.
 */

type Status = "pass" | "run" | "flag" | "rejected" | "hired";

type Card = {
  id: string;
  name: string;
  /** 0 screened · 1 challenge · 2 interview · 3 offer */
  col: number;
  status?: Status;
  /** Right-aligned figure, tabular. */
  figure: string;
  /** Lower-case stage detail under the name. */
  detail: string;
  /** Filled segments of the five-segment signal meter. */
  signal: number;
  /** Ticks spent in the current column — drives ordering within a column. */
  age: number;
};

const COLUMNS = ["Screened", "Challenge", "Interview", "Offer"];
const CAPACITY = 5;
const INTAKE_FLOOR = 4;
const SLOT_H = 80;
/**
 * Equal lanes. A narrowed OFFER column reads as an unfinished board rather
 * than a deliberate funnel, and at the widths this actually renders at there
 * is room to give every stage the same share — which is what a real kanban
 * does. The cast below is kept short enough that nothing truncates at the
 * resulting lane width.
 */
const LANES = 4;
/** A lane narrower than this truncates names, so the board scrolls instead. */
const MIN_UNIT = 150;
const FALLBACK_UNIT = 168;
const TICK_MS = 2200;

/**
 * The cast SCREENED is refilled from, cycled in order. It has to be longer
 * than the board can hold (4 + 5 + 5 + 1 = 15 slots, one intake per tick) or a
 * name recurs while the earlier card carrying it is still on screen, and the
 * board shows the same person in two columns.
 */
const INTAKE: { name: string; figure: string; signal: number; status?: Status }[] = [
  { name: "E. Sato", figure: "8.8", signal: 5, status: "pass" },
  { name: "N. Farah", figure: "7.4", signal: 4, status: "pass" },
  { name: "P. Ortiz", figure: "6.3", signal: 3 },
  { name: "K. Weber", figure: "8.1", signal: 4, status: "pass" },
  { name: "L. Duval", figure: "5.9", signal: 2 },
  { name: "H. Ali", figure: "7.7", signal: 4, status: "pass" },
  { name: "G. Nakamura", figure: "8.5", signal: 5, status: "pass" },
  { name: "Z. Haddadi", figure: "6.8", signal: 3 },
  { name: "O. Lind", figure: "7.2", signal: 4, status: "pass" },
  { name: "F. Duarte", figure: "8.3", signal: 5, status: "pass" },
  { name: "W. Osei", figure: "6.6", signal: 3 },
  { name: "I. Kovacs", figure: "7.9", signal: 4, status: "pass" },
  { name: "R. Bhatt", figure: "8.6", signal: 5, status: "pass" },
  { name: "S. Petrova", figure: "5.7", signal: 2 },
  { name: "T. Mensah", figure: "7.5", signal: 4, status: "pass" },
  { name: "C. Reyes", figure: "8.0", signal: 4, status: "pass" },
  { name: "A. Rahman", figure: "6.9", signal: 3 },
  { name: "M. Berg", figure: "7.8", signal: 4, status: "pass" },
];

const INITIAL: Card[] = [
  { id: "c1", name: "A. Okafor", col: 0, status: "pass", figure: "8.4", detail: "ai screen", signal: 5, age: 3 },
  { id: "c2", name: "M. Iyer", col: 0, status: "pass", figure: "7.9", detail: "ai screen", signal: 4, age: 2 },
  { id: "c3", name: "J. Park", col: 0, figure: "6.1", detail: "ai screen", signal: 3, age: 1 },
  { id: "c9", name: "B. Adeyemi", col: 0, status: "pass", figure: "8.0", detail: "ai screen", signal: 4, age: 0 },
  { id: "c4", name: "R. Novak", col: 1, status: "pass", figure: "12/12", detail: "tests ok", signal: 5, age: 3 },
  { id: "c5", name: "S. Haddad", col: 1, status: "run", figure: "04:12", detail: "running", signal: 3, age: 2 },
  { id: "c6", name: "T. Lund", col: 1, status: "flag", figure: "x3", detail: "integrity", signal: 1, age: 1 },
  { id: "c10", name: "V. Petrov", col: 1, status: "run", figure: "60m", detail: "assigned", signal: 3, age: 0 },
  { id: "c7", name: "C. Mbeki", col: 2, status: "pass", figure: "58m", detail: "replay", signal: 5, age: 2 },
  { id: "c8", name: "D. Rossi", col: 2, figure: "Thu", detail: "scheduled", signal: 3, age: 1 },
  { id: "c11", name: "Y. Tanaka", col: 2, status: "pass", figure: "Fri", detail: "panel", signal: 4, age: 0 },
];

/** Two-letter monogram: "M. Iyer" becomes MI. */
function monogram(name: string) {
  const parts = name.replace(/[^A-Za-z ]/g, " ").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** What a card becomes when it lands in a given column. Deterministic. */
function landing(col: number, card: Card): Partial<Card> {
  const n = card.name.length;
  if (col === 1)
    return n % 2 === 0
      ? { figure: "60m", detail: "assigned", status: "run" as Status, signal: 3 }
      : {
        figure: `0${1 + (n % 5)}:${10 + (n % 48)}`,
        detail: "running",
        status: "run" as Status,
        signal: 3,
      };
  if (col === 2)
    return {
      figure: `${11 + (n % 2)}/12`,
      detail: "tests ok",
      status: "pass" as Status,
      signal: 4 + (n % 2),
    };
  if (col === 3)
    return { figure: "sent", detail: "offer", status: "hired" as Status, signal: 5 };
  return {};
}

type Log = { text: string; kind: "move" | "reject"; at: number };

function step(prev: Card[], tick: number, cursor: number) {
  // Beat two of a two-beat exit: anything marked last tick now leaves.
  let cards = prev
    .filter((c) => c.status !== "rejected" && c.col !== 3)
    .map((c) => ({ ...c, age: c.age + 1 }));

  let log: Omit<Log, "at"> = { text: "", kind: "move" };
  let movedId = "";
  const inCol = (col: number) => cards.filter((c) => c.col === col);
  // Longest-waiting card in a column moves first — a queue, not a shuffle.
  const front = (col: number) => inCol(col).slice().sort((a, b) => b.age - a.age)[0];

  // Every fourth tick is a rejection: this is a funnel, not a conveyor belt.
  if (tick % 4 === 3) {
    const flagged = cards.find((c) => c.status === "flag");
    const weakest = inCol(0).slice().sort((a, b) => a.signal - b.signal)[0];
    const target = flagged ?? weakest;
    if (target) {
      cards = cards.map((c) =>
        c.id === target.id
          ? { ...c, status: "rejected" as Status, detail: "rejected" }
          : c
      );
      log = {
        text: `${target.name} rejected · ${target.status === "flag" ? "integrity flag" : "below bar"
          }`,
        kind: "reject",
      };
    }
  } else {
    // Rotate which stage moves first. A fixed front-to-back priority drains
    // the middle of the funnel within a few ticks and the board looks
    // abandoned; taking turns keeps all four columns working.
    const startAt = tick % 3;
    for (const col of [startAt, (startAt + 1) % 3, (startAt + 2) % 3]) {
      const cand = front(col);
      const roomAhead = col === 2 || inCol(col + 1).length < CAPACITY;
      if (cand && roomAhead) {
        cards = cards.map((c) =>
          c.id === cand.id ? { ...c, col: col + 1, age: 0, ...landing(col + 1, c) } : c
        );
        movedId = cand.id;
        log = {
          text:
            col + 1 === 3
              ? `${cand.name} → offer sent`
              : `${cand.name} → ${COLUMNS[col + 1].toLowerCase()}`,
          kind: "move",
        };
        break;
      }
    }
  }

  // Top the intake back up so the funnel always has something entering it.
  let next = cursor;
  while (cards.filter((c) => c.col === 0 && c.status !== "rejected").length < INTAKE_FLOOR) {
    const seed = INTAKE[next % INTAKE.length];
    cards.push({
      id: `n${next}`,
      name: seed.name,
      figure: seed.figure,
      signal: seed.signal,
      status: seed.status,
      detail: "ai screen",
      col: 0,
      age: 0,
    });
    next += 1;
  }

  return { cards, log, cursor: next, movedId };
}

/** Statuses worth spelling out on the card; the rest are clear from context. */
const NOTABLE = new Set(["rejected", "flag", "hired"]);

const RAIL: Record<string, string> = {
  pass: "bg-emerald-500",
  run: "bg-amber-500",
  flag: "bg-accent",
  rejected: "bg-rose-500",
  hired: "bg-emerald-500",
};

/** 09:14 plus ~37s per tick. Derived, never Date.now — hydration must match. */
function clockAt(tick: number) {
  const total = 9 * 60 + 14 + Math.floor((tick * 37) / 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function PipelineBoard() {
  const reduced = useReducedMotion();
  const [cards, setCards] = useState<Card[]>(INITIAL);
  const [log, setLog] = useState<Log>({ text: "board live", kind: "move", at: 0 });
  const [movedId, setMovedId] = useState("");
  const [unit, setUnit] = useState(FALLBACK_UNIT);
  /** Measured track width, and whether the lanes fit inside it. */
  const [box, setBox] = useState({ w: 0, fits: false });
  const tickRef = useRef(0);
  const cursorRef = useRef(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Lanes fill the available width when each one lands above MIN_UNIT;
  // otherwise they hold a readable size and the board scrolls sideways, which
  // is how a real kanban behaves on a phone. Measured before paint, no jump.
  useIsoLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const fit = el.clientWidth / LANES;
      const fits = fit >= MIN_UNIT;
      setUnit(fits ? fit : FALLBACK_UNIT);
      setBox({ w: el.clientWidth, fits });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // An interview funnel simulating itself in a background tab helps nobody.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.2,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const advance = useCallback(() => {
    setCards((prev) => {
      const res = step(prev, tickRef.current, cursorRef.current);
      cursorRef.current = res.cursor;
      tickRef.current += 1;
      if (res.log.text) setLog({ ...res.log, at: tickRef.current });
      setMovedId(res.movedId);
      return res.cards;
    });
  }, []);

  useEffect(() => {
    if (reduced || !inView) return;
    const id = window.setInterval(advance, TICK_MS);
    return () => window.clearInterval(id);
  }, [reduced, inView, advance]);

  const slotOf = (card: Card) =>
    cards
      .filter((c) => c.col === card.col)
      .sort((a, b) => b.age - a.age || a.id.localeCompare(b.id))
      .findIndex((c) => c.id === card.id);

  const countIn = (col: number) =>
    cards.filter((c) => c.col === col && c.status !== "rejected").length;
  const liveCount = cards.filter((c) => c.status !== "rejected").length;

  const last = COLUMNS.length - 1;
  const offsetOf = (col: number) => col * Math.round(unit);
  /**
   * Rounding each lane independently left the total a pixel wider than the
   * track, which was enough to open a scrollbar on a board that fits. The
   * final lane absorbs the remainder instead.
   */
  const widthOf = (col: number) =>
    col === last && box.fits && box.w > 0
      ? Math.max(0, box.w - offsetOf(last))
      : Math.round(unit);
  const boardW = offsetOf(last) + widthOf(last);

  return (
    <div ref={hostRef} className="ip-frame ip-ticks ip-ticks-secondary">
      {/* Chrome */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
        <span className="ip-label ip-label-fg">acme</span>
        <span className="ip-label">· engineering</span>
        <span className="ip-rule-soft h-px flex-1" aria-hidden />
        <span className="ip-label flex items-center gap-1.5">
          <span className="ip-live h-[5px] w-[5px] bg-emerald-500" aria-hidden />
          {liveCount} in flight
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden">
        <div style={{ width: boardW }}>
          {/* Column headers, each with a capacity meter built from the motif */}
          <div className="flex border-b border-border">
            {COLUMNS.map((label, i) => (
              <div
                key={label}
                style={{ width: widthOf(i) }}
                className={`shrink-0 px-3 py-2.5 ${i > 0 ? "border-l border-border" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="ip-label truncate">{label}</span>
                  <span className="ip-nums font-mono text-[11px] text-fg">{countIn(i)}</span>
                </div>
                <div className="mt-2 flex items-center gap-[3px]" aria-hidden>
                  {Array.from({ length: CAPACITY }).map((_, k) => (
                    <span
                      key={k}
                      className={`h-[3px] flex-1 ${k < countIn(i) ? "bg-secondary" : "bg-border"
                        }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Lanes + cards */}
          <div
            className="relative overflow-hidden"
            style={{ height: CAPACITY * SLOT_H }}
            aria-label="Candidate pipeline board"
          >
            {COLUMNS.map((label, i) => (
              <span
                key={label}
                aria-hidden
                style={{ left: offsetOf(i), width: widthOf(i) }}
                className={`absolute bottom-0 top-0 ${i % 2 === 1 ? "bg-panel/40" : ""} ${i > 0 ? "border-l border-border" : ""
                  }`}
              />
            ))}

            <AnimatePresence>
              {cards.map((card) => {
                const slot = slotOf(card);
                if (slot < 0 || slot >= CAPACITY) return null;
                const rejected = card.status === "rejected";
                const hired = card.status === "hired";
                const justMoved = card.id === movedId;
                return (
                  <motion.div
                    key={card.id}
                    className="absolute left-0 top-0 shrink-0 p-1.5"
                    style={{ width: widthOf(card.col) }}
                    initial={reduced ? false : { opacity: 0, y: slot * SLOT_H - 10 }}
                    animate={{ opacity: 1, x: offsetOf(card.col), y: slot * SLOT_H }}
                    exit={
                      reduced
                        ? { opacity: 0 }
                        : {
                          opacity: 0,
                          // Offers leave right, rejections drop out left.
                          x: offsetOf(card.col) + (card.col === 3 ? 40 : -40),
                          transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
                        }
                    }
                    transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      className={`relative flex items-center gap-2.5 border bg-surface py-2 pl-3 pr-2.5 transition-colors duration-500 ${rejected
                        ? "border-rose-500/40"
                        : hired
                          ? "border-emerald-500/45"
                          : justMoved
                            ? "border-secondary/60"
                            : "border-border"
                        }`}
                    >
                      {/* Status rail — the ip-row marker, at card scale */}
                      <span
                        aria-hidden
                        className={`absolute inset-y-0 left-0 w-[2px] ${card.status ? RAIL[card.status] : "bg-border-strong"
                          }`}
                      />

                      {/* Monogram: identity without a stock avatar */}
                      <span
                        aria-hidden
                        className={`grid h-7 w-7 shrink-0 place-items-center border font-mono text-[11px] ${rejected
                          ? "border-rose-500/30 text-rose-700 dark:text-rose-400"
                          : hired
                            ? "border-emerald-500/35 text-emerald-800 dark:text-emerald-400"
                            : "border-border bg-panel text-subtle"
                          }`}
                      >
                        {monogram(card.name)}
                      </span>

                      {/* The name owns line one outright. Sharing it with the
                          figure cost ~30px and truncated half the cast once
                          the lanes were equalised. */}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[12.5px] font-semibold leading-tight ${
                            rejected ? "text-muted line-through" : "text-fg"
                          }`}
                        >
                          {card.name}
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          {NOTABLE.has(card.status ?? "") ? (
                            <span className="truncate font-mono text-[11px] text-subtle">
                              {card.detail}
                            </span>
                          ) : (
                            /* Five-segment signal meter: the stage motif, shrunk */
                            <span className="flex shrink-0 items-center gap-[2px]" aria-hidden>
                              {Array.from({ length: 5 }).map((_, k) => (
                                <span
                                  key={k}
                                  className={`h-[4px] w-[4px] ${
                                    k < card.signal
                                      ? "bg-secondary"
                                      : "border border-border-strong"
                                  }`}
                                />
                              ))}
                            </span>
                          )}
                          <span
                            className={`ip-nums ml-auto shrink-0 font-mono text-[11px] ${
                              rejected
                                ? "text-rose-700 dark:text-rose-400"
                                : hired
                                  ? "text-emerald-800 dark:text-emerald-400"
                                  : "text-fg"
                            }`}
                          >
                            {rejected ? "—" : card.figure}
                          </span>
                        </span>
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Trace line — what makes the movement a readout rather than an effect */}
      <div className="flex items-center gap-2.5 border-t border-border px-4 py-2.5">
        <span className="ip-nums hidden font-mono text-[11px] text-subtle sm:inline">
          {clockAt(log.at)}
        </span>
        <span
          aria-hidden
          className={`h-[5px] w-[5px] shrink-0 ${log.kind === "reject" ? "bg-rose-500" : "bg-secondary"
            }`}
        />
        <AnimatePresence mode="wait">
          <motion.span
            key={`${log.text}-${log.at}`}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            className="ip-label truncate"
          >
            {log.text}
          </motion.span>
        </AnimatePresence>
        <span className="ip-label ip-label-secondary ml-auto hidden shrink-0 md:inline">
          Replay on every attempt
        </span>
      </div>
    </div>
  );
}
