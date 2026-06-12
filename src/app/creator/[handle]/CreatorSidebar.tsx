"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  ExternalLink,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Globe,
  Users,
  LayoutGrid,
  Wallet,
  ArrowLeft,
  Settings,
} from "lucide-react";
import UserMenu from "@/components/UserMenu";

const STORAGE_KEY = "creator_sidebar_collapsed";

type SpaceItem = { name: string; handle: string };

type Props = {
  activeHandle: string;
  activeSpaceName: string;
  spaces: SpaceItem[];
  user: { name: string | null | undefined; email: string | null | undefined; image: string | null | undefined };
  isAdmin: boolean;
};

export default function CreatorSidebar({
  activeHandle,
  activeSpaceName,
  spaces,
  user,
  isAdmin,
}: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      document.body.classList.toggle("creator-sidebar-collapsed", collapsed);
    } catch {
      /* ignore */
    }
    return () => {
      try {
        document.body.classList.remove("creator-sidebar-collapsed");
      } catch {
        /* ignore */
      }
    };
  }, [collapsed]);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  const menuItems = [
    { label: "Overview", icon: Compass, href: `/creator/${activeHandle}` },
    { label: "Public Page Layout", icon: Globe, href: `/creator/${activeHandle}/layout` },
    { label: "Users / Members", icon: Users, href: `/creator/${activeHandle}/users` },
    { label: "Content & Access", icon: LayoutGrid, href: `/creator/${activeHandle}/content` },
    { label: "Payment & Payouts", icon: Wallet, href: `/creator/${activeHandle}/payment` },
    { label: "Space Settings", icon: Settings, href: `/creator/${activeHandle}/settings` },
  ];

  return (
    <aside
      className={`relative w-full ${
        collapsed ? "md:w-16" : "md:w-64"
      } md:h-full bg-surface/80 border-b md:border-b-0 md:border-r border-border backdrop-blur-md flex flex-col shrink-0 z-30 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
    >
      {/* Edge collapse toggle */}
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden md:flex absolute -right-3 top-6 z-40 w-6 h-6 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-fg hover:border-accent/50 shadow-sm transition-colors"
      >
        {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Active space header */}
      <div className={`border-b border-border ${collapsed ? "p-3 flex justify-center" : "p-4"}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center text-accent font-semibold text-[11px] shrink-0 select-none"
            title={collapsed ? activeSpaceName : undefined}
          >
            {activeSpaceName.substring(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-fg truncate">{activeSpaceName}</div>
              <div className="text-[10px] text-muted truncate">/c/{activeHandle}</div>
            </div>
          )}
        </div>
      </div>

      {/* Switcher + Nav Links */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-5 ${collapsed ? "px-2" : "px-3"}`}>
        {!collapsed && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
              Your Pages
            </div>

            {spaces.map((sp) => {
              const isActive = sp.handle === activeHandle;
              return (
                <Link
                  key={sp.handle}
                  href={`/creator/${sp.handle}`}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-fg hover:bg-panel/40"
                  }`}
                >
                  <Store className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-accent" : "text-muted/60"}`} />
                  <span className="truncate">{sp.name}</span>
                </Link>
              );
            })}

            <Link
              href="/creator?create=true"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-muted/70 hover:text-fg hover:bg-panel/30 transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Page</span>
            </Link>
          </div>
        )}

        <div className="space-y-1">
          {!collapsed && (
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
              Creator Studio
            </div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const tone = isActive
              ? "bg-accent/10 text-accent font-semibold"
              : "text-muted hover:text-fg hover:bg-panel/40";
            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] transition-colors ${tone}`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-accent" : "text-muted/60 group-hover:text-fg"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={`border-t border-border flex flex-col gap-2 ${collapsed ? "p-2 items-center" : "p-3"}`}>
        <Link
          href="/dashboard"
          title={collapsed ? "Back to Dashboard" : undefined}
          className={`flex items-center rounded-md bg-panel/40 border border-border text-muted hover:text-fg hover:border-accent/40 transition-colors ${
            collapsed ? "justify-center w-9 h-9" : "justify-between px-2.5 py-2 text-[11px] font-semibold w-full"
          }`}
        >
          {!collapsed && <span>Personal Dashboard</span>}
          <ArrowLeft className="w-3 h-3 shrink-0" />
        </Link>

        <div
          className={`flex items-center rounded-md border border-border bg-bg/40 ${
            collapsed ? "justify-center p-1.5" : "justify-between p-1.5 gap-2 w-full"
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-7 h-7 rounded-md border border-border bg-surface shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/25 flex items-center justify-center text-accent text-xs font-semibold shrink-0">
                  {user.name?.substring(0, 1).toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-fg truncate">{user.name || "Anonymous"}</div>
                <div className="text-[10px] text-muted truncate">{user.email || "No email"}</div>
              </div>
            </div>
          )}
          <UserMenu user={{ name: user.name, email: user.email, image: user.image }} isAdmin={isAdmin} />
        </div>
      </div>
    </aside>
  );
}
