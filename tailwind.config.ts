import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08090c",
        surface: "#0d1016",
        panel: "#12151d",
        elevated: "#181c26",
        border: "#20242f",
        "border-strong": "#2a2f3c",
        muted: "#7b8496",
        subtle: "#9aa3b5",
        fg: "#e8ebf2",
        accent: {
          DEFAULT: "#7c7fff",
          soft: "#6366f1",
          glow: "rgba(124, 127, 255, 0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        "tile": "0 1px 0 rgba(255,255,255,0.03) inset, 0 1px 2px rgba(0,0,0,0.3)",
        "tile-hover":
          "0 0 0 1px rgba(124,127,255,0.45), 0 8px 24px -8px rgba(124,127,255,0.3)",
        "soft": "0 2px 8px rgba(0,0,0,0.25)",
      },
      backgroundImage: {
        "grid-pattern":
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
        "hero-glow":
          "radial-gradient(800px circle at 50% -20%, rgba(124,127,255,0.12), transparent 60%)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
