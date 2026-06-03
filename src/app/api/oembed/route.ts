import { NextResponse } from "next/server";
import { getPortfolioData } from "@/lib/portfolio-badges";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get("url");

    if (!urlParam) {
      return new Response("Missing 'url' parameter", { status: 400 });
    }

    // Match candidate portfolio URL pattern (e.g. /u/[id] or /u/[id]/portfolio)
    const match = urlParam.match(/\/u\/([a-zA-Z0-9_\-]{8,40})(\/portfolio)?/);
    if (!match) {
      return new Response("Invalid or unsupported URL pattern", { status: 400 });
    }

    const userId = match[1];
    const data = await getPortfolioData(userId);

    if (!data || !data.portfolioPublic) {
      return new Response("Portfolio not found or is private", { status: 404 });
    }

    // Construct embed URL and HTML iframe snippet
    const domain = new URL(request.url).origin;
    const embedUrl = `${domain}/u/${userId}/portfolio?embed=true`;

    const oembedResponse = {
      type: "rich",
      version: "1.0",
      title: `${data.name ?? "Developer"}'s Verified Portfolio — Codepad`,
      author_name: data.name ?? "Verified Developer",
      author_url: `${domain}/u/${userId}/portfolio`,
      provider_name: "Codepad",
      provider_url: domain,
      cache_age: 3600,
      html: `<iframe src="${embedUrl}" width="100%" height="450" frameborder="0" style="border:1px solid #e2e8f0;border-radius:24px;box-shadow:0_10px_30px_rgba(0,0,0,0.04);max-width:700px;background:#0d0e12;" allow="clipboard-write"></iframe>`,
      width: 700,
      height: 450,
      thumbnail_url: data.image ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name ?? userId}`,
      thumbnail_width: 120,
      thumbnail_height: 120,
    };

    return NextResponse.json(oembedResponse);
  } catch (err) {
    console.error("Error in oEmbed route:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
