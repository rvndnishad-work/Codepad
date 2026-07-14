import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/hire", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/playgrounds", changeFrequency: "weekly", priority: 0.9 },
  { path: "/challenges", changeFrequency: "daily", priority: 0.9 },
  { path: "/blog", changeFrequency: "daily", priority: 0.9 },
  { path: "/interview-questions", changeFrequency: "daily", priority: 0.9 },
  { path: "/explore", changeFrequency: "daily", priority: 0.8 },
  { path: "/creators", changeFrequency: "daily", priority: 0.8 },
  { path: "/become-creator", changeFrequency: "monthly", priority: 0.6 },
  { path: "/login", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Prerenders at build (revalidate=3600). A cold/unreachable DB at build must
  // not fail the deploy — fall back to just the static routes and let the next
  // revalidation pick up the dynamic URLs once the DB is reachable.
  let blogs: { slug: string; updatedAt: Date }[] = [];
  let challenges: { slug: string; updatedAt: Date }[] = [];
  let snippets: { slug: string; updatedAt: Date }[] = [];
  let companies: { slug: string; updatedAt: Date }[] = [];
  let questions: { slug: string; updatedAt: Date }[] = [];
  let spaces: { handle: string; updatedAt: Date }[] = [];
  let spaceTutorials: { slug: string; updatedAt: Date; spaceId: string }[] = [];
  let spaceQAs: { slug: string; updatedAt: Date; spaceId: string }[] = [];
  let spaceExperiences: { slug: string; updatedAt: Date; spaceId: string }[] = [];
  let spaceIdToHandle = new Map<string, string>();
  try {
    [blogs, challenges, snippets, companies, questions] = await Promise.all([
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
      prisma.company.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.prepQuestion.findMany({
        where: { status: "published" },
        select: { slug: true, updatedAt: true },
        take: 10000,
      }),
    ]);
    spaces = await prisma.creatorSpace.findMany({
      where: { published: true },
      select: { id: true, handle: true, updatedAt: true },
    }).then((rows) => {
      spaceIdToHandle = new Map(rows.map((s) => [s.id, s.handle]));
      return rows;
    });
    const spaceIds = [...spaceIdToHandle.keys()];
    [spaceTutorials, spaceQAs, spaceExperiences] = await Promise.all([
      prisma.tutorial.findMany({
        where: { spaceId: { in: spaceIds }, published: true },
        select: { slug: true, updatedAt: true, spaceId: true },
      }),
      prisma.interviewQA.findMany({
        where: { spaceId: { in: spaceIds }, published: true },
        select: { slug: true, updatedAt: true, spaceId: true },
      }),
      prisma.interviewExperience.findMany({
        where: { spaceId: { in: spaceIds }, published: true },
        select: { slug: true, updatedAt: true, spaceId: true },
      }),
    ]);
  } catch (err) {
    console.error("[sitemap] DB unavailable, emitting static routes only:", err);
  }

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

  const techEntries: MetadataRoute.Sitemap = TECHNOLOGIES.map((t) => ({
    url: `${SITE_URL}/interview-questions/${t.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const companyEntries: MetadataRoute.Sitemap = companies.map((c) => ({
    url: `${SITE_URL}/interview-questions/company/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const questionEntries: MetadataRoute.Sitemap = questions.map((q) => ({
    url: `${SITE_URL}/interview-question/${q.slug}`,
    lastModified: q.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const spaceEntries: MetadataRoute.Sitemap = spaces.map((s) => ({
    url: `${SITE_URL}/c/${s.handle}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const spaceContentEntries: MetadataRoute.Sitemap = [
    ...spaceTutorials.map((t) => ({ path: "tutorials", ...t })),
    ...spaceQAs.map((q) => ({ path: "interview", ...q })),
    ...spaceExperiences.map((e) => ({ path: "experience", ...e })),
  ].flatMap((row) => {
    const handle = spaceIdToHandle.get(row.spaceId);
    if (!handle) return [];
    return [
      {
        url: `${SITE_URL}/c/${handle}/${row.path}/${row.slug}`,
        lastModified: row.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      },
    ];
  });

  return [
    ...staticEntries,
    ...blogEntries,
    ...challengeEntries,
    ...snippetEntries,
    ...techEntries,
    ...companyEntries,
    ...questionEntries,
    ...spaceEntries,
    ...spaceContentEntries,
  ];
}
