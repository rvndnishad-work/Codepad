/**
 * Seed script for sample blog posts. Used for UI density testing.
 *
 * Run with: npx tsx prisma/seed-blogs.ts
 *
 * Idempotent: deletes existing seeded rows (slugs prefixed "sample-") and
 * recreates them. Spreads posts across the first three users in the DB.
 */
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

interface SeedPost {
  title: string;
  excerpt: string;
  tags: string[];
  /** Optional Unsplash cover. Use undefined to test the no-cover variant. */
  coverImage?: string;
  /** Days ago the post was "created", to give a realistic spread. */
  daysAgo: number;
  /** View count to make the "Most read" sidebar look real. */
  viewCount: number;
  /** Admin-pinned / staff pick — surfaces as the homepage hero. */
  featured?: boolean;
}

const POSTS: SeedPost[] = [
  {
    title: "Why React Server Components changed how I think about data",
    excerpt:
      "Six months in production with RSC, the wins and the gotchas you only learn the hard way.",
    tags: ["react", "nextjs", "server-components"],
    coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80",
    daysAgo: 1,
    viewCount: 2840,
  },
  {
    title: "Stop reaching for useEffect",
    excerpt:
      "Most useEffect calls in your codebase don't need to exist. Here's a checklist before you reach for it.",
    tags: ["react", "hooks", "patterns"],
    coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80",
    daysAgo: 2,
    viewCount: 5120,
  },
  {
    title: "TypeScript generics aren't scary if you read them right-to-left",
    excerpt:
      "A small mental model that made generic signatures click for me after years of squinting.",
    tags: ["typescript", "generics"],
    daysAgo: 3,
    viewCount: 1670,
  },
  {
    title: "The interview question that filters everyone: closures",
    excerpt:
      "What closures actually are, why every senior asks about them, and how to answer in 60 seconds.",
    tags: ["interview", "javascript", "closures"],
    coverImage: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80",
    daysAgo: 4,
    viewCount: 8740,
  },
  {
    title: "I built a CSS-only carousel and learned to stop fearing scroll-snap",
    excerpt:
      "Zero JS, native momentum, accessible by default. Modern CSS is genuinely good now.",
    tags: ["css", "frontend"],
    daysAgo: 5,
    viewCount: 920,
  },
  {
    title: "How I prepare for system-design rounds at FAANG",
    excerpt:
      "The 5-step framework that took me from blanking on the whiteboard to landing offers at three big-five companies.",
    tags: ["interview", "system-design", "career"],
    coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
    daysAgo: 6,
    viewCount: 12030,
    featured: true,
  },
  {
    title: "AI-assisted coding is changing what 'senior' means",
    excerpt:
      "Copilot, Cursor, Claude — the skills that matter most have shifted. Here's what I now look for when hiring.",
    tags: ["ai", "career", "hiring"],
    daysAgo: 7,
    viewCount: 4380,
    featured: true,
  },
  {
    title: "A minimal guide to Tailwind v4",
    excerpt:
      "What changed, what didn't, and the three configs you'll actually edit on a real project.",
    tags: ["tailwind", "css", "frontend"],
    coverImage: "https://images.unsplash.com/photo-1635830625698-3b9bd74671ca?w=1200&q=80",
    daysAgo: 8,
    viewCount: 2210,
  },
  {
    title: "The hidden cost of barrel files",
    excerpt:
      "Why your `index.ts` re-exports are quietly making your bundles 30% larger than they need to be.",
    tags: ["javascript", "performance", "tooling"],
    daysAgo: 10,
    viewCount: 3950,
  },
  {
    title: "Debugging Next.js hydration errors without losing your mind",
    excerpt:
      "A practical playbook: how to find which component, which prop, and which line broke the SSR contract.",
    tags: ["nextjs", "react", "debugging"],
    coverImage: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&q=80",
    daysAgo: 12,
    viewCount: 6470,
  },
  {
    title: "What 100 algorithm problems taught me about pattern recognition",
    excerpt:
      "After grinding LeetCode for three months, the real value wasn't the solutions — it was learning to spot the shape of a problem.",
    tags: ["interview", "algorithms", "leetcode"],
    daysAgo: 14,
    viewCount: 1840,
  },
  {
    title: "Stop committing your `node_modules`. Seriously.",
    excerpt:
      "A short rant on a problem I keep seeing in 2026, and a 5-minute fix that will save your team months.",
    tags: ["git", "tooling"],
    daysAgo: 16,
    viewCount: 720,
  },
  {
    title: "Building a real-time collaborative editor with Y.js",
    excerpt:
      "From CRDTs to WebSockets, here's the minimum you need to add Google-Docs-style co-editing to your app.",
    tags: ["realtime", "crdt", "yjs"],
    coverImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80",
    daysAgo: 19,
    viewCount: 3110,
  },
  {
    title: "Why I switched from Jest to Vitest (and why you might too)",
    excerpt:
      "Faster cold starts, native ESM, and a config that doesn't fight you. A migration diary from a 400-test codebase.",
    tags: ["testing", "vitest", "jest"],
    daysAgo: 22,
    viewCount: 2980,
  },
];

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) + "-" + nanoid(6)
  );
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 3,
  });
  if (users.length === 0) {
    console.error("No users found. Sign up at least one user first.");
    process.exit(1);
  }

  // Wipe previously seeded sample rows so this script stays idempotent. We
  // identify them by the marker we put in adminNotes — slugs are randomized
  // each run, so we can't match on slug.
  const deleted = await prisma.blogPost.deleteMany({
    where: { adminNotes: "__seed__" },
  });
  console.log(`Cleared ${deleted.count} previously seeded posts.`);

  let created = 0;
  for (let i = 0; i < POSTS.length; i++) {
    const p = POSTS[i];
    const user = users[i % users.length];
    const createdAt = new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.blogPost.create({
      data: {
        slug: slugify(p.title),
        title: p.title,
        excerpt: p.excerpt,
        // Minimal markdown body — UI density testing only.
        content: `${p.excerpt}\n\nThis is a placeholder body for UI testing. The real article would go here.`,
        coverImage: p.coverImage ?? null,
        tags: JSON.stringify(p.tags),
        published: true,
        featured: p.featured ?? false,
        viewCount: p.viewCount,
        userId: user.id,
        adminNotes: "__seed__",
        createdAt,
        updatedAt: createdAt,
      },
    });
    created++;
  }
  console.log(`Created ${created} sample posts across ${users.length} user(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
