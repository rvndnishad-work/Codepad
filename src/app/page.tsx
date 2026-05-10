import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomeHero from "./HomeHero";
import HomeBento from "./HomeBento";
import HomeExplore from "./HomeExplore";
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
