import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "path";

loadEnvConfig(path.resolve(__dirname, "../../"));

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const isDev = process.env.NODE_ENV !== "production";

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
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://storage.googleapis.com https://*.firebasestorage.googleapis.com",
              "font-src 'self' data:",
              `connect-src 'self' ${apiUrl}${isDev ? " ws://localhost:*" : ""}`,
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
