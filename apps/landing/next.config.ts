import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@comeoffline/brand", "@comeoffline/types", "@comeoffline/ui"],
  experimental: {
    webpackBuildWorker: false,
  },
  output: 'standalone',
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
