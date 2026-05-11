"use client";

import { useRouter } from "next/navigation";
import BlogEditor from "@/components/BlogEditor";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewBlogPage() {
  const router = useRouter();

  const handleSave = async (data: any) => {
    const res = await fetch("/api/blogs", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Failed to create blog");
    
    const blog = await res.json();
    router.push(`/dashboard/blogs/${blog.id}/edit`);
    router.refresh();
  };

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-fg transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Dashboard
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-black text-fg tracking-tight">Create New Blog Post</h1>
          <p className="text-muted font-medium">Draft your technical masterpiece.</p>
        </div>
        <BlogEditor onSave={handleSave} />
      </main>
    </div>
  );
}
