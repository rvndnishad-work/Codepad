import type { NextConfig } from "next";
import { reactMergeRedirects } from "./src/lib/react-merge-redirects";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: false,
  // Pin the workspace root so Turbopack resolves modules from THIS project.
  // Without it, a stray lockfile elsewhere (e.g. ~/package-lock.json) makes
  // Next infer the wrong root, breaking page-module resolution at build time.
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // OAuth avatar providers + the image hosts we generate from + common stock
    // photo CDNs that show up in user-pasted blog covers. New hosts cause
    // `next/image` to throw in dev — add them here, do NOT widen to wildcards.
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "www.gravatar.com" },
      { protocol: "https", hostname: "image.pollinations.ai" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/templates",
        destination: "/playgrounds",
        permanent: true,
      },
      {
        source: "/j",
        destination: "/join",
        permanent: true,
      },
      {
        source: "/j/:code",
        destination: "/join/:code",
        permanent: true,
      },
      // Merged duplicate interview questions → canonical pages (JS answer review).
      {
        source: "/interview-question/javascript-closures",
        destination: "/interview-question/what-are-closures-in-javascript",
        permanent: true,
      },
      {
        source: "/interview-question/explain-the-concept-of-pure-functions",
        destination: "/interview-question/what-is-a-pure-function",
        permanent: true,
      },
      {
        source: "/interview-question/what-is-the-difference-between-and-2",
        destination: "/interview-question/what-is-the-difference-between-and",
        permanent: true,
      },
      {
        source: "/interview-question/what-is-the-difference-between-null-and-undefined-2",
        destination: "/interview-question/what-is-the-difference-between-null-and-undefined",
        permanent: true,
      },
      // Merged duplicate React questions → canonical pages (reactjs dedup).
      ...reactMergeRedirects,
    ];
  },
};

export default nextConfig;
