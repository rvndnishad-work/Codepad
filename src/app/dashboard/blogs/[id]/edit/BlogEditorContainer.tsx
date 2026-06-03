"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BlogEditor from "@/components/BlogEditor";
import type {
  BlogEditorData,
  BlogEditorSavePayload,
} from "@/components/blog-editor/types";

interface ContainerProps {
  initialData: BlogEditorData & { slug: string };
}

export default function BlogEditorContainer({ initialData }: ContainerProps) {
  const router = useRouter();

  const handleSave = async (data: BlogEditorSavePayload) => {
    const res = await fetch(`/api/blogs/${initialData.id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.formErrors?.join?.(", ") || "Failed to update");
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this blog post? This cannot be undone.")) return;
    const res = await fetch(`/api/blogs/${initialData.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete blog post");
      return;
    }
    toast.success("Blog post deleted");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-fg transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          {initialData.published && (
            <Link
              href={`/blog/${initialData.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-elevated text-fg text-[11px] font-bold transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View live
            </Link>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-[11px] font-bold transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
      <BlogEditor
        initialData={{
          id: initialData.id,
          title: initialData.title,
          content: initialData.content,
          excerpt: initialData.excerpt,
          coverImage: initialData.coverImage,
          published: initialData.published,
          tags: initialData.tags,
        }}
        onSave={handleSave}
        autoSave
      />
    </>
  );
}
