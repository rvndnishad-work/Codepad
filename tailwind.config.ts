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
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
