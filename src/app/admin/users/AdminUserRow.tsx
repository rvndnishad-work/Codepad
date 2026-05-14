"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, User, Trash2, ExternalLink, Code2, Target, FileText, Loader2, Edit3, ShieldAlert } from "lucide-react";
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
    createdAt: Date;
    isAdmin: boolean;
    _count: {
      snippets: number;
      attempts: number;
      blogs: number;
    };
  };
}

export default function AdminUserRow({ user }: AdminUserRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

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

  const initials = (user.name || user.email || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <tr className={`group transition-colors ${user.banned ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-elevated/30"}`}>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Link 
              href={`/u/${user.id}`}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-surface border border-border flex-shrink-0 flex items-center justify-center transition hover:border-accent group/avatar"
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
                className="font-bold text-fg truncate block hover:text-accent transition"
              >
                {user.name || "Anonymous User"}
              </Link>
              <div className="text-xs text-muted truncate">{user.email}</div>
            </div>
          </div>
        </td>

        <td className="px-6 py-4">
          <div className="flex flex-col gap-1.5 items-start">
            {user.isAdmin ? (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-wider border border-accent/20">
                <Shield className="w-3 h-3" />
                Admin
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/10 text-muted text-[10px] font-black uppercase tracking-wider border border-border">
                User
              </div>
            )}
            
            {user.banned && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider border border-red-500/20">
                <ShieldAlert className="w-3 h-3" />
                Banned
              </div>
            )}
          </div>
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center justify-center gap-4">
            <Link href={`/u/${user.id}`} className="flex flex-col items-center group/stat" title="Snippets">
              <Code2 className="w-3.5 h-3.5 text-muted mb-0.5 group-hover/stat:text-fg transition" />
              <span className="text-[10px] font-mono font-bold text-muted group-hover/stat:text-fg transition">{user._count.snippets}</span>
            </Link>
            <div className="flex flex-col items-center" title="Challenges">
              <Target className="w-3.5 h-3.5 text-muted mb-0.5" />
              <span className="text-[10px] font-mono font-bold text-muted">{user._count.attempts}</span>
            </div>
            <div className="flex flex-col items-center" title="Blogs">
              <FileText className="w-3.5 h-3.5 text-muted mb-0.5" />
              <span className="text-[10px] font-mono font-bold text-muted">{user._count.blogs}</span>
            </div>
          </div>
        </td>

        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-xs font-mono text-muted">
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(user.createdAt))}
          </div>
        </td>

        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-accent hover:border-accent/50 transition"
              title="Edit User"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            
            <Link
              href={`/u/${user.id}`}
              target="_blank"
              className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-fg hover:border-border-strong transition"
              title="View Profile"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            
            {!user.isAdmin && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-red-500 hover:border-red-500/50 transition disabled:opacity-50"
                title="Delete User"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </td>
      </tr>

      {isEditOpen && (
        <AdminUserEditModal
          user={user}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  );
}
