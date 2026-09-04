"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

function HeaderShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname?.startsWith("/embed")) return null;
  if (pathname?.startsWith("/ai-interview")) return null;
  if (params?.get("view") === "preview") return null;
  // Full-screen coding IDE — the playground manages its own chrome (with an
  // exit button back to /playgrounds). Exact /play or /play/* only: the
  // /playgrounds browser keeps the global nav.
  if (pathname === "/play" || pathname?.startsWith("/play/")) return null;
  // The challenge attempt page is a full-screen coding IDE with its own top bar
  // (title + countdown + submit) — drop the global nav so it isn't dead space.
  if (pathname && /^\/challenges\/[^/]+\/attempt$/.test(pathname)) return null;
  return <>{children}</>;
}

export default function HeaderShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <HeaderShellInner>{children}</HeaderShellInner>
    </Suspense>
  );
}
