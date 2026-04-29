"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

function HeaderShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname?.startsWith("/embed")) return null;
  if (params?.get("view") === "preview") return null;
  return <>{children}</>;
}

export default function HeaderShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <HeaderShellInner>{children}</HeaderShellInner>
    </Suspense>
  );
}
