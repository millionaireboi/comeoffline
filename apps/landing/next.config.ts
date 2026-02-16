import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "path";

// Load env vars from the monorepo root .env
loadEnvConfig(path.resolve(__dirname, "../../"));

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
