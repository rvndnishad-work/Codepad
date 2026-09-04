"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoDynamic from "./LogoDynamic";

export default function HeaderLogo() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");
  // Recruiter/hiring view carries the indigo (secondary) brand mark.
  const isRecruiter = pathname?.startsWith("/hire") || pathname?.startsWith("/w");

  return (
    <Link
      href={isAdminPage ? "/admin" : "/"}
      className="hidden md:flex items-center gap-3 group shrink-0 overflow-visible"
      aria-label="Interviewpad home"
    >
      <LogoDynamic tone={isRecruiter ? "secondary" : "accent"} />
      {isAdminPage && (
        <span className="ip-label ip-label-accent border-l border-border pl-2.5">
          Admin Portal
        </span>
      )}
    </Link>
  );
}

