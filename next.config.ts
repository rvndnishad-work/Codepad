import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
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
