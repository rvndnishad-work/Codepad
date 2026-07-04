"use client";

import { useEffect, useState } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import type { LeaderboardRow } from "./types";

function fmtTime(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function Leaderboard({
  challengeId,
  refreshKey = 0,
}: {
  challengeId: string;
  /** Bump to force a re-fetch (e.g. after the user posts a new hunt run). */
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/review-challenges/leaderboard?challengeId=${encodeURIComponent(challengeId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [challengeId, refreshKey]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
          <Trophy className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Hunt Leaderboard</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          <span className="text-xs">Loading…</span>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted py-6 text-center">
          No timed runs yet — be the first to set a record.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.attemptId}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-bg/60 border border-border/50"
            >
              <span
                className={`w-6 text-center font-mono font-bold text-sm ${
                  r.rank === 1
                    ? "text-amber-500"
                    : r.rank === 2
                      ? "text-slate-400"
                      : r.rank === 3
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-muted"
                }`}
              >
                {r.rank}
              </span>
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-fg">{r.name}</span>
              <span className="text-[11px] text-muted font-mono">
                {r.foundCount}/{r.totalFindings}
              </span>
              <span className="text-[11px] text-muted font-mono w-14 text-right">{fmtTime(r.durationSec)}</span>
              <span className="text-sm font-mono font-bold text-emerald-500 w-10 text-right tabular-nums">
                {r.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
