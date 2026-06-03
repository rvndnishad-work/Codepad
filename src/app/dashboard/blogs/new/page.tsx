"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import BlogEditor from "@/components/BlogEditor";
import type { BlogEditorSavePayload } from "@/components/blog-editor/types";

export default function NewBlogPage() {
  const router = useRouter();

  const handleSave = async (data: BlogEditorSavePayload) => {
    const res = await fetch("/api/blogs", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.formErrors?.join?.(", ") || "Failed to create blog");
    }

    const blog = await res.json();
    // Once the row exists, hop to its edit page so autosave kicks in.
    router.push(`/dashboard/blogs/${blog.id}/edit`);
    router.refresh();
  };

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-fg transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to dashboard
          </Link>
        </div>
        <BlogEditor onSave={handleSave} autoSave={false} />
      </main>
    </div>
  );
}
