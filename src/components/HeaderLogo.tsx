"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "./Logo";

export default function HeaderLogo() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");
  // Recruiter/hiring view carries the indigo (secondary) brand mark.
  const isRecruiter = pathname?.startsWith("/hire") || pathname?.startsWith("/w");

  return (
    <Link
      href={isAdminPage ? "/admin" : "/"}
      className="hidden md:flex items-center gap-3 group shrink-0 overflow-visible"
    >
      {/* Crisp optical centering at height 46 within the 64px header bar */}
      <LogoLockup height={46} tone={isRecruiter ? "secondary" : "accent"} />
      {isAdminPage ? (
        <span className="ip-label ip-label-accent border-l border-border pl-2.5">
          Admin Portal
        </span>
      ) : (
        <span className="hidden xl:inline-flex items-center gap-1.5 border-l border-border pl-3 text-subtle">
          <span
            className={`h-1.5 w-1.5 ${isRecruiter ? "bg-secondary" : "bg-accent"}`}
            aria-hidden
          />
          <span className="ip-label ip-label-xs">
            {isRecruiter ? "Hiring runtime" : "Interview runtime"}
          </span>
        </span>
      )}
    </Link>
  );
}
