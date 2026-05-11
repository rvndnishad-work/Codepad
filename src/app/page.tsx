import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomeHero from "./HomeHero";
import HomeBento from "./HomeBento";
import HomeExplore from "./HomeExplore";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import BlogCard from "@/components/BlogCard";
import TemplatePicker from "@/components/TemplatePicker";

export default async function HomePage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  let welcomeData: {
    name: string | null;
    image: string | null;
    snippetCount: number;
    recent: { slug: string; title: string; template: string } | null;
  } | null = null;

  if (userId) {
    const [count, recent] = await Promise.all([
      prisma.snippet.count({ where: { userId } }),
      prisma.snippet.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { slug: true, title: true, template: true },
      }),
    ]);
    welcomeData = {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
      snippetCount: count,
      recent,
    };
  }

  // Top public snippets
  const featuredRows = await prisma.snippet.findMany({
    where: { visibility: "public" },
    orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
    take: 6,
    include: { user: { select: { name: true, image: true } } },
  });

  // Latest blogs
  const latestBlogs = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { user: { select: { name: true, image: true } } },
  });

  const featured = featuredRows.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    template: s.template,
    updatedAt: s.updatedAt.toISOString(),
    author: s.user ? { name: s.user.name, image: s.user.image } : null,
  }));

  return (
    <div className="bg-bg min-h-screen">
      <HomeHero 
        sessionName={welcomeData?.name} 
        snippetCount={welcomeData?.snippetCount ?? 0}
        recentSnippet={welcomeData?.recent}
      />
      
      <HomeBento />
      
      <HomeExplore featured={featured} />
      
      {/* Latest Stories Section */}
      {latestBlogs.length > 0 && (
        <section className="bg-bg py-24 border-t border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -mr-64 -mt-64" />
          <div className="mx-auto max-w-6xl px-4 relative z-10">
            <div className="flex items-end justify-between mb-12">
              <div>
                 <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-accent mb-2 bg-accent/10 px-3 py-1 rounded-full">
                    <BookOpen className="w-3.5 h-3.5" />
                    Insights
                 </div>
                 <h2 className="text-3xl font-black text-fg tracking-tight">Latest Stories</h2>
              </div>
              <Link href="/blog" className="text-sm font-bold text-muted hover:text-fg transition-colors flex items-center gap-2 group">
                Read all articles
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestBlogs.map((blog) => (
                <BlogCard key={blog.id} blog={{
                  ...blog,
                  createdAt: blog.createdAt.toISOString()
                }} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="templates" className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4">
           <div className="mb-12 text-center">
              <h2 className="text-3xl font-black text-fg tracking-tight mb-4">The Full Library</h2>
              <p className="text-muted max-w-lg mx-auto">
                Explore all 16+ pre-wired templates. From core languages to complex ecosystem variants.
              </p>
           </div>
           {/* TemplatePicker can still be used for the library/search functionality */}
           <TemplatePicker welcome={welcomeData} featured={[]} hideHero />
        </div>
      </section>
    </div>
  );
}
