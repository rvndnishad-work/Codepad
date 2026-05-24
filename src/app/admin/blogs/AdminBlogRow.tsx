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
      <div 
        className={`group transition-all duration-200 border-b border-border last:border-b-0 hover:bg-panel/5 p-5 lg:p-0 lg:grid lg:grid-cols-[40px_3fr_1.5fr_1.2fr_1.5fr_1.8fr] lg:items-center lg:px-6 lg:py-4`}
      >
        {/* Column 1: Checkbox */}
        <div className="flex items-center lg:justify-center mb-3 lg:mb-0">
          <BulkRowCheckbox id={blog.id} />
          <span className="lg:hidden text-[10px] uppercase font-bold text-muted ml-2 tracking-wider">Select Blog</span>
        </div>

        {/* Column 2: Blog Post Info */}
        <div className="min-w-0 mb-3 lg:mb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted/20 border border-border flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-muted" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-fg text-sm lg:text-base group-hover:text-accent transition truncate block">
                  {blog.title}
                </span>
                {blog.featured && (
                  <Star className="w-3.5 h-3.5 text-accent fill-accent flex-shrink-0" />
                )}
              </div>
              <div className="text-xs text-muted truncate">/{blog.slug}</div>
            </div>
          </div>
        </div>

        {/* Column 3: Author */}
        <div className="mt-2 lg:mt-0 flex items-center lg:block">
          <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-20 mr-2 block">Author:</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-muted relative border border-border">
              {blog.user.image ? (
                <Image src={blog.user.image} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-muted bg-bg animate-fade-in">
                  {(blog.user.name || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-muted truncate max-w-[120px]">
              {blog.user.name || blog.user.email}
            </span>
          </div>
        </div>

        {/* Column 4: Status */}
        <div className="mt-2 lg:mt-0 flex items-center lg:block">
          <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-20 mr-2 block">Status:</span>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.color}`}>
            <config.icon className="w-3 h-3" />
            {config.label}
          </div>
        </div>

        {/* Column 5: Stats */}
        <div className="mt-3 lg:mt-0 flex items-center lg:block">
          <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-20 mr-2 block">Stats:</span>
          <div className="flex items-center gap-4 bg-bg lg:bg-transparent border border-border lg:border-none px-3 py-1 lg:p-0 rounded-lg">
            <div className="flex items-center gap-1 group/stat" title="Views">
              <Eye className="w-3.5 h-3.5 text-muted group-hover/stat:text-accent transition" />
              <span className="text-[10px] font-mono font-bold text-muted group-hover/stat:text-accent transition">{blog.viewCount}</span>
            </div>
            <div className="flex items-center gap-1 group/stat" title="Reactions">
              <Heart className="w-3.5 h-3.5 text-muted group-hover/stat:text-accent transition" />
              <span className="text-[10px] font-mono font-bold text-muted group-hover/stat:text-accent transition">{blog._count.reactions}</span>
            </div>
            <div className="flex items-center gap-1 group/stat" title="Comments">
              <MessageSquare className="w-3.5 h-3.5 text-muted group-hover/stat:text-accent transition" />
              <span className="text-[10px] font-mono font-bold text-muted group-hover/stat:text-accent transition">{blog._count.comments}</span>
            </div>
          </div>
        </div>

        {/* Column 6: Actions */}
        <div className="mt-4 lg:mt-0 flex items-center justify-end gap-2 border-t border-border pt-3 lg:border-none lg:pt-0">
          <button
            onClick={() => setIsModOpen(true)}
            className="p-2 rounded-lg bg-bg border border-border text-muted hover:text-accent hover:border-accent/45 transition"
            title="Moderate Blog"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <Link
            href={`/blog/${blog.slug}`}
            target="_blank"
            className="p-2 rounded-lg bg-bg border border-border text-muted hover:text-fg hover:border-border-strong transition"
            title="View Blog"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {isModOpen && (
        <AdminBlogModerationModal
          blog={blog}
          onClose={() => setIsModOpen(false)}
        />
      )}
    </>
  );
}
