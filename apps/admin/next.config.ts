import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "path";

// Load env vars from the monorepo root .env
loadEnvConfig(path.resolve(__dirname, "../../"));

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  transpilePackages: ["@comeoffline/brand", "@comeoffline/types", "@comeoffline/ui", "@comeoffline/firebase"],
  experimental: {
    webpackBuildWorker: false, // Disable webpack workers to prevent hangs
  },
  output: 'standalone', // Optimize for deployment
  productionBrowserSourceMaps: false, // Disable source maps to speed up build
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
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://apis.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://storage.googleapis.com https://*.firebasestorage.googleapis.com",
              "font-src 'self' data:",
              `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com ${apiUrl}`,
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
