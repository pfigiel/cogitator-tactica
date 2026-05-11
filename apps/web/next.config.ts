import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cogitator-tactica/ui-kit"],
  experimental: {
    optimizePackageImports: ["@cogitator-tactica/ui-kit"],
  },
};

export default nextConfig;
