"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "./Logo";

export default function HeaderLogo() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");
  // Recruiter/hiring view carries the indigo (secondary) brand mark.
  const isRecruiter = pathname?.startsWith("/hire");

  return (
    <Link href={isAdminPage ? "/admin" : "/"} className="hidden md:flex items-center gap-2.5 group shrink-0 overflow-visible">
      {/* No glow, no lift. The mark is the mark; hover is handled by the
          nav's own rules, not by making the logo bloom. */}
      <LogoLockup height={58} tone={isRecruiter ? "secondary" : "accent"} />
      {isAdminPage && (
        <span className="ip-label ip-label-accent border-l border-border pl-2.5">
          Admin Portal
        </span>
      )}
    </Link>
  );
}
