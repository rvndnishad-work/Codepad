import { recruiterOrigin } from "@/lib/site-url";

// The recruiter domain's robots.txt. The proxy serves it at /robots.txt on that
// domain (see src/lib/domains.ts); the developer domain keeps src/app/robots.ts.
export const revalidate = 3600;

export function GET() {
  const origin = recruiterOrigin();
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin/",
    "Disallow: /w/",
    "Disallow: /login",
    "Disallow: /interview/",
    "Disallow: /take-home/",
    "Disallow: /ai-interview/",
    "Disallow: /invite/",
    "",
    `Host: ${origin}`,
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
