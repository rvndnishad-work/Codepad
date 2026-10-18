import { recruiterOrigin } from "@/lib/site-url";

// The recruiter domain's sitemap. The proxy serves it at /sitemap.xml on that
// domain (see src/lib/domains.ts); the developer domain keeps src/app/sitemap.ts.
const PAGES: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/features", changefreq: "monthly", priority: "0.7" },
];

export const revalidate = 3600;

export function GET() {
  const origin = recruiterOrigin();
  const now = new Date().toISOString();
  const urls = PAGES.map(
    (p) =>
      `  <url><loc>${origin}${p.path}</loc><lastmod>${now}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
