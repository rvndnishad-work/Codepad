"use client";

import { useRouter } from "next/navigation";
import BlogEditor from "@/components/BlogEditor";
import { ArrowLeft, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function BlogEditorContainer({ initialData }: { initialData: any }) {
  const router = useRouter();

  const handleSave = async (data: any) => {
    const res = await fetch(`/api/blogs/${initialData.id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Failed to update blog");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    
    const res = await fetch(`/api/blogs/${initialData.id}`, {
      method: "DELETE",
    });

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-fg transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-fg tracking-tight">Edit Blog Post</h1>
          <p className="text-muted font-medium">Refining your insights.</p>
        </div>
        <div className="flex items-center gap-3">
          {initialData.published && (
            <Link 
              href={`/blog/${initialData.slug}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-fg text-sm font-bold hover:bg-elevated transition-all"
              target="_blank"
            >
              <ExternalLink className="w-4 h-4" />
              View Live
            </Link>
          )}
          <button 
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete Post
          </button>
        </div>
      </div>
      <BlogEditor initialData={initialData} onSave={handleSave} />
    </>
  );
}
