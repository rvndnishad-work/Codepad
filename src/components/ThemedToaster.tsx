"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export default function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--fg)",
        },
        classNames: {
          description: "!text-fg/80",
          title: "!text-fg",
        },
      }}
    />
  );
}
