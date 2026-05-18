"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  FileText, 
  User, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  Star,
  MessageSquare,
  Heart,
  MoreHorizontal,
  Edit3,
  Eye
} from "lucide-react";
import AdminBlogModerationModal from "./AdminBlogModerationModal";
import { BulkRowCheckbox } from "./BlogsBulkTable";

interface AdminBlogRowProps {
  blog: {
    id: string;
    slug: string;
    title: string;
    status: string;
    featured: boolean;
    adminNotes: string | null;
    createdAt: Date;
    viewCount: number;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
    _count: {
      reactions: number;
      comments: number;
    };
  };
}

export default function AdminBlogRow({ blog }: AdminBlogRowProps) {
  const [isModOpen, setIsModOpen] = useState(false);

  const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
    DRAFT: { label: "Draft", icon: FileText, color: "text-muted bg-muted/10 border-border" },
    PENDING: { label: "Pending", icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    PUBLISHED: { label: "Published", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    REJECTED: { label: "Rejected", icon: XCircle, color: "text-red-500 bg-red-500/10 border-red-500/20" },
    NEEDS_CHANGES: { label: "Changes", icon: AlertCircle, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  };

  const config = statusConfig[blog.status] || statusConfig.DRAFT;

  return (
    <>
      <tr className="group hover:bg-elevated/30 transition-colors">
        <td className="pl-6 pr-2 py-4 w-8">
          <BulkRowCheckbox id={blog.id} />
        </td>
        <td className="px-6 py-4 max-w-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted/20 border border-border flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-muted" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-fg truncate block">
                  {blog.title}
                </span>
                {blog.featured && (
                  <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                )}
              </div>
              <div className="text-xs text-muted truncate">/{blog.slug}</div>
            </div>
          </div>
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-muted relative">
              {blog.user.image ? (
                <Image src={blog.user.image} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-muted">
                  {(blog.user.name || "?")[0]}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-muted truncate max-w-[100px]">
              {blog.user.name || blog.user.email}
            </span>
          </div>
        </td>

        <td className="px-6 py-4">
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.color}`}>
            <config.icon className="w-3 h-3" />
            {config.label}
          </div>
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center" title="Views">
              <Eye className="w-3.5 h-3.5 text-muted mb-0.5" />
              <span className="text-[10px] font-mono font-bold text-muted">{blog.viewCount}</span>
            </div>
            <div className="flex flex-col items-center" title="Reactions">
              <Heart className="w-3.5 h-3.5 text-muted mb-0.5" />
              <span className="text-[10px] font-mono font-bold text-muted">{blog._count.reactions}</span>
            </div>
            <div className="flex flex-col items-center" title="Comments">
              <MessageSquare className="w-3.5 h-3.5 text-muted mb-0.5" />
              <span className="text-[10px] font-mono font-bold text-muted">{blog._count.comments}</span>
            </div>
          </div>
        </td>

        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsModOpen(true)}
              className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-accent hover:border-accent/50 transition"
              title="Moderate Blog"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <Link
              href={`/blog/${blog.slug}`}
              target="_blank"
              className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-fg hover:border-border-strong transition"
              title="View Blog"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </td>
      </tr>

      {isModOpen && (
        <AdminBlogModerationModal
          blog={blog}
          onClose={() => setIsModOpen(false)}
        />
      )}
    </>
  );
}
