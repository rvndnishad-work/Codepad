"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, User, Trash2, ExternalLink, Code2, Target, FileText, Loader2, Edit3, ShieldAlert, ShieldOff, GraduationCap, Briefcase } from "lucide-react";
import AdminUserEditModal from "./AdminUserEditModal";

interface AdminUserRowProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    bio: string | null;
    hireMeUrl: string | null;
    portfolioPublic: boolean;
    banned: boolean;
    userType: string | null;
    createdAt: Date;
    isAdmin: boolean;
    _count: {
      snippets: number;
      attempts: number;
      blogs: number;
    };
    workspaces?: {
      role: string;
      workspace: {
        name: string;
        slug: string;
      };
    }[];
  };
}

export default function AdminUserRow({ user }: AdminUserRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete ${user.name || user.email}? This action is permanent and will delete all their data.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete user");
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Error deleting user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleBan() {
    const action = user.banned ? "unban" : "ban";
    if (!confirm(`${action === "ban" ? "Ban" : "Unban"} ${user.name || user.email}?`)) {
      return;
    }

    setIsToggling(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !user.banned }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} user`);
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Error ${action}ning user.`);
    } finally {
      setIsToggling(false);
    }
  }

  const initials = (user.name || user.email || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div 
        className={`group transition-all duration-300 border-b border-border last:border-b-0 ${
          user.banned 
            ? "bg-red-500/[0.02] hover:bg-red-500/[0.04]" 
            : "hover:bg-panel/20"
        } p-5 lg:p-0 lg:grid lg:grid-cols-[2.2fr_1fr_1.2fr_1fr_1fr] lg:items-center lg:px-6 lg:py-4`}
      >
        {/* Column 1: User Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <Link 
            href={`/u/${user.id}`}
            className="relative w-10 h-10 rounded-full overflow-hidden bg-panel/20 border border-border flex-shrink-0 flex items-center justify-center transition-all duration-300 group-hover:border-accent/40 group-hover:shadow-sm group/avatar"
          >
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="text-[10px] font-black text-muted group-hover/avatar:text-accent transition">
                {initials}
              </div>
            )}
          </Link>
          <div className="min-w-0">
            <Link 
              href={`/u/${user.id}`}
              className="font-bold text-fg truncate block hover:text-accent transition text-sm tracking-tight"
            >
              {user.name || "Anonymous User"}
            </Link>
            <div className="text-xs text-muted/65 truncate font-mono tracking-tight">{user.email}</div>
          </div>
        </div>

        {/* Column 2: Role / Badges */}
        <div className="mt-4 lg:mt-0 flex flex-col gap-2 items-start justify-center">
          <div className="flex items-center justify-between w-full lg:w-auto gap-2">
            <span className="lg:hidden text-[9px] uppercase tracking-[0.1em] font-black text-muted/50">Role & Status</span>
            <div className="flex items-center gap-1.5">
              {user.isAdmin ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-wider border border-accent/20 shadow-sm">
                  <Shield className="w-2.5 h-2.5" />
                  Admin
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-panel/40 text-muted text-[9px] font-black uppercase tracking-wider border border-border">
                  User
                </div>
              )}
              
              {user.banned && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-semibold uppercase tracking-wide border border-red-500/20 shadow-sm">
                  <ShieldAlert className="w-2.5 h-2.5" />
                  Banned
                </div>
              )}

              <UserTypeBadge userType={user.userType} />
            </div>
          </div>
          {user.workspaces && user.workspaces.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              {user.workspaces.map((w, idx) => (
                <Link
                  key={idx}
                  href={`/w/${w.workspace.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/15 text-[9px] font-bold transition"
                >
                  <span className="capitalize">{w.role.toLowerCase()}</span> in {w.workspace.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Activity stats */}
        <div className="mt-4 lg:mt-0 flex flex-col gap-2 lg:flex-row lg:items-center w-full lg:w-auto">
          <span className="lg:hidden text-[9px] uppercase tracking-[0.1em] font-black text-muted/50">Activity Stats</span>
          <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center lg:gap-4 bg-panel/10 lg:bg-transparent border border-border lg:border-none p-2 lg:p-0 rounded-xl w-full lg:w-auto">
            <Link href={`/u/${user.id}`} className="flex flex-col lg:flex-row items-center justify-center gap-1.5 py-1 px-2 rounded-lg hover:bg-panel/40 lg:hover:bg-transparent transition-all group/stat" title="Snippets">
              <Code2 className="w-3.5 h-3.5 text-muted/70 group-hover/stat:text-accent transition" />
              <span className="text-[10px] font-mono font-bold text-muted/80 group-hover/stat:text-accent transition">{user._count.snippets}</span>
              <span className="lg:hidden text-[8px] uppercase tracking-wider font-black text-muted/40">Snippets</span>
            </Link>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-1.5 py-1 px-2 rounded-lg transition group/stat" title="Challenges">
              <Target className="w-3.5 h-3.5 text-muted/70" />
              <span className="text-[10px] font-mono font-bold text-muted/80">{user._count.attempts}</span>
              <span className="lg:hidden text-[8px] uppercase tracking-wider font-black text-muted/40">Attempts</span>
            </div>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-1.5 py-1 px-2 rounded-lg transition group/stat" title="Blogs">
              <FileText className="w-3.5 h-3.5 text-muted/70" />
              <span className="text-[10px] font-mono font-bold text-muted/80">{user._count.blogs}</span>
              <span className="lg:hidden text-[8px] uppercase tracking-wider font-black text-muted/40">Blogs</span>
            </div>
          </div>
        </div>

        {/* Column 4: Joined Date */}
        <div className="mt-4 lg:mt-0 flex items-center justify-between lg:justify-start gap-2">
          <span className="lg:hidden text-[9px] uppercase tracking-[0.1em] font-black text-muted/50">Joined</span>
          <div className="text-xs font-mono text-muted/70">
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(user.createdAt))}
          </div>
        </div>

        {/* Column 5: Actions */}
        <div className="mt-5 lg:mt-0 flex items-center justify-end gap-2 border-t border-border pt-4 lg:border-none lg:pt-0">
          <button
            onClick={() => setIsEditOpen(true)}
            className="p-2 rounded-lg bg-panel/10 border border-border text-muted/85 hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all duration-200"
            title="Edit User"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <Link
            href={`/u/${user.id}`}
            target="_blank"
            className="p-2 rounded-lg bg-panel/10 border border-border text-muted/85 hover:text-fg hover:border-border hover:bg-panel/40 transition-all duration-200"
            title="View Profile"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {!user.isAdmin && (
            <button
              onClick={handleToggleBan}
              disabled={isToggling}
              className={`p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 ${
                user.banned
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15"
                  : "bg-panel/10 border-border text-muted/85 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5"
              }`}
              title={user.banned ? "Unban User" : "Ban User"}
            >
              {isToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : user.banned ? (
                <ShieldOff className="w-3.5 h-3.5" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {!user.isAdmin && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 rounded-lg bg-panel/10 border border-border text-muted/85 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-200 disabled:opacity-50"
              title="Delete User"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {isEditOpen && (
        <AdminUserEditModal
          user={user}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Renders the user's userType as a small chip alongside the Admin/User/Banned
 * badges. Every user is expected to be candidate or recruiter post-backfill;
 * the null branch returns nothing so we don't render a meaningless chip if a
 * row somehow slips through with no type set.
 */
function UserTypeBadge({ userType }: { userType: string | null }) {
  if (userType === "candidate") {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-semibold uppercase tracking-wide border border-sky-500/20">
        <GraduationCap className="w-2.5 h-2.5" />
        Candidate
      </div>
    );
  }
  if (userType === "recruiter") {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold uppercase tracking-wide border border-emerald-500/20">
        <Briefcase className="w-2.5 h-2.5" />
        Recruiter
      </div>
    );
  }
  return null;
}
