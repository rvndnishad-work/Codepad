import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  // The `ip-*` design-language classes live in `@layer components` in
  // globals.css, and Tailwind tree-shakes that layer against the content
  // scan. Safelisting the prefix keeps the system whole in production even
  // when a class is only referenced from a variable, and lets us ship
  // vocabulary (e.g. `ip-chip-accent`) ahead of its first use.
  safelist: [{ pattern: /^ip-/ }],
  theme: {
    extend: {
      colors: {
        /* Resolved from channel triplets, not from the hex vars directly.
           Tailwind can only honour an opacity modifier (`bg-accent/10`,
           `border-border/40`) when the colour exposes `<alpha-value>`; given a
           bare `var(--accent)` it drops the declaration, which silently
           renders tinted backgrounds transparent and bordered elements in the
           default grey. These must be the SPACE-separated `--c-*` channels:
           `rgb(1, 2, 3 / .4)` is invalid CSS and fails the same way. The hex
           and comma `--*-rgb` vars remain for use in plain CSS. */
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        border: "rgb(var(--c-border) / <alpha-value>)",
        "border-strong": "rgb(var(--c-border-strong) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        subtle: "rgb(var(--c-subtle) / <alpha-value>)",
        fg: "rgb(var(--c-fg) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          soft: "rgb(var(--c-accent-soft) / <alpha-value>)",
          glow: "var(--accent-glow)",
          ink: "var(--accent-ink)",
        },
        secondary: {
          DEFAULT: "rgb(var(--c-accent-2) / <alpha-value>)",
          soft: "rgb(var(--c-accent-2-soft) / <alpha-value>)",
          glow: "var(--accent-2-glow)",
          ink: "var(--accent-2-ink)",
        },
        /* Ink is the structural primary (see globals.css "Runtime" notes):
           near-black on paper, paper on near-black. `ink-fg` is the only
           colour that belongs on top of it. */
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          fg: "rgb(var(--c-ink-fg) / <alpha-value>)",
        },
        /* The editorial hairline and the blueprint field. Both already carry
           their own alpha, so they stay as plain vars. */
        rule: "var(--rule)",
        grid: "var(--grid)",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        /* Shape is semantic here. `sharp` (0) is the default for structure,
           `data` (2px) marks a datum, `action` (4px) marks a control. The
           legacy xl/2xl steps stay for the app shell, which is not part of
           the marketing redesign. */
        sharp: "0",
        data: "2px",
        action: "4px",
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        /* Marketing surfaces do not use shadows — depth comes from the rule
           system. These remain for the app shell (menus, toasts, overlays)
           where a floating layer genuinely leaves the page. */
        "tile": "0 1px 0 rgba(var(--accent-rgb),0.04) inset, 0 1px 2px rgba(0,0,0,0.12)",
        "tile-hover":
          "0 0 0 1px rgba(var(--accent-rgb),0.45), 0 8px 24px -8px rgba(var(--accent-rgb),0.3)",
        "soft": "0 2px 8px rgba(0,0,0,0.15)",
        /* The one elevation the redesign allows: a hard-edged drop for
           command panels, so they read as a sheet placed on the page rather
           than a blurred glass bubble. Defined per theme in globals.css — on
           dark a black drop is invisible, so the token swaps to an edge ring. */
        "panel": "var(--shadow-panel)",
      },
      backgroundImage: {
        "grid-pattern":
          "radial-gradient(circle at 1px 1px, rgba(var(--accent-rgb),0.07) 1px, transparent 0)",
        "hero-glow":
          "radial-gradient(800px circle at 50% -20%, rgba(var(--accent-rgb),0.12), transparent 60%)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.7)" },
          "60%": { opacity: "1", transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "marquee-left": { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "rule-in": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        "marquee-right": { from: { transform: "translateX(-50%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 320ms cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scale-in 200ms ease-out",
        "pop-in": "pop-in 260ms cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 2.6s linear infinite",
        "marquee-left": "marquee-left 42s linear infinite",
        "rule-in": "rule-in 520ms cubic-bezier(0.16,1,0.3,1) both",
        "marquee-right": "marquee-right 48s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
