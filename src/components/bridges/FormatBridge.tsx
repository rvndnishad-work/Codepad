"use client";

import { useEffect } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { toast } from "sonner";

export function FormatBridge({
  formatRef,
}: {
  formatRef: React.MutableRefObject<(() => Promise<void>) | null>;
}) {
  const { sandpack } = useSandpack();
  
  useEffect(() => {
    formatRef.current = async () => {
      const path = sandpack.activeFile;
      if (!path) return;
      const file = sandpack.files[path];
      const code = typeof file === "string" ? file : (file as { code: string }).code;
      
      const { formatCode } = await import("@/lib/format");
      const result = await formatCode(path, code);
      if (!result.ok) {
        toast.error("Format failed", { description: result.reason });
        return;
      }
      if (result.code === code) {
        toast("Already formatted");
        return;
      }
      sandpack.updateFile(path, result.code);
      toast.success("Formatted");
    };
  }, [sandpack]);

  return null;
}
