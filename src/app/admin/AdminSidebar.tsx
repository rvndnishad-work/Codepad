"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, X } from "lucide-react";
import AdminLink from "./AdminLink";
import AdminPersonaToggle from "./AdminPersonaToggle";
import type { AdminPersona } from "@/lib/admin-persona";

interface AdminSidebarProps {
  session: {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  } | null;
  persona: AdminPersona;
}

export default function AdminSidebar({ session, persona }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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

  const initials = (session?.user?.name || session?.user?.email || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Nav is split by persona so the sidebar only shows what's relevant to the
  // admin's current job. "Core" + "System" are always rendered; the middle
  // section flips based on the toggle.
  const NavigationLinks = () => (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      <div className="text-[9px] font-bold tracking-wider text-muted/55 uppercase px-3 mb-2">
        Core
      </div>
      <AdminLink href="/admin" icon="LayoutDashboard" label="Dashboard" />
      <AdminLink href="/admin/inbox" icon="Inbox" label="Inbox" />

      {/* Persona toggle drives which group of links renders below. */}
      <div className="pt-4">
        <AdminPersonaToggle initial={persona} />
      </div>

      {persona === "candidate" ? (
        <>
          <AdminLink href="/admin/users" icon="Users" label="Users" />
          <AdminLink href="/admin/snippets" icon="Pin" label="Trends" />
          <AdminLink href="/admin/blogs" icon="FileText" label="Blogs" />
          <AdminLink href="/admin/comments" icon="MessageCircle" label="Comments" />
          <AdminLink href="/admin/challenges" icon="Target" label="Challenges" />
          <AdminLink href="/admin/attempts" icon="Code2" label="Attempts" />
          <AdminLink href="/admin/creators" icon="Sparkles" label="Creators" />
        </>
      ) : (
        <>
          <AdminLink href="/admin/users/recruiters" icon="Users" label="Users" />
          <AdminLink href="/admin/workspaces" icon="Building2" label="Workspaces" />
          <AdminLink href="/admin/interviews" icon="Briefcase" label="Interviews" />
          <AdminLink href="/admin/ai-interviews" icon="Coins" label="AI Credits" />
        </>
      )}

      <div className="text-[9px] font-bold tracking-wider text-muted/55 uppercase px-3 pt-4 mb-2">
        System
      </div>
      <AdminLink href="/admin/copilot" icon="GemmaMark" label="Gemma Copilot" />
      <AdminLink href="/admin/todos" icon="ClipboardList" label="Todos" />
      <AdminLink href="/admin/notifications" icon="Megaphone" label="Notifications" />
      <AdminLink href="/admin/emails" icon="Mail" label="Emails" />
      <AdminLink href="/admin/roles" icon="ShieldCheck" label="Roles" />
      <AdminLink href="/admin/settings" icon="Settings" label="Settings" />
    </nav>
  );

  const ProfileDetails = () => (
    <div className="p-4 border-t border-border bg-elevated/20 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-mono font-bold text-xs uppercase shrink-0">
        {session?.user?.name?.[0] || session?.user?.email?.[0] || "A"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-fg truncate">
          {session?.user?.name || "Administrator"}
        </div>
        <div className="text-[10px] text-muted truncate leading-none mt-0.5">
          {session?.user?.email}
        </div>
      </div>
    </div>
  );

  const BrandHeader = () => (
    <div className="p-5 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-bg font-black text-sm shrink-0">
          IP
        </div>
        <div>
          <div className="text-[9px] font-black tracking-[0.2em] text-muted uppercase leading-none">
            Internal
          </div>
          <h1 className="text-sm font-black tracking-tight mt-0.5">Admin Panel</h1>
        </div>
      </div>
      <Link
        href="/"
        className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-fg hover:border-border-strong transition"
        title="Back to site"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
      </Link>
    </div>
  );

  return (
    <>
      {/* Mobile Top Sticky Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-panel/90 backdrop-blur-md border-b border-border sticky top-0 w-full z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-bg font-black text-xs shrink-0">
            IP
          </div>
          <h1 className="text-xs font-black tracking-wider uppercase text-fg">Admin Panel</h1>
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
        className={`fixed inset-y-0 left-0 w-64 bg-panel/95 backdrop-blur-xl border-r border-border flex flex-col h-full z-50 transform lg:transform-none transition-transform duration-300 ease-in-out lg:relative lg:z-20 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <BrandHeader />
        <NavigationLinks />
        <ProfileDetails />
      </aside>
    </>
  );
}
