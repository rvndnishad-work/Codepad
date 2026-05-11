import { prisma } from "@/lib/prisma";
import BlogCard from "@/components/BlogCard";
import { Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlogListingPage() {
  const blogs = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-20">
        <div className="mb-20 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-accent mb-6 bg-accent/10 px-4 py-1.5 rounded-full">
            <Flame className="w-3.5 h-3.5 fill-current" />
            Insights & Engineering
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-fg tracking-tighter mb-6 leading-[0.9]">
            The <span className="text-accent">Codepad</span> Chronicles
          </h1>
          <p className="text-muted text-xl max-w-2xl mx-auto font-medium">
            Deep dives into modern web technologies, AI agent engineering, and building the future of collaborative coding.
          </p>
        </div>

        {blogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={{
                ...blog, 
                createdAt: blog.createdAt.toISOString()
              }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-surface rounded-[40px] border border-border shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative z-10">
              <p className="text-muted text-lg font-medium italic">No stories published yet. Be the first to share your insights!</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
