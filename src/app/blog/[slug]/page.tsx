import { prisma } from "@/lib/prisma";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { notFound } from "next/navigation";
import { User, Calendar, BookOpen, ArrowLeft } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import Link from "next/link";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const blog = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  if (!blog || !blog.published) {
    notFound();
  }

  // Increment view count in background
  prisma.blogPost.update({
    where: { id: blog.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => null);

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-accent transition-colors mb-12 group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Blog
          </Link>

          {blog.coverImage && (
            <div className="aspect-video w-full rounded-[40px] overflow-hidden border border-border shadow-2xl mb-12 relative group">
              <img src={blog.coverImage} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/40 to-transparent" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 mb-12">
            <div className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-4 py-2 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-surface overflow-hidden border border-border">
                {blog.user.image ? (
                  <img src={blog.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-fg/40" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-fg tracking-tight">{blog.user.name ?? "Anonymous"}</span>
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Author</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-muted/40 font-bold uppercase text-[10px] tracking-widest">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                <RelativeTime iso={blog.createdAt.toISOString()} />
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" />
                {Math.ceil(blog.content.length / 1000)} min read
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-7xl font-black text-fg mb-16 tracking-tighter leading-[0.9]">
            {blog.title}
          </h1>

          <div className="bg-surface/30 rounded-[40px] border border-border/50 p-8 md:p-12 shadow-inner">
            <MarkdownRenderer content={blog.content} className="max-w-none" />
          </div>

          <div className="mt-20 pt-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-surface border border-border overflow-hidden p-1">
                   <div className="w-full h-full rounded-2xl bg-gradient-to-br from-accent to-accent-soft grid place-items-center">
                      <BookOpen className="w-6 h-6 text-bg" />
                   </div>
                </div>
                <div>
                   <h4 className="font-black text-fg tracking-tight text-lg">Thanks for reading!</h4>
                   <p className="text-muted text-sm font-medium">Was this post helpful? Share it with your fellow developers.</p>
                </div>
             </div>
             <Link href="/blog" className="px-8 py-4 rounded-2xl bg-fg text-bg font-bold hover:scale-105 transition-all shadow-xl active:scale-95">
                Discover More Stories
             </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
