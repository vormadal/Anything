import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
