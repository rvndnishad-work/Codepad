"use client";

import { useRef, useState } from "react";
import { Eye, Heart, Users, Wallet, type LucideIcon } from "lucide-react";

/**
 * Four stat tiles with 30-day sparklines. Each tile is a single-series line
 * (title names the series — no legend needed) with a crosshair tooltip.
 * Colors are the validated 600-step palette (passes light+dark surfaces).
 */

export type SeriesPoint = { date: string; value: number };

type TileSpec = {
  key: string;
  label: string;
  total: string;
  series: SeriesPoint[];
  /** validated chart color, one per metric */
  color: string;
  icon: "views" | "follows" | "members" | "earnings";
  /** serializable formatter id — resolved client-side (fns can't cross RSC) */
  unit: "views" | "new" | "joined" | "money";
};

const ICONS: Record<TileSpec["icon"], LucideIcon> = {
  views: Eye,
  follows: Heart,
  members: Users,
  earnings: Wallet,
};

const FORMATTERS: Record<TileSpec["unit"], (v: number) => string> = {
  views: (v) => `${v} view${v === 1 ? "" : "s"}`,
  new: (v) => `${v} new`,
  joined: (v) => `${v} joined`,
  money: (v) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v),
};

export default function OverviewCharts({ tiles }: { tiles: TileSpec[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map((t) => (
        <StatTile key={t.key} tile={t} />
      ))}
    </div>
  );
}

function StatTile({ tile }: { tile: TileSpec }) {
  const Icon = ICONS[tile.icon];
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 pt-4 pb-3 shadow-tile">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color: tile.color }} /> {tile.label}
        </div>
      </div>
      <div className="mt-1.5 text-2xl font-black text-fg leading-none tabular-nums">{tile.total}</div>
      <div className="mt-3">
        <Sparkline series={tile.series} color={tile.color} format={FORMATTERS[tile.unit]} />
      </div>
      <div className="mt-1 text-[9px] font-semibold text-muted/70 uppercase tracking-wider">Last 30 days</div>
    </div>
  );
}

const W = 220;
const H = 48;
const PAD = 4;

function Sparkline({
  series,
  color,
  format,
}: {
  series: SeriesPoint[];
  color: string;
  format: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(1, ...series.map((p) => p.value));
  const x = (i: number) => PAD + (i / Math.max(1, series.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const points = series.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPath = `M ${PAD},${H - PAD} L ${points.replaceAll(" ", " L ")} L ${W - PAD},${H - PAD} Z`;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD) / (W - PAD * 2)) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  }

  const hp = hover != null ? series[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-12 block"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Sparkline, latest ${format(series[series.length - 1]?.value ?? 0)}`}
      >
        <path d={areaPath} fill={color} opacity={0.1} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* endpoint dot */}
        {series.length > 0 && (
          <circle cx={x(series.length - 1)} cy={y(series[series.length - 1].value)} r={3} fill={color} />
        )}
        {/* crosshair + hover marker */}
        {hover != null && hp && (
          <>
            <line x1={x(hover)} y1={PAD} x2={x(hover)} y2={H - PAD} stroke="currentColor" strokeOpacity={0.25} strokeWidth={1} />
            <circle cx={x(hover)} cy={y(hp.value)} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
      </svg>
      {hover != null && hp && (
        <div
          className="absolute -top-9 z-10 rounded-lg border border-border bg-bg px-2 py-1 text-[10px] font-semibold text-fg whitespace-nowrap pointer-events-none shadow-tile"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > series.length / 2 ? "-100%" : "0"})`,
          }}
        >
          <span className="text-muted">{hp.date}</span> · {format(hp.value)}
        </div>
      )}
    </div>
  );
}
