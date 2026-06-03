"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./Logo";

export default function HeaderLogo() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <Link href={isAdminPage ? "/admin" : "/"} className="hidden md:flex items-center gap-2.5 group">
      <LogoMark size={32} className="drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.35)] transition-transform group-hover:scale-105" />
      <div className="flex flex-col leading-none">
        <span className="font-extrabold text-lg tracking-tight text-fg group-hover:text-fg/90 transition-colors">
          Interview<span className="text-accent font-medium">pad</span>
          <span className="text-fg/30 font-normal text-sm">.in</span>
        </span>
        {isAdminPage && (
          <span className="text-[9px] font-black tracking-widest text-accent uppercase mt-0.5">
            Admin Portal
          </span>
        )}
      </div>
    </Link>
  );
}
