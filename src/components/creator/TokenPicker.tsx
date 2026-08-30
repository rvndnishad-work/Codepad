"use client";

import { TOKEN_PRESETS, contrastRatio, type TokenPresetKey, type TokenSet } from "@/lib/creator/tokens";

type Props = {
  value: TokenSet | null;
  onChange: (next: TokenSet) => void;
};

const PRESET_META: Record<TokenPresetKey, { label: string; desc: string }> = {
  slate: { label: "Slate", desc: "Default dark look" },
  glassmorphism: { label: "Glassmorphism", desc: "Translucent glass blurs" },
  neon: { label: "Neon Cyber", desc: "High-energy cyber glows" },
  minimalist: { label: "Minimalist", desc: "Borderless flat simplicity" },
  editorial: { label: "Editorial", desc: "Serif headlines, warm accent" },
  paper: { label: "Paper", desc: "Warm paper, amber accent" },
  midnight: { label: "Midnight", desc: "Deep indigo elevated" },
  aurora: { label: "Aurora", desc: "Emerald glass freshness" },
};

function swatchStyle(tokens: TokenSet): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accentSoft})`,
    borderRadius: 10,
  };
}

function contrastBadge(tokens: TokenSet): { label: string; tone: string } {
  // contrast of accent text on white-ish surface approximation; threshold 4.5 for AA
  const ratio = contrastRatio(tokens.accent, "#ffffff");
  if (ratio >= 7) return { label: `AAA ${ratio.toFixed(1)}:1`, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (ratio >= 4.5) return { label: `AA ${ratio.toFixed(1)}:1`, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (ratio >= 3) return { label: `AA Large ${ratio.toFixed(1)}:1`, tone: "text-amber-600 bg-amber-50 border-amber-200" };
  return { label: `Low ${ratio.toFixed(1)}:1`, tone: "text-rose-600 bg-rose-50 border-rose-200" };
}

export default function TokenPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(Object.entries(TOKEN_PRESETS) as [TokenPresetKey, TokenSet][]).map(([key, preset]) => {
        const active = value ? value.accent === preset.accent && value.radius === preset.radius : key === "slate";
        const badge = contrastBadge(preset);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(preset)}
            className={`relative text-left rounded-xl border p-3 transition-all ${
              active ? "border-accent bg-accent-glow shadow-soft" : "border-border bg-bg/40 hover:border-border-strong hover:bg-bg/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 shrink-0 border border-black/10 shadow-sm" style={swatchStyle(preset)} aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-fg">{PRESET_META[key].label}</span>
                <span className="block text-[10px] text-muted leading-normal truncate">{PRESET_META[key].desc}</span>
              </span>
            </div>
            <span
              className={`mt-2 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${badge.tone}`}
              title={`Contrast ${preset.accent} on white`}
            >
              {badge.label}
            </span>
            {active && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
