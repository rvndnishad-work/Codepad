"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

function FooterShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  // Hide footer where vertical space matters (playground, embeds)
  if (pathname?.startsWith("/embed")) return null;
  if (pathname?.startsWith("/play")) return null;
  if (params?.get("view") === "preview") return null;
  return <>{children}</>;
}

export default function FooterShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <FooterShellInner>{children}</FooterShellInner>
    </Suspense>
  );
}
