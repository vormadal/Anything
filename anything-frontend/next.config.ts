import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Kiota ships its abstractions as ESM; transpiling it lets Jest (via next/jest)
  // transform the package when hooks import runtime helpers like DateOnly directly.
  // `marked` (the notes markdown importer) is ESM-only for the same reason —
  // next/jest hardcodes `/node_modules/` in transformIgnorePatterns unless a
  // package is listed here, so a jest.config override alone can't reach it.
  transpilePackages: ["@microsoft/kiota-abstractions", "marked"],
  async redirects() {
    return [
      { source: '/shopping-lists', destination: '/lists', permanent: true },
      { source: '/shopping-lists/:id', destination: '/lists/:id', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Chrome's WebAPK update checker must always get a fresh manifest to
        // detect icon/name changes and update the installed PWA badge-free.
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        // Service worker must never be served stale — browsers check it on
        // every load and rely on byte-for-byte comparison to detect updates.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  images: {
    // imgproxy already handles all resizing and format conversion (webp).
    // Disabling Next.js image optimization avoids redundant double-processing
    // and removes the remotePatterns hostname allowlist restriction, which
    // would otherwise block production imgproxy URLs from displaying.
    unoptimized: true,
  },
};

export default nextConfig;
