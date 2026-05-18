"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Target, Compass, Briefcase, Shield, ChevronDown, BookOpen, Home, Box } from "lucide-react";
import { LogoMark } from "./Logo";
import { NavLinkConfig } from "@/lib/settings-constants";

const ICON_MAP: Record<string, any> = {
  "/": Home,
  "/playgrounds": Box,
  "/challenges": Target,
  "/blog": BookOpen,
  "/explore": Compass,
  "/interview": Briefcase,
};


export default function MobileNav({
  signedIn,
  isAdmin,
  navLinks,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  navLinks: NavLinkConfig[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Outside-click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visibleItems = [
    ...navLinks
      .filter((link) => {
        if (link.href === "/interview" && !signedIn) return false;
        if (link.status === "hidden" && !isAdmin) return false;
        return true;
      })
      .map((link) => ({
        ...link,
        icon: ICON_MAP[link.href] || Code2,
        isComingSoon: link.status === "coming_soon",
        isHidden: link.status === "hidden",
      })),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield, adminOnly: true }] : []),
  ];

  return (
    <>
      {/*
        On mobile, the logo itself is the menu trigger — the previous Menu
        (hamburger) icon was visually indistinguishable from LogoMark, so we
        collapsed them into one button.
      */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
        className="md:hidden flex items-center gap-2.5 group rounded-lg -m-1 p-1 hover:bg-elevated/60 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-soft grid place-items-center shadow-[0_0_15px_rgba(var(--accent-rgb),0.18)]">
          <LogoMark size={18} className="text-bg" />
        </div>
        <span className="font-bold text-lg tracking-tight text-fg leading-none">
          Interviewpad<span className="text-fg/30 font-normal">.in</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="md:hidden absolute left-0 right-0 top-full mt-px bg-surface border-b border-border shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col">
            {visibleItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const isComingSoon = "isComingSoon" in item && item.isComingSoon;
              const isHidden = "isHidden" in item && item.isHidden;

              const content = (
                <>
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {isComingSoon && (
                    <span className="ml-auto text-[8px] px-1 rounded uppercase font-black bg-amber-500/10 text-amber-600/60">
                      Soon
                    </span>
                  )}
                  {isHidden && isAdmin && (
                    <span className="ml-auto text-[8px] px-1 rounded uppercase font-black bg-rose-500/20 text-rose-500">
                      Hidden
                    </span>
                  )}
                </>
              );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "adminOnly" in item
                        ? "bg-accent/10 text-accent"
                        : "bg-elevated text-fg"
                      : "text-fg/70 hover:bg-elevated hover:text-fg"
                  } ${isHidden || (isComingSoon && !isAdmin) ? "opacity-60" : ""}`}
                >
                  {content}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
