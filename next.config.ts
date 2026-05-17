import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
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
    ];
  },
};

export default nextConfig;
