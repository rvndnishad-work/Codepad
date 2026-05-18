"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./Logo";

export default function HeaderLogo() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <Link href={isAdminPage ? "/admin" : "/"} className="hidden md:flex items-center gap-2.5 group">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-soft grid place-items-center shadow-[0_0_15px_rgba(var(--accent-rgb),0.18)] transition-transform group-hover:scale-105 shrink-0">
        <LogoMark size={18} className="text-bg" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-lg tracking-tight text-fg group-hover:text-fg/90 transition-colors">
          Interviewpad<span className="text-fg/30 font-normal">.in</span>
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
