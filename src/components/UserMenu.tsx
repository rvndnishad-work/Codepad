"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, User as UserIcon, LogOut, Shield } from "lucide-react";
import { handleSignOut } from "@/app/actions";

type UserShape = {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
};

export default function UserMenu({
  user,
  isAdmin,
}: {
  user: UserShape;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
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

  const initial = (user.name ?? user.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        className="block rounded-full focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? ""}
            width={32}
            height={32}
            className="rounded-full ring-1 ring-border hover:ring-accent/30 transition-all"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface border border-border grid place-items-center text-xs font-semibold text-fg/80 hover:bg-elevated transition-colors">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Account block */}
          <div className="px-4 py-3 border-b border-border bg-surface/80">
            {user.name && (
              <div className="font-bold text-sm text-fg truncate">{user.name}</div>
            )}
            {user.email && (
              <div className="text-xs text-muted truncate">{user.email}</div>
            )}
          </div>

          {/* Primary actions */}
          <div className="p-1">
            <MenuLink
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href="/profile"
              icon={UserIcon}
              label="Profile"
              onClick={() => setOpen(false)}
            />
            {isAdmin && (
              <MenuLink
                href="/admin"
                icon={Shield}
                label="Admin"
                accent
                onClick={() => setOpen(false)}
              />
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-border p-1">
            <form action={handleSignOut}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-fg/70 hover:bg-elevated hover:text-fg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        accent
          ? "text-accent hover:bg-accent/10"
          : "text-fg/70 hover:bg-elevated hover:text-fg"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
