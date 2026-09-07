"use client";

import dynamic from "next/dynamic";

// WebGL-only canvas — split into its own chunk and never SSR it. This
// wrapper must stay a Client Component: `ssr: false` is not allowed in
// Server Components.
const GalaxyCanvas = dynamic(() => import("./GalaxyCanvas"), {
  ssr: false,
  loading: () => <div aria-hidden className="fixed inset-0 -z-10 bg-[#02030a]" />,
});

export default function GalaxyBackdrop() {
  return <GalaxyCanvas />;
}
