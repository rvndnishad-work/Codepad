"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./brand/BrandLogo";
import { BRANDS, type BrandKey } from "@/lib/brand";

/** `brand` is the domain's brand; `null` keeps the old per-route behaviour when both sites share a domain. */
export default function HeaderLogo({ brand }: { brand: BrandKey | null }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");
  const shown: BrandKey = brand ?? (pathname?.startsWith("/hire") || pathname?.startsWith("/w") ? "intervutree" : "devprep");

  return (
    <Link
      href={isAdminPage ? "/admin" : "/"}
      className="hidden md:flex items-center gap-3 group shrink-0 overflow-visible"
      aria-label={`${BRANDS[shown].name} home`}
    >
      <BrandLogo brand={shown} />
      {isAdminPage && (
        <span className="ip-label ip-label-accent border-l border-border pl-2.5">
          Admin Portal
        </span>
      )}
    </Link>
  );
}
