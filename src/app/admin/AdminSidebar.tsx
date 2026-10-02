"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronsLeft, ChevronsRight, Menu, Shield, X } from "lucide-react";
import { AdminNavCollapsedContext } from "./admin-nav-context";
import AdminLink from "./AdminLink";
import type { AdminNavGroup } from "./admin-nav";

const STORAGE_KEY = "admin_sidebar_collapsed";

interface AdminSidebarProps {
  session: {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  } | null;
  nav: AdminNavGroup[];
  badges?: Record<string, { count: number; tone: "warn" | "bad" }>;
}

export default function AdminSidebar({ session, nav, badges }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Desktop icon rail, persisted like the workspace sidebar. The mobile
  // drawer always shows full labels.
  const [railCollapsed, setRailCollapsed] = useState(false);
  useEffect(() => {
    try {
      setRailCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);
  const toggleCollapsed = () =>
    setRailCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* storage blocked */
      }
      return next;
    });
  const collapsed = railCollapsed && !isOpen;

  // Automatically close mobile menu when path changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Handle scroll locking on underlying page when menu drawer is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Groups come from admin-nav.ts, already filtered to the permissions this
  // person holds. Styling mirrors the workspace sidebar (WorkspaceSidebarNav):
  // sentence-case labels, text-sm rows, quiet groups.
  const groupLabel = (label: string) =>
    collapsed ? (
      <div className="hidden lg:block h-px bg-border w-6 mx-auto my-3" aria-hidden />
    ) : (
      <div className="text-xs font-medium text-subtle px-2.5 mt-4 mb-1.5">{label}</div>
    );

  const NavigationLinks = () => (
    <nav aria-label="Admin" className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 flex flex-col gap-0.5 ${collapsed ? "lg:px-2 px-3" : "px-3"}`}>
      {nav.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-0.5">
          {group.label && groupLabel(group.label)}
          {group.links.map((l) => (
            <AdminLink
              key={l.href}
              href={l.href}
              icon={l.icon}
              label={l.label}
              exact={l.exact}
              match={l.match}
              badge={badges?.[l.href]}
            />
          ))}
        </div>
      ))}
    </nav>
  );

  const BrandHeader = () => (
    <div className={`h-14 shrink-0 border-b border-border flex items-center gap-2.5 ${collapsed ? "lg:justify-center lg:px-2 px-4" : "px-4"}`}>
      <div className="w-7 h-7 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
        <Shield className="w-4 h-4" aria-hidden />
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-fg leading-tight">Admin</div>
          <div className="text-xs text-subtle truncate leading-tight">{session?.user?.email}</div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Top Sticky Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-bg border-b border-border sticky top-0 w-full z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" aria-hidden />
          </div>
          <span className="text-sm font-semibold text-fg">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-fg transition"
            title="Back to site"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-fg transition focus:outline-none"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Navigation Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 ${collapsed ? "lg:w-16" : "lg:w-60"} bg-bg border-r border-border flex flex-col h-full z-50 transform lg:transform-none transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:relative lg:z-20 shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex absolute -right-3 top-[68px] z-40 w-6 h-6 items-center justify-center rounded-full border border-border bg-surface text-subtle hover:text-fg hover:border-border-strong transition-colors"
        >
          {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
        </button>
        <AdminNavCollapsedContext.Provider value={collapsed}>
          <BrandHeader />
          <NavigationLinks />
        </AdminNavCollapsedContext.Provider>
      </aside>
    </>
  );
}
