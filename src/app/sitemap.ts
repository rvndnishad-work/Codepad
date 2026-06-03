import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/playgrounds", changeFrequency: "weekly", priority: 0.9 },
  { path: "/challenges", changeFrequency: "daily", priority: 0.9 },
  { path: "/blog", changeFrequency: "daily", priority: 0.9 },
  { path: "/explore", changeFrequency: "daily", priority: 0.8 },
  { path: "/login", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [blogs, challenges, snippets] = await Promise.all([
    prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.challenge.findMany({
      where: { published: true, visibility: "public" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.snippet.findMany({
      where: { visibility: "public" },
      select: { slug: true, updatedAt: true },
      take: 5000,
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogs.map((b) => ({
    url: `${SITE_URL}/blog/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const challengeEntries: MetadataRoute.Sitemap = challenges.map((c) => ({
    url: `${SITE_URL}/challenges/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const snippetEntries: MetadataRoute.Sitemap = snippets.map((s) => ({
    url: `${SITE_URL}/play/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...blogEntries, ...challengeEntries, ...snippetEntries];
}
