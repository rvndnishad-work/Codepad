"use client";

import Link from "next/link";
import { User, Calendar, BookOpen } from "lucide-react";
import RelativeTime from "./RelativeTime";

interface BlogCardProps {
  blog: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    createdAt: string;
    user: {
      name: string | null;
      image: string | null;
    };
  };
}

export default function BlogCard({ blog }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group relative flex flex-col rounded-3xl border border-border bg-surface overflow-hidden hover:border-border-strong transition-all shadow-xl hover:-translate-y-1"
    >
      {blog.coverImage ? (
        <div className="aspect-[16/9] w-full overflow-hidden border-b border-border">
          <img
            src={blog.coverImage}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] w-full bg-panel/30 flex items-center justify-center border-b border-border group-hover:bg-panel/50 transition-colors">
          <BookOpen className="w-12 h-12 text-muted/20" />
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent mb-3">
          <Calendar className="w-3 h-3" />
          <RelativeTime iso={blog.createdAt} />
        </div>

        <h3 className="text-xl font-black text-fg mb-3 group-hover:text-accent transition-colors line-clamp-2 leading-tight">
          {blog.title}
        </h3>

        {blog.excerpt && (
          <p className="text-sm text-muted line-clamp-3 mb-6 flex-1">
            {blog.excerpt}
          </p>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-border mt-auto">
          <div className="w-8 h-8 rounded-full bg-surface overflow-hidden ring-2 ring-bg border border-border">
            {blog.user.image ? (
              <img src={blog.user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                <User className="w-4 h-4 text-fg/40" />
              </div>
            )}
          </div>
          <span className="text-xs font-bold text-muted truncate flex-1">
            {blog.user.name ?? "Anonymous"}
          </span>
        </div>
      </div>
    </Link>
  );
}
