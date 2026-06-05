"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "./Logo";

export default function HeaderLogo() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <Link href={isAdminPage ? "/admin" : "/"} className="hidden md:flex items-center gap-2.5 group shrink-0 overflow-visible">
      <LogoLockup height={58} className="drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.25)] transition-transform group-hover:scale-105" />
      {isAdminPage && (
        <span className="text-[9px] font-black tracking-widest text-accent uppercase border-l border-border pl-2.5">
          Admin Portal
        </span>
      )}
    </Link>
  );
}
