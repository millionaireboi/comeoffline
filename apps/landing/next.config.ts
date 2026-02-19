import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@comeoffline/brand", "@comeoffline/types", "@comeoffline/ui"],
  experimental: {
    webpackBuildWorker: false, // Disable webpack workers to prevent hangs
  },
  output: 'standalone', // Optimize for deployment
  productionBrowserSourceMaps: false, // Disable source maps to speed up build
  compiler: {
    removeConsole: false, // Keep console logs for now
  },
};

export default nextConfig;
