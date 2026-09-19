"use client";

import { useEffect } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { toast } from "sonner";

export type FormatResult = {
  /** The file that was formatted. */
  path: string;
  /** Code after formatting (equals the input when unchanged). */
  code: string;
  /** Whether the file was rewritten. */
  changed: boolean;
};

export function FormatBridge({
  formatRef,
}: {
  formatRef: React.MutableRefObject<
    ((opts?: { quiet?: boolean }) => Promise<FormatResult | null>) | null
  >;
}) {
  const { sandpack } = useSandpack();

  useEffect(() => {
    formatRef.current = async (opts) => {
      const quiet = opts?.quiet ?? false;
      const path = sandpack.activeFile;
      if (!path) return null;
      const file = sandpack.files[path];
      const code = typeof file === "string" ? file : (file as { code: string }).code;

      const { formatCode } = await import("@/lib/format");
      const result = await formatCode(path, code);
      if (!result.ok) {
        if (!quiet) toast.error("Format failed", { description: result.reason });
        return { path, code, changed: false };
      }
      if (result.code === code) {
        if (!quiet) toast("Already formatted");
        return { path, code, changed: false };
      }
      sandpack.updateFile(path, result.code);
      if (!quiet) toast.success("Formatted");
      return { path, code: result.code, changed: true };
    };
  }, [sandpack]);

  return null;
}
