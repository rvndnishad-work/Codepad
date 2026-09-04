"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** The home, hire + playground heroes are dark in both themes — the only
 *  places the bar may float transparent. Everywhere else it starts opaque
 *  so light pages keep a readable nav. */
const IMMERSIVE_EXACT = ["/", "/hire", "/playgrounds", "/candidate/playgrounds"];

function isImmersive(pathname: string | null): boolean {
  if (!pathname) return false;
  return IMMERSIVE_EXACT.includes(pathname);
}

/**
 * Scroll-aware navbar chrome. At the top of an immersive route the bar is
 * transparent (white content over the dark hero); past ~24px — or on any
 * other route — it condenses into an opaque glass bar with theme content.
 * Starts opaque to avoid a flash of the wrong state during hydration.
 */
export default function NavChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(true);

  useEffect(() => {
    if (!isImmersive(pathname)) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return (
    <header data-scrolled={scrolled} className="site-nav sticky top-0 z-[100] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300">
      <div
        aria-hidden
        className="nav-hairline pointer-events-none absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-[#8b93ff]/60 to-transparent transition-opacity duration-300"
      />
      {children}
    </header>
  );
}
