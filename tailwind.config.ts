import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        panel: "var(--panel)",
        elevated: "var(--elevated)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",
        fg: "var(--fg)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          glow: "var(--accent-glow)",
        },
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
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        "tile": "0 1px 0 rgba(var(--accent-rgb),0.04) inset, 0 1px 2px rgba(0,0,0,0.12)",
        "tile-hover":
          "0 0 0 1px rgba(var(--accent-rgb),0.45), 0 8px 24px -8px rgba(var(--accent-rgb),0.3)",
        "soft": "0 2px 8px rgba(0,0,0,0.15)",
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
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 320ms cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scale-in 200ms ease-out",
        "pop-in": "pop-in 260ms cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 2.6s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
