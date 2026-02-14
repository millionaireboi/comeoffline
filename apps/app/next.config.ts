import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@comeoffline/brand", "@comeoffline/types", "@comeoffline/ui", "@comeoffline/firebase"],
};

export default nextConfig;
