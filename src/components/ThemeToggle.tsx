"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl border border-border bg-surface/50" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="group relative w-9 h-9 rounded-xl border border-border bg-surface/50 hover:bg-elevated hover:border-accent/30 transition-all duration-300 flex items-center justify-center overflow-hidden"
      aria-label="Toggle theme"
    >
      <div className="relative w-4 h-4 overflow-hidden">
        <Sun
          className={`absolute inset-0 w-4 h-4 transition-all duration-500 transform ${
            theme === "dark" ? "translate-y-[120%] opacity-0" : "translate-y-0 opacity-100 rotate-0"
          } text-accent`}
        />
        <Moon
          className={`absolute inset-0 w-4 h-4 transition-all duration-500 transform ${
            theme === "dark" ? "translate-y-0 opacity-100 rotate-0" : "translate-y-[-120%] opacity-0"
          } text-accent`}
        />
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-accent/5 blur-xl pointer-events-none" />
    </button>
  );
}
