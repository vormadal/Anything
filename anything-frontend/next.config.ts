import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
    remotePatterns: [
      {
        // imgproxy in development (Aspire assigns the host port dynamically)
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
